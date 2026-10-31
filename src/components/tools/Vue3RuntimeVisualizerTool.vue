<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  initLabsWasm,
  simulateVueDiffWithWasm,
  type VueDiffSimulationResult,
  type VueDiffStep,
} from '@/wasm-pkg/tool-labs';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const diffPresets = [
  {
    id: 'lis-classic',
    labelZh: '经典案例：双端预处理 + 最长递增子序列 (LIS) 最小移动',
    labelEn: 'Classic LIS: Sync Ends + Longest Increasing Subsequence',
    oldCsv: 'A, B, C, D, E, F, G',
    newCsv: 'A, B, E, C, D, H, F, G',
  },
  {
    id: 'only-mount',
    labelZh: '阶段三案例：头尾同步后仅新增挂载 (i > e1 && i <= e2)',
    labelEn: 'Stage 3: Common Sequence + Mount Only',
    oldCsv: 'A, B, F, G',
    newCsv: 'A, B, C, D, F, G',
  },
  {
    id: 'complex-shuffle',
    labelZh: '极限乱序：含卸载、新增与多节点跨位移动',
    labelEn: 'Complex Shuffle: Unmount + Mount + Multi-Move',
    oldCsv: 'A, B, C, D, E, F, G, H',
    newCsv: 'A, F, C, D, I, E, B, H',
  },
];

const oldCsvInput = ref(diffPresets[0].oldCsv);
const newCsvInput = ref(diffPresets[0].newCsv);
const currentStepIdx = ref(0);

const wasmExports = ref<Awaited<ReturnType<typeof initLabsWasm>> | null>(null);
const diffResult = ref<VueDiffSimulationResult>({
  authorized: true,
  newIdxToOldIdx: [],
  lisKeys: [],
  stats: { moves: 0, mounts: 0, unmounts: 0 },
  steps: [],
});

const oldKeysArr = computed(() =>
  oldCsvInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const newKeysArr = computed(() =>
  newCsvInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const currentStep = computed<VueDiffStep>(() => {
  const list = diffResult.value.steps;
  if (!list.length) {
    return {
      stage: '0. Init',
      i: 0,
      e1: 0,
      e2: 0,
      action: 'init',
      descZh: '正在初始化 Rust Wasm 快速 Diff 引擎...',
      descEn: 'Initializing Rust Wasm Fast Diff Engine...',
      domState: oldKeysArr.value,
    };
  }
  return list[Math.min(currentStepIdx.value, list.length - 1)];
});

const lisSet = computed(() => new Set(diffResult.value.lisKeys));

function applyPreset(p: (typeof diffPresets)[0]) {
  oldCsvInput.value = p.oldCsv;
  newCsvInput.value = p.newCsv;
}

function runDiffSimulation() {
  if (!wasmExports.value) return;
  currentStepIdx.value = 0;
  diffResult.value = simulateVueDiffWithWasm(
    wasmExports.value,
    oldCsvInput.value,
    newCsvInput.value
  );
}

// Reactive Track / Trigger Interactive Simulator State
const reactiveState = ref({
  msg: 'Hello Yunsin',
  count: 1,
  theme: 'dark',
});
const lastTriggeredKey = ref<'msg' | 'count' | 'theme'>('msg');
const triggerCountMap = ref({
  renderEffect: 1,
  computedGreeting: 1,
  watchMsgEffect: 0,
});

const depGraph = [
  {
    key: 'msg' as const,
    type: 'RefImpl<string>',
    subscribers: [
      { id: 'renderEffect', name: 'Component Render Effect (setupRenderEffect)' },
      { id: 'computedGreeting', name: 'ComputedRefImpl (fullGreeting)' },
      { id: 'watchMsgEffect', name: 'Watcher Pre-Flush Effect (watch(msg))' },
    ],
  },
  {
    key: 'count' as const,
    type: 'RefImpl<number>',
    subscribers: [{ id: 'renderEffect', name: 'Component Render Effect (setupRenderEffect)' }],
  },
  {
    key: 'theme' as const,
    type: 'ReactiveProxy.theme',
    subscribers: [{ id: 'renderEffect', name: 'Component Render Effect (setupRenderEffect)' }],
  },
];

function triggerReactiveMutation(key: 'msg' | 'count' | 'theme') {
  lastTriggeredKey.value = key;
  if (key === 'msg') {
    reactiveState.value.msg =
      reactiveState.value.msg === 'Hello Yunsin' ? 'Vue 3 Reactive Rocks!' : 'Hello Yunsin';
    triggerCountMap.value.renderEffect++;
    triggerCountMap.value.computedGreeting++;
    triggerCountMap.value.watchMsgEffect++;
  } else if (key === 'count') {
    reactiveState.value.count++;
    triggerCountMap.value.renderEffect++;
  } else {
    reactiveState.value.theme = reactiveState.value.theme === 'dark' ? 'light' : 'dark';
    triggerCountMap.value.renderEffect++;
  }
}

onMounted(async () => {
  wasmExports.value = await initLabsWasm();
  runDiffSimulation();
});

watch([oldCsvInput, newCsvInput], () => {
  runDiffSimulation();
});
</script>

<template>
  <div class="v3-runtime-tool">
    <!-- Section 1: Vue 3 Fast Diff (LIS) Stepper -->
    <div class="runtime-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">
            ⚡ {{ isEn ? '1. Vue 3 Fast Diff (patchKeyedChildren & LIS) Step-by-Step Animator' : '一、Vue 3 快速 Diff 算法（双端预处理 + 最长递增子序列 LIS）单步推演' }}
          </h2>
          <p class="card-sub">
            {{
              isEn
                ? 'Powered by Rust Wasm `vue3_get_sequence`: inspect pointers (i, e1, e2), LIS stationary anchors, and minimal DOM moves.'
                : '基于 Rust Wasm 还原 Vue 3 源码 `patchKeyedChildren` 与 `getSequence`：直观观察双端指针 (i, e1, e2) 与最长递增子序列锚点'
            }}
          </p>
        </div>
        <div class="stat-badges">
          <span class="stat-pill move-pill">
            {{ isEn ? 'DOM Moves:' : 'DOM 移动：' }} <strong>{{ diffResult.stats.moves }}</strong>
          </span>
          <span class="stat-pill mount-pill">
            {{ isEn ? 'Mounts:' : '新增挂载：' }} <strong>{{ diffResult.stats.mounts }}</strong>
          </span>
          <span class="stat-pill unmount-pill">
            {{ isEn ? 'Unmounts:' : '卸载节点：' }} <strong>{{ diffResult.stats.unmounts }}</strong>
          </span>
        </div>
      </div>

      <!-- Preset & Sequence Inputs -->
      <div class="diff-controls">
        <div class="preset-row">
          <button
            v-for="p in diffPresets"
            :key="p.id"
            type="button"
            class="preset-chip"
            @click="applyPreset(p)"
          >
            {{ isEn ? p.labelEn : p.labelZh }}
          </button>
        </div>

        <div class="input-grid">
          <label class="seq-field">
            <span>{{ isEn ? 'Old VNode Keys (c1):' : '旧 VNode 节点序列 (c1)：' }}</span>
            <input v-model="oldCsvInput" type="text" class="seq-input" />
          </label>
          <label class="seq-field">
            <span>{{ isEn ? 'New VNode Keys (c2):' : '新 VNode 节点序列 (c2)：' }}</span>
            <input v-model="newCsvInput" type="text" class="seq-input" />
          </label>
        </div>
      </div>

      <!-- Stepper Control Bar -->
      <div class="stepper-bar">
        <div class="stage-info">
          <span class="stage-tag">{{ currentStep.stage }}</span>
          <span class="pointer-readout">
            <code>i = {{ currentStep.i }}</code> · <code>e1 = {{ currentStep.e1 }}</code> ·
            <code>e2 = {{ currentStep.e2 }}</code>
          </span>
        </div>
        <div class="step-btns">
          <button
            type="button"
            class="step-btn"
            :disabled="currentStepIdx === 0"
            @click="currentStepIdx = 0"
          >
            ↺ {{ isEn ? 'Reset' : '重置' }}
          </button>
          <button
            type="button"
            class="step-btn"
            :disabled="currentStepIdx === 0"
            @click="currentStepIdx--"
          >
            ◀ {{ isEn ? 'Prev' : '上一步' }}
          </button>
          <button
            type="button"
            class="step-btn primary"
            :disabled="currentStepIdx >= diffResult.steps.length - 1"
            @click="currentStepIdx++"
          >
            {{ isEn ? 'Next Step' : '下一步' }} ▶ ({{ currentStepIdx + 1 }}/{{ diffResult.steps.length || 1 }})
          </button>
        </div>
      </div>

      <div class="step-desc-banner">
        💡 {{ isEn ? currentStep.descEn : currentStep.descZh }}
      </div>

      <!-- Visual Lanes: Old VNodes, New VNodes (with LIS Highlight), Live Simulated DOM -->
      <div class="lanes-container">
        <div class="vnode-lane">
          <div class="lane-label">
            {{ isEn ? 'Old Children (c1)' : '旧子节点列表 (c1)' }}
          </div>
          <div class="node-boxes">
            <div
              v-for="(k, idx) in oldKeysArr"
              :key="`old-${idx}-${k}`"
              class="vnode-box"
              :class="{
                'ptr-i': idx === currentStep.i,
                'ptr-end': idx === currentStep.e1,
              }"
            >
              <span class="node-idx">#{{ idx }}</span>
              <strong class="node-key">{{ k }}</strong>
              <span v-if="idx === currentStep.i" class="ptr-tag">i</span>
              <span v-if="idx === currentStep.e1" class="ptr-tag end">e1</span>
            </div>
          </div>
        </div>

        <div class="vnode-lane">
          <div class="lane-label">
            {{ isEn ? 'New Children (c2) & LIS Stationary Anchors' : '新子节点列表 (c2) — 绿色代表命中 LIS 最长递增子序列免移动锚点' }}
          </div>
          <div class="node-boxes">
            <div
              v-for="(k, idx) in newKeysArr"
              :key="`new-${idx}-${k}`"
              class="vnode-box"
              :class="{
                'is-lis': lisSet.has(k),
                'ptr-i': idx === currentStep.i,
                'ptr-end': idx === currentStep.e2,
              }"
            >
              <span class="node-idx">#{{ idx }}</span>
              <strong class="node-key">{{ k }}</strong>
              <span v-if="lisSet.has(k)" class="lis-badge">LIS Anchor</span>
              <span v-if="idx === currentStep.i" class="ptr-tag">i</span>
              <span v-if="idx === currentStep.e2" class="ptr-tag end">e2</span>
            </div>
          </div>
        </div>

        <div class="vnode-lane dom-lane">
          <div class="lane-label">
            🖥️ {{ isEn ? 'Real Browser DOM Order at Current Step' : '当前步骤真实 DOM 树节点顺序快照' }}
          </div>
          <div class="node-boxes">
            <div
              v-for="(k, idx) in currentStep.domState"
              :key="`dom-${idx}-${k}`"
              class="vnode-box dom-box"
              :class="{ 'is-lis': lisSet.has(k) }"
            >
              <span class="node-idx">DOM[{{ idx }}]</span>
              <strong class="node-key">&lt;li key="{{ k }}"&gt;</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Reactive Track & Trigger Dependency Graph -->
    <div class="runtime-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">
            🔗 {{ isEn ? '2. Vue 3 Reactive Dependency Graph (targetMap -> depsMap -> Dep Set)' : '二、Vue 3 响应式依赖收集 (track) 与精确派发更新 (trigger) 演练台' }}
          </h2>
          <p class="card-sub">
            {{
              isEn
                ? 'Click to mutate any reactive key below and watch how Vue 3 triggers only its subscribed ReactiveEffect set.'
                : '点击下方按钮修改响应式变量，观察 targetMap -> depsMap -> Dep(ReactiveEffect) 如何精准触发对应副作用函数'
            }}
          </p>
        </div>
      </div>

      <div class="reactive-grid">
        <div class="mutate-col">
          <div
            v-for="item in depGraph"
            :key="item.key"
            class="prop-card"
            :class="{ active: lastTriggeredKey === item.key }"
          >
            <div class="prop-top">
              <code class="prop-name">{{ item.key }}: {{ JSON.stringify(reactiveState[item.key]) }}</code>
              <span class="prop-type">{{ item.type }}</span>
            </div>
            <div class="sub-list">
              <div v-for="sub in item.subscribers" :key="sub.id" class="sub-pill">
                🎯 {{ sub.name }}
              </div>
            </div>
            <button
              type="button"
              class="trigger-btn"
              @click="triggerReactiveMutation(item.key)"
            >
              ⚡ {{ isEn ? `Mutate & trigger('${item.key}')` : `修改 ${item.key} 并触发 trigger('${item.key}')` }}
            </button>
          </div>
        </div>

        <div class="effects-col">
          <div class="effect-box" :class="{ highlight: true }">
            <div class="eff-head">
              <strong>1. Component Render Effect (setupRenderEffect)</strong>
              <span class="run-count">Runs: {{ triggerCountMap.renderEffect }}</span>
            </div>
            <p class="eff-desc">
              {{
                isEn
                  ? 'Subscribed to [msg, count, theme]. Schedules component re-render in microtask queue (`queueJob`).'
                  : '在首次渲染执行 render() 时通过 track() 收集了 [msg, count, theme] 三个依赖，任一变更均调度 queueJob 更新视图。'
              }}
            </p>
          </div>

          <div
            class="effect-box"
            :class="{ highlight: lastTriggeredKey === 'msg' }"
          >
            <div class="eff-head">
              <strong>2. ComputedRefImpl (`greeting = computed(() => msg.value)`)</strong>
              <span class="run-count">Evaluations: {{ triggerCountMap.computedGreeting }}</span>
            </div>
            <p class="eff-desc">
              {{
                isEn
                  ? 'Subscribed ONLY to [msg]. Modifying `count` or `theme` leaves this Computed dirty=false.'
                  : '仅在 Dep(msg) 集合中注册！修改 count 或 theme 时完全不会触发该计算属性重新求值。'
              }}
            </p>
          </div>

          <div
            class="effect-box"
            :class="{ highlight: lastTriggeredKey === 'msg' }"
          >
            <div class="eff-head">
              <strong>3. Watcher Callback (`watch(() => msg.value, cb)`)</strong>
              <span class="run-count">Triggered: {{ triggerCountMap.watchMsgEffect }}</span>
            </div>
            <p class="eff-desc">
              {{
                isEn
                  ? 'Subscribed ONLY to [msg]. Fires callback when `msg` changes.'
                  : '仅订阅 Dep(msg)，当 msg 发生变更时通过 scheduler 触发监听回调。'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.v3-runtime-tool {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.runtime-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-color);
}

.card-title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}

.card-sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);

  strong {
    color: var(--accent);
    font-weight: 800;
  }
}

.diff-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);

  &:hover {
    background-color: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}

.seq-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.seq-input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
}

.stepper-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
}

.stage-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.stage-tag {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
  background-color: var(--accent-soft);
  color: var(--accent);
}

.pointer-readout {
  font-size: 12.5px;
  color: var(--text-secondary);

  code {
    font-weight: 700;
    color: var(--text-primary);
  }
}

.step-btns {
  display: flex;
  gap: 8px;
}

.step-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-color);

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

.step-desc-banner {
  padding: 11px 14px;
  border-radius: 10px;
  background-color: var(--accent-soft);
  border: 1px solid var(--accent-border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.lanes-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vnode-lane {
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
}

.lane-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.node-boxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vnode-box {
  position: relative;
  min-width: 58px;
  padding: 8px 10px;
  border-radius: 10px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  &.is-lis {
    border-color: #10b981;
    background-color: rgba(16, 185, 129, 0.12);
  }

  &.ptr-i {
    box-shadow: 0 0 0 2px var(--accent);
  }
}

.node-idx {
  font-size: 10px;
  font-family: monospace;
  color: var(--text-muted);
}

.node-key {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-primary);
}

.lis-badge {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  background-color: #10b981;
  color: #fff;
}

.ptr-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 0 5px;
  border-radius: 4px;
  background-color: var(--accent);
  color: #fff;

  &.end {
    background-color: #f59e0b;
  }
}

.reactive-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.mutate-col,
.effects-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prop-card,
.effect-box {
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.active,
  &.highlight {
    border-color: var(--accent-border);
    background-color: var(--accent-soft);
  }
}

.prop-top,
.eff-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prop-name {
  font-weight: 800;
  font-size: 13px;
  color: var(--text-primary);
}

.prop-type,
.run-count {
  font-size: 11.5px;
  font-family: monospace;
  font-weight: 700;
  color: var(--accent);
}

.sub-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-pill {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.trigger-btn {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--accent);
  color: #fff;
  border: none;
}

.eff-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
