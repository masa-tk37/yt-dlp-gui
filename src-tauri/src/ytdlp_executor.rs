use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::Arc;

use parking_lot::Mutex;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

use crate::error::AppError;
use crate::types::{DownloadProgress, Job, JobStatus, Settings, VideoInfo};
use crate::ytdlp_parser::{
    parse_phase, parse_playlist, parse_progress, parse_single_video, PROGRESS_PREFIX,
};

const STDERR_BUFFER_SIZE: usize = 100;

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
            return Err(AppError::Process(format!(
                "yt-dlp failed: {}",
                stderr.trim()
            )));
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
        let args = self.build_args(job);
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

        if let Some(pid) = child.id() {
            self.active_pids.lock().insert(job.id.clone(), pid);
        }

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AppError::Process("No stdout handle".to_string()))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| AppError::Process("No stderr handle".to_string()))?;

        let job_id = job.id.clone();
        let mut stdout_lines = BufReader::new(stdout).lines();

        let phase_tx = progress_tx.clone();
        let job_id_phase = job.id.clone();
        let stderr_task = tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            // avoid unbounded memory growth on long downloads
            let mut lines: VecDeque<String> = VecDeque::new();
            while let Ok(Some(line)) = reader.next_line().await {
                if let Some(phase_text) = parse_phase(&line) {
                    let _ = phase_tx
                        .send(DownloadProgress {
                            job_id: job_id_phase.clone(),
                            status: JobStatus::Downloading,
                            phase: Some(phase_text),
                            ..Default::default()
                        })
                        .await;
                }
                lines.push_back(line);
                if lines.len() > STDERR_BUFFER_SIZE {
                    lines.pop_front();
                }
            }
            Vec::from(lines).join("\n")
        });

        while let Ok(Some(line)) = stdout_lines.next_line().await {
            if !line.starts_with(PROGRESS_PREFIX) {
                continue;
            }
            if let Some(progress) = parse_progress(&line, &job_id) {
                let _ = progress_tx.send(progress).await;
            }
        }

        let exit_status = child
            .wait()
            .await
            .map_err(|e| AppError::Process(e.to_string()))?;

        let stderr_text = stderr_task
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        self.active_pids.lock().remove(&job.id);

        if !exit_status.success() {
            let msg = if stderr_text.trim().is_empty() {
                format!("yt-dlp exited with {}", exit_status)
            } else {
                stderr_text.trim().to_string()
            };
            return Err(AppError::Process(msg));
        }

        // yt-dlp reports the merged output path only via stderr [Merger] lines
        let merger_filename = stderr_text.lines().find_map(|line| {
            if line.contains("[Merger") && line.contains("Merging formats into") {
                line.find("Merging formats into \"").map(|idx| {
                    let start = idx + "Merging formats into \"".len();
                    let rest = &line[start..];
                    rest.rfind('"')
                        .map(|end| rest[..end].to_string())
                        .unwrap_or_default()
                })
            } else {
                None
            }
        });

        Ok(merger_filename)
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

    fn build_args(&self, job: &Job) -> Vec<String> {
        let progress_template = format!("{}%(progress)j", PROGRESS_PREFIX);
        let mut args = vec![
            "--newline".to_string(),
            "--progress-template".to_string(),
            progress_template,
            "--no-exec".to_string(),
            "-o".to_string(),
            "%(title)s.%(ext)s".to_string(),
        ];

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
}
