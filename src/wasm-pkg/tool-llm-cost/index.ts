export interface TokenSlice {
  t: string;
  id: number;
  k: 'word' | 'cjk' | 'num' | 'ws' | 'sym' | 'trap';
}

export interface PromptAnalysisResult {
  totalTokens: number;
  charCount: number;
  cjkCount: number;
  wordCount: number;
  symbolCount: number;
  truncated: boolean;
  slices: TokenSlice[];
}

interface WasmExports {
  memory: WebAssembly.Memory;
  wasm_alloc: (size: number) => number;
  wasm_dealloc: (ptr: number, size: number) => void;
  wasm_result_ptr: () => number;
  wasm_result_len: () => number;
  wasm_analyze_prompt: (
    hostPtr: number,
    hostLen: number,
    textPtr: number,
    textLen: number,
    profile: number
  ) => number;
  wasm_calculate_monthly_cost: (
    hostPtr: number,
    hostLen: number,
    inputTokens: number,
    outputTokens: number,
    requestsPerDay: number,
    cacheHitRatio: number,
    inputPricePerM: number,
    cachedPricePerM: number,
    outputPricePerM: number,
    exchangeRate: number
  ) => number;
}

let wasmExports: WasmExports | null = null;
let initPromise: Promise<WasmExports> | null = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Lazily loads the ~28KB micro-Wasm module (`/wasm/tool_llm_cost.wasm`) only on the LLM Calculator page.
 */
export async function initLlmCostWasm(): Promise<WasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const response = await fetch('/wasm/tool_llm_cost.wasm');
    let instance: WebAssembly.Instance;
    if ('instantiateStreaming' in WebAssembly) {
      try {
        const result = await WebAssembly.instantiateStreaming(response.clone(), {});
        instance = result.instance;
      } catch {
        const bytes = await response.arrayBuffer();
        const result = await WebAssembly.instantiate(bytes, {});
        instance = result.instance;
      }
    } else {
      const bytes = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, {});
      instance = result.instance;
    }
    wasmExports = instance.exports as unknown as WasmExports;
    return wasmExports;
  })();

  return initPromise;
}

function getCurrentHost(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

function writeStrToWasm(exports: WasmExports, str: string): { ptr: number; len: number } {
  const bytes = encoder.encode(str);
  if (bytes.length === 0) {
    return { ptr: 0, len: 0 };
  }
  const ptr = exports.wasm_alloc(bytes.length);
  const mem = new Uint8Array(exports.memory.buffer, ptr, bytes.length);
  mem.set(bytes);
  return { ptr, len: bytes.length };
}

/**
 * Calls the Rust Wasm BPE/CJK hybrid tokenizer and visual slicer.
 * Automatically passes the browser's current `location.hostname` for internal XOR domain verification.
 */
export function analyzePromptWithWasm(
  exports: WasmExports,
  promptText: string,
  profile: number
): PromptAnalysisResult {
  const hostBuf = writeStrToWasm(exports, getCurrentHost());
  const textBuf = writeStrToWasm(exports, promptText);

  try {
    const outLen = exports.wasm_analyze_prompt(
      hostBuf.ptr,
      hostBuf.len,
      textBuf.ptr,
      textBuf.len,
      profile
    );
    const outPtr = exports.wasm_result_ptr();
    const outBytes = new Uint8Array(exports.memory.buffer, outPtr, outLen);
    const jsonStr = decoder.decode(outBytes);
    return JSON.parse(jsonStr) as PromptAnalysisResult;
  } finally {
    if (hostBuf.len > 0) exports.wasm_dealloc(hostBuf.ptr, hostBuf.len);
    if (textBuf.len > 0) exports.wasm_dealloc(textBuf.ptr, textBuf.len);
  }
}

/**
 * Calls the Rust Wasm pricing engine to compute monthly API costs with prompt caching.
 */
export function calculateMonthlyCostWithWasm(
  exports: WasmExports,
  params: {
    inputTokens: number;
    outputTokens: number;
    requestsPerDay: number;
    cacheHitRatio: number;
    inputPricePerM: number;
    cachedPricePerM: number;
    outputPricePerM: number;
    exchangeRate: number;
  }
): number {
  const hostBuf = writeStrToWasm(exports, getCurrentHost());
  try {
    return exports.wasm_calculate_monthly_cost(
      hostBuf.ptr,
      hostBuf.len,
      params.inputTokens,
      params.outputTokens,
      params.requestsPerDay,
      params.cacheHitRatio,
      params.inputPricePerM,
      params.cachedPricePerM,
      params.outputPricePerM,
      params.exchangeRate
    );
  } finally {
    if (hostBuf.len > 0) exports.wasm_dealloc(hostBuf.ptr, hostBuf.len);
  }
}
