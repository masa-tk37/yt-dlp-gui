use std::fs;
use std::path::{Component, Path, PathBuf};

use crate::error::AppError;
use crate::types::Settings;

pub struct SettingsStore {
    settings: Settings,
    file_path: PathBuf,
}

impl SettingsStore {
    pub fn new(data_dir: PathBuf) -> Result<Self, AppError> {
        fs::create_dir_all(&data_dir)?;
        let file_path = data_dir.join("settings.json");

        let default_output_dir = dirs::download_dir()
            .unwrap_or_else(|| {
                dirs::home_dir()
                    .unwrap_or_default()
                    .join("Downloads")
            })
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
        if let Some(dir) = output_dir {
            let home = dirs::home_dir().ok_or_else(|| {
                AppError::Validation("Cannot determine home directory".to_string())
            })?;
            let path = PathBuf::from(&dir);
            // Make absolute, then lexically normalize to prevent path traversal
            let abs = if path.is_absolute() {
                path.clone()
            } else {
                home.join(&path)
            };
            let normalized = lexical_normalize(&abs);
            if !normalized.starts_with(&home) {
                return Err(AppError::Validation(
                    "Output directory must be within your home directory".to_string(),
                ));
            }
            self.settings.output_dir = normalized.to_string_lossy().into_owned();
        }
        if let Some(n) = max_concurrent {
            if !(1..=10).contains(&n) {
                return Err(AppError::Validation(
                    "max_concurrent must be between 1 and 10".to_string(),
                ));
            }
            self.settings.max_concurrent = n;
        }
        if let Some(n) = max_playlist_items {
            if !(1..=1000).contains(&n) {
                return Err(AppError::Validation(
                    "max_playlist_items must be between 1 and 1000".to_string(),
                ));
            }
            self.settings.max_playlist_items = n;
        }
        self.save()?;
        Ok(self.get())
    }

    fn load(path: &Path, defaults: Settings) -> Settings {
        match fs::read_to_string(path) {
            Ok(text) => match serde_json::from_str::<Settings>(&text) {
                Ok(s) => s,
                Err(_) => {
                    log::warn!("Failed to parse settings.json, using defaults");
                    defaults
                }
            },
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => defaults,
            Err(e) => {
                log::warn!("Failed to read settings.json: {}, using defaults", e);
                defaults
            }
        }
    }

    fn save(&self) -> Result<(), AppError> {
        let text = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.file_path, text)?;
        Ok(())
    }
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
