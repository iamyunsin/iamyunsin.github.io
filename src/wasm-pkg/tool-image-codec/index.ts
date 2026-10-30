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
