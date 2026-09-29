use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum JobStatus {
    #[default]
    Pending,
    Downloading,
    Completed,
    Failed,
    Cancelled,
}

impl JobStatus {
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            JobStatus::Completed | JobStatus::Failed | JobStatus::Cancelled
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub url: String,
    pub title: Option<String>,
    pub format_id: Option<String>,
    pub audio_only: bool,
    pub status: JobStatus,
    pub progress: Option<f64>,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub filename: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
    /// Insertion order; created_at can tie within one bulk add.
    #[serde(skip)]
    pub seq: u64,
}

impl Job {
    /// Snapshot of this job's state as a status-change event.
    pub fn progress_event(&self) -> DownloadProgress {
        DownloadProgress {
            job_id: self.id.clone(),
            status: self.status.clone(),
            progress: self.progress.unwrap_or(0.0),
            filename: self.filename.clone().unwrap_or_default(),
            error: self.error.clone(),
            ..Default::default()
        }
    }
}

pub const PROGRESS_EVENT: &str = "download-progress";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub job_id: String,
    pub status: JobStatus,
    pub progress: f64,
    pub speed: String,
    pub eta: String,
    pub filename: String,
    pub total_bytes: Option<u64>,
    pub total_bytes_estimate: Option<u64>,
    pub downloaded_bytes: Option<u64>,
    pub phase: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Format {
    pub format_id: String,
    pub ext: String,
    pub resolution: Option<String>,
    pub filesize: Option<u64>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistEntry {
    pub url: String,
    pub title: String,
    pub duration: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub title: String,
    pub formats: Vec<Format>,
    pub is_playlist: bool,
    pub entries: Option<Vec<PlaylistEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub output_dir: String,
    pub max_concurrent: u32,
    pub max_playlist_items: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolInfo {
    pub version: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyStatus {
    /// Whether setup() built the download manager; the tool probe below is display only.
    pub backend_ready: bool,
    pub ytdlp: Option<ToolInfo>,
    pub ffmpeg: Option<ToolInfo>,
}
