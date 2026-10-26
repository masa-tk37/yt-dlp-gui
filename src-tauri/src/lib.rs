mod accent_color;
mod app_menu;
mod commands;
mod download_manager;
mod error;
mod job_runner;
mod settings;
mod types;
mod validation;
mod ytdlp;
mod ytdlp_executor;
mod ytdlp_failure;
mod ytdlp_parser;

use std::sync::Arc;

use parking_lot::Mutex;
use tauri::{Manager, RunEvent, WindowEvent};

use commands::{
    add_bulk_downloads, add_download, cancel_all_downloads, cancel_download, clear_completed,
    get_all_jobs, get_dependency_status, get_settings, list_formats, update_settings,
};
use download_manager::DownloadManager;
use settings::SettingsStore;
use ytdlp_executor::YtdlpExecutor;

pub(crate) const YTDLP_NOT_FOUND_MSG: &str =
    "yt-dlp not found in PATH. Install with: brew install yt-dlp";

pub struct AppState {
    pub download_manager: Option<Arc<Mutex<DownloadManager>>>,
    pub settings: Arc<Mutex<SettingsStore>>,
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            accent_color::get_accent_color,
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

            let download_manager = ytdlp::find_ytdlp().map(|ytdlp_path| {
                let executor = Arc::new(YtdlpExecutor::new(ytdlp_path));
                Arc::new(Mutex::new(DownloadManager::new(handle, executor)))
            });

            app.manage(AppState {
                download_manager,
                settings: settings_store,
            });

            app_menu::install(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Closing the main window hides it so in-flight downloads keep running.
            WindowEvent::CloseRequested { api, .. } if window.label() == app_menu::MAIN_WINDOW => {
                api.prevent_close();
                let _ = window.hide();
            }
            // Accent changes have no window event; refocus is when the user returns from System Settings.
            WindowEvent::Focused(true) => accent_color::broadcast(window.app_handle()),
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        if let RunEvent::Reopen { .. } = event {
            app_menu::show_main(app);
        }
    });
}
