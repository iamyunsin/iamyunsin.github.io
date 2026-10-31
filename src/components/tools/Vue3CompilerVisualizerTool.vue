<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  initLabsWasm,
  compileVueTemplateWithWasm,
  type VueCompileResult,
  type VueAstNodeItem,
} from '@/wasm-pkg/tool-labs';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const presets = [
  {
    id: 'hoist-patch',
    labelZh: '案例 1：静态提升 (_hoisted) + PatchFlags 靶向更新',
    labelEn: 'Preset 1: Static Hoisting + Bitwise PatchFlags',
    code: `<template>
  <div class="user-card" :class="themeMode">
    <header class="static-banner">⚡ VIP 静态徽章（自动静态提升）</header>
    <p class="greeting">Hello {{ userName }}!</p>
    <button :disabled="isLocked" @click="handleSend">发送消息</button>
  </div>
</template>`,
  },
  {
    id: 'vmodel-component',
    labelZh: '案例 2：组件通信与 v-model 双向绑定（对应博文示例）',
    labelEn: 'Preset 2: Component & v-model Compilation',
    code: `<template>
  <div class="app-root">
    <HelloWorld name="yunsin" v-model="msg" />
    <p class="preview">打招呼的消息：{{ msg }}</p>
    <input id="msg-input" v-model="msg" type="text" />
  </div>
</template>`,
  },
  {
    id: 'structural-block',
    labelZh: '案例 3：v-if / v-for 结构化指令与动态 Block 收集',
    labelEn: 'Preset 3: v-if / v-for Structural Directives & Block Tree',
    code: `<template>
  <section class="feed-list">
    <h2 class="feed-title">最新动态列表</h2>
    <div v-if="isLoading" class="skeleton">{{ loadingTip }}</div>
    <ul v-for="item in articleList" :key="item.id" :style="customStyle">
      <li>{{ item.title }}</li>
    </ul>
  </section>
</template>`,
  },
];

const selectedPreset = ref(presets[0].id);
const templateCode = ref(presets[0].code);
const activeStage = ref<'all' | 'tokens' | 'ast' | 'codegen'>('all');
const copied = ref(false);

const wasmExports = ref<Awaited<ReturnType<typeof initLabsWasm>> | null>(null);
const compileResult = ref<VueCompileResult>({
  authorized: true,
  tokens: [],
  ast: {
    nodeType: 'Root (0)',
    tag: 'ROOT',
    patchFlag: 0,
    isBlock: true,
    isHoisted: false,
    patchFlagNames: [],
    dynamicProps: [],
    attrs: [],
    children: [],
  },
  hoistedCount: 0,
  dynamicBlockNodes: [],
  renderCode: '// Loading Rust Wasm Vue 3 Compiler Engine...',
});

const patchFlagReference = [
  { bit: 1, name: 'TEXT', descZh: '动态文本插值 {{ val }}', descEn: 'Dynamic text content' },
  { bit: 2, name: 'CLASS', descZh: '动态 class 绑定 :class', descEn: 'Dynamic class binding' },
  { bit: 4, name: 'STYLE', descZh: '动态 style 绑定 :style', descEn: 'Dynamic style binding' },
  { bit: 8, name: 'PROPS', descZh: '非 class/style 的动态属性或事件', descEn: 'Dynamic non-class/style props' },
  { bit: 64, name: 'STABLE_FRAGMENT', descZh: '子节点顺序稳定的 Fragment / v-if 分支', descEn: 'Fragment with stable child order' },
  { bit: 128, name: 'KEYED_FRAGMENT', descZh: '带 key 的 v-for 列表 Fragment', descEn: 'Fragment with keyed children (v-for)' },
  { bit: -1, name: 'HOISTED', descZh: '纯静态节点，提升至渲染函数外部仅创建一次', descEn: 'Static node hoisted outside render()' },
];

function selectPreset(id: string) {
  selectedPreset.value = id;
  const found = presets.find((p) => p.id === id);
  if (found) {
    templateCode.value = found.code;
  }
}

function runCompiler() {
  if (!wasmExports.value) return;
  compileResult.value = compileVueTemplateWithWasm(wasmExports.value, templateCode.value);
}

interface FlatAstRow {
  depth: number;
  node: VueAstNodeItem;
}

function flattenAst(node: VueAstNodeItem, depth = 0, out: FlatAstRow[] = []): FlatAstRow[] {
  out.push({ depth, node });
  for (const child of node.children) {
    flattenAst(child, depth + 1, out);
  }
  return out;
}

const flatAstRows = computed(() => flattenAst(compileResult.value.ast));

const activeBitsSet = computed(() => {
  const set = new Set<number>();
  for (const row of flatAstRows.value) {
    const f = row.node.patchFlag;
    if (f === -1) set.add(-1);
    else if (f > 0) {
      for (const item of patchFlagReference) {
        if (item.bit > 0 && (f & item.bit) !== 0) {
          set.add(item.bit);
        }
      }
    }
  }
  return set;
});

async function copyRenderCode() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(compileResult.value.renderCode);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1800);
  }
}

onMounted(async () => {
  wasmExports.value = await initLabsWasm();
  runCompiler();
});

watch(templateCode, () => {
  runCompiler();
});
</script>

<template>
  <div class="v3-compiler-tool">
    <!-- Top Pipeline Stepper Banner -->
    <div class="pipeline-bar">
      <div class="pipeline-step">
        <span class="step-num">1</span>
        <div class="step-text">
          <strong>{{ isEn ? 'Lexical Analysis (Tokenizer)' : '词法分析 (Tokenizer)' }}</strong>
          <span>{{ compileResult.tokens.length }} {{ isEn ? 'Tokens' : '个词法标记' }}</span>
        </div>
      </div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-step">
        <span class="step-num">2</span>
        <div class="step-text">
          <strong>{{ isEn ? 'Syntax Parse (Template AST)' : '语法分析 (Template AST)' }}</strong>
          <span>{{ flatAstRows.length }} {{ isEn ? 'AST Nodes' : '个语法树节点' }}</span>
        </div>
      </div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-step">
        <span class="step-num">3</span>
        <div class="step-text">
          <strong>{{ isEn ? 'Transform & Hoisting' : '转换优化 (JS AST & 静态提升)' }}</strong>
          <span>
            {{ compileResult.hoistedCount }} {{ isEn ? 'Hoisted' : '处静态提升' }} ·
            {{ compileResult.dynamicBlockNodes.length }} {{ isEn ? 'Dynamic Nodes' : '处靶向节点' }}
          </span>
        </div>
      </div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-step">
        <span class="step-num">4</span>
        <div class="step-text">
          <strong>{{ isEn ? 'Codegen (Render Function)' : '代码生成 (Render 函数)' }}</strong>
          <span>Block Tree + PatchFlags</span>
        </div>
      </div>
    </div>

    <!-- Preset Selector Bar -->
    <div class="preset-bar">
      <span class="preset-label">{{ isEn ? '🎯 Quick Presets:' : '🎯 经典编译案例切换：' }}</span>
      <div class="preset-buttons">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          class="preset-btn"
          :class="{ active: selectedPreset === p.id }"
          @click="selectPreset(p.id)"
        >
          {{ isEn ? p.labelEn : p.labelZh }}
        </button>
      </div>
    </div>

    <!-- Main Dual-Pane Workspace -->
    <div class="workspace-grid">
      <!-- Left: Template Editor + PatchFlags Bitwise Matrix -->
      <div class="editor-column">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">
              📝 {{ isEn ? 'Vue 3 SFC <template> Input' : 'Vue 3 SFC <template> 源码输入（实时编译）' }}
            </span>
            <span class="live-pill">{{ isEn ? '⚡ Real-Time Wasm AST' : '⚡ 实时解析' }}</span>
          </div>
          <textarea
            v-model="templateCode"
            class="code-textarea"
            spellcheck="false"
            rows="11"
          ></textarea>
        </div>

        <!-- Bitwise PatchFlags Inspector -->
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">
              🎯 {{ isEn ? 'Active PatchFlags Bitmask Inspector' : 'PatchFlags 靶向更新位运算命中矩阵' }}
            </span>
          </div>
          <div class="flag-grid">
            <div
              v-for="f in patchFlagReference"
              :key="f.bit"
              class="flag-item"
              :class="{ hit: activeBitsSet.has(f.bit) }"
            >
              <div class="flag-top">
                <code class="flag-name">{{ f.name }}</code>
                <span class="flag-bit">{{ f.bit === -1 ? '-1' : `1 << ${Math.log2(f.bit)} (${f.bit})` }}</span>
              </div>
              <p class="flag-desc">{{ isEn ? f.descEn : f.descZh }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Multi-Stage Compiler Output -->
      <div class="output-column">
        <div class="panel-card output-card">
          <div class="panel-header">
            <div class="tab-group">
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeStage === 'all' }"
                @click="activeStage = 'all'"
              >
                {{ isEn ? '🔍 Full Overview' : '🔍 全链路总览' }}
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeStage === 'tokens' }"
                @click="activeStage = 'tokens'"
              >
                {{ isEn ? '1. Lexer Tokens' : '1. 词法 Token 流' }} ({{ compileResult.tokens.length }})
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeStage === 'ast' }"
                @click="activeStage = 'ast'"
              >
                {{ isEn ? '2. AST & Transform' : '2. AST 树与转换标记' }}
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeStage === 'codegen' }"
                @click="activeStage = 'codegen'"
              >
                {{ isEn ? '3. Render Codegen' : '3. 生成 Render 代码' }}
              </button>
            </div>
            <button type="button" class="copy-btn" @click="copyRenderCode">
              {{ copied ? (isEn ? '✅ Copied' : '✅ 已复制') : isEn ? '📋 Copy Render JS' : '📋 复制 Render 代码' }}
            </button>
          </div>

          <div class="output-body">
            <!-- Section A: Generated Render Code -->
            <div v-if="activeStage === 'all' || activeStage === 'codegen'" class="stage-block">
              <div class="stage-subtitle">
                <span>⚡ {{ isEn ? 'Generated JS Render Function (`generate`)' : '阶段四：代码生成器产物 (`generate` -> `render()`)' }}</span>
                <span class="stage-hint">
                  {{ isEn ? 'Notice _hoisted_* outside render() and numeric PatchFlags comments' : '留意提取到函数外部的 _hoisted_* 常量与行尾的 PatchFlags 注释' }}
                </span>
              </div>
              <pre class="code-output"><code>{{ compileResult.renderCode }}</code></pre>
            </div>

            <!-- Section B: AST Tree & Block Tree -->
            <div v-if="activeStage === 'all' || activeStage === 'ast'" class="stage-block">
              <div class="stage-subtitle">
                <span>🌳 {{ isEn ? 'Template AST & JS Transform Annotations (`parse` + `transform`)' : '阶段二 & 三：语法树 AST 与静态提升 / 动态属性标注' }}</span>
              </div>
              <div class="ast-tree-list">
                <div
                  v-for="(row, idx) in flatAstRows"
                  :key="idx"
                  class="ast-row"
                  :style="{ paddingLeft: `${row.depth * 20 + 12}px` }"
                >
                  <span class="ast-type-badge">{{ row.node.nodeType }}</span>
                  <code class="ast-tag">{{ row.node.tag }}</code>
                  <span v-if="row.node.isBlock" class="ast-pill block-pill">Block Tree Root</span>
                  <span v-if="row.node.isHoisted && row.node.tag !== '#text'" class="ast-pill hoist-pill">
                    _hoisted (-1)
                  </span>
                  <span
                    v-for="fn in row.node.patchFlagNames"
                    :key="fn"
                    class="ast-pill flag-pill"
                  >
                    PatchFlag: {{ fn }}
                  </span>
                  <span v-if="row.node.dynamicProps.length > 0" class="ast-dyn-props">
                    dynamicProps: [{{ row.node.dynamicProps.join(', ') }}]
                  </span>
                  <span v-if="row.node.interpolation" class="ast-expr">
                    _ctx.{{ row.node.interpolation }}
                  </span>
                  <span v-else-if="row.node.text" class="ast-text">
                    "{{ row.node.text }}"
                  </span>
                </div>
              </div>
            </div>

            <!-- Section C: Lexical Tokens -->
            <div v-if="activeStage === 'all' || activeStage === 'tokens'" class="stage-block">
              <div class="stage-subtitle">
                <span>🧩 {{ isEn ? 'Lexical Token Stream (`baseParse` Tokenizer)' : '阶段一：有限状态机词法分析 Token 流' }}</span>
              </div>
              <div class="token-stream">
                <div v-for="(tk, i) in compileResult.tokens" :key="i" class="token-chip" :data-kind="tk.kind">
                  <span class="token-kind">{{ tk.kind }}</span>
                  <code class="token-raw">{{ tk.raw }}</code>
                  <span class="token-detail">{{ tk.detail }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.v3-compiler-tool {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pipeline-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 14px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
}

.pipeline-step {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-num {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background-color: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text {
  display: flex;
  flex-direction: column;
  font-size: 12.5px;

  strong {
    color: var(--text-primary);
    font-weight: 700;
  }

  span {
    color: var(--text-muted);
    font-size: 11.5px;
  }
}

.pipeline-arrow {
  color: var(--text-muted);
  font-weight: 700;

  @media (max-width: 768px) {
    display: none;
  }
}

.preset-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.preset-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
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

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(320px, 440px) 1fr;
  gap: 18px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
}

.editor-column,
.output-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.panel-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-muted);
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.live-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background-color: var(--accent-soft);
  color: var(--accent);
}

.code-textarea {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  padding: 14px 16px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  background-color: var(--bg-surface);
  color: var(--text-primary);
  resize: vertical;
}

.flag-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
}

.flag-item {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-muted);
  opacity: 0.65;
  transition: all 0.2s ease;

  &.hit {
    opacity: 1;
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
  }
}

.flag-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.flag-name {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
}

.flag-bit {
  font-size: 11px;
  font-family: monospace;
  color: var(--text-muted);
}

.flag-desc {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.tab-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tab-btn {
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);

  &.active {
    background-color: var(--bg-surface);
    color: var(--accent);
    border-color: var(--accent-border);
  }
}

.copy-btn {
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-color);

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.output-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stage-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-subtitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.stage-hint {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-muted);
}

.code-output {
  margin: 0;
  padding: 14px 16px;
  border-radius: 10px;
  background-color: #0f172a;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.65;
  overflow-x: auto;
}

.ast-tree-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
}

.ast-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  font-size: 12px;
}

.ast-type-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.ast-tag {
  font-weight: 800;
  color: var(--text-primary);
  background-color: var(--bg-muted);
  padding: 1px 6px;
  border-radius: 4px;
}

.ast-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;

  &.block-pill {
    background-color: rgba(59, 130, 246, 0.14);
    color: #2563eb;
  }

  &.hoist-pill {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }

  &.flag-pill {
    background-color: var(--accent-soft);
    color: var(--accent);
  }
}

.ast-dyn-props {
  font-size: 11px;
  font-family: monospace;
  color: #d97706;
}

.ast-expr {
  font-family: monospace;
  font-weight: 700;
  color: var(--accent);
}

.ast-text {
  color: var(--text-secondary);
  font-style: italic;
}

.token-stream {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.token-chip {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 8px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  font-size: 12px;
}

.token-kind {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--accent);
}

.token-raw {
  font-family: monospace;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-all;
}

.token-detail {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
