<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  initLabsWasm,
  simulateEventLoopWithWasm,
  type EventLoopSimulationResult,
  type EventLoopStep,
} from '@/wasm-pkg/tool-labs';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const scenarios = [
  {
    id: 0,
    titleZh: '案例 1：《一文讲透事件循环》全队列探测 (Sync + Promise + rAF + setTimeout + Idle)',
    titleEn: 'Scenario 1: Full 5-Queue Probe (Sync + Promise + rAF + setTimeout + requestIdleCallback)',
    lines: [
      'function slowAction() {',
      "  console.log('执行栈：慢操作执行开始');",
      '  requestIdleCallback(() => {',
      "    console.log('执行栈：requestIdleCallback');",
      '  });',
      '  setTimeout(() => {',
      "    console.log('执行栈：setTimeout');",
      '  }, 0);',
      '  requestAnimationFrame(() => {',
      "    console.log('执行栈：requestAnimationFrame');",
      '  });',
      '  Promise.resolve().then(() => {',
      "    console.log('执行栈：Promise');",
      '  });',
      '  for (let i = 0; i < 100000; i++) {} // 同步耗时阻塞',
      "  console.log('执行栈：慢操作执行结束');",
      '}',
      'slowAction();',
    ],
  },
  {
    id: 1,
    titleZh: '案例 2：微任务内部嵌套衍生新微任务 vs 宏任务排队（饥饿效应）',
    titleEn: 'Scenario 2: Nested Microtask Spawning vs Macrotask Starvation',
    lines: [
      "console.log('1. Sync Start');",
      'setTimeout(() => {',
      "  console.log('5. Macrotask T1');",
      '}, 0);',
      'Promise.resolve().then(() => {',
      "  console.log('3. Microtask M1');",
      '  Promise.resolve().then(() => {',
      "    console.log('4. Nested Microtask M2');",
      '  });',
      '});',
      '// 同步栈尾声',
      "console.log('2. Sync End');",
    ],
  },
  {
    id: 2,
    titleZh: '案例 3：async / await 语法糖微任务拆解（经典大厂面试必考题）',
    titleEn: 'Scenario 3: async / await Desugaring & Microtask Continuation',
    lines: [
      'async function async1() {',
      "  console.log('1. async1 start');",
      '  await async2();',
      "  console.log('4. async1 end');",
      '}',
      'async function async2() {',
      "  console.log('2. async2');",
      '  setTimeout(() => console.log("5. setTimeout"), 0);',
      '}',
      "async1(); console.log('3. script end');",
    ],
  },
];

const activeScenarioId = ref(0);
const currentStepIdx = ref(0);
const isPlaying = ref(false);
let playTimer: ReturnType<typeof setInterval> | null = null;

const wasmExports = ref<Awaited<ReturnType<typeof initLabsWasm>> | null>(null);
const simResult = ref<EventLoopSimulationResult>({
  authorized: true,
  scenarioId: 0,
  steps: [],
});

const currentScenario = computed(
  () => scenarios.find((s) => s.id === activeScenarioId.value) || scenarios[0]
);

const currentFrame = computed<EventLoopStep>(() => {
  const list = simResult.value.steps;
  if (!list.length) {
    return {
      stepIndex: 0,
      line: 1,
      phase: 'sync',
      stationmasterZh: '准备就绪',
      stationmasterEn: 'Ready',
      descZh: '正在加载 Rust Wasm 事件循环引擎...',
      descEn: 'Loading Rust Wasm Event Loop Engine...',
      callStack: [],
      microQueue: [],
      rafQueue: [],
      macroQueue: [],
      idleQueue: [],
      logs: [],
    };
  }
  return list[Math.min(currentStepIdx.value, list.length - 1)];
});

function loadScenario(id: number) {
  stopAutoPlay();
  activeScenarioId.value = id;
  currentStepIdx.value = 0;
  if (wasmExports.value) {
    simResult.value = simulateEventLoopWithWasm(wasmExports.value, id);
  }
}

function prevStep() {
  stopAutoPlay();
  if (currentStepIdx.value > 0) {
    currentStepIdx.value--;
  }
}

function nextStep() {
  if (currentStepIdx.value < simResult.value.steps.length - 1) {
    currentStepIdx.value++;
  } else {
    stopAutoPlay();
  }
}

function resetSteps() {
  stopAutoPlay();
  currentStepIdx.value = 0;
}

function stopAutoPlay() {
  isPlaying.value = false;
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
}

function toggleAutoPlay() {
  if (isPlaying.value) {
    stopAutoPlay();
    return;
  }
  if (currentStepIdx.value >= simResult.value.steps.length - 1) {
    currentStepIdx.value = 0;
  }
  isPlaying.value = true;
  playTimer = setInterval(() => {
    if (currentStepIdx.value < simResult.value.steps.length - 1) {
      currentStepIdx.value++;
    } else {
      stopAutoPlay();
    }
  }, 1350);
}

onMounted(async () => {
  wasmExports.value = await initLabsWasm();
  loadScenario(0);
});

onUnmounted(() => {
  stopAutoPlay();
});
</script>

<template>
  <div class="eventloop-sandbox">
    <!-- Scenario Selector -->
    <div class="scenario-tabs">
      <button
        v-for="sc in scenarios"
        :key="sc.id"
        type="button"
        class="scenario-btn"
        :class="{ active: activeScenarioId === sc.id }"
        @click="loadScenario(sc.id)"
      >
        {{ isEn ? sc.titleEn : sc.titleZh }}
      </button>
    </div>

    <!-- Stationmaster Mental Model Status Bar -->
    <div class="stationmaster-banner" :data-phase="currentFrame.phase">
      <div class="sm-left">
        <span class="sm-badge">
          🚉 {{ isEn ? 'Stationmaster State:' : '光杆站长当前状态：' }}
        </span>
        <strong class="sm-status">
          {{ isEn ? currentFrame.stationmasterEn : currentFrame.stationmasterZh }}
        </strong>
      </div>
      <div class="sm-controls">
        <button type="button" class="ctrl-btn" :disabled="currentStepIdx === 0" @click="resetSteps">
          ↺ {{ isEn ? 'Reset' : '重置' }}
        </button>
        <button type="button" class="ctrl-btn" :disabled="currentStepIdx === 0" @click="prevStep">
          ◀ {{ isEn ? 'Prev' : '上一步' }}
        </button>
        <button type="button" class="ctrl-btn primary" @click="toggleAutoPlay">
          {{ isPlaying ? (isEn ? '⏸ Pause' : '⏸ 暂停') : isEn ? '▶ Auto Play' : '▶ 自动推演' }}
        </button>
        <button
          type="button"
          class="ctrl-btn"
          :disabled="currentStepIdx >= simResult.steps.length - 1"
          @click="nextStep"
        >
          {{ isEn ? 'Next' : '下一步' }} ▶
        </button>
        <span class="step-counter">
          Step {{ currentStepIdx + 1 }} / {{ simResult.steps.length || 1 }}
        </span>
      </div>
    </div>

    <!-- Step Explanation Callout -->
    <div class="explanation-box">
      <span class="exp-icon">💡</span>
      <p class="exp-text">{{ isEn ? currentFrame.descEn : currentFrame.descZh }}</p>
    </div>

    <!-- Main 2-Column Layout: Code & Console on Left, Call Stack + 4 Queues on Right -->
    <div class="sandbox-grid">
      <div class="left-col">
        <div class="box-card">
          <div class="box-header">
            <span>📜 {{ isEn ? 'JavaScript Source Execution' : 'JavaScript 代码执行跟踪' }}</span>
            <span class="line-indicator">Line #{{ currentFrame.line }}</span>
          </div>
          <div class="code-lines">
            <div
              v-for="(lineText, idx) in currentScenario.lines"
              :key="idx"
              class="code-line"
              :class="{ active: currentFrame.line === idx + 1 }"
            >
              <span class="line-no">{{ idx + 1 }}</span>
              <code class="line-code">{{ lineText }}</code>
            </div>
          </div>
        </div>

        <!-- Console Output -->
        <div class="box-card console-card">
          <div class="box-header">
            <span>🖥️ {{ isEn ? 'Console Output (Execution Order)' : '控制台输出 (console.log 真实先后顺序)' }}</span>
            <span class="line-indicator">{{ currentFrame.logs.length }} logs</span>
          </div>
          <div class="console-body">
            <div v-if="currentFrame.logs.length === 0" class="empty-tip">
              {{ isEn ? '// Waiting for console.log execution...' : '// 暂无输出，点击「下一步」观察打印顺序' }}
            </div>
            <div v-for="(log, idx) in currentFrame.logs" :key="idx" class="log-row">
              <span class="log-order">#{{ idx + 1 }}</span>
              <code class="log-text">&gt; {{ log }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Call Stack + 4 Priority Queues -->
      <div class="right-col">
        <!-- Call Stack -->
        <div class="queue-card stack-card" :class="{ active: currentFrame.callStack.length > 0 }">
          <div class="queue-head">
            <span class="queue-title">
              🥞 {{ isEn ? 'Call Stack (LIFO - Single Thread)' : '1. 执行栈 Call Stack (光杆站长工作台 · LIFO)' }}
            </span>
            <span class="priority-pill p-stack">
              {{ isEn ? 'Immediate Execution' : '正在执行' }}
            </span>
          </div>
          <div class="queue-items">
            <span v-if="currentFrame.callStack.length === 0" class="queue-empty">
              {{ isEn ? '[Empty — Checking Queues]' : '[执行栈已清空 — 准备检查微任务队列]' }}
            </span>
            <span v-for="(item, i) in currentFrame.callStack" :key="i" class="task-chip stack-chip">
              {{ item }}
            </span>
          </div>
        </div>

        <!-- Microtask Queue -->
        <div class="queue-card" :class="{ active: currentFrame.phase === 'microtask' }">
          <div class="queue-head">
            <span class="queue-title">
              🚄 {{ isEn ? 'Microtask Queue (FIFO - High Priority)' : '2. 微任务队列 Microtask Queue (特快列车 · 栈空必先全清)' }}
            </span>
            <span class="priority-pill p-micro">Priority #1</span>
          </div>
          <div class="queue-items">
            <span v-if="currentFrame.microQueue.length === 0" class="queue-empty">
              {{ isEn ? '[Queue Empty]' : '[队列为空]' }}
            </span>
            <span v-for="(item, i) in currentFrame.microQueue" :key="i" class="task-chip micro-chip">
              {{ item }}
            </span>
          </div>
        </div>

        <!-- rAF Queue -->
        <div class="queue-card" :class="{ active: currentFrame.phase === 'raf' }">
          <div class="queue-head">
            <span class="queue-title">
              🎨 {{ isEn ? 'Animation Frame Callbacks (rAF)' : '3. 渲染帧回调 requestAnimationFrame (UI 重绘前执行)' }}
            </span>
            <span class="priority-pill p-raf">Before Repaint</span>
          </div>
          <div class="queue-items">
            <span v-if="currentFrame.rafQueue.length === 0" class="queue-empty">
              {{ isEn ? '[Queue Empty]' : '[队列为空]' }}
            </span>
            <span v-for="(item, i) in currentFrame.rafQueue" :key="i" class="task-chip raf-chip">
              {{ item }}
            </span>
          </div>
        </div>

        <!-- Macrotask Queue -->
        <div class="queue-card" :class="{ active: currentFrame.phase === 'macrotask' }">
          <div class="queue-head">
            <span class="queue-title">
              🚂 {{ isEn ? 'Macrotask Queue (FIFO - setTimeout / I/O)' : '4. 宏任务队列 Macrotask Queue (普通列车 · 每轮仅取一个)' }}
            </span>
            <span class="priority-pill p-macro">Priority #2</span>
          </div>
          <div class="queue-items">
            <span v-if="currentFrame.macroQueue.length === 0" class="queue-empty">
              {{ isEn ? '[Queue Empty]' : '[队列为空]' }}
            </span>
            <span v-for="(item, i) in currentFrame.macroQueue" :key="i" class="task-chip macro-chip">
              {{ item }}
            </span>
          </div>
        </div>

        <!-- Idle Queue -->
        <div class="queue-card" :class="{ active: currentFrame.phase === 'idle' }">
          <div class="queue-head">
            <span class="queue-title">
              ☕ {{ isEn ? 'Idle Callbacks (requestIdleCallback)' : '5. 空闲回调 requestIdleCallback (站长彻底空闲时触发)' }}
            </span>
            <span class="priority-pill p-idle">Lowest Priority</span>
          </div>
          <div class="queue-items">
            <span v-if="currentFrame.idleQueue.length === 0" class="queue-empty">
              {{ isEn ? '[Queue Empty]' : '[队列为空]' }}
            </span>
            <span v-for="(item, i) in currentFrame.idleQueue" :key="i" class="task-chip idle-chip">
              {{ item }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.eventloop-sandbox {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scenario-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scenario-btn {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;

  &:hover,
  &.active {
    background-color: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }
}

.stationmaster-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 14px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
}

.sm-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.sm-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background-color: var(--accent-soft);
  color: var(--accent);
}

.sm-status {
  font-size: 14px;
  color: var(--text-primary);
}

.sm-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ctrl-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--bg-muted);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  transition: all 0.18s ease;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &.primary {
    background-color: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
}

.step-counter {
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
  color: var(--text-muted);
  margin-left: 4px;
}

.explanation-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--accent-soft);
  border: 1px solid var(--accent-border);
}

.exp-icon {
  font-size: 16px;
  line-height: 1.4;
}

.exp-text {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.55;
}

.sandbox-grid {
  display: grid;
  grid-template-columns: minmax(320px, 460px) 1fr;
  gap: 16px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.box-card,
.queue-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &.active {
    border-color: var(--accent-border);
    box-shadow: var(--shadow-sm);
  }
}

.box-header,
.queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background-color: var(--bg-muted);
  border-bottom: 1px solid var(--border-color);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.line-indicator {
  font-family: monospace;
  font-size: 11.5px;
  color: var(--accent);
}

.code-lines {
  padding: 10px 0;
  background-color: #0f172a;
  color: #cbd5e1;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}

.code-line {
  display: flex;
  align-items: center;
  padding: 3px 12px;
  transition: background-color 0.15s ease;

  &.active {
    background-color: rgba(56, 189, 248, 0.22);
    color: #fff;
    border-left: 3px solid #38bdf8;
  }
}

.line-no {
  width: 26px;
  flex-shrink: 0;
  color: #64748b;
  user-select: none;
}

.line-code {
  white-space: pre-wrap;
  word-break: break-all;
}

.console-body {
  padding: 12px 14px;
  min-height: 120px;
  background-color: #090d16;
  color: #a7f3d0;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.empty-tip {
  color: #64748b;
  font-size: 12px;
}

.log-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-order {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.priority-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.queue-items {
  padding: 12px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 46px;
  align-items: center;
}

.queue-empty {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.task-chip {
  padding: 5px 11px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  background-color: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.micro-chip {
  background-color: rgba(16, 185, 129, 0.14);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.35);
}

.raf-chip {
  background-color: rgba(139, 92, 246, 0.14);
  color: #7c3aed;
  border-color: rgba(139, 92, 246, 0.35);
}

.macro-chip {
  background-color: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.35);
}

.idle-chip {
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  border-color: var(--border-color);
}
</style>
