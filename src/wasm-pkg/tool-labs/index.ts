export interface VueTokenItem {
  kind: string;
  raw: string;
  detail: string;
}

export interface VueAstAttr {
  name: string;
  value: string;
  dynamic: boolean;
}

export interface VueAstNodeItem {
  nodeType: string;
  tag: string;
  patchFlag: number;
  isBlock: boolean;
  isHoisted: boolean;
  patchFlagNames: string[];
  dynamicProps: string[];
  attrs: VueAstAttr[];
  interpolation?: string;
  text?: string;
  children: VueAstNodeItem[];
}

export interface VueCompileResult {
  authorized: boolean;
  tokens: VueTokenItem[];
  ast: VueAstNodeItem;
  hoistedCount: number;
  dynamicBlockNodes: string[];
  renderCode: string;
}

export interface VueDiffStep {
  stage: string;
  i: number;
  e1: number;
  e2: number;
  action: string;
  descZh: string;
  descEn: string;
  domState: string[];
}

export interface VueDiffSimulationResult {
  authorized: boolean;
  newIdxToOldIdx: number[];
  lisKeys: string[];
  stats: {
    moves: number;
    mounts: number;
    unmounts: number;
  };
  steps: VueDiffStep[];
}

export interface EventLoopStep {
  stepIndex: number;
  line: number;
  phase: 'sync' | 'microtask' | 'raf' | 'macrotask' | 'idle';
  stationmasterZh: string;
  stationmasterEn: string;
  descZh: string;
  descEn: string;
  callStack: string[];
  microQueue: string[];
  rafQueue: string[];
  macroQueue: string[];
  idleQueue: string[];
  logs: string[];
}

export interface EventLoopSimulationResult {
  authorized: boolean;
  scenarioId: number;
  steps: EventLoopStep[];
}

export interface HttpStreamTiming {
  name: string;
  handshakeMs: number;
  transferMs: number;
  holBlockedMs: number;
  totalMs: number;
}

export interface Http3QuicSimulationResult {
  rttMs: number;
  lossPct: number;
  zeroRtt: boolean;
  h2HandshakeMs: number;
  h3HandshakeMs: number;
  h2TotalMs: number;
  h3TotalMs: number;
  savedMs: number;
  speedupPct: number;
  h2Streams: HttpStreamTiming[];
  h3Streams: HttpStreamTiming[];
}

export interface LabsWasmExports {
  memory: WebAssembly.Memory;
  wasm_alloc: (size: number) => number;
  wasm_dealloc: (ptr: number, size: number) => void;
  wasm_result_ptr: () => number;
  wasm_result_len: () => number;
  wasm_compile_vue_template: (
    hostPtr: number,
    hostLen: number,
    tplPtr: number,
    tplLen: number
  ) => number;
  wasm_simulate_vue_diff: (
    hostPtr: number,
    hostLen: number,
    oldPtr: number,
    oldLen: number,
    newPtr: number,
    newLen: number
  ) => number;
  wasm_simulate_event_loop: (
    hostPtr: number,
    hostLen: number,
    scenarioId: number
  ) => number;
  wasm_simulate_http3_quic: (
    hostPtr: number,
    hostLen: number,
    rttMs: number,
    lossPct: number,
    zeroRtt: number
  ) => number;
}

let wasmExports: LabsWasmExports | null = null;
let initPromise: Promise<LabsWasmExports> | null = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function initLabsWasm(): Promise<LabsWasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const response = await fetch('/wasm/tool_labs.wasm');
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
    wasmExports = instance.exports as unknown as LabsWasmExports;
    return wasmExports;
  })();

  return initPromise;
}

function getHost(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

export function compileVueTemplateWithWasm(
  exports: LabsWasmExports,
  template: string
): VueCompileResult {
  const hostBytes = encoder.encode(getHost());
  const tplBytes = encoder.encode(template);
  const hostPtr = exports.wasm_alloc(hostBytes.length);
  const tplPtr = exports.wasm_alloc(tplBytes.length);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    new Uint8Array(exports.memory.buffer, tplPtr, tplBytes.length).set(tplBytes);
    const outLen = exports.wasm_compile_vue_template(
      hostPtr,
      hostBytes.length,
      tplPtr,
      tplBytes.length
    );
    const outPtr = exports.wasm_result_ptr();
    const jsonStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
    return JSON.parse(jsonStr) as VueCompileResult;
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
    if (tplBytes.length > 0) exports.wasm_dealloc(tplPtr, tplBytes.length);
  }
}

export function simulateVueDiffWithWasm(
  exports: LabsWasmExports,
  oldCsv: string,
  newCsv: string
): VueDiffSimulationResult {
  const hostBytes = encoder.encode(getHost());
  const oldBytes = encoder.encode(oldCsv);
  const newBytes = encoder.encode(newCsv);
  const hostPtr = exports.wasm_alloc(hostBytes.length);
  const oldPtr = exports.wasm_alloc(oldBytes.length);
  const newPtr = exports.wasm_alloc(newBytes.length);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    new Uint8Array(exports.memory.buffer, oldPtr, oldBytes.length).set(oldBytes);
    new Uint8Array(exports.memory.buffer, newPtr, newBytes.length).set(newBytes);
    const outLen = exports.wasm_simulate_vue_diff(
      hostPtr,
      hostBytes.length,
      oldPtr,
      oldBytes.length,
      newPtr,
      newBytes.length
    );
    const outPtr = exports.wasm_result_ptr();
    const jsonStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
    return JSON.parse(jsonStr) as VueDiffSimulationResult;
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
    if (oldBytes.length > 0) exports.wasm_dealloc(oldPtr, oldBytes.length);
    if (newBytes.length > 0) exports.wasm_dealloc(newPtr, newBytes.length);
  }
}

export function simulateEventLoopWithWasm(
  exports: LabsWasmExports,
  scenarioId: number
): EventLoopSimulationResult {
  const hostBytes = encoder.encode(getHost());
  const hostPtr = exports.wasm_alloc(hostBytes.length);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    const outLen = exports.wasm_simulate_event_loop(hostPtr, hostBytes.length, scenarioId);
    const outPtr = exports.wasm_result_ptr();
    const jsonStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
    return JSON.parse(jsonStr) as EventLoopSimulationResult;
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
  }
}

export function simulateHttp3QuicWithWasm(
  exports: LabsWasmExports,
  rttMs: number,
  lossPct: number,
  zeroRtt: boolean
): Http3QuicSimulationResult {
  const hostBytes = encoder.encode(getHost());
  const hostPtr = exports.wasm_alloc(hostBytes.length);

  try {
    new Uint8Array(exports.memory.buffer, hostPtr, hostBytes.length).set(hostBytes);
    const outLen = exports.wasm_simulate_http3_quic(
      hostPtr,
      hostBytes.length,
      rttMs,
      lossPct,
      zeroRtt ? 1 : 0
    );
    const outPtr = exports.wasm_result_ptr();
    const jsonStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
    return JSON.parse(jsonStr) as Http3QuicSimulationResult;
  } finally {
    if (hostBytes.length > 0) exports.wasm_dealloc(hostPtr, hostBytes.length);
  }
}
