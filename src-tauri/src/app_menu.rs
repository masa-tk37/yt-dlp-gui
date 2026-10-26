use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, WINDOW_SUBMENU_ID};
use tauri::{App, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

pub const MAIN_WINDOW: &str = "main";
const SETTINGS_WINDOW: &str = "settings";
const SETTINGS_ID: &str = "settings";
const SHOW_MAIN_ID: &str = "show-main";

pub fn install(app: &App) -> tauri::Result<()> {
    let handle = app.handle();
    let menu = Menu::default(handle)?;

    // Default macOS app submenu is [About, separator, Services, ...]; Settings goes after About.
    if let Some(app_submenu) = menu.items()?.first().and_then(|i| i.as_submenu().cloned()) {
        let settings =
            MenuItem::with_id(handle, SETTINGS_ID, "Settings…", true, Some("CmdOrCtrl+,"))?;
        app_submenu.insert_items(&[&settings, &PredefinedMenuItem::separator(handle)?], 2)?;
    }

    // A hidden main window drops out of the system window list, so it needs its own entry.
    if let Some(window_submenu) = menu
        .get(WINDOW_SUBMENU_ID)
        .and_then(|i| i.as_submenu().cloned())
    {
        let show_main = MenuItem::with_id(
            handle,
            SHOW_MAIN_ID,
            &handle.package_info().name,
            true,
            Some("CmdOrCtrl+0"),
        )?;
        window_submenu.append_items(&[&PredefinedMenuItem::separator(handle)?, &show_main])?;
    }

    app.set_menu(menu)?;
    app.on_menu_event(|app, event| match event.id().as_ref() {
        SETTINGS_ID => {
            if let Err(e) = open_settings(app) {
                log::error!("Failed to open settings window: {e}");
            }
        }
        SHOW_MAIN_ID => show_main(app),
        _ => {}
    });
    Ok(())
}

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn open_settings(app: &AppHandle<Wry>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW) {
        return window.set_focus();
    }
    WebviewWindowBuilder::new(app, SETTINGS_WINDOW, WebviewUrl::App("index.html".into()))
        .title("Settings")
        .inner_size(520.0, 440.0)
        .resizable(false)
        .minimizable(false)
        .maximizable(false)
        .visible(false)
        .build()?;
    Ok(())
}
