use std::path::Path;
use std::sync::Arc;

use chrono::Utc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

use crate::download_manager::DownloadManager;
use crate::error::AppError;
use crate::settings::SettingsStore;
use crate::types::{DownloadProgress, Job, JobStatus, PROGRESS_EVENT};

pub(crate) async fn run_job(
    job: Job,
    manager: Arc<Mutex<DownloadManager>>,
    settings_store: Arc<Mutex<SettingsStore>>,
) {
    let job_id = job.id.clone();
    let settings = settings_store.lock().get();
    let (executor, app) = {
        let m = manager.lock();
        // A cancel can land between the slot claim and this task starting. Emitting under
        // the guard keeps this event from arriving after cancel_job's "cancelled" one.
        if m.jobs
            .get(&job_id)
            .is_some_and(|j| j.status == JobStatus::Downloading)
        {
            let _ = m.app.emit(
                PROGRESS_EVENT,
                DownloadProgress {
                    job_id: job_id.clone(),
                    status: JobStatus::Downloading,
                    ..Default::default()
                },
            );
        }
        (m.executor.clone(), m.app.clone())
    };

    let (tx, rx) = mpsc::channel::<DownloadProgress>(128);

    let fwd_task = tokio::spawn(forward_progress(
        rx,
        manager.clone(),
        app.clone(),
        job_id.clone(),
    ));
    let result = executor.execute(&job, &settings, tx).await;
    let _ = fwd_task.await;

    if let Some(p) = finalize_job(&result, &manager, &job_id) {
        let _ = app.emit(PROGRESS_EVENT, &p);
    }

    DownloadManager::try_start_pending(manager, settings_store);
}

async fn forward_progress(
    mut rx: mpsc::Receiver<DownloadProgress>,
    manager: Arc<Mutex<DownloadManager>>,
    app: AppHandle,
    job_id: String,
) {
    while let Some(progress) = rx.recv().await {
        // Output still buffered after a cancel would otherwise flip the UI back to
        // "downloading", and finalize_job emits nothing for a cancelled job to undo it.
        // The guard is held across emit so this cannot land after cancel_job's event.
        if let Some(j) = manager.lock().jobs.get_mut(&job_id)
            && j.status == JobStatus::Downloading
        {
            if progress.phase.is_none() {
                apply_progress(j, &progress);
            }
            let _ = app.emit(PROGRESS_EVENT, &progress);
        }
    }
}

fn apply_progress(j: &mut Job, progress: &DownloadProgress) {
    j.progress = Some(progress.progress);
    if !progress.speed.is_empty() {
        j.speed = Some(progress.speed.clone());
    }
    if !progress.eta.is_empty() {
        j.eta = Some(progress.eta.clone());
    }
    if progress.filename.is_empty() {
        return;
    }
    j.filename = Some(if j.audio_only {
        let stem = Path::new(&progress.filename)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&progress.filename);
        format!("{}.mp3", stem)
    } else {
        progress.filename.clone()
    });
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
            Some(j.progress_event())
        }
        Err(e) => {
            let error_msg = e.to_string();
            log::error!("Download failed for job {}: {}", job_id, error_msg);
            j.status = JobStatus::Failed;
            j.error = Some(error_msg);
            Some(j.progress_event())
        }
    }
}
