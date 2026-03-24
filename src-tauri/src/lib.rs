mod commands;
mod download_manager;
mod error;
mod job_runner;
mod settings;
mod types;
mod validation;
mod ytdlp;
mod ytdlp_executor;
mod ytdlp_parser;

use std::sync::Arc;

use parking_lot::Mutex;
use tauri::{Emitter, Manager};

use commands::{
    add_bulk_downloads, add_download, build_dependency_status, cancel_all_downloads,
    cancel_download, clear_completed, get_all_jobs, get_dependency_status, get_settings,
    list_formats, update_settings,
};
use download_manager::DownloadManager;
use settings::SettingsStore;
use ytdlp_executor::YtdlpExecutor;

pub(crate) const YTDLP_NOT_FOUND_MSG: &str =
    "yt-dlp not found in PATH. Install with: brew install yt-dlp";

#[derive(Debug, serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BackendCrashedPayload {
    error: String,
}

pub struct AppState {
    pub download_manager: Option<Arc<Mutex<DownloadManager>>>,
    pub settings: Arc<Mutex<SettingsStore>>,
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            add_download,
            add_bulk_downloads,
            get_all_jobs,
            cancel_download,
            cancel_all_downloads,
            clear_completed,
            list_formats,
            get_settings,
            update_settings,
            get_dependency_status,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            let data_dir = dirs::home_dir()
                .expect("Failed to get home directory")
                .join(".yt-dlp-gui")
                .join("data");
            let settings_store = Arc::new(Mutex::new(
                SettingsStore::new(data_dir)
                    .map_err(|e| format!("Failed to init settings: {}", e))?,
            ));

            let handle2 = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(dep_status) =
                    tokio::task::spawn_blocking(build_dependency_status).await
                {
                    let _ = handle2.emit("dependency-status", &dep_status);
                }
            });

            let download_manager = if let Some(ytdlp_path) = ytdlp::find_ytdlp() {
                let executor = Arc::new(YtdlpExecutor::new(ytdlp_path));
                let dm = Arc::new(Mutex::new(DownloadManager::new(handle.clone(), executor)));
                let _ = handle.emit("backend-ready", ());
                Some(dm)
            } else {
                let _ = handle.emit(
                    "backend-crashed",
                    BackendCrashedPayload {
                        error: YTDLP_NOT_FOUND_MSG.into(),
                    },
                );
                None
            };

            app.manage(AppState {
                download_manager,
                settings: settings_store,
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
