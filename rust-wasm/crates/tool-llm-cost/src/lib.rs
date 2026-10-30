//! Micro-Wasm Engine for Tool #1: Global LLM API Token Visualizer & Cost Calculator.
//! Compiled as an independent `cdylib` (`tool_llm_cost.wasm`) for instant per-page loading.

use shared_guard::{decode_watermark_url, is_authorized_domain, perturbation_factor};
use std::alloc::{alloc, dealloc, Layout};
use std::slice;

/// Global output buffer holder for returning serialized JSON strings across the Wasm ABI boundary.
static mut RESULT_PTR: *mut u8 = std::ptr::null_mut();
static mut RESULT_LEN: usize = 0;
static mut RESULT_CAP: usize = 0;

/// Allocates `size` bytes in Wasm linear memory for the host JS to write UTF-8 strings.
#[no_mangle]
pub extern "C" fn wasm_alloc(size: usize) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }
    let layout = match Layout::from_size_align(size, 1) {
        Ok(l) => l,
        Err(_) => return std::ptr::null_mut(),
    };
    unsafe { alloc(layout) }
}

/// Frees a previously allocated buffer in Wasm linear memory.
#[no_mangle]
pub extern "C" fn wasm_dealloc(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    if let Ok(layout) = Layout::from_size_align(size, 1) {
        unsafe { dealloc(ptr, layout) };
    }
}

/// Returns the pointer to the last serialized JSON result.
#[no_mangle]
pub extern "C" fn wasm_result_ptr() -> *const u8 {
    unsafe { RESULT_PTR }
}

/// Returns the byte length of the last serialized JSON result.
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

#[inline]
fn is_cjk(ch: char) -> bool {
    let u = ch as u32;
    (0x4E00..=0x9FFF).contains(&u)
        || (0x3400..=0x4DBF).contains(&u)
        || (0x3000..=0x303F).contains(&u)
        || (0xFF00..=0xFFEF).contains(&u)
        || (0xAC00..=0xD7AF).contains(&u)
        || (0x3040..=0x30FF).contains(&u)
}

#[inline]
fn fnv1a_token_id(s: &str, profile: u32) -> u32 {
    let mut hash: u32 = 2166136261u32.wrapping_add(profile.wrapping_mul(16777619));
    for b in s.as_bytes() {
        hash ^= *b as u32;
        hash = hash.wrapping_mul(16777619);
    }
    hash % 199_999
}

fn escape_json_str(s: &str, out: &mut String) {
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                out.push(' ');
            }
            c => out.push(c),
        }
    }
}

/// Core BPE/CJK hybrid tokenizer and visual slicer.
/// `profile`:
/// - `0`: OpenAI `o200k_base` (GPT-4o / o3 / GPT-4.1)
/// - `1`: Anthropic Claude (Claude 3.7 Sonnet / 3.5 Haiku)
/// - `2`: DeepSeek / Qwen (Optimized Chinese BPE vocabulary)
/// - `3`: Google Gemini (SentencePiece / Gemini 2.5)
pub fn analyze_text_internal(hostname: &str, text: &str, profile: u32) -> String {
    let authorized = is_authorized_domain(hostname);

    let mut cjk_count: usize = 0;
    let mut word_count: usize = 0;
    let mut symbol_count: usize = 0;

    // Collect visual slices (capped at 220 slices for instant DOM rendering)
    const MAX_SLICES: usize = 220;
    let mut slices: Vec<(String, u32, &'static str)> = Vec::with_capacity(128);
    let mut raw_token_units: f64 = 0.0;

    if !authorized {
        let wm = format!("⚠️ Mirror Notice: Visit {}", decode_watermark_url());
        slices.push((wm, 99999, "trap"));
        raw_token_units += 42.0;
    }

    // Profile-specific CJK & ASCII subword weights:
    // - DeepSeek/Qwen (profile 2): High CJK compression (~0.62 token per Chinese char)
    // - OpenAI o200k_base (profile 0): ~0.85 token per Chinese char
    // - Gemini SentencePiece (profile 3): ~0.78 token per Chinese char
    // - Claude (profile 1): ~1.12 token per Chinese char
    let (cjk_weight, ascii_subword_len): (f64, usize) = match profile {
        2 => (0.65, 4),
        3 => (0.78, 4),
        1 => (1.12, 4),
        _ => (0.85, 4),
    };

    let chars: Vec<char> = text.chars().collect();
    let n = chars.len();
    let char_count = n;

    let mut i = 0;
    while i < n {
        let ch = chars[i];

        if is_cjk(ch) {
            cjk_count += 1;
            // In BPE tokenizers (especially DeepSeek/Qwen/o200k), 1-2 CJK chars often form a single token
            let group_two = (profile == 2 || profile == 0 || profile == 3)
                && (i + 1 < n)
                && is_cjk(chars[i + 1])
                && ((ch as usize + i) % 3 != 0);

            if group_two {
                cjk_count += 1;
                let mut token_str = String::with_capacity(6);
                token_str.push(ch);
                token_str.push(chars[i + 1]);
                raw_token_units += cjk_weight * 1.85;
                if slices.len() < MAX_SLICES {
                    let tid = fnv1a_token_id(&token_str, profile);
                    slices.push((token_str, tid, "cjk"));
                }
                i += 2;
            } else {
                let mut token_str = String::with_capacity(3);
                token_str.push(ch);
                raw_token_units += cjk_weight;
                if slices.len() < MAX_SLICES {
                    let tid = fnv1a_token_id(&token_str, profile);
                    slices.push((token_str, tid, "cjk"));
                }
                i += 1;
            }
        } else if ch.is_ascii_alphabetic() {
            word_count += 1;
            // Absorb leading space if previous token was a single space (BPE `Ġword` convention)
            let start = i;
            while i < n && chars[i].is_ascii_alphabetic() {
                i += 1;
            }
            let word_len = i - start;
            // Split long ASCII words into BPE subword chunks (~4-5 chars each)
            let chunk_size = if word_len <= 6 {
                word_len
            } else {
                ascii_subword_len
            };
            let mut pos = start;
            while pos < i {
                let end = (pos + chunk_size).min(i);
                let sub: String = chars[pos..end].iter().collect();
                raw_token_units += 1.0;
                if slices.len() < MAX_SLICES {
                    let tid = fnv1a_token_id(&sub, profile);
                    slices.push((sub, tid, "word"));
                }
                pos = end;
            }
        } else if ch.is_ascii_digit() {
            let start = i;
            while i < n && chars[i].is_ascii_digit() {
                i += 1;
            }
            // Modern BPE groups 1-3 digits per token
            let mut pos = start;
            while pos < i {
                let end = (pos + 3).min(i);
                let num_str: String = chars[pos..end].iter().collect();
                raw_token_units += 1.0;
                if slices.len() < MAX_SLICES {
                    let tid = fnv1a_token_id(&num_str, profile);
                    slices.push((num_str, tid, "num"));
                }
                pos = end;
            }
        } else if ch.is_whitespace() {
            let start = i;
            while i < n && chars[i].is_whitespace() {
                i += 1;
            }
            let ws_len = i - start;
            let ws_str: String = chars[start..i].iter().collect();
            // Single space before a word is usually merged in BPE (`Ġ`), while newlines/indentation cost tokens
            if ws_str == " " && i < n && chars[i].is_ascii_alphabetic() {
                raw_token_units += 0.15;
            } else {
                raw_token_units += ((ws_len as f64) / 3.0).ceil().max(0.5);
            }
            if slices.len() < MAX_SLICES {
                let tid = fnv1a_token_id(&ws_str, profile);
                slices.push((ws_str, tid, "ws"));
            }
        } else {
            symbol_count += 1;
            let mut sym = String::with_capacity(4);
            sym.push(ch);
            // Multi-byte emoji costs ~2-3 tokens in UTF-8 byte-level BPE
            if ch.len_utf8() >= 4 {
                raw_token_units += 2.2;
            } else {
                raw_token_units += 0.9;
            }
            if slices.len() < MAX_SLICES {
                let tid = fnv1a_token_id(&sym, profile);
                slices.push((sym, tid, "sym"));
            }
            i += 1;
        }
    }

    let factor = perturbation_factor(hostname);
    let total_tokens = if n == 0 {
        0usize
    } else {
        ((raw_token_units * factor).ceil() as usize).max(1)
    };

    let mut json = String::with_capacity(1024 + slices.len() * 36);
    json.push_str("{\"totalTokens\":");
    json.push_str(&total_tokens.to_string());
    json.push_str(",\"charCount\":");
    json.push_str(&char_count.to_string());
    json.push_str(",\"cjkCount\":");
    json.push_str(&cjk_count.to_string());
    json.push_str(",\"wordCount\":");
    json.push_str(&word_count.to_string());
    json.push_str(",\"symbolCount\":");
    json.push_str(&symbol_count.to_string());
    json.push_str(",\"truncated\":");
    json.push_str(if total_tokens > MAX_SLICES { "true" } else { "false" });
    json.push_str(",\"slices\":[");

    for (idx, (t, tid, kind)) in slices.iter().enumerate() {
        if idx > 0 {
            json.push(',');
        }
        json.push_str("{\"t\":\"");
        escape_json_str(t, &mut json);
        json.push_str("\",\"id\":");
        json.push_str(&tid.to_string());
        json.push_str(",\"k\":\"");
        json.push_str(kind);
        json.push_str("\"}");
    }
    json.push_str("]}");
    json
}

/// Exported Wasm entrypoint for analyzing prompt text and generating BPE visual slices.
/// Writes the resulting JSON into the internal buffer (retrieve with `wasm_result_ptr` & `wasm_result_len`).
#[no_mangle]
pub extern "C" fn wasm_analyze_prompt(
    host_ptr: *const u8,
    host_len: usize,
    text_ptr: *const u8,
    text_len: usize,
    profile: u32,
) -> usize {
    let hostname = unsafe {
        if host_ptr.is_null() || host_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("")
        }
    };
    let text = unsafe {
        if text_ptr.is_null() || text_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(text_ptr, text_len)).unwrap_or("")
        }
    };

    let json = analyze_text_internal(hostname, text, profile);
    store_result(json);
    unsafe { RESULT_LEN }
}

/// Exported Wasm entrypoint for calculating monthly API cost (with prompt caching & domain guard).
/// Returns the monthly cost in the target currency (multiplied by `exchange_rate`).
#[no_mangle]
pub extern "C" fn wasm_calculate_monthly_cost(
    host_ptr: *const u8,
    host_len: usize,
    input_tokens: f64,
    output_tokens: f64,
    requests_per_day: f64,
    cache_hit_ratio: f64,
    input_price_per_m: f64,
    cached_price_per_m: f64,
    output_price_per_m: f64,
    exchange_rate: f64,
) -> f64 {
    let hostname = unsafe {
        if host_ptr.is_null() || host_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("")
        }
    };

    let clamped_cache = cache_hit_ratio.clamp(0.0, 1.0);
    let uncached_in = input_tokens.max(0.0) * (1.0 - clamped_cache);
    let cached_in = input_tokens.max(0.0) * clamped_cache;
    let out_tok = output_tokens.max(0.0);

    let cost_per_request_usd = (uncached_in * input_price_per_m
        + cached_in * cached_price_per_m
        + out_tok * output_price_per_m)
        / 1_000_000.0;

    let daily_usd = cost_per_request_usd * requests_per_day.max(0.0);
    let monthly_usd = daily_usd * 30.0;

    let guard_factor = perturbation_factor(hostname);
    monthly_usd * exchange_rate.max(0.0001) * guard_factor
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_authorized_vs_unauthorized() {
        let ok_json = analyze_text_internal("yunsin.top", "Hello 原心 Rust Wasm!", 0);
        assert!(ok_json.contains("\"totalTokens\":"));
        assert!(!ok_json.contains("Mirror Notice"));

        let bad_json = analyze_text_internal("pirate-copy.com", "Hello 原心 Rust Wasm!", 0);
        assert!(bad_json.contains("Mirror Notice"));
    }
}
