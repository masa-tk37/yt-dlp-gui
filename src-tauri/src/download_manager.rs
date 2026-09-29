use std::collections::HashMap;
use std::sync::Arc;

use chrono::Utc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::error::AppError;
use crate::job_runner::run_job;
use crate::settings::SettingsStore;
use crate::types::{Job, JobStatus, PROGRESS_EVENT};
use crate::ytdlp_executor::YtdlpExecutor;

const MAX_JOBS: usize = 100;

pub struct DownloadManager {
    pub(crate) jobs: HashMap<String, Job>,
    next_seq: u64,
    pub(crate) executor: Arc<YtdlpExecutor>,
    pub(crate) app: AppHandle,
}

impl DownloadManager {
    pub fn new(app: AppHandle, executor: Arc<YtdlpExecutor>) -> Self {
        Self {
            jobs: HashMap::new(),
            next_seq: 0,
            executor,
            app,
        }
    }

    pub fn ensure_capacity(&self, additional: usize) -> Result<(), AppError> {
        if self.jobs.len() + additional > MAX_JOBS {
            return Err(AppError::QueueFull(format!(
                "Job queue is full (max {})",
                MAX_JOBS
            )));
        }
        Ok(())
    }

    pub fn add_job(
        &mut self,
        url: String,
        format_id: Option<String>,
        audio_only: Option<bool>,
        title: Option<String>,
    ) -> Result<Job, AppError> {
        self.ensure_capacity(1)?;

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
            seq: self.next_seq,
        };
        self.next_seq += 1;

        self.jobs.insert(id, job.clone());
        Ok(job)
    }

    pub fn get_all_jobs(&self) -> Vec<Job> {
        let mut jobs: Vec<Job> = self.jobs.values().cloned().collect();
        jobs.sort_by_key(|j| j.seq);
        jobs
    }

    pub fn cancel_job(&mut self, id: &str) -> Result<(), AppError> {
        let job = self
            .jobs
            .get_mut(id)
            .ok_or_else(|| AppError::NotFound(format!("Job {} not found", id)))?;

        // A cancel racing with completion must not relabel a finished job.
        if job.status.is_terminal() {
            return Ok(());
        }
        if job.status == JobStatus::Downloading {
            self.executor.cancel(id);
        }

        job.status = JobStatus::Cancelled;
        let _ = self.app.emit(PROGRESS_EVENT, job.progress_event());
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

    pub fn clear_completed(&mut self) -> u32 {
        let before = self.jobs.len();
        self.jobs.retain(|_, j| !j.status.is_terminal());
        (before - self.jobs.len()) as u32
    }

    /// Call after add_job or job completion to fill available concurrency slots.
    pub fn try_start_pending(
        manager: Arc<Mutex<DownloadManager>>,
        settings_store: Arc<Mutex<SettingsStore>>,
    ) {
        let max_concurrent = settings_store.lock().get().max_concurrent as usize;
        // Counting and claiming slots under one guard; concurrent callers would otherwise
        // both see the same free slots and exceed max_concurrent.
        let to_start: Vec<Job> = {
            let mut m = manager.lock();
            let active = m
                .jobs
                .values()
                .filter(|j| j.status == JobStatus::Downloading)
                .count();
            let mut pending: Vec<&mut Job> = m
                .jobs
                .values_mut()
                .filter(|j| j.status == JobStatus::Pending)
                .collect();
            pending.sort_by_key(|j| j.seq);
            pending
                .into_iter()
                .take(max_concurrent.saturating_sub(active))
                .map(|j| {
                    j.status = JobStatus::Downloading;
                    j.clone()
                })
                .collect()
        };

        for job in to_start {
            tokio::spawn(run_job(job, manager.clone(), settings_store.clone()));
        }
    }
}
