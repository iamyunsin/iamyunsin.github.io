<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  LLM_MODELS,
  DEFAULT_USD_TO_CNY,
  type LlmModelPricing,
} from '@/data/llmPricing';
import {
  initLlmCostWasm,
  analyzePromptWithWasm,
  calculateMonthlyCostWithWasm,
  type PromptAnalysisResult,
} from '@/wasm-pkg/tool-llm-cost';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// Wasm runtime state
const wasmInstance = ref<Awaited<ReturnType<typeof initLlmCostWasm>> | null>(null);
const wasmReady = ref(false);

// Tokenizer & Prompt state
const tokenizerProfile = ref<0 | 1 | 2 | 3>(0);
const showTokenIds = ref(false);
const promptText = ref(
  props.lang === 'en'
    ? `You are an expert Rust & WebAssembly architect.\nAnalyze the following JSON payload and return a concise summary:\n{"project": "yunsin.top", "engine": "rust-wasm", "cache_hit": 0.65}`
    : `你是一位资深 Rust 与 WebAssembly 架构师。\n请分析以下系统配置并输出性能优化建议：\n{"site": "yunsin.top", "engine": "rust-wasm", "daily_requests": 10000}`
);

// Cost Simulator Parameters
const inputTokens = ref<number>(1500);
const outputTokens = ref<number>(600);
const requestsPerDay = ref<number>(1000);
const cacheHitPercent = ref<number>(50);
const currency = ref<'CNY' | 'USD'>(props.lang === 'en' ? 'USD' : 'CNY');
const exchangeRate = ref<number>(DEFAULT_USD_TO_CNY);
const selectedProvider = ref<string>('ALL');
const sortBy = ref<'cost-asc' | 'default'>('cost-asc');

const samplePresets = computed(() =>
  isEn.value
    ? [
        {
          label: '🤖 RAG System Prompt',
          text: `You are a helpful AI assistant with access to retrieved knowledge chunks.\nAlways cite [doc_id] and respond in valid Markdown.\nContext: Rust WebAssembly runs at near-native speed inside modern browsers with 0 server cost.`,
        },
        {
          label: '🦀 Rust Function Code',
          text: `#[no_mangle]\npub extern "C" fn calculate_tokens(ptr: *const u8, len: usize) -> usize {\n    let slice = unsafe { std::slice::from_raw_parts(ptr, len) };\n    slice.iter().filter(|&&b| b != b' ').count()\n}`,
        },
        {
          label: '🌏 Multilingual JSON',
          text: `{"title_zh": "全球大模型 Token 成本计算器", "title_en": "LLM API Cost Calculator", "models": ["DeepSeek-V3", "Claude-3.7-Sonnet", "GPT-4o", "Gemini-2.5-Pro"]}`,
        },
      ]
    : [
        {
          label: '🤖 RAG 知识库系统提示词',
          text: `你是一个企业级智能助手，请严格基于以下检索到的上下文（Context）回答用户问题。\n如果上下文中不包含答案，请直接回答“未找到相关信息”，切勿编造事实。\n检索片段：Rust 编译为 WebAssembly 后可在浏览器本地实现毫秒级分词与图片压缩。`,
        },
        {
          label: '🦀 Rust Wasm 核心代码',
          text: `#[no_mangle]\npub extern "C" fn verify_domain(ptr: *const u8, len: usize) -> bool {\n    let host = unsafe { std::str::from_utf8_unchecked(std::slice::from_raw_parts(ptr, len)) };\n    host.ends_with("yunsin.top") || host == "localhost"\n}`,
        },
        {
          label: '📊 结构化 JSON 输出指令',
          text: `{"task": "抽取订单信息", "schema": {"orderId": "string", "items": [{"name": "DeepSeek API", "price": 0.27}], "currency": "CNY"}}`,
        },
      ]
);

const analysisResult = ref<PromptAnalysisResult>({
  totalTokens: 42,
  charCount: promptText.value.length,
  cjkCount: 0,
  wordCount: 12,
  symbolCount: 8,
  truncated: false,
  slices: [],
});

function runPromptAnalysis() {
  if (!wasmInstance.value) return;
  analysisResult.value = analyzePromptWithWasm(
    wasmInstance.value,
    promptText.value,
    tokenizerProfile.value
  );
}

onMounted(async () => {
  try {
    wasmInstance.value = await initLlmCostWasm();
    wasmReady.value = true;
    runPromptAnalysis();
  } catch (err) {
    console.error('Failed to initialize tool_llm_cost.wasm:', err);
  }
});

watch([promptText, tokenizerProfile], () => {
  runPromptAnalysis();
});

function syncPromptTokensToSimulator() {
  if (analysisResult.value.totalTokens > 0) {
    inputTokens.value = analysisResult.value.totalTokens;
  }
}

const currencySymbol = computed(() => (currency.value === 'CNY' ? '¥' : '$'));
const activeRate = computed(() => (currency.value === 'CNY' ? exchangeRate.value : 1.0));

interface ComputedModelRow {
  model: LlmModelPricing;
  monthlyCost: number;
  monthlyNoCacheCost: number;
  monthlySaved: number;
  per1kReqCost: number;
}

const computedRows = computed<ComputedModelRow[]>(() => {
  const ratio = cacheHitPercent.value / 100;
  const rate = activeRate.value;

  const filtered = LLM_MODELS.filter(
    (m) => selectedProvider.value === 'ALL' || m.provider === selectedProvider.value
  );

  const rows = filtered.map((model) => {
    let monthlyCost = 0;
    let monthlyNoCacheCost = 0;

    if (wasmInstance.value) {
      monthlyCost = calculateMonthlyCostWithWasm(wasmInstance.value, {
        inputTokens: inputTokens.value,
        outputTokens: outputTokens.value,
        requestsPerDay: requestsPerDay.value,
        cacheHitRatio: ratio,
        inputPricePerM: model.inputPricePerM,
        cachedPricePerM: model.cachedPricePerM,
        outputPricePerM: model.outputPricePerM,
        exchangeRate: rate,
      });
      monthlyNoCacheCost = calculateMonthlyCostWithWasm(wasmInstance.value, {
        inputTokens: inputTokens.value,
        outputTokens: outputTokens.value,
        requestsPerDay: requestsPerDay.value,
        cacheHitRatio: 0,
        inputPricePerM: model.inputPricePerM,
        cachedPricePerM: model.cachedPricePerM,
        outputPricePerM: model.outputPricePerM,
        exchangeRate: rate,
      });
    } else {
      // Instant SSR/hydration fallback before Wasm finishes streaming
      const uncachedIn = inputTokens.value * (1 - ratio);
      const cachedIn = inputTokens.value * ratio;
      const perReqUsd =
        (uncachedIn * model.inputPricePerM +
          cachedIn * model.cachedPricePerM +
          outputTokens.value * model.outputPricePerM) /
        1_000_000;
      monthlyCost = perReqUsd * requestsPerDay.value * 30 * rate;

      const noCacheReqUsd =
        (inputTokens.value * model.inputPricePerM +
          outputTokens.value * model.outputPricePerM) /
        1_000_000;
      monthlyNoCacheCost = noCacheReqUsd * requestsPerDay.value * 30 * rate;
    }

    const totalMonthlyReqs = Math.max(1, requestsPerDay.value * 30);
    const per1kReqCost = (monthlyCost / totalMonthlyReqs) * 1000;
    const monthlySaved = Math.max(0, monthlyNoCacheCost - monthlyCost);

    return {
      model,
      monthlyCost,
      monthlyNoCacheCost,
      monthlySaved,
      per1kReqCost,
    };
  });

  if (sortBy.value === 'cost-asc') {
    return [...rows].sort((a, b) => a.monthlyCost - b.monthlyCost);
  }
  return rows;
});

const maxMonthlyCost = computed(() => {
  const maxVal = Math.max(...computedRows.value.map((r) => r.monthlyCost), 0.01);
  return maxVal;
});

function formatMoney(val: number): string {
  if (val === 0) return '0.00';
  if (val < 0.01) return val.toFixed(4);
  if (val < 10) return val.toFixed(2);
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSliceDisplay(t: string): string {
  return t.replace(/ /g, '·').replace(/\n/g, '↵\n');
}
</script>

<template>
  <div class="llm-calc-root">
    <!-- Panel 1: Rust Wasm BPE/CJK Visual Tokenizer -->
    <div class="calc-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. Live Prompt Tokenizer & BPE Slicer' : '1. 实时 Prompt 分词切片可视化 (Rust Wasm)' }}
          </h2>
          <span class="wasm-status" :class="{ ready: wasmReady }">
            <span class="status-dot"></span>
            {{
              wasmReady
                ? isEn
                  ? 'Rust Wasm Engine Active (28.5 KB)'
                  : 'Rust Wasm 引擎已就绪 (28.5 KB)'
                : isEn
                  ? 'Loading Wasm...'
                  : '正在加载 Wasm...'
            }}
          </span>
        </div>

        <div class="tokenizer-select-wrap">
          <label class="field-label" for="tokenizer-profile-select">
            {{ isEn ? 'Tokenizer:' : '分词器模型：' }}
          </label>
          <select id="tokenizer-profile-select" v-model.number="tokenizerProfile" class="select-input">
            <option :value="0">OpenAI o200k_base (GPT-4o / o3)</option>
            <option :value="2">DeepSeek-V3 / R1 & Qwen (中文高压缩)</option>
            <option :value="1">Anthropic Claude 3.7 / 3.5</option>
            <option :value="3">Google Gemini 2.5 SentencePiece</option>
          </select>
        </div>
      </div>

      <!-- Preset Quick Fill Bar -->
      <div class="preset-bar">
        <span class="preset-label">{{ isEn ? 'Try sample:' : '填入测试示例：' }}</span>
        <button
          v-for="(preset, idx) in samplePresets"
          :key="idx"
          type="button"
          class="preset-btn"
          @click="promptText = preset.text"
        >
          {{ preset.label }}
        </button>
        <button
          type="button"
          class="preset-btn clear-btn"
          @click="promptText = ''"
        >
          {{ isEn ? 'Clear' : '清空' }}
        </button>
      </div>

      <!-- Split Editor & Visual Token Capsules -->
      <div class="tokenizer-split">
        <div class="prompt-input-col">
          <textarea
            v-model="promptText"
            class="prompt-textarea"
            :placeholder="
              isEn
                ? 'Paste your system prompt, JSON schema, or code snippet here (processed 100% locally in Rust Wasm)...'
                : '在此粘贴您的 Prompt 提示词、JSON 或代码片段（100% 在浏览器本地通过 Rust Wasm 分词，绝不上传服务器）...'
            "
            rows="7"
          ></textarea>
          <div class="prompt-actions-bar">
            <div class="mini-metrics">
              <span>
                <strong>{{ analysisResult.totalTokens }}</strong> Tokens
              </span>
              <span>·</span>
              <span>
                <strong>{{ analysisResult.charCount }}</strong> {{ isEn ? 'Chars' : '字符' }}
              </span>
              <span>·</span>
              <span>
                <strong>{{ analysisResult.cjkCount }}</strong> {{ isEn ? 'CJK' : '中文字' }}
              </span>
              <span>·</span>
              <span>
                <strong>{{ analysisResult.wordCount }}</strong> {{ isEn ? 'Words' : '英文词' }}
              </span>
            </div>
            <button type="button" class="sync-btn" @click="syncPromptTokensToSimulator">
              {{
                isEn
                  ? `↓ Use ${analysisResult.totalTokens} Tokens in Cost Simulator`
                  : `↓ 将 ${analysisResult.totalTokens} Tokens 同步至下方账单计算器`
              }}
            </button>
          </div>
        </div>

        <div class="token-visual-col">
          <div class="visual-head">
            <span class="visual-title">
              {{ isEn ? 'BPE Token Slices Preview' : 'BPE 分词切片染色预览' }}
            </span>
            <label class="toggle-id-label">
              <input v-model="showTokenIds" type="checkbox" />
              <span>{{ isEn ? 'Show Token IDs' : '显示 Token ID' }}</span>
            </label>
          </div>

          <div class="slices-box">
            <template v-if="analysisResult.slices.length > 0">
              <span
                v-for="(s, i) in analysisResult.slices"
                :key="i"
                class="token-chip"
                :class="`kind-${s.k}`"
                :title="`Token #${i + 1} | ID: ${s.id} | Type: ${s.k}`"
              >
                <span class="chip-text">{{ formatSliceDisplay(s.t) }}</span>
                <sub v-if="showTokenIds" class="chip-id">{{ s.id }}</sub>
              </span>
              <span v-if="analysisResult.truncated" class="truncated-tip">
                {{
                  isEn
                    ? `... (Showing first 220 slices out of ${analysisResult.totalTokens} tokens)`
                    : `...（为保证流畅度，仅染色预览前 220 个切片，总计 ${analysisResult.totalTokens} Tokens）`
                }}
              </span>
            </template>
            <div v-else class="empty-slices">
              {{ isEn ? 'Type or paste text on the left to inspect BPE token slices.' : '在左侧输入任意文本，即可实时查看大模型分词切片结果。' }}
            </div>
          </div>

          <div class="legend-bar">
            <span class="legend-item"><i class="dot kind-cjk"></i> {{ isEn ? 'CJK / Chinese' : '中文字符/词根' }}</span>
            <span class="legend-item"><i class="dot kind-word"></i> {{ isEn ? 'ASCII Subword' : '英文单词/子词' }}</span>
            <span class="legend-item"><i class="dot kind-num"></i> {{ isEn ? 'Number' : '数字切片' }}</span>
            <span class="legend-item"><i class="dot kind-sym"></i> {{ isEn ? 'Symbol / Code' : '代码符号/Emoji' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel 2: Interactive Multi-Model API Cost & Prompt Caching Simulator -->
    <div class="calc-card">
      <div class="card-head">
        <div>
          <h2 class="section-title">
            {{
              isEn
                ? '2. Global LLM API Cost & Prompt Caching Simulator'
                : '2. 全球主流大模型 API 月度账单与缓存节省计算器'
            }}
          </h2>
          <p class="section-sub">
            {{
              isEn
                ? 'Adjust request volume and prompt-caching hit rate to compare real-time monthly costs.'
                : '拖动滑块调节单次 Token 数、日调用量与「Prompt 缓存命中率」，实时对比各厂商真实月度账单。'
            }}
          </p>
        </div>

        <div class="toolbar-controls">
          <div class="currency-switch">
            <button
              type="button"
              class="curr-btn"
              :class="{ active: currency === 'CNY' }"
              @click="currency = 'CNY'"
            >
              CNY (¥ 人民币)
            </button>
            <button
              type="button"
              class="curr-btn"
              :class="{ active: currency === 'USD' }"
              @click="currency = 'USD'"
            >
              USD ($ 美元)
            </button>
          </div>
        </div>
      </div>

      <!-- 4 Interactive Sliders Grid -->
      <div class="sliders-grid">
        <div class="slider-box">
          <div class="slider-top">
            <label>{{ isEn ? 'Input Tokens / Request' : '单次输入 (Input Tokens)' }}</label>
            <div class="num-input-wrap">
              <input v-model.number="inputTokens" type="number" min="1" max="1000000" class="num-input" />
              <span class="unit">tok</span>
            </div>
          </div>
          <input v-model.number="inputTokens" type="range" min="50" max="32000" step="50" class="range-slider" />
          <div class="slider-Quick">
            <button type="button" @click="inputTokens = 500">500</button>
            <button type="button" @click="inputTokens = 2000">2K (RAG)</button>
            <button type="button" @click="inputTokens = 8000">8K (Agent)</button>
            <button type="button" @click="inputTokens = 32000">32K (Long)</button>
          </div>
        </div>

        <div class="slider-box">
          <div class="slider-top">
            <label>{{ isEn ? 'Output Tokens / Request' : '单次输出 (Output Tokens)' }}</label>
            <div class="num-input-wrap">
              <input v-model.number="outputTokens" type="number" min="1" max="200000" class="num-input" />
              <span class="unit">tok</span>
            </div>
          </div>
          <input v-model.number="outputTokens" type="range" min="50" max="8000" step="50" class="range-slider" />
          <div class="slider-Quick">
            <button type="button" @click="outputTokens = 200">200</button>
            <button type="button" @click="outputTokens = 800">800</button>
            <button type="button" @click="outputTokens = 2000">2K</button>
            <button type="button" @click="outputTokens = 4000">4K</button>
          </div>
        </div>

        <div class="slider-box">
          <div class="slider-top">
            <label>{{ isEn ? 'Daily API Requests' : '每日调用量 (Requests / Day)' }}</label>
            <div class="num-input-wrap">
              <input v-model.number="requestsPerDay" type="number" min="1" max="10000000" class="num-input" />
              <span class="unit">/day</span>
            </div>
          </div>
          <input v-model.number="requestsPerDay" type="range" min="10" max="50000" step="10" class="range-slider" />
          <div class="slider-Quick">
            <button type="button" @click="requestsPerDay = 100">100/d</button>
            <button type="button" @click="requestsPerDay = 1000">1K/d</button>
            <button type="button" @click="requestsPerDay = 10000">10K/d</button>
            <button type="button" @click="requestsPerDay = 50000">50K/d</button>
          </div>
        </div>

        <div class="slider-box highlight-cache">
          <div class="slider-top">
            <label>{{ isEn ? 'Prompt Cache Hit Rate' : 'Prompt 缓存命中率 (Cache Hit)' }}</label>
            <div class="num-input-wrap">
              <input v-model.number="cacheHitPercent" type="number" min="0" max="100" class="num-input" />
              <span class="unit">%</span>
            </div>
          </div>
          <input v-model.number="cacheHitPercent" type="range" min="0" max="95" step="5" class="range-slider" />
          <div class="slider-Quick">
            <button type="button" @click="cacheHitPercent = 0">0% (Off)</button>
            <button type="button" @click="cacheHitPercent = 50">50%</button>
            <button type="button" @click="cacheHitPercent = 75">75%</button>
            <button type="button" @click="cacheHitPercent = 90">90% (RAG)</button>
          </div>
        </div>
      </div>

      <!-- Filter & Sort Bar -->
      <div class="filter-bar">
        <div class="provider-pills">
          <button
            v-for="prov in ['ALL', 'DeepSeek', 'OpenAI', 'Anthropic', 'Google', 'Qwen']"
            :key="prov"
            type="button"
            class="prov-pill"
            :class="{ active: selectedProvider === prov }"
            @click="selectedProvider = prov"
          >
            {{ prov === 'ALL' ? (isEn ? 'All Models' : '全部厂商') : prov }}
          </button>
        </div>

        <div class="sort-wrap">
          <button
            type="button"
            class="sort-btn"
            @click="sortBy = sortBy === 'cost-asc' ? 'default' : 'cost-asc'"
          >
            {{
              sortBy === 'cost-asc'
                ? isEn
                  ? '📈 Sorted: Cheapest First'
                  : '📈 当前排序：按月度账单从低到高'
                : isEn
                  ? '📋 Default Order'
                  : '📋 默认厂商排序'
            }}
          </button>
        </div>
      </div>

      <!-- Comparison Table -->
      <div class="table-responsive">
        <table class="pricing-table">
          <thead>
            <tr>
              <th>{{ isEn ? 'Model & Provider' : '模型与厂商' }}</th>
              <th>{{ isEn ? 'Input / Cached (1M)' : '输入 / 缓存命中单价 (每百万)' }}</th>
              <th>{{ isEn ? 'Output (1M)' : '输出单价 (每百万)' }}</th>
              <th>{{ isEn ? 'Cost / 1K Reqs' : '每 1,000 次调用成本' }}</th>
              <th>{{ isEn ? 'Est. Monthly Bill (30d)' : '预估月度总账单 (30天)' }}</th>
              <th>{{ isEn ? 'Action / Official Offer' : '接入通道与特惠' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in computedRows" :key="row.model.id" :class="{ 'best-row': idx === 0 && sortBy === 'cost-asc' }">
              <td>
                <div class="model-cell">
                  <div class="model-name-line">
                    <span class="model-name">{{ row.model.name }}</span>
                    <span v-if="isEn ? row.model.badgeEn : row.model.badgeZh" class="model-badge">
                      {{ isEn ? row.model.badgeEn : row.model.badgeZh }}
                    </span>
                  </div>
                  <div class="model-meta-line">
                    <span class="prov-tag">{{ row.model.provider }}</span>
                    <span class="ctx-tag">{{ row.model.contextWindow }} ctx</span>
                  </div>
                </div>
              </td>

              <td class="num-col">
                <div class="unit-price">
                  ${{ row.model.inputPricePerM.toFixed(2) }}
                  <span class="cache-price" :title="isEn ? 'Cached Input Price per 1M tokens' : 'Prompt 缓存命中后每百万 Token 单价'">
                    (⚡ ${{ row.model.cachedPricePerM.toFixed(3) }})
                  </span>
                </div>
              </td>

              <td class="num-col">
                <div class="unit-price">${{ row.model.outputPricePerM.toFixed(2) }}</div>
              </td>

              <td class="num-col">
                <span class="req1k-val">{{ currencySymbol }}{{ formatMoney(row.per1kReqCost) }}</span>
              </td>

              <td class="bill-col">
                <div class="bill-main">
                  <span class="bill-amount">{{ currencySymbol }}{{ formatMoney(row.monthlyCost) }}</span>
                  <span v-if="row.monthlySaved > 0.01" class="saved-pill">
                    {{ isEn ? `Saved ${currencySymbol}${formatMoney(row.monthlySaved)}` : `缓存立省 ${currencySymbol}${formatMoney(row.monthlySaved)}` }}
                  </span>
                </div>
                <div class="cost-bar-track">
                  <div
                    class="cost-bar-fill"
                    :style="{ width: `${Math.max(3, Math.min(100, (row.monthlyCost / maxMonthlyCost) * 100))}%` }"
                  ></div>
                </div>
              </td>

              <td class="action-col">
                <a
                  :href="isEn ? row.model.affiliateUrlEn : row.model.affiliateUrlZh"
                  target="_blank"
                  rel="nofollow noopener sponsored"
                  class="row-cta-btn"
                >
                  {{ isEn ? row.model.ctaTextEn : row.model.ctaTextZh }} ↗
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.llm-calc-root {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.calc-card {
  padding: 22px 24px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.head-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.section-title {
  margin: 0;
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.section-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.wasm-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background-color: var(--bg-muted);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);

  &.ready {
    background-color: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.3);
  }
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
}

.tokenizer-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.select-input {
  padding: 6px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  outline: none;

  &:focus {
    border-color: var(--accent);
  }
}

.preset-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.preset-label {
  font-size: 12px;
  color: var(--text-muted);
}

.preset-btn {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
    background-color: var(--accent-soft);
  }

  &.clear-btn {
    margin-left: auto;
  }
}

.tokenizer-split {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.prompt-input-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prompt-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: var(--accent);
    background-color: var(--bg-surface);
  }
}

.prompt-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.mini-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);

  strong {
    color: var(--accent);
    font-weight: 800;
  }
}

.sync-btn {
  padding: 6px 12px;
  border-radius: 9px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
}

.token-visual-col {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  padding: 12px 14px;
}

.visual-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.visual-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.toggle-id-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.slices-box {
  flex: 1;
  min-height: 132px;
  max-height: 190px;
  overflow-y: auto;
  padding: 8px;
  border-radius: 8px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
}

.token-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 5px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-all;

  &.kind-cjk {
    background-color: rgba(59, 130, 246, 0.15);
    color: #2563eb;
    border: 1px solid rgba(59, 130, 246, 0.28);
  }
  &.kind-word {
    background-color: rgba(16, 185, 129, 0.14);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.28);
  }
  &.kind-num {
    background-color: rgba(245, 158, 11, 0.16);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  &.kind-sym {
    background-color: rgba(139, 92, 246, 0.15);
    color: #7c3aed;
    border: 1px solid rgba(139, 92, 246, 0.28);
  }
  &.kind-ws {
    background-color: var(--bg-muted);
    color: var(--text-muted);
    border: 1px dashed var(--border-color);
  }
  &.kind-trap {
    background-color: rgba(239, 68, 68, 0.2);
    color: #dc2626;
    font-weight: 700;
  }
}

.chip-id {
  font-size: 9.5px;
  opacity: 0.75;
}

.truncated-tip {
  width: 100%;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.empty-slices {
  color: var(--text-muted);
  font-size: 12.5px;
  padding: 24px 8px;
}

.legend-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 3px;
    display: inline-block;

    &.kind-cjk {
      background-color: #3b82f6;
    }
    &.kind-word {
      background-color: #10b981;
    }
    &.kind-num {
      background-color: #f59e0b;
    }
    &.kind-sym {
      background-color: #8b5cf6;
    }
  }
}

.currency-switch {
  display: inline-flex;
  border-radius: 10px;
  padding: 3px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.curr-btn {
  padding: 5px 12px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--bg-surface);
    color: var(--accent);
    box-shadow: var(--shadow-sm);
  }
}

.sliders-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.slider-box {
  padding: 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.highlight-cache {
    border-color: var(--accent-border);
    background-color: var(--accent-soft);
  }
}

.slider-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }
}

.num-input-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.num-input {
  width: 72px;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 800;
  text-align: right;
}

.unit {
  font-size: 11px;
  color: var(--text-muted);
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}

.slider-Quick {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;

  button {
    flex: 1;
    padding: 3px 4px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background-color: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 11px;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.provider-pills {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.prov-pill {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &.active {
    background-color: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
}

.sort-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.pricing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    text-align: left;
    padding: 12px 10px;
    border-bottom: 2px solid var(--border-color);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  td {
    padding: 13px 10px;
    border-bottom: 1px solid var(--border-subtle);
    vertical-align: middle;
  }

  tr:hover td {
    background-color: var(--bg-muted);
  }

  tr.best-row td {
    background-color: rgba(16, 185, 129, 0.06);
  }
}

.model-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.model-name {
  font-weight: 800;
  color: var(--text-primary);
  font-size: 14px;
}

.model-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  background-color: var(--accent-soft);
  color: var(--accent);
}

.model-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.unit-price {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  color: var(--text-primary);
}

.cache-price {
  font-size: 11.5px;
  color: #10b981;
  font-weight: 700;
  margin-left: 4px;
}

.req1k-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  color: var(--text-secondary);
}

.bill-col {
  min-width: 190px;
}

.bill-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.bill-amount {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--accent);
}

.saved-pill {
  font-size: 11px;
  font-weight: 700;
  color: #10b981;
}

.cost-bar-track {
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background-color: var(--border-color);
  overflow: hidden;
}

.cost-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #10b981, var(--accent));
}

.row-cta-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background-color: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.18s ease;

  &:hover {
    background-color: var(--accent);
    color: #fff;
  }
}
</style>
