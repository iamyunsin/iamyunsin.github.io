export interface ImageHeaderInspection {
  format: string;
  hasExif: boolean;
  hasGps: boolean;
  hasCamera: boolean;
  metadataBytes: number;
  authorized: boolean;
}

interface ImageCodecWasmExports {
  memory: WebAssembly.Memory;
  wasm_alloc: (size: number) => number;
  wasm_dealloc: (ptr: number, size: number) => void;
  wasm_result_ptr: () => number;
  wasm_result_len: () => number;
  wasm_inspect_image_header: (
    hostPtr: number,
    hostLen: number,
    dataPtr: number,
    dataLen: number
  ) => number;
  wasm_process_rgba_pixels: (
    hostPtr: number,
    hostLen: number,
    rgbaPtr: number,
    rgbaLen: number,
    width: number,
    quantizeLevel: number
  ) => void;
}

let wasmExports: ImageCodecWasmExports | null = null;
let initPromise: Promise<ImageCodecWasmExports> | null = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function initImageCodecWasm(): Promise<ImageCodecWasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const response = await fetch('/wasm/tool_image_codec.wasm');
    let instance: WebAssembly.Instance;
    if ('instantiateStreaming' in WebAssembly) {
      try {
        const res = await WebAssembly.instantiateStreaming(response.clone(), {});
        instance = res.instance;
      } catch {
        const buf = await response.arrayBuffer();
        const res = await WebAssembly.instantiate(buf, {});
        instance = res.instance;
      }
    } else {
      const buf = await response.arrayBuffer();
      const res = await WebAssembly.instantiate(buf, {});
      instance = res.instance;
    }
    wasmExports = instance.exports as unknown as ImageCodecWasmExports;
    return wasmExports;
  })();

  return initPromise;
}

function getHost(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

export function inspectImageHeaderWithWasm(
  exports: ImageCodecWasmExports,
  headerBytes: Uint8Array
): ImageHeaderInspection {
  const hostBytes = encoder.encode(getHost());
  const hostPtr = exports.wasm_alloc(hostBytes.length);
  const sliceLen = Math.min(headerBytes.length, 65536);
  const dataPtr = exports.wasm_alloc(sliceLen);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    new Uint8Array(exports.memory.buffer, dataPtr, sliceLen).set(headerBytes.subarray(0, sliceLen));

    const outLen = exports.wasm_inspect_image_header(
      hostPtr,
      hostBytes.length,
      dataPtr,
      sliceLen
    );
    const outPtr = exports.wasm_result_ptr();
    const jsonStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
    return JSON.parse(jsonStr) as ImageHeaderInspection;
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
    if (sliceLen > 0) exports.wasm_dealloc(dataPtr, sliceLen);
  }
}

export function processRgbaBufferWithWasm(
  exports: ImageCodecWasmExports,
  rgbaData: Uint8ClampedArray,
  width: number,
  quantizeLevel: number
): void {
  const hostBytes = encoder.encode(getHost());
  const hostPtr = exports.wasm_alloc(hostBytes.length);
  const rgbaPtr = exports.wasm_alloc(rgbaData.byteLength);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    new Uint8Array(exports.memory.buffer, rgbaPtr, rgbaData.byteLength).set(rgbaData);

    exports.wasm_process_rgba_pixels(
      hostPtr,
      hostBytes.length,
      rgbaPtr,
      rgbaData.byteLength,
      width,
      quantizeLevel
    );

    rgbaData.set(new Uint8Array(exports.memory.buffer, rgbaPtr, rgbaData.byteLength));
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
    if (rgbaData.byteLength > 0) exports.wasm_dealloc(rgbaPtr, rgbaData.byteLength);
  }
}

// ==========================================
// On-Demand Wasm Encoders (@jsquash/webp & @jsquash/avif)
// Enables genuine WebP & AVIF encoding on iOS Safari / WebKit where canvas.toBlob is unsupported
// ==========================================
let webpReadyPromise: Promise<(data: ImageData, options?: Record<string, unknown>) => Promise<ArrayBuffer>> | null = null;
let avifReadyPromise: Promise<(data: ImageData, options?: Record<string, unknown>) => Promise<ArrayBuffer>> | null = null;

// Standard 31-byte WebAssembly SIMD feature detection probe
const WASM_SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253,
  15, 253, 98, 11,
]);

function supportsWasmSimd(): boolean {
  try {
    return typeof WebAssembly === 'object' && WebAssembly.validate(WASM_SIMD_PROBE);
  } catch {
    return false;
  }
}

async function getWebpWasmEncoder() {
  if (webpReadyPromise) return webpReadyPromise;
  webpReadyPromise = (async () => {
    const hasSimd = supportsWasmSimd();
    const [webpEncFactory, webpMeta, webpUtils] = await Promise.all([
      hasSimd
        ? import('@jsquash/webp/codec/enc/webp_enc_simd.js')
        : import('@jsquash/webp/codec/enc/webp_enc.js'),
      import('@jsquash/webp/meta.js'),
      import('@jsquash/webp/utils.js'),
    ]);
    const emscriptenModule = await (
      webpUtils.initEmscriptenModule as (
        factory: unknown
      ) => Promise<{
        encode: (
          buf: Uint8ClampedArray,
          w: number,
          h: number,
          opts: Record<string, unknown>
        ) => { buffer: ArrayBuffer } | null;
      }>
    )(webpEncFactory.default);

    return async (data: ImageData, options: Record<string, unknown> = {}) => {
      const mergedOptions = { ...webpMeta.defaultOptions, ...options };
      const output = emscriptenModule.encode(
        data.data,
        data.width,
        data.height,
        mergedOptions
      );
      if (!output) {
        throw new Error('WebP Wasm encoding error.');
      }
      return output.buffer;
    };
  })();
  return webpReadyPromise;
}

async function getAvifWasmEncoder() {
  if (avifReadyPromise) return avifReadyPromise;
  avifReadyPromise = (async () => {
    const [avifEncFactory, avifMeta, avifUtils] = await Promise.all([
      import('@jsquash/avif/codec/enc/avif_enc.js'),
      import('@jsquash/avif/meta.js'),
      import('@jsquash/avif/utils.js'),
    ]);
    const emscriptenModule = await (
      avifUtils.initEmscriptenModule as (
        factory: unknown
      ) => Promise<{
        encode: (
          buf: Uint8Array,
          w: number,
          h: number,
          opts: Record<string, unknown>
        ) => { buffer: ArrayBuffer } | null;
      }>
    )(avifEncFactory.default);

    return async (data: ImageData, options: Record<string, unknown> = {}) => {
      const mergedOptions = { ...avifMeta.defaultOptions, ...options };
      const rgbaBytes = new Uint8Array(
        data.data.buffer,
        data.data.byteOffset,
        data.data.byteLength
      );
      const output = emscriptenModule.encode(
        rgbaBytes,
        data.width,
        data.height,
        mergedOptions
      );
      if (!output) {
        throw new Error('AVIF Wasm encoding error.');
      }
      return output.buffer;
    };
  })();
  return avifReadyPromise;
}

export async function encodeWebpWithWasm(
  imageData: ImageData,
  quality: number
): Promise<Blob> {
  const encodeWebp = await getWebpWasmEncoder();
  const buffer = await encodeWebp(imageData, {
    quality: Math.max(1, Math.min(100, Math.round(quality))),
    method: 4,
  });
  return new Blob([buffer], { type: 'image/webp' });
}

export async function encodeAvifWithWasm(
  imageData: ImageData,
  quality: number
): Promise<Blob> {
  const encodeAvif = await getAvifWasmEncoder();
  const buffer = await encodeAvif(imageData, {
    quality: Math.max(1, Math.min(100, Math.round(quality))),
    speed: 8,
  });
  return new Blob([buffer], { type: 'image/avif' });
}
