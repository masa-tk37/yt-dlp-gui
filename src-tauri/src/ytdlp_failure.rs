//! Classification of yt-dlp's stderr into causes the UI can act on.

const ERROR_PREFIX: &str = "ERROR:";

struct FailureSignature {
    /// Substring of yt-dlp's own message, taken from its source rather than guessed.
    marker: &'static str,
    explanation: &'static str,
}

/// Order is significant: within one line, the earlier entry wins.
const SIGNATURES: &[FailureSignature] = &[
    FailureSignature {
        marker: "DRM protected",
        explanation:
            "This video is protected by DRM. yt-dlp does not decrypt DRM, so it cannot be downloaded.",
    },
    FailureSignature {
        marker: "Requested format is not available",
        explanation: "The requested quality is not available for this video. Try another quality.",
    },
    FailureSignature {
        marker: "due to geo restriction",
        explanation: "This video is not available from your region.",
    },
    FailureSignature {
        marker: "only available for registered users",
        explanation: "This video requires a signed-in account, which this app does not support.",
    },
    FailureSignature {
        marker: "Sign in to confirm",
        explanation: "This video requires a signed-in account, which this app does not support.",
    },
];

/// Rewrites a known failure into an actionable sentence, keeping the line that
/// triggered it so a bug report still carries the original wording.
///
/// Only `ERROR:` lines count. yt-dlp prefixes non-fatal notices with `WARNING:`, and
/// it warns about DRM-protected formats it skipped even when the run fails for an
/// unrelated reason — matching those would restore the "it must be DRM" misdiagnosis.
/// It also keeps a video title quoting a marker from being read as the cause.
///
/// The last match wins: yt-dlp reports the fatal error after any preceding ones.
pub(crate) fn explain(stderr: &str) -> Option<String> {
    stderr
        .lines()
        .rev()
        .map(str::trim)
        .filter(|line| line.starts_with(ERROR_PREFIX))
        .find_map(|line| {
            SIGNATURES
                .iter()
                .find(|sig| line.contains(sig.marker))
                .map(|sig| format!("{} (yt-dlp: {})", sig.explanation, line))
        })
}

/// yt-dlp only warns and exits 0 when it has to skip a merge for lack of ffmpeg,
/// leaving the video and audio streams as separate files. A zero exit status alone
/// therefore does not mean the output is usable. Audio extraction instead fails the
/// run outright, with a message pointing at `--ffmpeg-location`. One of the two forms
/// is a warning, so unlike `explain` this cannot restrict itself to `ERROR:` lines.
pub(crate) fn ffmpeg_missing(stderr: &str) -> bool {
    stderr.contains("but ffmpeg is not installed")
        || stderr.contains("provide the path using --ffmpeg-location")
}

#[cfg(test)]
mod tests {
    use super::*;

    const DRM: &str = "ERROR: [tver] ep1: This video is DRM protected";
    const NO_FORMAT: &str =
        "ERROR: [tver] ep1: Requested format is not available. Use --list-formats for a list of available formats";

    #[test]
    fn explain_drm() {
        let msg = explain(DRM).unwrap();
        assert!(msg.starts_with("This video is protected by DRM."));
        assert!(msg.ends_with(&format!("(yt-dlp: {})", DRM)));
    }

    #[test]
    fn explain_requested_format() {
        assert!(
            explain(NO_FORMAT)
                .unwrap()
                .starts_with("The requested quality is not available")
        );
    }

    #[test]
    fn explain_geo_restriction() {
        let stderr =
            "ERROR: [tver] ep1: This video is not available from your location due to geo restriction";
        assert!(
            explain(stderr)
                .unwrap()
                .starts_with("This video is not available from your region.")
        );
    }

    #[test]
    fn explain_login_required() {
        for stderr in [
            "ERROR: [tver] ep1: This video is only available for registered users",
            "ERROR: [youtube] abc: Sign in to confirm you're not a bot",
        ] {
            assert!(
                explain(stderr)
                    .unwrap()
                    .starts_with("This video requires a signed-in account")
            );
        }
    }

    // The misdiagnosis this module exists to prevent: a DRM warning must not mask the real error
    #[test]
    fn explain_prefers_fatal_error_over_drm_warning() {
        let stderr = format!("WARNING: Some formats are DRM protected\n{}", NO_FORMAT);
        assert!(
            explain(&stderr)
                .unwrap()
                .starts_with("The requested quality is not available")
        );
    }

    #[test]
    fn explain_takes_the_last_error() {
        let stderr = format!("{}\n{}", DRM, NO_FORMAT);
        assert!(
            explain(&stderr)
                .unwrap()
                .starts_with("The requested quality is not available")
        );
    }

    #[test]
    fn explain_ignores_markers_outside_error_lines() {
        assert!(explain("WARNING: downloading \"How DRM protected media works\"").is_none());
        assert!(explain("[download] Destination: Requested format is not available.mp4").is_none());
    }

    #[test]
    fn explain_none_for_unrecognized_and_empty() {
        assert!(explain("").is_none());
        assert!(explain("ERROR: unable to download video data: HTTP Error 500").is_none());
    }

    #[test]
    fn ffmpeg_missing_detects_merge_warning() {
        assert!(ffmpeg_missing(
            "WARNING: You have requested merging of multiple formats but ffmpeg is not installed. The formats won't be merged"
        ));
    }

    #[test]
    fn ffmpeg_missing_detects_audio_extraction_error() {
        assert!(ffmpeg_missing(
            "ERROR: Postprocessing: ffprobe and ffmpeg not found. Please install or provide the path using --ffmpeg-location"
        ));
    }

    #[test]
    fn ffmpeg_missing_false_on_normal_stderr() {
        assert!(!ffmpeg_missing(""));
        assert!(!ffmpeg_missing(
            "WARNING: [youtube] No supported JavaScript runtime could be found."
        ));
        // a video title is not evidence that ffmpeg is absent
        assert!(!ffmpeg_missing(
            "ERROR: unable to download \"why ffmpeg is not installed\""
        ));
    }
}
