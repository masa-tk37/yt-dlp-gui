use std::path::Path;
use std::sync::Arc;

use chrono::Utc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

use crate::download_manager::DownloadManager;
use crate::error::AppError;
use crate::settings::SettingsStore;
use crate::types::{DownloadProgress, Job, JobStatus, Settings};

pub(crate) async fn run_job(
    job: Job,
    manager: Arc<Mutex<DownloadManager>>,
    settings: Settings,
    settings_store: Arc<Mutex<SettingsStore>>,
) {
    let job_id = job.id.clone();
    let (executor, app) = {
        let m = manager.lock();
        (m.executor.clone(), m.app.clone())
    };

    let (tx, rx) = mpsc::channel::<DownloadProgress>(128);

    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            job_id: job_id.clone(),
            status: JobStatus::Downloading,
            ..Default::default()
        },
    );

    let fwd_task = tokio::spawn(forward_progress(
        rx,
        manager.clone(),
        app.clone(),
        job_id.clone(),
    ));
    let result = executor.execute(&job, &settings, tx).await;
    let _ = fwd_task.await;

    if let Some(p) = finalize_job(&result, &manager, &job_id) {
        let _ = app.emit("download-progress", &p);
    }

    let new_settings = { settings_store.lock().get() };
    DownloadManager::try_start_pending(manager, new_settings, settings_store);
}

async fn forward_progress(
    mut rx: mpsc::Receiver<DownloadProgress>,
    manager: Arc<Mutex<DownloadManager>>,
    app: AppHandle,
    job_id: String,
) {
    while let Some(progress) = rx.recv().await {
        {
            let mut m = manager.lock();
            if let Some(j) = m.jobs.get_mut(&job_id) {
                if progress.phase.is_none() {
                    j.progress = Some(progress.progress);
                    if !progress.speed.is_empty() {
                        j.speed = Some(progress.speed.clone());
                    }
                    if !progress.eta.is_empty() {
                        j.eta = Some(progress.eta.clone());
                    }
                    if !progress.filename.is_empty() {
                        let fname = if j.audio_only {
                            let stem = Path::new(&progress.filename)
                                .file_stem()
                                .and_then(|s| s.to_str())
                                .unwrap_or(&progress.filename);
                            format!("{}.mp3", stem)
                        } else {
                            progress.filename.clone()
                        };
                        j.filename = Some(fname);
                    }
                }
            }
        }
        let _ = app.emit("download-progress", &progress);
    }
}

fn finalize_job(
    result: &Result<Option<String>, AppError>,
    manager: &Mutex<DownloadManager>,
    job_id: &str,
) -> Option<DownloadProgress> {
    let mut m = manager.lock();
    let j = m.jobs.get_mut(job_id)?;

    if j.status == JobStatus::Cancelled {
        return None;
    }

    match result {
        Ok(merged_filename) => {
            if let Some(f) = merged_filename {
                j.filename = Some(f.clone());
            }
            j.status = JobStatus::Completed;
            j.completed_at = Some(Utc::now().to_rfc3339());
            j.progress = Some(100.0);
            Some(DownloadProgress {
                job_id: job_id.to_string(),
                status: JobStatus::Completed,
                progress: 100.0,
                filename: j.filename.clone().unwrap_or_default(),
                ..Default::default()
            })
        }
        Err(e) => {
            let error_msg = e.to_string();
            log::error!("Download failed for job {}: {}", job_id, error_msg);
            j.status = JobStatus::Failed;
            j.error = Some(error_msg.clone());
            Some(DownloadProgress {
                job_id: job_id.to_string(),
                status: JobStatus::Failed,
                progress: j.progress.unwrap_or(0.0),
                filename: j.filename.clone().unwrap_or_default(),
                error: Some(error_msg),
                ..Default::default()
            })
        }
    }
}
