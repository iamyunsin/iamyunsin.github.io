export interface CalldataAbiWord {
  index: number;
  name: string;
  kind: string;
  raw: string;
  decoded: string;
}

export interface DecodedCalldataResult {
  valid: boolean;
  error?: string;
  selector?: string;
  signature?: string;
  category?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReason?: string;
  byteLength?: number;
  words?: CalldataAbiWord[];
}

interface Web3WasmExports {
  memory: WebAssembly.Memory;
  wasm_alloc: (size: number) => number;
  wasm_dealloc: (ptr: number, size: number) => void;
  wasm_result_ptr: () => number;
  wasm_result_len: () => number;
  wasm_decode_calldata: (
    hostPtr: number,
    hostLen: number,
    hexPtr: number,
    hexLen: number
  ) => number;
}

let wasmExports: Web3WasmExports | null = null;
let initPromise: Promise<Web3WasmExports> | null = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function initWeb3Wasm(): Promise<Web3WasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const response = await fetch('/wasm/tool_web3.wasm');
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
    wasmExports = instance.exports as unknown as Web3WasmExports;
    return wasmExports;
  })();

  return initPromise;
}

function getHost(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

export function decodeCalldataWithWasm(
  exports: Web3WasmExports,
  rawHex: string
): DecodedCalldataResult {
  const hostBytes = encoder.encode(getHost());
  const hexBytes = encoder.encode(rawHex);

  const hostPtr = exports.wasm_alloc(hostBytes.length);
  const hexPtr = exports.wasm_alloc(hexBytes.length);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    new Uint8Array(exports.memory.buffer, hexPtr, hexBytes.length).set(hexBytes);

    const outLen = exports.wasm_decode_calldata(
      hostPtr,
      hostBytes.length,
      hexPtr,
      hexBytes.length
    );
    const outPtr = exports.wasm_result_ptr();
    const jsonStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
    return JSON.parse(jsonStr) as DecodedCalldataResult;
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
    if (hexBytes.length > 0) exports.wasm_dealloc(hexPtr, hexBytes.length);
  }
}
