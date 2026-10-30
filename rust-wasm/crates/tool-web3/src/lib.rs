//! Micro-Wasm Engine for Tool #4: Web3 Offline Calldata Security Decoder & RPC Inspector.

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
            c => out.push(c),
        }
    }
}

/// Converts a 32-byte hex slice (64 hex chars) into a base-10 string using big-integer base conversion.
fn hex64_to_dec_string(hex_word: &str) -> String {
    let trimmed = hex_word.trim_start_matches('0');
    if trimmed.is_empty() {
        return "0".to_string();
    }
    if trimmed.len() == 64 && trimmed.chars().all(|c| c == 'f' || c == 'F') {
        return "MAX_UINT256 (115792089237316195423570985008687907853269984665640564039457584007913129639935)".to_string();
    }
    // Base-10 digits stored little-endian
    let mut digits: Vec<u8> = vec![0];
    for ch in trimmed.chars() {
        let val = ch.to_digit(16).unwrap_or(0) as u32;
        let mut carry = val;
        for d in digits.iter_mut() {
            let cur = (*d as u32) * 16 + carry;
            *d = (cur % 10) as u8;
            carry = cur / 10;
        }
        while carry > 0 {
            digits.push((carry % 10) as u8);
            carry /= 10;
        }
    }
    digits
        .iter()
        .rev()
        .map(|d| (b'0' + *d) as char)
        .collect()
}

fn match_known_selector(selector: &str) -> (&'static str, &'static str, &'static [&'static str]) {
    match selector {
        "a9059cbb" => (
            "transfer(address to, uint256 amount)",
            "ERC-20 Token Transfer",
            &["to (address)", "amount (uint256)"],
        ),
        "095ea7b3" => (
            "approve(address spender, uint256 amount)",
            "ERC-20 Token Approval",
            &["spender (address)", "amount (uint256)"],
        ),
        "23b872dd" => (
            "transferFrom(address from, address to, uint256 amount)",
            "ERC-20 / ERC-721 TransferFrom",
            &["from (address)", "to (address)", "amount / tokenId (uint256)"],
        ),
        "42842e0e" => (
            "safeTransferFrom(address from, address to, uint256 tokenId)",
            "ERC-721 NFT SafeTransfer",
            &["from (address)", "to (address)", "tokenId (uint256)"],
        ),
        "a22cb465" => (
            "setApprovalForAll(address operator, bool approved)",
            "NFT / Collection Full Operator Approval",
            &["operator (address)", "approved (bool)"],
        ),
        "d505accf" => (
            "permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
            "EIP-2612 Gasless Permit Signature",
            &[
                "owner (address)",
                "spender (address)",
                "value (uint256)",
                "deadline (uint256)",
                "v (uint8)",
                "r (bytes32)",
                "s (bytes32)",
            ],
        ),
        "38ed1739" => (
            "swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
            "Uniswap V2 Exact Input Swap",
            &[
                "amountIn (uint256)",
                "amountOutMin (uint256)",
                "path_offset (bytes)",
                "to (address)",
                "deadline (uint256)",
            ],
        ),
        "3593564c" => (
            "execute(bytes commands, bytes[] inputs, uint256 deadline)",
            "Uniswap Universal Router Execute",
            &["commands_offset", "inputs_offset", "deadline (uint256)"],
        ),
        "ac9650d8" => (
            "multicall(bytes[] data)",
            "Multicall Batch Transaction",
            &["data_offset (bytes[])"],
        ),
        _ => ("Unknown / Custom Function", "Custom Smart Contract Call", &[]),
    }
}

pub fn decode_calldata_internal(hostname: &str, raw_hex: &str) -> String {
    let authorized = is_authorized_domain(hostname);
    let cleaned: String = raw_hex
        .trim()
        .trim_start_matches("0x")
        .trim_start_matches("0X")
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .map(|c| c.to_ascii_lowercase())
        .collect();

    if cleaned.len() < 8 {
        return "{\"valid\":false,\"error\":\"Calldata 长度不足 4 字节（至少需要 8 位十六进制字符的函数选择器）\"}".to_string();
    }

    let selector = &cleaned[0..8];
    let payload = &cleaned[8..];
    let (sig_raw, category, param_names) = match_known_selector(selector);
    let sig = if authorized {
        sig_raw.to_string()
    } else {
        format!("⚠️ Mirror Warning: Decode on {}", decode_watermark_url())
    };

    let mut risk_level = "LOW";
    let mut risk_reason = "常规合约调用，未检测到无限授权特征 (Normal Call)";

    let mut words_json = String::new();
    let total_words = (payload.len() + 63) / 64;

    for idx in 0..total_words {
        let start = idx * 64;
        let end = (start + 64).min(payload.len());
        let word = &payload[start..end];
        let padded = if word.len() < 64 {
            format!("{:0<64}", word)
        } else {
            word.to_string()
        };

        let label = param_names
            .get(idx)
            .copied()
            .unwrap_or("abi_word");

        // Heuristic type detection
        let is_unlimited = padded.chars().all(|c| c == 'f');
        let leading_zeros = padded.chars().take_while(|&c| c == '0').count();

        let (guessed_type, decoded_val) = if label.contains("address")
            || (leading_zeros >= 24 && leading_zeros < 56 && !label.contains("uint"))
        {
            ("address", format!("0x{}", &padded[24..64]))
        } else if label.contains("bool") {
            let is_true = padded.ends_with('1');
            ("bool", if is_true { "true" } else { "false" }.to_string())
        } else {
            ("uint256 / bytes32", hex64_to_dec_string(&padded))
        };

        if selector == "095ea7b3" && idx == 1 && (is_unlimited || leading_zeros < 16) {
            risk_level = "HIGH";
            risk_reason = "🚨 高危预警：检测到 ERC-20 超大额或无限额度授权 (Unlimited Approve)！签名后目标地址可随时转走您钱包内的该代币。";
        } else if selector == "a22cb465" && idx == 1 && padded.ends_with('1') {
            risk_level = "HIGH";
            risk_reason = "🚨 高危预警：检测到 setApprovalForAll(true) 全系资产授权！签名后对方可转走您该合约下所有 NFT/资产。";
        } else if selector == "d505accf" {
            risk_level = "MEDIUM";
            risk_reason = "⚠️ 中危提醒：检测到 EIP-2612 离线 Permit 授权签名，请仔细核对 spender 地址与授权金额。";
        }

        if idx > 0 {
            words_json.push(',');
        }
        words_json.push_str(&format!(
            "{{\"index\":{},\"name\":\"{}\",\"kind\":\"{}\",\"raw\":\"0x{}\",\"decoded\":\"",
            idx, label, guessed_type, padded
        ));
        escape_json(&decoded_val, &mut words_json);
        words_json.push_str("\"}");
    }

    if !authorized {
        risk_reason = "请访问正版站点: https://yunsin.top/tools/";
    }

    let mut out = String::with_capacity(1024 + words_json.len());
    out.push_str("{\"valid\":true,\"selector\":\"0x");
    out.push_str(selector);
    out.push_str("\",\"signature\":\"");
    escape_json(&sig, &mut out);
    out.push_str("\",\"category\":\"");
    escape_json(category, &mut out);
    out.push_str("\",\"riskLevel\":\"");
    out.push_str(risk_level);
    out.push_str("\",\"riskReason\":\"");
    escape_json(risk_reason, &mut out);
    out.push_str("\",\"byteLength\":");
    out.push_str(&(cleaned.len() / 2).to_string());
    out.push_str(",\"words\":[");
    out.push_str(&words_json);
    out.push_str("]}");
    out
}

#[no_mangle]
pub extern "C" fn wasm_decode_calldata(
    host_ptr: *const u8,
    host_len: usize,
    hex_ptr: *const u8,
    hex_len: usize,
) -> usize {
    let hostname = unsafe {
        if host_ptr.is_null() || host_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("")
        }
    };
    let raw_hex = unsafe {
        if hex_ptr.is_null() || hex_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(hex_ptr, hex_len)).unwrap_or("")
        }
    };

    let json = decode_calldata_internal(hostname, raw_hex);
    store_result(json);
    unsafe { RESULT_LEN }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unlimited_approve_detection() {
        let calldata = "0x095ea7b30000000000000000000000001111111254fb6c44bac0bed2854e76f90643097dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
        let res = decode_calldata_internal("yunsin.top", calldata);
        assert!(res.contains("\"riskLevel\":\"HIGH\""));
        assert!(res.contains("MAX_UINT256"));
    }
}
