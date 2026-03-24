use std::collections::HashMap;
use std::sync::Arc;

use chrono::Utc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::error::AppError;
use crate::job_runner::run_job;
use crate::settings::SettingsStore;
use crate::types::{DownloadProgress, Job, JobStatus, Settings};
use crate::ytdlp_executor::YtdlpExecutor;

const MAX_JOBS: usize = 100;

pub struct DownloadManager {
    pub(crate) jobs: HashMap<String, Job>,
    pub(crate) executor: Arc<YtdlpExecutor>,
    pub(crate) app: AppHandle,
}

impl DownloadManager {
    pub fn new(app: AppHandle, executor: Arc<YtdlpExecutor>) -> Self {
        Self {
            jobs: HashMap::new(),
            executor,
            app,
        }
    }

    pub fn add_job(
        &mut self,
        url: String,
        format_id: Option<String>,
        audio_only: Option<bool>,
        title: Option<String>,
    ) -> Result<Job, AppError> {
        if self.jobs.len() >= MAX_JOBS {
            return Err(AppError::QueueFull(format!(
                "Job queue is full (max {})",
                MAX_JOBS
            )));
        }

        let id = Uuid::new_v4().to_string();
        let job = Job {
            id: id.clone(),
            url,
            title,
            format_id,
            audio_only: audio_only.unwrap_or(false),
            status: JobStatus::Pending,
            progress: None,
            speed: None,
            eta: None,
            filename: None,
            error: None,
            created_at: Utc::now().to_rfc3339(),
            completed_at: None,
        };

        self.jobs.insert(id, job.clone());
        Ok(job)
    }

    pub fn get_all_jobs(&self) -> Vec<Job> {
        let mut jobs: Vec<Job> = self.jobs.values().cloned().collect();
        jobs.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        jobs
    }

    pub fn cancel_job(&mut self, id: &str) -> Result<(), AppError> {
        let job = self
            .jobs
            .get_mut(id)
            .ok_or_else(|| AppError::NotFound(format!("Job {} not found", id)))?;

        if job.status == JobStatus::Downloading {
            self.executor.cancel(id);
        }

        job.status = JobStatus::Cancelled;

        let progress = DownloadProgress {
            job_id: id.to_string(),
            status: JobStatus::Cancelled,
            progress: job.progress.unwrap_or(0.0),
            filename: job.filename.clone().unwrap_or_default(),
            ..Default::default()
        };

        let _ = self.app.emit("download-progress", &progress);
        Ok(())
    }

    pub fn cancel_all(&mut self) -> u32 {
        let ids: Vec<String> = self
            .jobs
            .values()
            .filter(|j| !j.status.is_terminal())
            .map(|j| j.id.clone())
            .collect();

        let count = ids.len() as u32;
        for id in ids {
            let _ = self.cancel_job(&id);
        }
        count
    }

    pub fn executor(&self) -> &Arc<YtdlpExecutor> {
        &self.executor
    }

    pub fn clear_completed(&mut self) -> u32 {
        let to_remove: Vec<String> = self
            .jobs
            .values()
            .filter(|j| j.status.is_terminal())
            .map(|j| j.id.clone())
            .collect();

        let count = to_remove.len() as u32;
        for id in to_remove {
            self.jobs.remove(&id);
        }
        count
    }

    /// Call after add_job or job completion to fill available concurrency slots.
    pub fn try_start_pending(
        manager: Arc<Mutex<DownloadManager>>,
        settings: Settings,
        settings_store: Arc<Mutex<SettingsStore>>,
    ) {
        let (active, pending_ids) = {
            let m = manager.lock();
            let active = m
                .jobs
                .values()
                .filter(|j| j.status == JobStatus::Downloading)
                .count();
            let mut pending: Vec<(String, String)> = m
                .jobs
                .values()
                .filter(|j| j.status == JobStatus::Pending)
                .map(|j| (j.id.clone(), j.created_at.clone()))
                .collect();
            // maintain FIFO order
            pending.sort_by(|a, b| a.1.cmp(&b.1));
            let pending: Vec<String> = pending.into_iter().map(|(id, _)| id).collect();
            (active, pending)
        };

        let available = (settings.max_concurrent as usize).saturating_sub(active);

        for id in pending_ids.into_iter().take(available) {
            let job = {
                let mut m = manager.lock();
                match m.jobs.get_mut(&id) {
                    Some(j) if j.status == JobStatus::Pending => {
                        j.status = JobStatus::Downloading;
                        j.clone()
                    }
                    _ => continue,
                }
            };

            let manager_clone = manager.clone();
            let settings_clone = settings.clone();
            let settings_store_clone = settings_store.clone();

            tokio::spawn(async move {
                run_job(job, manager_clone, settings_clone, settings_store_clone).await;
            });
        }
    }
}
