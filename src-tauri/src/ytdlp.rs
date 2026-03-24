use std::path::{Path, PathBuf};

pub fn find_ytdlp() -> Option<PathBuf> {
    which("yt-dlp")
}

pub fn find_ffmpeg() -> Option<PathBuf> {
    which("ffmpeg")
}

pub fn get_version(bin_path: &Path) -> Option<String> {
    let output = std::process::Command::new(bin_path)
        .arg("--version")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// ffmpeg uses `-version` (not `--version`) and outputs "ffmpeg version X.Y ...".
pub fn get_ffmpeg_version(bin_path: &Path) -> Option<String> {
    let output = std::process::Command::new(bin_path)
        .arg("-version")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .next()
        .and_then(|l| l.split_whitespace().nth(2))
        .map(String::from)
}

fn which(name: &str) -> Option<PathBuf> {
    if let Some(path_var) = std::env::var_os("PATH") {
        let candidate = std::env::split_paths(&path_var)
            .map(|dir| dir.join(name))
            .find(|p| p.is_file());
        if candidate.is_some() {
            return candidate;
        }
    }

    // Fallback for macOS GUI apps that may not inherit shell PATH
    ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"]
        .iter()
        .map(|dir| PathBuf::from(dir).join(name))
        .find(|p| p.is_file())
}
