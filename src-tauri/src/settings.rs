use std::fs;
use std::ops::RangeInclusive;
use std::path::{Component, Path, PathBuf};

use crate::error::AppError;
use crate::types::Settings;

pub struct SettingsStore {
    settings: Settings,
    file_path: PathBuf,
}

impl SettingsStore {
    pub fn new(data_dir: &Path) -> Result<Self, AppError> {
        fs::create_dir_all(data_dir)?;
        let file_path = data_dir.join("settings.json");

        let default_output_dir = dirs::download_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Downloads"))
            .to_string_lossy()
            .to_string();

        let defaults = Settings {
            output_dir: default_output_dir,
            max_concurrent: 3,
            max_playlist_items: 100,
        };

        let settings = Self::load(&file_path, defaults);

        Ok(Self {
            settings,
            file_path,
        })
    }

    pub fn get(&self) -> Settings {
        self.settings.clone()
    }

    pub fn update(
        &mut self,
        output_dir: Option<String>,
        max_concurrent: Option<u32>,
        max_playlist_items: Option<u32>,
    ) -> Result<Settings, AppError> {
        // Staged on a copy so a rejected field or failed write leaves nothing half-applied.
        let mut next = self.settings.clone();
        if let Some(dir) = output_dir {
            next.output_dir = validate_output_dir(&dir)?;
        }
        if let Some(n) = max_concurrent {
            next.max_concurrent = validate_range("max_concurrent", n, MAX_CONCURRENT_RANGE)?;
        }
        if let Some(n) = max_playlist_items {
            next.max_playlist_items =
                validate_range("max_playlist_items", n, MAX_PLAYLIST_ITEMS_RANGE)?;
        }
        self.save(&next)?;
        self.settings = next;
        Ok(self.get())
    }

    fn load(path: &Path, defaults: Settings) -> Settings {
        let text = match fs::read_to_string(path) {
            Ok(text) => text,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return defaults,
            Err(e) => {
                log::warn!("Failed to read settings.json: {e}, using defaults");
                return defaults;
            }
        };
        match serde_json::from_str::<Settings>(&text) {
            Ok(stored) => sanitize(&stored, defaults),
            Err(e) => {
                // Moved aside so the next save() cannot overwrite what the user may want back.
                let backup = path.with_extension("json.corrupt");
                match fs::rename(path, &backup) {
                    Ok(()) => log::warn!(
                        "Failed to parse settings.json ({e}); moved it to {} and using defaults",
                        backup.display()
                    ),
                    Err(re) => log::warn!(
                        "Failed to parse settings.json ({e}) or move it aside ({re}); using defaults"
                    ),
                }
                defaults
            }
        }
    }

    fn save(&self, settings: &Settings) -> Result<(), AppError> {
        let text = serde_json::to_string_pretty(settings)?;
        fs::write(&self.file_path, text)?;
        Ok(())
    }
}

const MAX_CONCURRENT_RANGE: RangeInclusive<u32> = 1..=10;
const MAX_PLAYLIST_ITEMS_RANGE: RangeInclusive<u32> = 1..=1000;

/// A hand-edited settings.json bypasses `update()` validation.
fn sanitize(stored: &Settings, defaults: Settings) -> Settings {
    Settings {
        output_dir: or_default(validate_output_dir(&stored.output_dir), defaults.output_dir),
        max_concurrent: or_default(
            validate_range(
                "max_concurrent",
                stored.max_concurrent,
                MAX_CONCURRENT_RANGE,
            ),
            defaults.max_concurrent,
        ),
        max_playlist_items: or_default(
            validate_range(
                "max_playlist_items",
                stored.max_playlist_items,
                MAX_PLAYLIST_ITEMS_RANGE,
            ),
            defaults.max_playlist_items,
        ),
    }
}

fn or_default<T>(checked: Result<T, AppError>, default: T) -> T {
    checked.unwrap_or_else(|e| {
        log::warn!("Ignoring stored setting: {e}");
        default
    })
}

fn validate_output_dir(dir: &str) -> Result<String, AppError> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::Validation("Cannot determine home directory".to_string()))?;
    let path = PathBuf::from(dir);
    let abs = if path.is_absolute() {
        path
    } else {
        home.join(&path)
    };
    let normalized = lexical_normalize(&abs);
    if !normalized.starts_with(&home) {
        return Err(AppError::Validation(
            "Output directory must be within your home directory".to_string(),
        ));
    }
    Ok(normalized.to_string_lossy().into_owned())
}

fn validate_range(name: &str, n: u32, range: RangeInclusive<u32>) -> Result<u32, AppError> {
    if !range.contains(&n) {
        return Err(AppError::Validation(format!(
            "{name} must be between {} and {}",
            range.start(),
            range.end()
        )));
    }
    Ok(n)
}

/// Lexically resolves `.` and `..` without touching the filesystem.
fn lexical_normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            c => out.push(c),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_store_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("yt-dlp-gui-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn defaults() -> Settings {
        Settings {
            output_dir: dirs::home_dir()
                .unwrap()
                .join("Downloads")
                .to_string_lossy()
                .into_owned(),
            max_concurrent: 3,
            max_playlist_items: 100,
        }
    }

    #[test]
    fn load_replaces_only_invalid_fields() {
        let dir = temp_store_dir();
        let path = dir.join("settings.json");
        let music = dirs::home_dir().unwrap().join("Music");
        let stored = serde_json::json!({
            "outputDir": music,
            "maxConcurrent": 0,
            "maxPlaylistItems": 50,
        });
        fs::write(&path, stored.to_string()).unwrap();

        let loaded = SettingsStore::load(&path, defaults());

        assert_eq!(loaded.output_dir, music.to_string_lossy());
        assert_eq!(loaded.max_concurrent, 3);
        assert_eq!(loaded.max_playlist_items, 50);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn load_rejects_output_dir_outside_home() {
        let dir = temp_store_dir();
        let path = dir.join("settings.json");
        let stored = serde_json::json!({
            "outputDir": "/private/tmp",
            "maxConcurrent": 2,
            "maxPlaylistItems": 50,
        });
        fs::write(&path, stored.to_string()).unwrap();

        let loaded = SettingsStore::load(&path, defaults());

        assert_eq!(loaded.output_dir, defaults().output_dir);
        assert_eq!(loaded.max_concurrent, 2);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn load_moves_unparsable_file_aside() {
        let dir = temp_store_dir();
        let path = dir.join("settings.json");
        fs::write(&path, "{ not json").unwrap();

        let loaded = SettingsStore::load(&path, defaults());

        assert_eq!(loaded.max_concurrent, 3);
        assert!(!path.exists());
        assert_eq!(
            fs::read_to_string(dir.join("settings.json.corrupt")).unwrap(),
            "{ not json"
        );
        fs::remove_dir_all(dir).unwrap();
    }
}
