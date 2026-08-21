use std::collections::{HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use parking_lot::Mutex;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

use crate::error::AppError;
use crate::types::{DownloadProgress, Job, JobStatus, Settings, VideoInfo};
use crate::ytdlp;
use crate::ytdlp_failure::{explain, ffmpeg_missing};
use crate::ytdlp_parser::{
    PROGRESS_PREFIX, parse_merged_filename, parse_phase, parse_playlist, parse_progress,
    parse_single_video,
};

// Only the tail is kept, to bound memory on long runs; anything the caller must not
// miss is detected line by line as stderr streams in.
const STDERR_BUFFER_SIZE: usize = 100;

const FFMPEG_REQUIRED_MSG: &str =
    "ffmpeg is required to merge video and audio. Install with: brew install ffmpeg";

pub struct YtdlpExecutor {
    bin_path: PathBuf,
    active_pids: Arc<Mutex<HashMap<String, u32>>>,
}

impl YtdlpExecutor {
    pub fn new(bin_path: PathBuf) -> Self {
        Self {
            bin_path,
            active_pids: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn list_formats(
        &self,
        url: &str,
        max_playlist_items: u32,
    ) -> Result<VideoInfo, AppError> {
        let output = Command::new(&self.bin_path)
            .args([
                // Without this a user's global config can add output of its own
                // (--print, --write-info-json, ...) and corrupt the JSON on stdout.
                "--ignore-config",
                "--flat-playlist",
                "--dump-single-json",
                "--playlist-items",
                &format!("1:{}", max_playlist_items),
                url,
            ])
            .output()
            .await
            .map_err(|e| AppError::Process(format!("Failed to spawn yt-dlp: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::Process(
                explain(&stderr).unwrap_or_else(|| format!("yt-dlp failed: {}", stderr.trim())),
            ));
        }

        let data: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| AppError::Internal(format!("Failed to parse yt-dlp output: {}", e)))?;

        if data["_type"].as_str() == Some("playlist") {
            return Ok(parse_playlist(&data));
        }

        Ok(parse_single_video(&data))
    }

    pub async fn execute(
        &self,
        job: &Job,
        settings: &Settings,
        progress_tx: mpsc::Sender<DownloadProgress>,
    ) -> Result<Option<String>, AppError> {
        // Resolved per job so that installing ffmpeg takes effect without an app restart
        let args = build_args(job, ytdlp::find_ffmpeg().as_deref());
        self.run_process(args, job, settings, progress_tx).await
    }

    async fn run_process(
        &self,
        args: Vec<String>,
        job: &Job,
        settings: &Settings,
        progress_tx: mpsc::Sender<DownloadProgress>,
    ) -> Result<Option<String>, AppError> {
        let mut child = Command::new(&self.bin_path)
            .args(&args)
            .current_dir(&settings.output_dir)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| AppError::Process(format!("Failed to spawn yt-dlp: {}", e)))?;

        // Taken before the pid is registered so an early return here cannot leave a
        // stale entry that a later cancel would signal at a recycled pid.
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AppError::Process("No stdout handle".to_string()))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| AppError::Process("No stderr handle".to_string()))?;

        if let Some(pid) = child.id() {
            self.active_pids.lock().insert(job.id.clone(), pid);
        }

        let job_id = job.id.clone();
        let mut stdout_lines = BufReader::new(stdout).lines();

        let stderr_task = tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            let mut lines: VecDeque<String> = VecDeque::new();
            let mut saw_ffmpeg_missing = false;
            while let Ok(Some(line)) = reader.next_line().await {
                saw_ffmpeg_missing |= ffmpeg_missing(&line);
                lines.push_back(line);
                if lines.len() > STDERR_BUFFER_SIZE {
                    lines.pop_front();
                }
            }
            (Vec::from(lines).join("\n"), saw_ffmpeg_missing)
        });

        // yt-dlp sends progress, phase and [Merger] lines to stdout; stderr carries
        // only warnings and errors.
        let mut merged_filename = None;
        while let Ok(Some(line)) = stdout_lines.next_line().await {
            if line.starts_with(PROGRESS_PREFIX) {
                if let Some(progress) = parse_progress(&line, &job_id) {
                    let _ = progress_tx.send(progress).await;
                }
                continue;
            }
            if let Some(name) = parse_merged_filename(&line) {
                merged_filename = Some(name);
            }
            if let Some(phase_text) = parse_phase(&line) {
                let _ = progress_tx
                    .send(DownloadProgress {
                        job_id: job_id.clone(),
                        status: JobStatus::Downloading,
                        phase: Some(phase_text),
                        ..Default::default()
                    })
                    .await;
            }
        }

        let wait_result = child.wait().await;
        let stderr_result = stderr_task.await;
        self.active_pids.lock().remove(&job.id);

        let exit_status = wait_result.map_err(|e| AppError::Process(e.to_string()))?;
        let (stderr_text, saw_ffmpeg_missing) =
            stderr_result.map_err(|e| AppError::Internal(e.to_string()))?;

        // Before the exit-status branch: neither status is conclusive on its own
        // (see ytdlp_failure::ffmpeg_missing).
        if saw_ffmpeg_missing {
            return Err(AppError::Process(FFMPEG_REQUIRED_MSG.to_string()));
        }

        if !exit_status.success() {
            let msg = explain(&stderr_text).unwrap_or_else(|| {
                if stderr_text.trim().is_empty() {
                    format!("yt-dlp exited with {}", exit_status)
                } else {
                    stderr_text.trim().to_string()
                }
            });
            return Err(AppError::Process(msg));
        }

        Ok(merged_filename)
    }

    pub fn cancel(&self, job_id: &str) {
        let pid = self.active_pids.lock().remove(job_id);

        if let Some(pid) = pid {
            #[cfg(unix)]
            unsafe {
                libc::kill(pid as libc::pid_t, libc::SIGTERM);
            }

            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                #[cfg(unix)]
                unsafe {
                    // Only send SIGKILL if the process is still alive
                    if libc::kill(pid as libc::pid_t, 0) == 0 {
                        libc::kill(pid as libc::pid_t, libc::SIGKILL);
                    }
                }
            });
        }
    }
}

fn build_args(job: &Job, ffmpeg_path: Option<&Path>) -> Vec<String> {
    let progress_template = format!("{}%(progress)j", PROGRESS_PREFIX);
    let mut args = vec![
        // A user's global config could otherwise override -f and -o, or set --quiet
        // and suppress the stderr warnings run_process reads.
        "--ignore-config".to_string(),
        "--newline".to_string(),
        "--progress-template".to_string(),
        progress_template,
        "--no-exec".to_string(),
        "-o".to_string(),
        "%(title)s.%(ext)s".to_string(),
    ];

    // Bundled .app processes inherit a minimal PATH, so yt-dlp cannot find ffmpeg
    // on its own. Passing the binary also resolves ffprobe from the same directory.
    if let Some(path) = ffmpeg_path {
        args.extend([
            "--ffmpeg-location".to_string(),
            path.to_string_lossy().into_owned(),
        ]);
    }

    if job.audio_only {
        args.extend([
            "-x".to_string(),
            "--audio-format".to_string(),
            "mp3".to_string(),
        ]);
    } else if let Some(ref fmt) = job.format_id {
        args.extend(["-f".to_string(), fmt.clone()]);
    }

    args.push(job.url.clone());
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    const URL: &str = "https://www.youtube.com/watch?v=A8_endEPTHY";
    const MP4_PRESET: &str =
        "bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b";
    const FFMPEG: &str = "/opt/homebrew/bin/ffmpeg";

    fn test_job(format_id: Option<&str>, audio_only: bool) -> Job {
        Job {
            id: "job-1".to_string(),
            url: URL.to_string(),
            title: None,
            format_id: format_id.map(String::from),
            audio_only,
            status: JobStatus::Pending,
            progress: None,
            speed: None,
            eta: None,
            filename: None,
            error: None,
            created_at: String::new(),
            completed_at: None,
        }
    }

    fn all_shapes() -> Vec<Job> {
        vec![
            test_job(Some(MP4_PRESET), false),
            test_job(Some("137"), false),
            test_job(None, false),
            test_job(None, true),
        ]
    }

    #[test]
    fn build_args_mp4_preset_full_vector() {
        let job = test_job(Some(MP4_PRESET), false);
        assert_eq!(
            build_args(&job, Some(Path::new(FFMPEG))),
            vec![
                "--ignore-config",
                "--newline",
                "--progress-template",
                "PROGRESS:%(progress)j",
                "--no-exec",
                "-o",
                "%(title)s.%(ext)s",
                "--ffmpeg-location",
                FFMPEG,
                "-f",
                MP4_PRESET,
                URL,
            ]
        );
    }

    #[test]
    fn build_args_omits_ffmpeg_location_when_not_found() {
        let args = build_args(&test_job(Some(MP4_PRESET), false), None);
        assert!(!args.iter().any(|a| a == "--ffmpeg-location"));
        assert!(args.iter().any(|a| a == MP4_PRESET));
    }

    #[test]
    fn build_args_auto_quality_has_no_f() {
        let args = build_args(&test_job(None, false), Some(Path::new(FFMPEG)));
        assert!(!args.iter().any(|a| a == "-f"));
        assert!(args.iter().any(|a| a == "--ffmpeg-location"));
    }

    #[test]
    fn build_args_audio_only_extracts_mp3() {
        let args = build_args(&test_job(Some(MP4_PRESET), true), Some(Path::new(FFMPEG)));
        assert!(args.iter().any(|a| a == "-x"));
        assert_eq!(
            args.iter()
                .position(|a| a == "--audio-format")
                .map(|i| &args[i + 1]),
            Some(&"mp3".to_string())
        );
        // audio_only takes precedence over any requested format
        assert!(!args.iter().any(|a| a == "-f"));
    }

    #[test]
    fn build_args_url_is_last() {
        for job in all_shapes() {
            assert_eq!(
                build_args(&job, Some(Path::new(FFMPEG))).last(),
                Some(&URL.to_string())
            );
            assert_eq!(build_args(&job, None).last(), Some(&URL.to_string()));
        }
    }

    #[test]
    fn build_args_always_ignores_user_config() {
        for job in all_shapes() {
            assert!(
                build_args(&job, Some(Path::new(FFMPEG)))
                    .iter()
                    .any(|a| a == "--ignore-config")
            );
        }
    }
}
