use serde_json::Value;

use crate::types::{DownloadProgress, Format, JobStatus, PlaylistEntry, VideoInfo};

pub const PROGRESS_PREFIX: &str = "PROGRESS:";

pub fn parse_progress(line: &str, job_id: &str) -> Option<DownloadProgress> {
    if !line.starts_with(PROGRESS_PREFIX) {
        return None;
    }

    let json_str = &line[PROGRESS_PREFIX.len()..];
    let raw: Value = serde_json::from_str(json_str).ok()?;

    let percent = raw["_percent_str"]
        .as_str()
        .and_then(|s| s.trim().trim_end_matches('%').parse::<f64>().ok())
        .unwrap_or(0.0);

    let total_bytes = raw["total_bytes"].as_u64();
    let total_bytes_estimate = raw["total_bytes_estimate"].as_u64();
    let downloaded_bytes = raw["downloaded_bytes"].as_u64();

    Some(DownloadProgress {
        job_id: job_id.to_string(),
        status: JobStatus::Downloading,
        progress: if percent.is_finite() { percent } else { 0.0 },
        speed: raw["_speed_str"].as_str().unwrap_or("").to_string(),
        eta: raw["_eta_str"].as_str().unwrap_or("").to_string(),
        filename: raw["filename"].as_str().unwrap_or("").to_string(),
        total_bytes,
        total_bytes_estimate,
        downloaded_bytes,
        phase: None,
        error: None,
    })
}

pub fn parse_single_video(data: &Value) -> VideoInfo {
    let formats: Vec<Format> = data["formats"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|f| Format {
                    format_id: f["format_id"].as_str().unwrap_or("").to_string(),
                    ext: f["ext"].as_str().unwrap_or("").to_string(),
                    resolution: f["resolution"].as_str().map(String::from),
                    filesize: f["filesize"]
                        .as_u64()
                        .or_else(|| f["filesize_approx"].as_u64()),
                    vcodec: f["vcodec"]
                        .as_str()
                        .filter(|&v| v != "none")
                        .map(String::from),
                    acodec: f["acodec"]
                        .as_str()
                        .filter(|&v| v != "none")
                        .map(String::from),
                    note: f["format_note"].as_str().map(String::from),
                })
                .collect()
        })
        .unwrap_or_default();

    VideoInfo {
        title: data["title"].as_str().unwrap_or("Unknown").to_string(),
        formats,
        is_playlist: false,
        entries: None,
    }
}

pub fn parse_playlist(data: &Value) -> VideoInfo {
    let entries: Vec<PlaylistEntry> = data["entries"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|e| PlaylistEntry {
                    url: e["url"].as_str().unwrap_or("").to_string(),
                    title: e["title"]
                        .as_str()
                        .or_else(|| e["url"].as_str())
                        .unwrap_or("")
                        .to_string(),
                    duration: e["duration"].as_f64(),
                })
                .collect()
        })
        .unwrap_or_default();

    VideoInfo {
        title: data["title"].as_str().unwrap_or("Playlist").to_string(),
        formats: vec![],
        is_playlist: true,
        entries: Some(entries),
    }
}

pub(crate) fn parse_phase(line: &str) -> Option<String> {
    if line.contains("Extracting URL") {
        Some("Resolving...".to_string())
    } else if line.contains("Downloading webpage")
        || line.contains("Downloading api JSON")
        || line.contains("Downloading player")
    {
        Some("Preparing...".to_string())
    } else if line.contains("Downloading m3u8") || line.contains("Downloading MPD") {
        Some("Fetching stream info...".to_string())
    } else if line.contains("[Merger]") && line.contains("Merging") {
        Some("Merging...".to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- parse_phase ---

    #[test]
    fn parse_phase_resolving() {
        assert_eq!(
            parse_phase("[youtube] Extracting URL: https://example.com"),
            Some("Resolving...".to_string())
        );
    }

    #[test]
    fn parse_phase_preparing() {
        assert_eq!(
            parse_phase("[youtube] Downloading webpage"),
            Some("Preparing...".to_string())
        );
        assert_eq!(
            parse_phase("[info] Downloading api JSON"),
            Some("Preparing...".to_string())
        );
    }

    #[test]
    fn parse_phase_merging() {
        assert_eq!(
            parse_phase("[Merger] Merging formats into \"video.mp4\""),
            Some("Merging...".to_string())
        );
    }

    #[test]
    fn parse_phase_none_for_unrecognized() {
        assert_eq!(parse_phase("[download] 50% of 100MiB"), None);
        assert_eq!(parse_phase("[info] some random info"), None);
        assert_eq!(parse_phase(""), None);
    }

    // --- parse_progress ---

    #[test]
    fn parse_progress_valid() {
        let line = r#"PROGRESS:{"_percent_str":" 42.5%","_speed_str":"1.5MiB/s","_eta_str":"00:30","filename":"video.mp4","total_bytes":1000000,"downloaded_bytes":425000}"#;
        let result = parse_progress(line, "job-1").unwrap();
        assert_eq!(result.job_id, "job-1");
        assert!((result.progress - 42.5).abs() < 0.001);
        assert_eq!(result.speed, "1.5MiB/s");
        assert_eq!(result.eta, "00:30");
        assert_eq!(result.filename, "video.mp4");
        assert_eq!(result.total_bytes, Some(1000000));
        assert_eq!(result.downloaded_bytes, Some(425000));
    }

    #[test]
    fn parse_progress_missing_prefix() {
        assert!(parse_progress(r#"{"_percent_str":"50%"}"#, "job-1").is_none());
    }

    #[test]
    fn parse_progress_invalid_json() {
        assert!(parse_progress("PROGRESS:not-json", "job-1").is_none());
    }

    #[test]
    fn parse_progress_total_bytes_estimate_fallback() {
        let line = r#"PROGRESS:{"_percent_str":"10%","total_bytes_estimate":500000}"#;
        let result = parse_progress(line, "job-1").unwrap();
        assert_eq!(result.total_bytes, None);
        assert_eq!(result.total_bytes_estimate, Some(500000));
    }

    #[test]
    fn parse_progress_nan_percent_defaults_to_zero() {
        let line = r#"PROGRESS:{"_percent_str":"N/A%"}"#;
        let result = parse_progress(line, "job-1").unwrap();
        assert_eq!(result.progress, 0.0);
    }

    // --- parse_single_video ---

    #[test]
    fn parse_single_video_basic() {
        let data = serde_json::json!({
            "title": "Test Video",
            "formats": [
                {
                    "format_id": "137",
                    "ext": "mp4",
                    "resolution": "1920x1080",
                    "filesize": 50000000,
                    "vcodec": "avc1",
                    "acodec": "none",
                    "format_note": "1080p"
                }
            ]
        });
        let info = parse_single_video(&data);
        assert_eq!(info.title, "Test Video");
        assert!(!info.is_playlist);
        assert_eq!(info.formats.len(), 1);
        assert_eq!(info.formats[0].format_id, "137");
        assert_eq!(info.formats[0].ext, "mp4");
        assert_eq!(info.formats[0].resolution, Some("1920x1080".to_string()));
        assert_eq!(info.formats[0].filesize, Some(50000000));
        assert_eq!(info.formats[0].vcodec, Some("avc1".to_string()));
        assert!(info.formats[0].acodec.is_none()); // "none" filtered
    }

    #[test]
    fn parse_single_video_no_formats() {
        let data = serde_json::json!({ "title": "No Formats" });
        let info = parse_single_video(&data);
        assert_eq!(info.title, "No Formats");
        assert!(info.formats.is_empty());
    }

    #[test]
    fn parse_single_video_filesize_approx_fallback() {
        let data = serde_json::json!({
            "title": "Video",
            "formats": [{"format_id": "1", "ext": "mp4", "filesize_approx": 12345}]
        });
        let info = parse_single_video(&data);
        assert_eq!(info.formats[0].filesize, Some(12345));
    }

    // --- parse_playlist ---

    #[test]
    fn parse_playlist_basic() {
        let data = serde_json::json!({
            "title": "My Playlist",
            "entries": [
                {"url": "https://example.com/1", "title": "Video 1", "duration": 120.0},
                {"url": "https://example.com/2", "title": "Video 2", "duration": 240.0}
            ]
        });
        let info = parse_playlist(&data);
        assert_eq!(info.title, "My Playlist");
        assert!(info.is_playlist);
        assert_eq!(info.entries.as_ref().unwrap().len(), 2);
        assert_eq!(info.entries.as_ref().unwrap()[0].title, "Video 1");
        assert_eq!(info.entries.as_ref().unwrap()[0].duration, Some(120.0));
    }

    #[test]
    fn parse_playlist_empty_entries() {
        let data = serde_json::json!({"title": "Empty Playlist", "entries": []});
        let info = parse_playlist(&data);
        assert!(info.entries.as_ref().unwrap().is_empty());
    }

    #[test]
    fn parse_playlist_title_fallback_to_url() {
        let data = serde_json::json!({
            "title": "Playlist",
            "entries": [{"url": "https://example.com/v", "duration": null}]
        });
        let info = parse_playlist(&data);
        // title falls back to url when title field is missing
        assert_eq!(info.entries.as_ref().unwrap()[0].title, "https://example.com/v");
    }
}
