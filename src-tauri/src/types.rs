use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum JobStatus {
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl Default for DownloadProgress {
    fn default() -> Self {
        Self {
            job_id: String::new(),
            status: JobStatus::Pending,
            progress: 0.0,
            speed: String::new(),
            eta: String::new(),
            filename: String::new(),
            total_bytes: None,
            total_bytes_estimate: None,
            downloaded_bytes: None,
            phase: None,
            error: None,
        }
    }
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
