<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  generateBarcodeSvg,
  computeGs1CheckDigit,
  decodeImageBarcodes,
  type BarcodeFormat,
  type DecodedCodeItem,
} from '@/utils/qrBarcodeEngine';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

type ActiveTab = 'batch' | 'decoder';
const activeTab = ref<ActiveTab>('batch');

const format = ref<BarcodeFormat>('EAN13');
const barWidth = ref<number>(2);
const barHeight = ref<number>(64);
const showText = ref<boolean>(true);
const showHeaderTitle = ref<boolean>(true);
const gridCols = ref<number>(3);
const gridGap = ref<number>(12);
const showCutBorder = ref<boolean>(true);

const SAMPLE_EAN13 = `690123456789 | 极客机械键盘轴体礼盒 ¥199
692345065771 | 农夫山泉东方树叶 500ml ¥5.5
694148721955 | 小米氮化镓 67W 快充头 ¥99
697024189310 | 独立开发者的咖啡挂耳包 ¥39
693536405128 | TP-LINK 双频千兆路由器 ¥159
690295288004 | 晨光 0.5mm 顺滑按动中性笔 ¥2.5
695817392041 | 蓝宝石防窥钢化膜 2片装 ¥29.9
691003847562 | Type-C 100W 编织数据线 1.5m ¥19.9`;

const SAMPLE_CODE128 = `SKU-KB-2026-PRO | 机械键盘 Pro 黑轴版 ¥299
SF-EXP-9088123 | 顺丰特快仓配单 #9088
FBA-X0029A81B | 亚马逊 FBA 入库标签 A区
WH-SH-A01-08 | 上海一号仓 A01 货架位
ORD-20261101-88 | 跨境独立站订单包裹 #88
SKU-USB4-CABLE | 雷电 4 40Gbps 高速线 ¥89
ASSET-MAC-042 | 研发部固定资产编号 #042
LOT-2026-BATCH9 | 生产批次溯源码 Batch-9`;

const SAMPLE_UPCA = `03600029145 | Kleenex Facial Tissue $2.99
01234567890 | Indie Hardware DevKit $49.00
04210000526 | Campbell Soup Classic $1.89
07800008246 | Dr Pepper 12oz Can $1.25
63938200039 | USB-C PD Trigger Board $8.50
05100001251 | Organic Roast Coffee $12.99
02100065883 | Kraft Cheddar Block $4.49
88590995080 | Apple Adapter Accessory $19.00`;

const SAMPLE_CODE39 = `INDIE-001 | 工业仓储托盘号 #001
PART-A908 | 精密CNC铝合金外壳
RACK-B12 | 深圳保税仓 B12 货位
DEV-7788 | 内部测试样机资产贴
LOT-2026A | 质检合格批次码 A
BOX-8890 | 外贸出口箱唛编号
TOOL-305 | 产线校准治具编号
QC-PASS1 | 老化测试通过标签`;

const batchInput = ref<string>(SAMPLE_EAN13);

function loadSampleForFormat(targetFormat?: BarcodeFormat) {
  const fmt = targetFormat || format.value;
  if (fmt === 'EAN13') batchInput.value = SAMPLE_EAN13;
  else if (fmt === 'CODE128') batchInput.value = SAMPLE_CODE128;
  else if (fmt === 'UPCA') batchInput.value = SAMPLE_UPCA;
  else batchInput.value = SAMPLE_CODE39;
}

function handleFormatChange(newFmt: BarcodeFormat) {
  format.value = newFmt;
  loadSampleForFormat(newFmt);
}

interface ParsedBarcodeItem {
  id: string;
  rawCode: string;
  labelTitle: string;
  valid: boolean;
  normalizedValue: string;
  checkDigit?: string;
  error?: string;
  svg: string;
}

const barcodeItems = computed<ParsedBarcodeItem[]>(() => {
  const lines = batchInput.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const parts = line.split('|');
    const rawCode = (parts[0] || '').trim();
    const labelTitle = parts.slice(1).join('|').trim();
    const res = generateBarcodeSvg(rawCode, format.value, {
      barWidth: barWidth.value,
      height: barHeight.value,
      showText: showText.value,
      labelTitle: showHeaderTitle.value ? labelTitle : undefined,
      fgColor: '#111827',
      bgColor: '#ffffff',
    });

    return {
      id: `${index}-${rawCode}`,
      rawCode,
      labelTitle,
      valid: res.encoded.valid,
      normalizedValue: res.encoded.normalizedValue,
      checkDigit: res.encoded.checkDigit,
      error: res.encoded.error,
      svg: res.svg,
    };
  });
});

const validCount = computed(() => barcodeItems.value.filter((i) => i.valid).length);

// Quick GS1 Check Digit Helper
const gs1ProbeInput = ref('690123456789');
const gs1ProbeResult = computed(() => {
  const clean = gs1ProbeInput.value.replace(/\D/g, '');
  if (!clean) return null;
  const cd = computeGs1CheckDigit(clean);
  return {
    base: clean,
    checkDigit: cd,
    full: clean + cd,
  };
});

function downloadSingleSvg(item: ParsedBarcodeItem) {
  if (!item.valid) return;
  const blob = new Blob([item.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `barcode-${item.normalizedValue}.svg`;
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadSinglePng(item: ParsedBarcodeItem) {
  if (!item.valid) return;
  const svgBlob = new Blob([item.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    URL.revokeObjectURL(url);
    const a = document.createElement('a');
    a.download = `barcode-${item.normalizedValue}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = url;
}

function printA4Sheet() {
  window.print();
}

// ==========================================
// Tab 2: Barcode Image Upload & Scanline Decoder
// ==========================================
interface DecodedBarcodeRow {
  id: string;
  fileName: string;
  previewUrl: string;
  items: DecodedCodeItem[];
  copied: boolean;
}

const decodedRows = ref<DecodedBarcodeRow[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

async function decodeSvgOrImageToRow(fileName: string, srcUrl: string) {
  const img = new Image();
  img.onload = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, img.naturalWidth || img.width || 400);
    canvas.height = Math.max(1, img.naturalHeight || img.height || 180);
    const ctx = canvas.getContext('2d');
    let imageData: ImageData | undefined;
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    const items = await decodeImageBarcodes(canvas, imageData);
    decodedRows.value.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName,
      previewUrl: canvas.toDataURL('image/png'),
      items,
      copied: false,
    });
  };
  img.src = srcUrl;
}

function handleDecoderFiles(files: FileList | File[]) {
  for (const f of Array.from(files)) {
    if (!f.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(f);
    decodeSvgOrImageToRow(f.name, url);
  }
}

function testFirstBarcodeInDecoder() {
  const firstValid = barcodeItems.value.find((i) => i.valid);
  if (!firstValid) return;
  activeTab.value = 'decoder';
  const blob = new Blob([firstValid.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  decodeSvgOrImageToRow(`sample-${firstValid.normalizedValue}.svg`, url);
}

async function copyDecodedText(row: DecodedBarcodeRow, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    row.copied = true;
    setTimeout(() => {
      row.copied = false;
    }, 1600);
  } catch {
    // ignore
  }
}
</script>

<template>
  <div class="barcode-printer-root">
    <!-- Top Mode Switcher -->
    <div class="mode-tabs-bar no-print">
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: activeTab === 'batch' }"
        @click="activeTab = 'batch'"
      >
        🖨️
        {{
          isEn
            ? 'Bulk Barcode Generator & A4 Label Sheet Printer'
            : '批量条形码生成与 A4 不干胶标签网格排版打印'
        }}
      </button>
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: activeTab === 'decoder' }"
        @click="activeTab = 'decoder'"
      >
        🔍
        {{
          isEn
            ? 'Barcode Image Upload & Scanline Decoder'
            : '条形码图片上传识别解码器（内置离线扫描线引擎）'
        }}
      </button>
    </div>

    <!-- TAB 1: BATCH GENERATOR & A4 PRINTER -->
    <div v-if="activeTab === 'batch'" class="batch-workspace">
      <!-- Configuration Card (Hidden when printing) -->
      <div class="config-card no-print">
        <div class="top-row-grid">
          <!-- Left: Multi-line Input -->
          <div class="input-col">
            <div class="label-bar">
              <label class="field-title">
                {{
                  isEn
                    ? 'Batch Input (One per line: Code | Product Title / Price)'
                    : '批量条码输入（每行一条，格式：条码内容 | 商品名称或价格标签）'
                }}
              </label>
              <button type="button" class="sample-btn" @click="loadSampleForFormat()">
                ✨ {{ isEn ? 'Load 8 E-Commerce Samples' : '填入 8 个电商商品条码示例' }}
              </button>
            </div>

            <textarea
              v-model="batchInput"
              rows="8"
              class="batch-textarea"
              :placeholder="
                isEn
                  ? '690123456789 | Mechanical Keyboard $99\n692345065771 | Green Tea 500ml $2.5'
                  : '690123456789 | 极客机械键盘 ¥199\nSKU-2026-01 | 顺丰仓储货架号'
              "
            ></textarea>

            <!-- GS1 Check Digit Live Calculator Bar -->
            <div class="gs1-helper-bar">
              <span class="gs1-badge">🧮 {{ isEn ? 'GS1 Check Digit Calculator:' : 'GS1 校验位自动补全计算器:' }}</span>
              <input
                v-model="gs1ProbeInput"
                type="text"
                maxlength="17"
                class="gs1-input"
                :placeholder="isEn ? 'Enter 12 digits (EAN) or 11 (UPC)' : '输入12位数字自动算第13位校验码'"
              />
              <span v-if="gs1ProbeResult" class="gs1-output">
                {{ isEn ? 'Check Digit:' : '校验位:' }}
                <strong>{{ gs1ProbeResult.checkDigit }}</strong>
                → {{ isEn ? 'Full Code:' : '完整条码:' }}
                <code>{{ gs1ProbeResult.full }}</code>
              </span>
            </div>
          </div>

          <!-- Right: Format & A4 Layout Controls -->
          <div class="controls-col">
            <div class="ctrl-group">
              <label class="field-title">{{ isEn ? '1. Barcode Standard' : '1. 条形码编码标准' }}</label>
              <div class="format-buttons">
                <button
                  type="button"
                  class="fmt-btn"
                  :class="{ active: format === 'EAN13' }"
                  @click="handleFormatChange('EAN13')"
                >
                  <strong>EAN-13</strong>
                  <span>{{ isEn ? '12/13-digit Retail' : '零售商品码 (自动算校验位)' }}</span>
                </button>
                <button
                  type="button"
                  class="fmt-btn"
                  :class="{ active: format === 'CODE128' }"
                  @click="handleFormatChange('CODE128')"
                >
                  <strong>Code 128-B</strong>
                  <span>{{ isEn ? 'Logistics / SKU / FBA' : '通用字母数字物流/SKU码' }}</span>
                </button>
                <button
                  type="button"
                  class="fmt-btn"
                  :class="{ active: format === 'UPCA' }"
                  @click="handleFormatChange('UPCA')"
                >
                  <strong>UPC-A</strong>
                  <span>{{ isEn ? '11/12-digit North America' : '北美商超 12位商品码' }}</span>
                </button>
                <button
                  type="button"
                  class="fmt-btn"
                  :class="{ active: format === 'CODE39' }"
                  @click="handleFormatChange('CODE39')"
                >
                  <strong>Code 39</strong>
                  <span>{{ isEn ? 'Industrial Asset Tag' : '工业制造与资产编号码' }}</span>
                </button>
              </div>
            </div>

            <div class="sliders-grid">
              <div class="ctrl-box">
                <div class="ctrl-top">
                  <label>{{ isEn ? 'Bar Width' : '单条线宽' }}</label>
                  <span class="val-badge">{{ barWidth }}px</span>
                </div>
                <input v-model.number="barWidth" type="range" min="1" max="4" step="0.5" class="range-slider" />
              </div>

              <div class="ctrl-box">
                <div class="ctrl-top">
                  <label>{{ isEn ? 'Bar Height' : '条码高度' }}</label>
                  <span class="val-badge">{{ barHeight }}px</span>
                </div>
                <input v-model.number="barHeight" type="range" min="40" max="110" step="4" class="range-slider" />
              </div>

              <div class="ctrl-box">
                <div class="ctrl-top">
                  <label>{{ isEn ? 'A4 Grid Columns' : 'A4 排版列数' }}</label>
                  <span class="val-badge">{{ gridCols }} {{ isEn ? 'Cols' : '列' }}</span>
                </div>
                <select v-model.number="gridCols" class="select-input">
                  <option :value="2">{{ isEn ? '2 Columns (Large Labels)' : '2 列（大号物流箱唛贴）' }}</option>
                  <option :value="3">{{ isEn ? '3 Columns (Standard A4)' : '3 列（标准商品不干胶）' }}</option>
                  <option :value="4">{{ isEn ? '4 Columns (Compact SKU)' : '4 列（紧凑型货架签）' }}</option>
                  <option :value="5">{{ isEn ? '5 Columns (Mini Price Tag)' : '5 列（迷你珠宝/文具签）' }}</option>
                </select>
              </div>

              <div class="ctrl-box">
                <div class="ctrl-top">
                  <label>{{ isEn ? 'Grid Gap' : '标签间距' }}</label>
                  <span class="val-badge">{{ gridGap }}px</span>
                </div>
                <input v-model.number="gridGap" type="range" min="6" max="24" step="2" class="range-slider" />
              </div>
            </div>

            <div class="toggles-row">
              <label class="check-pill">
                <input v-model="showHeaderTitle" type="checkbox" />
                <span>{{ isEn ? 'Show Product Header' : '显示顶部商品名/价格' }}</span>
              </label>
              <label class="check-pill">
                <input v-model="showText" type="checkbox" />
                <span>{{ isEn ? 'Show Code Digits' : '显示底部可读编码' }}</span>
              </label>
              <label class="check-pill">
                <input v-model="showCutBorder" type="checkbox" />
                <span>{{ isEn ? 'Dashed Cut Lines' : '显示裁切虚线框' }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="action-toolbar">
          <div class="stat-summary">
            {{ isEn ? 'Valid Barcodes Ready:' : '已生成有效条形码:' }}
            <strong class="accent-num">{{ validCount }}</strong> / {{ barcodeItems.length }}
          </div>
          <div class="toolbar-btns">
            <button type="button" class="secondary-btn" @click="testFirstBarcodeInDecoder">
              🧪 {{ isEn ? 'Send 1st Barcode to Decoder' : '将首个条形码送入解码器验证' }}
            </button>
            <button type="button" class="primary-print-btn" @click="printA4Sheet">
              🖨️ {{ isEn ? 'Print A4 Sticker Sheet (PDF / Printer)' : '一键打印 A4 不干胶标签页（或另存为 PDF）' }}
            </button>
          </div>
        </div>
      </div>

      <!-- A4 Printable Sticker Sheet -->
      <div class="a4-sheet-container">
        <div class="sheet-banner no-print">
          <span>📄 {{ isEn ? 'A4 Sticker Sheet Live Preview (Print-Ready Vector SVG)' : 'A4 不干胶标签排版实时预览（100% 矢量 SVG 印刷级清晰度）' }}</span>
          <span class="hint-text">{{ isEn ? 'Tip: In browser Print dialog, enable "Save as PDF" or print on A4 sticker paper.' : '提示：点击上方打印按钮，可在系统打印窗口直接连接打印机或选择“另存为 PDF”' }}</span>
        </div>

        <div
          class="a4-barcode-grid"
          :style="{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gap: `${gridGap}px`,
          }"
        >
          <div
            v-for="item in barcodeItems"
            :key="item.id"
            class="barcode-cell"
            :class="{ 'cut-border': showCutBorder, invalid: !item.valid }"
          >
            <template v-if="item.valid">
              <div class="svg-render-box" v-html="item.svg"></div>
              <div class="cell-actions no-print">
                <span v-if="item.checkDigit && (format === 'EAN13' || format === 'UPCA')" class="cd-tag">
                  {{ isEn ? 'Check:' : '校验位:' }} {{ item.checkDigit }}
                </span>
                <button type="button" class="mini-dl-btn" @click="downloadSinglePng(item)">PNG</button>
                <button type="button" class="mini-dl-btn" @click="downloadSingleSvg(item)">SVG</button>
              </div>
            </template>
            <template v-else>
              <div class="invalid-box">
                <strong>⚠️ {{ item.rawCode || 'Empty' }}</strong>
                <p>{{ item.error }}</p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: BARCODE IMAGE DECODER -->
    <div v-else class="decoder-workspace no-print">
      <div class="config-card">
        <div class="label-bar">
          <div>
            <h3 class="field-title">
              {{
                isEn
                  ? '1D Barcode & QR Image Offline Decoder'
                  : '条形码 / 商品码图片上传识别解码器（支持 EAN-13 / Code 128 离线扫描线解析）'
              }}
            </h3>
            <p class="sub-desc">
              {{
                isEn
                  ? 'Upload barcode screenshots or test generated SVGs. Includes a pure TypeScript scanline luminance decoder so it works even in browsers without BarcodeDetector!'
                  : '上传商品条形码照片或截图即可离线提取编码数字。内置自研 Scanline 灰度游程解码算法，即使浏览器不支持原生 BarcodeDetector 也能精准识别 EAN-13 与 Code 128！'
              }}
            </p>
          </div>
          <button type="button" class="sample-btn" @click="testFirstBarcodeInDecoder">
            🧪 {{ isEn ? 'Test With Current 1st Barcode' : '载入当前第 1 个生成条形码测试识别' }}
          </button>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          class="hidden-input"
          @change="(e) => { const t = e.target as HTMLInputElement; if (t.files?.length) handleDecoderFiles(t.files); t.value = ''; }"
        />

        <div
          class="dropzone"
          :class="{ dragging: isDragging }"
          @click="fileInputRef?.click()"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="(e) => { isDragging = false; if (e.dataTransfer?.files?.length) handleDecoderFiles(e.dataTransfer.files); }"
        >
          <div class="drop-icon">🏷️</div>
          <p class="drop-title">
            {{ isEn ? 'Click or Drag Barcode Images (PNG / JPG / SVG) Here' : '点击或拖拽条形码图片 (PNG / JPG / WebP / SVG) 到此处识别' }}
          </p>
        </div>

        <div v-if="decodedRows.length > 0" class="decoded-list">
          <div v-for="row in decodedRows" :key="row.id" class="decoded-row">
            <img :src="row.previewUrl" :alt="row.fileName" class="decoded-thumb" />
            <div class="decoded-info">
              <div class="row-top">
                <strong>{{ row.fileName }}</strong>
              </div>
              <div v-if="row.items.length === 0" class="warn-msg">
                {{ isEn ? 'Could not detect clear barcode bars in this image.' : '未能在此图片中检测到清晰的条形码黑白条纹。' }}
              </div>
              <div v-for="(it, idx) in row.items" :key="idx" class="hit-box">
                <span class="fmt-pill">{{ it.format.toUpperCase() }}</span>
                <code class="hit-code">{{ it.rawValue }}</code>
                <button type="button" class="mini-dl-btn" @click="copyDecodedText(row, it.rawValue)">
                  {{ row.copied ? (isEn ? '✓ Copied' : '✓ 已复制') : isEn ? 'Copy' : '复制条码' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.barcode-printer-root {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mode-tabs-bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 6px;
  border-radius: 14px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}

.mode-tab-btn {
  padding: 11px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--bg-surface);
    color: var(--accent);
    border-color: var(--accent-border);
  }
}

.batch-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.config-card {
  padding: 18px 20px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.top-row-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.input-col,
.controls-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.label-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.field-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.sub-desc {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.sample-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.batch-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
}

.gs1-helper-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  font-size: 12px;
}

.gs1-badge {
  font-weight: 700;
  color: var(--text-secondary);
}

.gs1-input {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 12px;
  width: 165px;
}

.gs1-output {
  color: var(--text-primary);

  strong {
    color: var(--accent);
  }
}

.format-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.fmt-btn {
  padding: 9px 11px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 13px;
  }
  span {
    font-size: 11px;
    color: var(--text-secondary);
  }

  &.active {
    background-color: var(--accent-soft);
    border-color: var(--accent);
    strong {
      color: var(--accent);
    }
  }
}

.sliders-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ctrl-box {
  padding: 9px 11px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-secondary);
  }
}

.ctrl-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.val-badge {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--accent);
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.select-input {
  width: 100%;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
}

.toggles-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.check-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.action-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.stat-summary {
  font-size: 13.5px;
  color: var(--text-secondary);
}

.accent-num {
  color: var(--accent);
  font-size: 15px;
}

.toolbar-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary-print-btn {
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
}

.secondary-btn {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.a4-sheet-container {
  padding: 20px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
}

.sheet-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.hint-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.a4-barcode-grid {
  display: grid;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.barcode-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
  background-color: #ffffff;
  border-radius: 8px;
  min-width: 0;

  &.cut-border {
    border: 1px dashed #cbd5e1;
  }

  &.invalid {
    border: 1px dashed #ef4444;
    background-color: #fef2f2;
  }
}

.svg-render-box {
  width: 100%;
  display: flex;
  justify-content: center;
  overflow: hidden;

  :deep(svg) {
    max-width: 100%;
    height: auto;
  }
}

.cell-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.cd-tag {
  font-size: 10.5px;
  font-weight: 700;
  color: #059669;
  background-color: #ecfdf5;
  padding: 1px 6px;
  border-radius: 4px;
}

.mini-dl-btn {
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: #4f46e5;
    color: #4f46e5;
  }
}

.invalid-box {
  text-align: center;
  color: #dc2626;
  font-size: 12px;
  padding: 12px 6px;

  p {
    margin: 4px 0 0;
    font-size: 11px;
  }
}

.hidden-input {
  display: none;
}

.dropzone {
  padding: 32px 20px;
  border-radius: 14px;
  border: 2px dashed var(--accent-border);
  background-color: var(--bg-muted);
  text-align: center;
  cursor: pointer;

  &:hover,
  &.dragging {
    background-color: var(--accent-soft);
    border-color: var(--accent);
  }
}

.drop-icon {
  font-size: 30px;
  margin-bottom: 6px;
}

.drop-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.decoded-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.decoded-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.decoded-thumb {
  width: 120px;
  height: 68px;
  object-fit: contain;
  background: #fff;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.decoded-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hit-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.fmt-pill {
  padding: 2px 8px;
  border-radius: 6px;
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
}

.hit-code {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-primary);
}

.warn-msg {
  font-size: 12px;
  color: #d97706;
}

@media print {
  .no-print {
    display: none !important;
  }
  .a4-sheet-container {
    padding: 0;
    border: none;
  }
  .a4-barcode-grid {
    border: none;
    padding: 0;
  }
}
</style>
