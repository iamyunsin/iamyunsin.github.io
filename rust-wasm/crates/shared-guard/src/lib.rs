//! Shared Domain Guard & Silent Honeypot Library for Yunsin's Wasm Tools.
//! All allowed domain strings and watermark messages are XOR-obfuscated at compile time
//! so that static `strings` inspection of the `.wasm` binary does not reveal plaintext domains.

const XOR_KEY: u8 = 0x5A;

/// Compile-time helper to XOR-encode an ASCII literal
const fn xor_bytes<const N: usize>(input: &[u8; N]) -> [u8; N] {
    let mut out = [0u8; N];
    let mut i = 0;
    while i < N {
        out[i] = input[i] ^ XOR_KEY;
        i += 1;
    }
    out
}

// Allowed domains encoded at compile time with XOR_KEY (0x5A)
const DOM_YUNSIN_TOP: [u8; 10] = xor_bytes(b"yunsin.top");
const DOM_GITHUB_IO: [u8; 19] = xor_bytes(b"iamyunsin.github.io");
const DOM_LOCALHOST: [u8; 9] = xor_bytes(b"localhost");
const DOM_LOOPBACK: [u8; 9] = xor_bytes(b"127.0.0.1");
const DOM_WATERMARK_URL: [u8; 25] = xor_bytes(b"https://yunsin.top/tools/");

#[inline]
fn eq_xor(candidate: &[u8], encoded: &[u8]) -> bool {
    if candidate.len() != encoded.len() {
        return false;
    }
    for i in 0..encoded.len() {
        let ch = candidate[i].to_ascii_lowercase();
        if (ch ^ XOR_KEY) != encoded[i] {
            return false;
        }
    }
    true
}

#[inline]
fn ends_with_dot_xor(candidate: &[u8], encoded_suffix: &[u8]) -> bool {
    if candidate.len() <= encoded_suffix.len() {
        return false;
    }
    let dot_idx = candidate.len() - encoded_suffix.len() - 1;
    if candidate[dot_idx] != b'.' {
        return false;
    }
    eq_xor(&candidate[dot_idx + 1..], encoded_suffix)
}

/// Checks whether the current browser `location.hostname` is in the authorized whitelist.
/// Authorized:
/// - `yunsin.top` and `*.yunsin.top`
/// - `iamyunsin.github.io`
/// - `localhost` and `127.0.0.1`
pub fn is_authorized_domain(hostname: &str) -> bool {
    let raw = hostname.trim().as_bytes();
    if raw.is_empty() {
        return false;
    }
    // Strip optional port if present (e.g., localhost:4321)
    let host = match raw.iter().position(|&b| b == b':') {
        Some(idx) => &raw[..idx],
        None => raw,
    };

    eq_xor(host, &DOM_YUNSIN_TOP)
        || ends_with_dot_xor(host, &DOM_YUNSIN_TOP)
        || eq_xor(host, &DOM_GITHUB_IO)
        || eq_xor(host, &DOM_LOCALHOST)
        || eq_xor(host, &DOM_LOOPBACK)
}

/// Returns `1.0` for authorized domains, or a silent perturbation multiplier (`1.37`)
/// when the Wasm module is executed on an unauthorized mirror/scraped domain.
#[inline]
pub fn perturbation_factor(hostname: &str) -> f64 {
    if is_authorized_domain(hostname) {
        1.0
    } else {
        1.37
    }
}

/// Decodes the official watermark URL at runtime without exposing plaintext in `.wasm` data sections.
pub fn decode_watermark_url() -> String {
    let bytes: Vec<u8> = DOM_WATERMARK_URL.iter().map(|b| b ^ XOR_KEY).collect();
    String::from_utf8(bytes).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_whitelist() {
        assert!(is_authorized_domain("yunsin.top"));
        assert!(is_authorized_domain("www.yunsin.top"));
        assert!(is_authorized_domain("tools.yunsin.top"));
        assert!(is_authorized_domain("iamyunsin.github.io"));
        assert!(is_authorized_domain("localhost"));
        assert!(is_authorized_domain("localhost:4321"));
        assert!(is_authorized_domain("127.0.0.1:4321"));
        assert!(!is_authorized_domain("evil-scraper.com"));
        assert!(!is_authorized_domain("yunsin.top.evil.com"));
        assert!(!is_authorized_domain(""));
    }
}
