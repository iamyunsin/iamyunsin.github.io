export interface DeepLinkCompileResult {
  aasaJson: string;
  assetlinksJson: string;
  h5Snippet: string;
  valid: boolean;
  warnings: string[];
}

interface DeepLinkWasmExports {
  memory: WebAssembly.Memory;
  wasm_alloc: (size: number) => number;
  wasm_dealloc: (ptr: number, size: number) => void;
  wasm_result_ptr: () => number;
  wasm_result_len: () => number;
  wasm_compile_deeplink: (
    hostPtr: number,
    hostLen: number,
    payloadPtr: number,
    payloadLen: number
  ) => number;
}

let wasmExports: DeepLinkWasmExports | null = null;
let initPromise: Promise<DeepLinkWasmExports> | null = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function initDeepLinkWasm(): Promise<DeepLinkWasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const response = await fetch('/wasm/tool_deeplink.wasm');
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
    wasmExports = instance.exports as unknown as DeepLinkWasmExports;
    return wasmExports;
  })();

  return initPromise;
}

function getHost(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

export function compileDeepLinkWithWasm(
  exports: DeepLinkWasmExports,
  params: {
    teamId: string;
    bundleId: string;
    paths: string;
    androidPkg: string;
    sha256: string;
    schemeUrl: string;
    universalUrl: string;
    iosStore: string;
    androidStore: string;
  }
): DeepLinkCompileResult {
  const hostBytes = encoder.encode(getHost());
  const payloadStr = [
    params.teamId,
    params.bundleId,
    params.paths,
    params.androidPkg,
    params.sha256,
    params.schemeUrl,
    params.universalUrl,
    params.iosStore,
    params.androidStore,
  ].join('\t');
  const payloadBytes = encoder.encode(payloadStr);

  const hostPtr = exports.wasm_alloc(hostBytes.length);
  const payloadPtr = exports.wasm_alloc(payloadBytes.length);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    new Uint8Array(exports.memory.buffer, payloadPtr, payloadBytes.length).set(payloadBytes);

    const outLen = exports.wasm_compile_deeplink(
      hostPtr,
      hostBytes.length,
      payloadPtr,
      payloadBytes.length
    );
    const outPtr = exports.wasm_result_ptr();
    const jsonStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
    return JSON.parse(jsonStr) as DeepLinkCompileResult;
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
    if (payloadBytes.length > 0) exports.wasm_dealloc(payloadPtr, payloadBytes.length);
  }
}
