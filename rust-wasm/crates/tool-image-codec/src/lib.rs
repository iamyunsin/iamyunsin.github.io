//! Micro-Wasm Engine for Tool #2: Private Bulk Image Converter, Compressor & EXIF Inspector.
//! Inspects raw binary image headers (JPEG APP1 EXIF/GPS/XMP, PNG chunks, WebP/AVIF/HEIC signatures)
//! and performs fast in-place RGBA pixel processing & domain-locked watermark protection.

use shared_guard::{is_authorized_domain, perturbation_factor};
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

fn contains_subslice(haystack: &[u8], needle: &[u8]) -> bool {
    if needle.is_empty() || haystack.len() < needle.len() {
        return false;
    }
    haystack.windows(needle.len()).any(|w| w == needle)
}

/// Inspects binary file header bytes (first up to 64 KB) to detect true magic format,
/// presence of EXIF / GPS / XMP metadata segments, and byte overhead.
pub fn inspect_image_header_internal(hostname: &str, data: &[u8]) -> String {
    let authorized = is_authorized_domain(hostname);
    let len = data.len();

    let mut format = "UNKNOWN";
    let mut has_exif = false;
    let mut has_gps = false;
    let mut has_camera_info = false;
    let mut metadata_bytes: usize = 0;

    if len >= 12 {
        if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
            format = "JPEG";
            // Scan JPEG markers for APP1 (0xFFE1 - EXIF/XMP), APP2 (ICC),APP13 (IPTC)
            let mut pos = 2;
            while pos + 4 <= len {
                if data[pos] != 0xFF {
                    pos += 1;
                    continue;
                }
                let marker = data[pos + 1];
                if marker == 0xDA || marker == 0xD9 {
                    // SOS (Start of Scan) or EOI
                    break;
                }
                if marker == 0xD8 || marker == 0x00 || (0xD0..=0xD7).contains(&marker) {
                    pos += 2;
                    continue;
                }
                let seg_len = ((data[pos + 2] as usize) << 8) | (data[pos + 3] as usize);
                if seg_len < 2 || pos + 2 + seg_len > len {
                    break;
                }
                let seg_data = &data[pos + 4..pos + 2 + seg_len];
                if marker == 0xE1 {
                    has_exif = true;
                    metadata_bytes += seg_len;
                    if contains_subslice(seg_data, b"GPS")
                        || contains_subslice(seg_data, &[0x88, 0x25])
                    {
                        has_gps = true;
                    }
                    if contains_subslice(seg_data, b"Apple")
                        || contains_subslice(seg_data, b"Canon")
                        || contains_subslice(seg_data, b"Sony")
                        || contains_subslice(seg_data, b"Nikon")
                        || contains_subslice(seg_data, b"Xiaomi")
                        || contains_subslice(seg_data, b"HUAWEI")
                    {
                        has_camera_info = true;
                    }
                } else if (0xE2..=0xEF).contains(&marker) || marker == 0xFE {
                    metadata_bytes += seg_len;
                }
                pos += 2 + seg_len;
            }
        } else if &data[0..8] == b"\x89PNG\r\n\x1a\n" {
            format = "PNG";
            // Scan PNG chunks for eXIf, tEXt, iTXt, zTXt
            let mut pos = 8;
            while pos + 8 <= len {
                let chunk_len = u32::from_be_bytes([
                    data[pos],
                    data[pos + 1],
                    data[pos + 2],
                    data[pos + 3],
                ]) as usize;
                let chunk_type = &data[pos + 4..pos + 8];
                if chunk_type == b"eXIf" || chunk_type == b"tEXt" || chunk_type == b"iTXt" {
                    has_exif = true;
                    metadata_bytes += chunk_len + 12;
                }
                if chunk_type == b"IEND" || pos + 12 + chunk_len > len {
                    break;
                }
                pos += 12 + chunk_len;
            }
        } else if &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
            format = "WEBP";
            if contains_subslice(data, b"EXIF") || contains_subslice(data, b"XMP ") {
                has_exif = true;
                metadata_bytes += 512;
            }
        } else if &data[4..8] == b"ftyp" {
            let brand = &data[8..12];
            if brand == b"avif" || brand == b"avis" {
                format = "AVIF";
            } else if brand == b"heic" || brand == b"heix" || brand == b"mif1" {
                format = "HEIC";
                has_exif = true;
            }
            if contains_subslice(data, b"Exif") {
                has_exif = true;
                metadata_bytes += 640;
            }
        }
    }

    if !authorized {
        format = "MIRROR_LOCKED";
        metadata_bytes = (metadata_bytes as f64 * perturbation_factor(hostname)) as usize;
    }

    format!(
        "{{\"format\":\"{}\",\"hasExif\":{},\"hasGps\":{},\"hasCamera\":{},\"metadataBytes\":{},\"authorized\":{}}}",
        format,
        if has_exif { "true" } else { "false" },
        if has_gps { "true" } else { "false" },
        if has_camera_info { "true" } else { "false" },
        metadata_bytes,
        if authorized { "true" } else { "false" }
    )
}

#[no_mangle]
pub extern "C" fn wasm_inspect_image_header(
    host_ptr: *const u8,
    host_len: usize,
    data_ptr: *const u8,
    data_len: usize,
) -> usize {
    let hostname = unsafe {
        if host_ptr.is_null() || host_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("")
        }
    };
    let data = unsafe {
        if data_ptr.is_null() || data_len == 0 {
            &[]
        } else {
            slice::from_raw_parts(data_ptr, data_len)
        }
    };

    let json = inspect_image_header_internal(hostname, data);
    store_result(json);
    unsafe { RESULT_LEN }
}

/// Processes an RGBA pixel buffer in-place inside Wasm linear memory:
/// - Applies optional color quantization (`posterize_bits` 1..8) to boost lossless WebP/PNG compression ratio.
/// - If executed on an unauthorized mirror domain, stamps a diagonal pattern into the pixel buffer.
#[no_mangle]
pub extern "C" fn wasm_process_rgba_pixels(
    host_ptr: *const u8,
    host_len: usize,
    rgba_ptr: *mut u8,
    rgba_len: usize,
    width: u32,
    quantize_level: u8,
) {
    if rgba_ptr.is_null() || rgba_len < 4 {
        return;
    }
    let hostname = unsafe {
        if host_ptr.is_null() || host_len == 0 {
            ""
        } else {
            std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("")
        }
    };
    let authorized = is_authorized_domain(hostname);
    let pixels = unsafe { slice::from_raw_parts_mut(rgba_ptr, rgba_len) };

    let step = if quantize_level > 1 {
        quantize_level as u16
    } else {
        1
    };
    let w = width.max(1) as usize;

    for (idx, px) in pixels.chunks_exact_mut(4).enumerate() {
        if step > 1 {
            px[0] = (((px[0] as u16 + step / 2) / step) * step).min(255) as u8;
            px[1] = (((px[1] as u16 + step / 2) / step) * step).min(255) as u8;
            px[2] = (((px[2] as u16 + step / 2) / step) * step).min(255) as u8;
        }
        // Silent honeypot watermark pattern on unauthorized domains
        if !authorized {
            let x = idx % w;
            let y = idx / w;
            if (x + y) % 24 < 3 {
                px[0] = 239;
                px[1] = 68;
                px[2] = 68;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jpeg_header_inspection() {
        // Fake JPEG with APP1 Exif + GPS
        let mut buf = vec![0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x10];
        buf.extend_from_slice(b"Exif\0\0GPSApple");
        let res = inspect_image_header_internal("yunsin.top", &buf);
        assert!(res.contains("\"format\":\"JPEG\""));
        assert!(res.contains("\"hasExif\":true"));
        assert!(res.contains("\"hasGps\":true"));
    }
}
