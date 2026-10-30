//! Micro-Wasm Engine for Tool #3: App DeepLink, iOS Universal Links (AASA) & Android App Links Compiler.

use shared_guard::{decode_watermark_url, is_authorized_domain};
use std::alloc::{alloc, dealloc, Layout};
use std::slice;

static mut RESULT_PTR: *mut u8 = std::ptr::null_mut();
static mut RESULT_LEN: usize = 0;
static mut RESULT_CAP: usize = 0;

#[no_mangle]
pub extern "C" fn wasm_alloc(size: usize) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }
    match Layout::from_size_align(size, 1) {
        Ok(l) => unsafe { alloc(l) },
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "C" fn wasm_dealloc(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    if let Ok(layout) = Layout::from_size_align(size, 1) {
        unsafe { dealloc(ptr, layout) };
    }
}

#[no_mangle]
pub extern "C" fn wasm_result_ptr() -> *const u8 {
    unsafe { RESULT_PTR }
}

#[no_mangle]
pub extern "C" fn wasm_result_len() -> usize {
    unsafe { RESULT_LEN }
}

fn store_result(json: String) {
    unsafe {
        if !RESULT_PTR.is_null() && RESULT_CAP > 0 {
            if let Ok(layout) = Layout::from_size_align(RESULT_CAP, 1) {
                dealloc(RESULT_PTR, layout);
            }
        }
        let mut bytes = json.into_bytes();
        RESULT_LEN = bytes.len();
        RESULT_CAP = bytes.capacity();
        RESULT_PTR = bytes.as_mut_ptr();
        std::mem::forget(bytes);
    }
}

fn escape_json(s: &str, out: &mut String) {
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c => out.push(c),
        }
    }
}

/// Validates a 10-character Apple Team ID (e.g. `9JA89QQLNQ`)
fn validate_apple_team_id(team_id: &str) -> bool {
    let t = team_id.trim();
    t.len() == 10 && t.chars().all(|c| c.is_ascii_alphanumeric())
}

/// Validates an Android SHA-256 cert fingerprint (`32` colon-separated hex pairs, 95 chars total)
fn validate_sha256_fingerprint(fp: &str) -> bool {
    let t = fp.trim();
    if t.len() != 95 {
        return false;
    }
    for (idx, part) in t.split(':').enumerate() {
        if idx >= 32 || part.len() != 2 || !part.chars().all(|c| c.is_ascii_hexdigit()) {
            return false;
        }
    }
    t.split(':').count() == 32
}

/// Compiles AASA (`apple-app-site-association`), `assetlinks.json`, validation diagnostics,
/// and the cross-platform H5 DeepLink launcher script.
pub fn compile_deeplink_configs_internal(
    hostname: &str,
    team_id: &str,
    bundle_id: &str,
    paths_raw: &str,
    android_pkg: &str,
    sha256_fp: &str,
    scheme_url: &str,
    universal_url: &str,
    ios_store_url: &str,
    android_store_url: &str,
) -> String {
    let authorized = is_authorized_domain(hostname);

    let clean_team = if authorized {
        team_id.trim()
    } else {
        "MIRROR0000"
    };
    let clean_bundle = bundle_id.trim();
    let app_id = format!("{}.{}", clean_team, clean_bundle);

    // Parse path patterns separated by comma or newline
    let mut paths: Vec<String> = paths_raw
        .split(|c| c == ',' || c == '\n' || c == ';')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if paths.is_empty() {
        paths.push("/app/*".to_string());
    }

    // Diagnostics check
    let mut warnings: Vec<String> = Vec::new();
    if !validate_apple_team_id(team_id) {
        warnings.push("Apple Team ID 应为 10 位大写字母与数字组合（如 9JA89QQLNQ）".to_string());
    }
    if !clean_bundle.contains('.') {
        warnings.push("iOS Bundle ID 应采用反向域名格式（如 com.example.app）".to_string());
    }
    if !validate_sha256_fingerprint(sha256_fp) {
        warnings.push("Android SHA-256 证书指纹应为 32 组冒号分隔的十六进制字符（共 95 字符）".to_string());
    }
    for p in &paths {
        let check_p = p.strip_prefix("NOT ").unwrap_or(p).trim();
        if !check_p.starts_with('/') && check_p != "*" {
            warnings.push(format!("路径规则 `{}` 建议以 `/` 开头", p));
        }
    }
    if !authorized {
        warnings.push(format!("正版工具地址: {}", decode_watermark_url()));
    }

    // 1. Build iOS `apple-app-site-association` (supporting both iOS 13+ components and legacy paths)
    let mut comp_items = String::new();
    let mut legacy_paths = String::new();
    for (idx, p) in paths.iter().enumerate() {
        if idx > 0 {
            comp_items.push_str(",\n            ");
            legacy_paths.push_str(", ");
        }
        if let Some(excluded) = p.strip_prefix("NOT ") {
            comp_items.push_str(&format!(
                "{{ \"/\": \"{}\", \"exclude\": true }}",
                excluded.trim()
            ));
        } else {
            comp_items.push_str(&format!("{{ \"/\": \"{}\" }}", p));
        }
        legacy_paths.push_str(&format!("\"{}\"", p));
    }

    let aasa_json = format!(
        "{{\n  \"applinks\": {{\n    \"apps\": [],\n    \"details\": [\n      {{\n        \"appIDs\": [\"{app_id}\"],\n        \"components\": [\n            {comp_items}\n        ],\n        \"paths\": [{legacy_paths}]\n      }}\n    ]\n  }},\n  \"webcredentials\": {{\n    \"apps\": [\"{app_id}\"]\n  }}\n}}"
    );

    // 2. Build Android `.well-known/assetlinks.json`
    let assetlinks_json = format!(
        "[\n  {{\n    \"relation\": [\n      \"delegate_permission/common.handle_all_urls\"\n    ],\n    \"target\": {{\n      \"namespace\": \"android_app\",\n      \"package_name\": \"{}\",\n      \"sha256_cert_fingerprints\": [\n        \"{}\"\n      ]\n    }}\n  }}\n]",
        android_pkg.trim(),
        sha256_fp.trim().to_uppercase()
    );

    // 3. Build Production H5 Smart DeepLink Wake-up Snippet
    let h5_snippet = format!(
        "// Generated by Yunsin DeepLink Engine (Rust Wasm)\nfunction openAppWithFallback(options = {{}}) {{\n  const schemeUrl = options.schemeUrl || '{}';\n  const universalUrl = options.universalUrl || '{}';\n  const iosStore = options.iosStore || '{}';\n  const androidStore = options.androidStore || '{}';\n  const ua = navigator.userAgent.toLowerCase();\n  const isWechat = /micromessenger/.test(ua);\n  const isIOS = /iphone|ipad|ipod/.test(ua);\n\n  if (isWechat) {{\n    alert('请点击右上角 ··· 选择「在默认浏览器中打开」以唤醒 App');\n    return;\n  }}\n\n  let hasHidden = false;\n  const onVisibilityChange = () => {{\n    if (document.hidden || document.webkitHidden) hasHidden = true;\n  }};\n  document.addEventListener('visibilitychange', onVisibilityChange);\n\n  // iOS 9+ 优先使用 Universal Links，Android 或降级使用 URL Scheme\n  if (isIOS && universalUrl.startsWith('https://')) {{\n    window.location.href = universalUrl;\n  }} else {{\n    window.location.href = schemeUrl;\n  }}\n\n  setTimeout(() => {{\n    document.removeEventListener('visibilitychange', onVisibilityChange);\n    if (!hasHidden) {{\n      window.location.href = isIOS ? iosStore : androidStore;\n    }}\n  }}, 2200);\n}}",
        scheme_url.trim(),
        universal_url.trim(),
        ios_store_url.trim(),
        android_store_url.trim()
    );

    // Serialize output JSON
    let mut out = String::with_capacity(2048);
    out.push_str("{\"aasaJson\":\"");
    escape_json(&aasa_json, &mut out);
    out.push_str("\",\"assetlinksJson\":\"");
    escape_json(&assetlinks_json, &mut out);
    out.push_str("\",\"h5Snippet\":\"");
    escape_json(&h5_snippet, &mut out);
    out.push_str("\",\"valid\":");
    out.push_str(if warnings.is_empty() { "true" } else { "false" });
    out.push_str(",\"warnings\":[");
    for (i, w) in warnings.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        out.push('"');
        escape_json(w, &mut out);
        out.push('"');
    }
    out.push_str("]}");
    out
}

#[no_mangle]
pub extern "C" fn wasm_compile_deeplink(
    host_ptr: *const u8,
    host_len: usize,
    payload_ptr: *const u8,
    payload_len: usize,
) -> usize {
    let hostname = unsafe {
        if host_ptr.is_null() || host_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("")
        }
    };
    let payload = unsafe {
        if payload_ptr.is_null() || payload_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(payload_ptr, payload_len)).unwrap_or("")
        }
    };

    // Payload is tab-separated (`\t`) fields:
    // 0: teamId, 1: bundleId, 2: paths, 3: androidPkg, 4: sha256, 5: schemeUrl, 6: universalUrl, 7: iosStore, 8: androidStore
    let parts: Vec<&str> = payload.split('\t').collect();
    let get_part = |idx: usize| -> &str { parts.get(idx).copied().unwrap_or("") };

    let json = compile_deeplink_configs_internal(
        hostname,
        get_part(0),
        get_part(1),
        get_part(2),
        get_part(3),
        get_part(4),
        get_part(5),
        get_part(6),
        get_part(7),
        get_part(8),
    );
    store_result(json);
    unsafe { RESULT_LEN }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_deeplink_valid() {
        let fp = "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5";
        let res = compile_deeplink_configs_internal(
            "yunsin.top",
            "9JA89QQLNQ",
            "com.yunsin.app",
            "/app/*, NOT /app/admin/*",
            "com.yunsin.app",
            fp,
            "yunsin://home",
            "https://yunsin.top/app/home",
            "https://apps.apple.com/app/id123456",
            "https://yunsin.top/download.apk",
        );
        assert!(res.contains("\"valid\":true"));
        assert!(res.contains("9JA89QQLNQ.com.yunsin.app"));
    }
}
