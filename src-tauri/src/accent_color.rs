use tauri::{AppHandle, Emitter};

const ACCENT_COLOR_EVENT: &str = "accent-color";

/// WebKit reports a fixed blue for `AccentColor` / `-apple-system-control-accent`
/// outside system-appearance contexts, so the real accent is read from AppKit.
#[cfg(target_os = "macos")]
pub fn current_hex() -> Option<String> {
    use objc2_app_kit::{NSColor, NSColorSpace};

    let color =
        NSColor::controlAccentColor().colorUsingColorSpace(&NSColorSpace::sRGBColorSpace())?;
    let channel = |v: f64| (v.clamp(0.0, 1.0) * 255.0).round() as u8;
    Some(format!(
        "#{:02x}{:02x}{:02x}",
        channel(color.redComponent()),
        channel(color.greenComponent()),
        channel(color.blueComponent()),
    ))
}

#[cfg(not(target_os = "macos"))]
pub fn current_hex() -> Option<String> {
    None
}

pub fn broadcast(app: &AppHandle) {
    if let Some(hex) = current_hex() {
        let _ = app.emit(ACCENT_COLOR_EVENT, hex);
    }
}

/// Pages call this on load; the event alone would race the listener registration.
#[tauri::command]
pub fn get_accent_color() -> Option<String> {
    current_hex()
}
