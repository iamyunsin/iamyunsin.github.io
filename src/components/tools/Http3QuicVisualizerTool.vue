<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  initLabsWasm,
  simulateHttp3QuicWithWasm,
  type Http3QuicSimulationResult,
} from '@/wasm-pkg/tool-labs';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const rttMs = ref(90);
const lossPct = ref(3);
const zeroRtt = ref(true);

const wasmExports = ref<Awaited<ReturnType<typeof initLabsWasm>> | null>(null);
const sim = ref<Http3QuicSimulationResult>({
  rttMs: 90,
  lossPct: 3,
  zeroRtt: true,
  h2HandshakeMs: 180,
  h3HandshakeMs: 0,
  h2TotalMs: 360,
  h3TotalMs: 180,
  savedMs: 180,
  speedupPct: 50,
  h2Streams: [],
  h3Streams: [],
});

const networkPresets = [
  {
    id: 'fiber',
    labelZh: '🏠 光纤宽带零丢包 (RTT 25ms, 丢包 0%)',
    labelEn: '🏠 Fiber Wi-Fi (RTT 25ms, Loss 0%)',
    rtt: 25,
    loss: 0,
    zRtt: true,
  },
  {
    id: 'subway-5g',
    labelZh: '🚇 高铁/地铁移动弱网 (RTT 90ms, 丢包 3% · 队头阻塞明显)',
    labelEn: '🚇 Mobile Weak Signal (RTT 90ms, Loss 3% · HoL Blocking)',
    rtt: 90,
    loss: 3,
    zRtt: true,
  },
  {
    id: 'cross-ocean',
    labelZh: '🌊 跨国高延迟拥塞链路 (RTT 180ms, 丢包 6%)',
    labelEn: '🌊 Cross-Ocean High Latency (RTT 180ms, Loss 6%)',
    rtt: 180,
    loss: 6,
    zRtt: false,
  },
];

function applyNetworkPreset(p: (typeof networkPresets)[0]) {
  rttMs.value = p.rtt;
  lossPct.value = p.loss;
  zeroRtt.value = p.zRtt;
}

function runSimulation() {
  if (!wasmExports.value) return;
  sim.value = simulateHttp3QuicWithWasm(
    wasmExports.value,
    rttMs.value,
    lossPct.value,
    zeroRtt.value
  );
}

const maxTimelineMs = computed(() => Math.max(sim.value.h2TotalMs, 100));

function pctWidth(ms: number): string {
  const pct = Math.min(100, Math.max(0, (ms / maxTimelineMs.value) * 100));
  return `${pct.toFixed(1)}%`;
}

onMounted(async () => {
  wasmExports.value = await initLabsWasm();
  runSimulation();
});

watch([rttMs, lossPct, zeroRtt], () => {
  runSimulation();
});
</script>

<template>
  <div class="http3-simulator">
    <!-- Quick Network Presets -->
    <div class="preset-bar">
      <button
        v-for="p in networkPresets"
        :key="p.id"
        type="button"
        class="preset-btn"
        @click="applyNetworkPreset(p)"
      >
        {{ isEn ? p.labelEn : p.labelZh }}
      </button>
    </div>

    <!-- Parameter Sliders -->
    <div class="controls-card">
      <div class="slider-group">
        <div class="slider-top">
          <span>🌐 {{ isEn ? 'Network Round-Trip Time (RTT):' : '网络往返延迟 (RTT)：' }}</span>
          <strong>{{ rttMs }} ms</strong>
        </div>
        <input v-model.number="rttMs" type="range" min="15" max="260" step="5" class="range-input" />
      </div>

      <div class="slider-group">
        <div class="slider-top">
          <span>📉 {{ isEn ? 'Packet Loss Rate (Stream #1 Drop):' : '网络丢包率 (触发 Stream #1 丢包重传)：' }}</span>
          <strong :class="{ danger: lossPct > 0 }">{{ lossPct }}%</strong>
        </div>
        <input v-model.number="lossPct" type="range" min="0" max="15" step="1" class="range-input" />
      </div>

      <div class="slider-group toggle-group">
        <label class="toggle-label">
          <input v-model="zeroRtt" type="checkbox" />
          <span>
            ⚡ {{ isEn ? 'Enable QUIC 0-RTT Session Resumption' : '开启 QUIC 0-RTT 会话恢复（二次访问免握手）' }}
          </span>
        </label>
        <p class="toggle-hint">
          {{
            isEn
              ? 'HTTP/2 requires 1-RTT TCP + 1-RTT TLS = 2 RTTs before sending first byte.'
              : '对比：HTTP/2 需经历 1-RTT TCP 三次握手 + 1-RTT TLS 握手 = 2 RTT 才能发首字节。'
          }}
        </p>
      </div>
    </div>

    <!-- Top KPI Comparison Row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">{{ isEn ? 'HTTP/2 (TCP + TLS) Total Time' : 'HTTP/2 (基于 TCP) 全部加载耗时' }}</span>
        <strong class="kpi-val h2-val">{{ sim.h2TotalMs }} ms</strong>
        <span class="kpi-sub">
          {{ isEn ? `Handshake: ${sim.h2HandshakeMs} ms (2-RTT)` : `握手耗时：${sim.h2HandshakeMs} ms (TCP+TLS 2-RTT)` }}
        </span>
      </div>

      <div class="kpi-card highlight">
        <span class="kpi-label">{{ isEn ? 'HTTP/3 (QUIC over UDP) Total Time' : 'HTTP/3 (基于 QUIC) 全部加载耗时' }}</span>
        <strong class="kpi-val h3-val">{{ sim.h3TotalMs }} ms</strong>
        <span class="kpi-sub">
          {{
            isEn
              ? `Handshake: ${sim.h3HandshakeMs} ms (${zeroRtt ? '0-RTT' : '1-RTT'})`
              : `握手耗时：${sim.h3HandshakeMs} ms (${zeroRtt ? '0-RTT 极速复用' : '1-RTT 合并握手'})`
          }}
        </span>
      </div>

      <div class="kpi-card gain-card">
        <span class="kpi-label">{{ isEn ? 'HTTP/3 Latency Reduction' : 'HTTP/3 提速收益' }}</span>
        <strong class="kpi-val gain-val">-{{ sim.savedMs }} ms ({{ sim.speedupPct }}% Faster)</strong>
        <span class="kpi-sub">
          {{
            lossPct > 0
              ? isEn
                ? 'Eliminated TCP Head-of-Line Blocking on Streams #2-#4!'
                : '彻底消除 Stream #2~#4 的 TCP 传输层队头阻塞！'
              : isEn
                ? 'Saved handshake round-trips via QUIC!'
                : '省去多余的 TCP + TLS 串行握手往返！'
          }}
        </span>
      </div>
    </div>

    <!-- Waterfall Comparison -->
    <div class="waterfall-grid">
      <!-- HTTP/2 Waterfall -->
      <div class="wf-panel">
        <div class="wf-header">
          <span class="wf-title">🐢 HTTP/2 (Single TCP Connection Multiplexing)</span>
          <span v-if="lossPct > 0" class="hol-alert">
            ⚠️ {{ isEn ? 'TCP Head-of-Line Blocked!' : '触发 TCP 队头阻塞（一包丢失，全流罚站）' }}
          </span>
        </div>
        <div class="wf-body">
          <div v-for="(st, idx) in sim.h2Streams" :key="`h2-${idx}`" class="stream-row">
            <div class="stream-meta">
              <span class="stream-name">{{ st.name }}</span>
              <span class="stream-total">{{ st.totalMs }} ms</span>
            </div>
            <div class="bar-track">
              <div
                class="bar-seg seg-handshake"
                :style="{ width: pctWidth(st.handshakeMs) }"
                :title="`Handshake: ${st.handshakeMs}ms`"
              ></div>
              <div
                class="bar-seg seg-transfer"
                :style="{ width: pctWidth(st.transferMs) }"
                :title="`Transfer: ${st.transferMs}ms`"
              ></div>
              <div
                v-if="st.holBlockedMs > 0"
                class="bar-seg seg-blocked"
                :style="{ width: pctWidth(st.holBlockedMs) }"
                :title="`Blocked/Retransmit: ${st.holBlockedMs}ms`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- HTTP/3 Waterfall -->
      <div class="wf-panel h3-panel">
        <div class="wf-header">
          <span class="wf-title">🚀 HTTP/3 (QUIC over UDP · Independent Streams)</span>
          <span class="h3-badge">
            ✅ {{ isEn ? 'Zero Inter-Stream HoL Blocking' : '流间完全独立 · 零队头阻塞' }}
          </span>
        </div>
        <div class="wf-body">
          <div v-for="(st, idx) in sim.h3Streams" :key="`h3-${idx}`" class="stream-row">
            <div class="stream-meta">
              <span class="stream-name">{{ st.name }}</span>
              <span class="stream-total h3-text">{{ st.totalMs }} ms</span>
            </div>
            <div class="bar-track">
              <div
                v-if="st.handshakeMs > 0"
                class="bar-seg seg-handshake-h3"
                :style="{ width: pctWidth(st.handshakeMs) }"
              ></div>
              <div
                class="bar-seg seg-transfer-h3"
                :style="{ width: pctWidth(st.transferMs) }"
              ></div>
              <div
                v-if="st.holBlockedMs > 0"
                class="bar-seg seg-blocked"
                :style="{ width: pctWidth(st.holBlockedMs) }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend-bar">
      <span class="legend-item">
        <i class="dot d-hs"></i> {{ isEn ? 'TCP/QUIC Handshake' : '连接握手阶段 (Handshake)' }}
      </span>
      <span class="legend-item">
        <i class="dot d-tx"></i> {{ isEn ? 'Data Frame Transfer' : '并发数据帧传输 (Transfer)' }}
      </span>
      <span class="legend-item">
        <i class="dot d-hol"></i>
        {{
          isEn
            ? 'Packet Loss Retransmission / TCP Head-of-Line Blocking Penalty'
            : '丢包重传等待 / TCP 队头阻塞连坐等待耗时 (HoL Penalty)'
        }}
      </span>
    </div>
  </div>
</template>

<style lang="less" scoped>
.http3-simulator {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);

  &:hover {
    background-color: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }
}

.controls-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);

  strong {
    color: var(--accent);
    font-family: monospace;
    font-size: 14px;

    &.danger {
      color: #ef4444;
    }
  }
}

.range-input {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
}

.toggle-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.45;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
}

.kpi-card {
  padding: 16px 18px;
  border-radius: 14px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.highlight {
    border-color: var(--accent-border);
    background-color: var(--accent-soft);
  }
}

.kpi-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.kpi-val {
  font-size: 22px;
  font-weight: 800;
  font-family: 'JetBrains Mono', Consolas, monospace;
  color: var(--text-primary);

  &.h3-val,
  &.gain-val {
    color: var(--accent);
  }
}

.kpi-sub {
  font-size: 11.5px;
  color: var(--text-muted);
}

.waterfall-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
}

.wf-panel {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;

  &.h3-panel {
    border-color: var(--accent-border);
  }
}

.wf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-muted);
  border-bottom: 1px solid var(--border-color);
}

.wf-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-primary);
}

.hol-alert {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background-color: rgba(239, 68, 68, 0.14);
  color: #ef4444;
}

.h3-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background-color: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.wf-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stream-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stream-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.stream-name {
  font-family: monospace;
  font-weight: 700;
  color: var(--text-primary);
}

.stream-total {
  font-family: monospace;
  font-weight: 700;
  color: var(--text-secondary);

  &.h3-text {
    color: var(--accent);
  }
}

.bar-track {
  height: 16px;
  border-radius: 999px;
  background-color: var(--bg-muted);
  display: flex;
  overflow: hidden;
}

.bar-seg {
  height: 100%;
  transition: width 0.25s ease;
}

.seg-handshake,
.seg-handshake-h3 {
  background-color: #f59e0b;
}

.seg-transfer {
  background-color: #64748b;
}

.seg-transfer-h3 {
  background-color: #10b981;
}

.seg-blocked {
  background: repeating-linear-gradient(
    45deg,
    #ef4444,
    #ef4444 6px,
    #f87171 6px,
    #f87171 12px
  );
}

.legend-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;

  &.d-hs {
    background-color: #f59e0b;
  }
  &.d-tx {
    background-color: #10b981;
  }
  &.d-hol {
    background-color: #ef4444;
  }
}
</style>
