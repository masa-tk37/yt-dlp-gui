use std::sync::Arc;

use parking_lot::Mutex;
use tauri::State;

use crate::AppState;
use crate::download_manager::DownloadManager;
use crate::types::{DependencyStatus, Job, Settings, ToolInfo, VideoInfo};
use crate::validation::{validate_format_id, validate_url};
use crate::ytdlp;

const MAX_BULK_URLS: usize = 1000;

pub(crate) fn get_dm(state: &AppState) -> Result<Arc<Mutex<DownloadManager>>, String> {
    state
        .download_manager
        .as_ref()
        .cloned()
        .ok_or_else(|| crate::YTDLP_NOT_FOUND_MSG.to_string())
}

fn build_dependency_status(backend_ready: bool) -> DependencyStatus {
    let ytdlp_path = ytdlp::find_ytdlp();
    let ffmpeg_path = ytdlp::find_ffmpeg();
    DependencyStatus {
        backend_ready,
        ytdlp: ytdlp_path.as_ref().map(|p| ToolInfo {
            version: ytdlp::get_version(p).unwrap_or_else(|| "unknown".into()),
            path: p.to_string_lossy().into(),
        }),
        ffmpeg: ffmpeg_path.as_ref().map(|p| ToolInfo {
            version: ytdlp::get_ffmpeg_version(p).unwrap_or_else(|| "unknown".into()),
            path: p.to_string_lossy().into(),
        }),
    }
}

#[tauri::command]
pub async fn add_download(
    url: String,
    format_id: Option<String>,
    audio_only: Option<bool>,
    title: Option<String>,
    state: State<'_, AppState>,
) -> Result<Job, String> {
    validate_url(&url)?;
    if let Some(ref fid) = format_id {
        validate_format_id(fid)?;
    }

    let dm = get_dm(&state)?;
    let job = {
        let mut dm = dm.lock();
        dm.add_job(url, format_id, audio_only, title)?
    };

    DownloadManager::try_start_pending(dm, state.settings.clone());

    Ok(job)
}

#[tauri::command]
pub async fn add_bulk_downloads(
    urls: Vec<String>,
    format_id: Option<String>,
    audio_only: Option<bool>,
    titles: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<Vec<Job>, String> {
    if urls.len() > MAX_BULK_URLS {
        return Err(format!("Too many URLs: max {} allowed", MAX_BULK_URLS));
    }
    for url in &urls {
        validate_url(url)?;
    }
    if let Some(ref fid) = format_id {
        validate_format_id(fid)?;
    }

    let dm = get_dm(&state)?;
    let mut jobs = Vec::new();
    {
        let mut dm_guard = dm.lock();
        // All-or-nothing: jobs inserted before a mid-loop failure would never be
        // returned to the frontend nor started.
        dm_guard.ensure_capacity(urls.len())?;
        for (i, url) in urls.into_iter().enumerate() {
            let title = titles.as_ref().and_then(|t| t.get(i)).cloned();
            let job = dm_guard.add_job(url, format_id.clone(), audio_only, title)?;
            jobs.push(job);
        }
    }

    DownloadManager::try_start_pending(dm, state.settings.clone());

    Ok(jobs)
}

#[tauri::command]
pub async fn get_all_jobs(state: State<'_, AppState>) -> Result<Vec<Job>, String> {
    Ok(get_dm(&state)?.lock().get_all_jobs())
}

#[tauri::command]
pub async fn cancel_download(id: String, state: State<'_, AppState>) -> Result<(), String> {
    get_dm(&state)?.lock().cancel_job(&id).map_err(String::from)
}

#[tauri::command]
pub async fn cancel_all_downloads(state: State<'_, AppState>) -> Result<u32, String> {
    Ok(get_dm(&state)?.lock().cancel_all())
}

#[tauri::command]
pub async fn clear_completed(state: State<'_, AppState>) -> Result<u32, String> {
    Ok(get_dm(&state)?.lock().clear_completed())
}

#[tauri::command]
pub async fn list_formats(url: String, state: State<'_, AppState>) -> Result<VideoInfo, String> {
    validate_url(&url)?;
    let max_playlist_items = state.settings.lock().get().max_playlist_items;
    let executor = get_dm(&state)?.lock().executor.clone();

    executor
        .list_formats(&url, max_playlist_items)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    Ok(state.settings.lock().get())
}

#[tauri::command]
pub async fn update_settings(
    output_dir: Option<String>,
    max_concurrent: Option<u32>,
    max_playlist_items: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Settings, String> {
    state
        .settings
        .lock()
        .update(output_dir, max_concurrent, max_playlist_items)
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_dependency_status(state: State<'_, AppState>) -> Result<DependencyStatus, String> {
    let backend_ready = state.download_manager.is_some();
    tokio::task::spawn_blocking(move || build_dependency_status(backend_ready))
        .await
        .map_err(|e| e.to_string())
}
