use std::net::{Ipv4Addr, Ipv6Addr};

use url::{Host, Url};

use crate::error::AppError;

pub fn validate_url(raw: &str) -> Result<(), AppError> {
    let url =
        Url::parse(raw).map_err(|_| AppError::Validation(format!("Invalid URL: {}", raw)))?;

    let scheme = url.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(AppError::Validation(format!(
            "URL must use http or https protocol, got '{}'",
            scheme
        )));
    }

    match url.host() {
        None => {
            return Err(AppError::Validation("URL has no host".to_string()));
        }
        Some(Host::Domain(d)) => {
            if d == "localhost" {
                return Err(AppError::Validation(
                    "Private/local URLs are not allowed".to_string(),
                ));
            }
        }
        Some(Host::Ipv4(v4)) => {
            if is_private_ipv4(&v4) {
                return Err(AppError::Validation(
                    "Private IP addresses are not allowed".to_string(),
                ));
            }
        }
        Some(Host::Ipv6(v6)) => {
            if is_private_ipv6(&v6) {
                return Err(AppError::Validation(
                    "Private IP addresses are not allowed".to_string(),
                ));
            }
        }
    }

    Ok(())
}

fn is_private_ipv4(v4: &Ipv4Addr) -> bool {
    let o = v4.octets();
    o[0] == 127
        || o[0] == 10
        || (o[0] == 172 && (16..=31).contains(&o[1]))
        || (o[0] == 192 && o[1] == 168)
        || (o[0] == 169 && o[1] == 254)
        || (o[0] == 0 && o[1] == 0 && o[2] == 0 && o[3] == 0)
}

fn is_private_ipv6(v6: &Ipv6Addr) -> bool {
    // IPv4-mapped IPv6 (::ffff:x.x.x.x) — SSRF bypass prevention
    if let Some(mapped_v4) = v6.to_ipv4_mapped() {
        return is_private_ipv4(&mapped_v4);
    }
    // ULA (fc00::/7): covers fc00:: and fd00:: prefixes
    let segs = v6.segments();
    if (segs[0] & 0xfe00) == 0xfc00 {
        return true;
    }
    v6.is_loopback() || v6.is_unspecified()
}

/// Allow yt-dlp format selection syntax: alphanumeric and +-./*[]!=<>~^,()@
/// Reject shell-dangerous chars: spaces, ;|&`$'"\  and control chars.
pub fn validate_format_id(format_id: &str) -> Result<(), AppError> {
    if format_id.is_empty() {
        return Err(AppError::Validation("Format ID cannot be empty".to_string()));
    }
    let valid = format_id
        .chars()
        .all(|c| c.is_alphanumeric() || "+-_./*[]!=<>~^,()@".contains(c));
    if !valid {
        return Err(AppError::Validation(format!(
            "Invalid format ID: {}",
            format_id
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::net::IpAddr;
    use super::*;

    fn is_private_ip(ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(v4) => is_private_ipv4(v4),
            IpAddr::V6(v6) => is_private_ipv6(v6),
        }
    }

    // --- validate_url ---

    #[test]
    fn valid_public_urls() {
        assert!(validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ").is_ok());
        assert!(validate_url("http://example.com/video").is_ok());
        assert!(validate_url("https://vimeo.com/123456").is_ok());
    }

    #[test]
    fn rejects_non_http_schemes() {
        assert!(validate_url("ftp://example.com").is_err());
        assert!(validate_url("file:///etc/passwd").is_err());
    }

    #[test]
    fn rejects_localhost() {
        assert!(validate_url("http://localhost/video").is_err());
        assert!(validate_url("http://localhost:8080/video").is_err());
    }

    #[test]
    fn rejects_private_ipv4() {
        assert!(validate_url("http://127.0.0.1/video").is_err());
        assert!(validate_url("http://10.0.0.1/video").is_err());
        assert!(validate_url("http://192.168.1.1/video").is_err());
        assert!(validate_url("http://172.16.0.1/video").is_err());
        assert!(validate_url("http://169.254.0.1/video").is_err());
    }

    #[test]
    fn rejects_ipv6_loopback() {
        assert!(validate_url("http://[::1]/video").is_err());
    }

    #[test]
    fn rejects_ipv6_ula() {
        assert!(validate_url("http://[fc00::1]/video").is_err());
        assert!(validate_url("http://[fd12:3456::1]/video").is_err());
    }

    #[test]
    fn rejects_ipv4_mapped_ipv6_ssrf() {
        assert!(validate_url("http://[::ffff:127.0.0.1]/video").is_err());
        assert!(validate_url("http://[::ffff:192.168.1.1]/video").is_err());
        assert!(validate_url("http://[::ffff:10.0.0.1]/video").is_err());
    }

    #[test]
    fn rejects_ipv6_unspecified() {
        assert!(validate_url("http://[::]/video").is_err());
    }

    // --- is_private_ip unit tests ---

    #[test]
    fn ipv4_mapped_ipv6_detected_as_private() {
        let addr: IpAddr = "::ffff:127.0.0.1".parse().unwrap();
        assert!(is_private_ip(&addr));

        let addr: IpAddr = "::ffff:192.168.1.1".parse().unwrap();
        assert!(is_private_ip(&addr));
    }

    #[test]
    fn public_ipv6_allowed() {
        let addr: IpAddr = "2001:db8::1".parse().unwrap();
        assert!(!is_private_ip(&addr));
    }

    // --- validate_format_id ---

    #[test]
    fn valid_format_ids() {
        assert!(validate_format_id("bestvideo+bestaudio").is_ok());
        assert!(validate_format_id("137+140").is_ok());
        assert!(validate_format_id("bestvideo[height<=1080]").is_ok());
        assert!(validate_format_id("best").is_ok());
        assert!(validate_format_id("worst[ext=mp4]").is_ok());
    }

    #[test]
    fn rejects_empty_format_id() {
        assert!(validate_format_id("").is_err());
    }

    #[test]
    fn rejects_shell_injection_chars() {
        assert!(validate_format_id("format;rm -rf /").is_err());
        assert!(validate_format_id("format|cat /etc/passwd").is_err());
        assert!(validate_format_id("format`whoami`").is_err());
        assert!(validate_format_id("format$HOME").is_err());
    }
}
