<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
  initialMode?: 'pdf-builder' | 'long-stitch';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
  initialMode: 'pdf-builder',
});

const isEn = computed(() => props.lang === 'en');

type ToolkitMode = 'pdf-builder' | 'long-stitch';
type PageOrientation = 'a4-portrait' | 'a4-landscape' | 'original-fit';
type PageMargin = 'none' | 'standard' | 'wide';

const activeMode = ref<ToolkitMode>(props.initialMode);

interface DocPageItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  sizeBytes: number;
}

const pages = ref<DocPageItem[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isBuildingPdf = ref(false);

// Mode 1: PDF Builder Options
const pageOrientation = ref<PageOrientation>('a4-portrait');
const pageMargin = ref<PageMargin>('standard');
const watermarkText = ref('仅供内部审阅与业务办理使用 · CONFIDENTIAL');
const enableWatermark = ref(true);
const showPageNumbers = ref(true);
const jpegQuality = ref(88);
const pdfFileName = ref('merged-document-a4');
const lastGeneratedPdfBytes = ref<number>(0);

// Mode 2: Vertical Long-Image Stitcher Options
const stitchWidth = ref<number>(1200);
const stitchPadding = ref<number>(24);
const stitchGap = ref<number>(16);
const stitchBgColor = ref('#f1f5f9');
const stitchFormat = ref<'image/png' | 'image/webp' | 'image/jpeg'>('image/png');
const stitchCanvasRef = ref<HTMLCanvasElement | null>(null);

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ==========================================
// Built-in 3-Page Sample Document Generator
// ==========================================
function createSyntheticSamplePage(
  pageNum: number,
  title: string,
  subtitle: string,
  accentHex: string,
  lines: string[]
): DocPageItem {
  const c = document.createElement('canvas');
  c.width = 1240;
  c.height = 1754; // 150 DPI A4 ratio
  const ctx = c.getContext('2d')!;

  // Paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);

  // Top header band
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, c.width, 180);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillText(title, 80, 96);
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(subtitle, 80, 142);

  // Content box
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 240, 1080, 1340);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(`SECTION 0${pageNum} · 扫描归档原件预览`, 130, 320);

  ctx.fillStyle = '#334155';
  ctx.font = '500 25px system-ui, sans-serif';
  lines.forEach((line, idx) => {
    ctx.fillText(line, 130, 410 + idx * 68);
  });

  // Official stamp simulation
  ctx.save();
  ctx.translate(920, 1360);
  ctx.rotate(-0.18);
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.78)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(220, 38, 38, 0.78)';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('原心工具箱', 0, -18);
  ctx.fillText('本地安全签章', 0, 22);
  ctx.restore();

  const dataUrl = c.toDataURL('image/jpeg', 0.9);
  return {
    id: `sample-${pageNum}-${Date.now()}`,
    name: `sample-page-0${pageNum}.jpg`,
    dataUrl,
    width: c.width,
    height: c.height,
    rotation: 0,
    sizeBytes: Math.round(dataUrl.length * 0.75),
  };
}

function loadSampleDocumentPages() {
  if (typeof document === 'undefined') return;
  pages.value = [
    createSyntheticSamplePage(
      1,
      '软件技术开发服务合同 (第 1 页)',
      'Contract No: YS-2026-1101 · 100% Client-Side PDF Synthesis',
      '#1e3a8a',
      [
        '甲方（委托方）：极客创新科技有限公司',
        '乙方（承接方）：原心独立开发工作室 (Yunsin Studio)',
        '一、项目名称：纯前端 Rust Wasm 与 PDF 隐私办公套件开发',
        '二、核心安全指标：所有合同扫描件、身份证件与财务发票均在浏览器',
        '    本地内存中直接封装为 ISO PDF 1.4 二进制流，严禁上传云端。',
        '三、交付周期：自本协议签署之日起 15 个工作日内完成全部模块验收。',
      ]
    ),
    createSyntheticSamplePage(
      2,
      '项目里程碑与验收标准清单 (第 2 页)',
      'Attachment A · Milestone & Technical Acceptance Criteria',
      '#065f46',
      [
        '1. 支持多张 JPG / PNG / WebP 扫描件自由拖拽排序与 90° 旋转校正；',
        '2. 支持标准 A4 纵向 (595×842 pt)、A4 横向及原图自适应尺寸排版；',
        '3. 支持一键叠加防伪斜体水印（如“仅供办理业务使用，他用无效”）；',
        '4. 内置零依赖二进制 PDF 1.4 交叉引用表 (xref) 生成器，秒级直出；',
        '5. 支持将多页文档垂直无缝拼接为高清长图，适配公众号与长微博发布。',
      ]
    ),
    createSyntheticSamplePage(
      3,
      '电子商业发票与结算凭证 (第 3 页)',
      'Commercial Invoice #INV-2026-889 · Paid in Full',
      '#4f46e5',
      [
        '开票日期 (Date)：2026-11-01',
        '服务明细 (Item)：企业级本地无服务文档处理引擎授权许可 × 1 份',
        '不含税金额 (Subtotal)：¥ 12,000.00 CNY',
        '增值税额 (VAT 6%)：¥ 720.00 CNY',
        '价税合计 (Total Due)：¥ 12,720.00 CNY （已结清 / PAID）',
      ]
    ),
  ];
  nextTick(() => {
    if (activeMode.value === 'long-stitch') renderLongStitchCanvas();
  });
}

function handleFilesUpload(fileList: FileList | File[]) {
  const arr = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
  for (const file of arr) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        pages.value.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          rotation: 0,
          sizeBytes: file.size,
        });
        if (activeMode.value === 'long-stitch') {
          nextTick(() => renderLongStitchCanvas());
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }
}

function movePage(index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= pages.value.length) return;
  const copy = [...pages.value];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  pages.value = copy;
}

function rotatePage(index: number) {
  const p = pages.value[index];
  if (!p) return;
  p.rotation = (p.rotation + 90) % 360;
}

function removePage(index: number) {
  pages.value.splice(index, 1);
}

// ==========================================
// Pure TypeScript Binary PDF 1.4 Stream Builder
// ==========================================
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderPageToJpegStream(
  page: DocPageItem,
  pageIdx: number,
  totalPages: number
): Promise<{ jpegBytes: Uint8Array; pixelW: number; pixelH: number; ptW: number; ptH: number }> {
  const img = await loadImageElement(page.dataUrl);
  const isRotated90 = page.rotation % 180 !== 0;
  const srcW = isRotated90 ? img.naturalHeight || img.height : img.naturalWidth || img.width;
  const srcH = isRotated90 ? img.naturalWidth || img.width : img.naturalHeight || img.height;

  let ptW = 595.28;
  let ptH = 841.89;
  let canvasW = 1240;
  let canvasH = 1754;

  if (pageOrientation.value === 'a4-landscape') {
    ptW = 841.89;
    ptH = 595.28;
    canvasW = 1754;
    canvasH = 1240;
  } else if (pageOrientation.value === 'original-fit') {
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    canvasW = Math.max(64, Math.round(srcW * scale));
    canvasH = Math.max(64, Math.round(srcH * scale));
    ptW = Number((canvasW * 0.72).toFixed(2));
    ptH = Number((canvasH * 0.72).toFixed(2));
  }

  const marginRatio =
    pageMargin.value === 'none' ? 0 : pageMargin.value === 'standard' ? 0.055 : 0.1;
  const padX = Math.round(canvasW * marginRatio);
  const padY = Math.round(canvasH * marginRatio);
  const availW = canvasW - padX * 2;
  const availH = canvasH - padY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // White page sheet
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Fit rotated image inside available box
  const scale = Math.min(availW / srcW, availH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((page.rotation * Math.PI) / 180);
  if (isRotated90) {
    ctx.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
  } else {
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.restore();

  // Optional diagonal anti-fraud watermark
  if (enableWatermark.value && watermarkText.value.trim()) {
    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.16)';
    ctx.font = `700 ${Math.round(canvasW * 0.028)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const text = watermarkText.value.trim();
    for (let y = -canvasH * 0.45; y <= canvasH * 0.45; y += canvasH * 0.28) {
      ctx.fillText(text, 0, y);
    }
    ctx.restore();
  }

  // Optional page footer number
  if (showPageNumbers.value) {
    ctx.fillStyle = '#64748b';
    ctx.font = `600 ${Math.round(canvasW * 0.018)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageIdx + 1} / ${totalPages}`, canvasW / 2, canvasH - 22);
  }

  const jpegUrl = canvas.toDataURL('image/jpeg', jpegQuality.value / 100);
  const jpegBytes = dataUrlToUint8Array(jpegUrl);
  return { jpegBytes, pixelW: canvasW, pixelH: canvasH, ptW, ptH };
}

async function generateAndDownloadPdf() {
  if (pages.value.length === 0 || isBuildingPdf.value) return;
  isBuildingPdf.value = true;

  try {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    let byteOffset = 0;
    const objOffsets: number[] = [0]; // 1-based index

    function pushAscii(str: string) {
      const b = encoder.encode(str);
      chunks.push(b);
      byteOffset += b.length;
    }

    function pushBinary(bytes: Uint8Array) {
      chunks.push(bytes);
      byteOffset += bytes.length;
    }

    // PDF 1.4 Header with binary comment marker
    pushAscii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    const n = pages.value.length;
    const kidsRefs: string[] = [];
    for (let i = 0; i < n; i++) {
      kidsRefs.push(`${3 + i * 3} 0 R`);
    }

    // Object 1: Catalog
    objOffsets[1] = byteOffset;
    pushAscii('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Object 2: Pages Root
    objOffsets[2] = byteOffset;
    pushAscii(`2 0 obj\n<< /Type /Pages /Kids [${kidsRefs.join(' ')}] /Count ${n} >>\nendobj\n`);

    for (let i = 0; i < n; i++) {
      const rendered = await renderPageToJpegStream(pages.value[i], i, n);
      const pageObjId = 3 + i * 3;
      const contentObjId = pageObjId + 1;
      const imageObjId = pageObjId + 2;

      // Page Object
      objOffsets[pageObjId] = byteOffset;
      pushAscii(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${rendered.ptW} ${rendered.ptH}] /Resources << /XObject << /Im${i} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
      );

      // Content Stream Object
      const streamCmd = `q\n${rendered.ptW} 0 0 ${rendered.ptH} 0 0 cm\n/Im${i} Do\nQ\n`;
      const streamBytes = encoder.encode(streamCmd);
      objOffsets[contentObjId] = byteOffset;
      pushAscii(
        `${contentObjId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamCmd}endstream\nendobj\n`
      );

      // Image XObject (DCTDecode JPEG)
      objOffsets[imageObjId] = byteOffset;
      pushAscii(
        `${imageObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${rendered.pixelW} /Height ${rendered.pixelH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${rendered.jpegBytes.length} >>\nstream\n`
      );
      pushBinary(rendered.jpegBytes);
      pushAscii('\nendstream\nendobj\n');
    }

    const totalObjs = 2 + n * 3;
    const xrefStart = byteOffset;
    pushAscii(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
    for (let id = 1; id <= totalObjs; id++) {
      const offStr = String(objOffsets[id] || 0).padStart(10, '0');
      pushAscii(`${offStr} 00000 n \n`);
    }

    pushAscii(
      `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
    );

    const pdfBlob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
    lastGeneratedPdfBytes.value = pdfBlob.size;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    const cleanName = (pdfFileName.value.trim() || 'document').replace(/\.pdf$/i, '');
    a.download = `${cleanName}.pdf`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  } finally {
    isBuildingPdf.value = false;
  }
}

// ==========================================
// Mode 2: Vertical Long-Image Stitcher
// ==========================================
async function renderLongStitchCanvas() {
  const canvas = stitchCanvasRef.value;
  if (!canvas || pages.value.length === 0) return;

  const loadedImgs = await Promise.all(pages.value.map((p) => loadImageElement(p.dataUrl)));
  const outerW = stitchWidth.value;
  const pad = stitchPadding.value;
  const gap = stitchGap.value;
  const contentW = Math.max(100, outerW - pad * 2);

  const heights = loadedImgs.map((img, i) => {
    const rot = pages.value[i].rotation % 180 !== 0;
    const w = rot ? img.naturalHeight || img.height : img.naturalWidth || img.width;
    const h = rot ? img.naturalWidth || img.width : img.naturalHeight || img.height;
    return Math.round((h / w) * contentW);
  });

  const totalH =
    pad * 2 +
    heights.reduce((acc, h) => acc + h, 0) +
    Math.max(0, heights.length - 1) * gap;

  canvas.width = outerW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = stitchBgColor.value;
  ctx.fillRect(0, 0, outerW, totalH);

  let curY = pad;
  loadedImgs.forEach((img, i) => {
    const h = heights[i];
    ctx.drawImage(img, pad, curY, contentW, h);
    curY += h + gap;
  });
}

function downloadStitchedLongImage() {
  const canvas = stitchCanvasRef.value;
  if (!canvas) return;
  const ext =
    stitchFormat.value === 'image/webp'
      ? 'webp'
      : stitchFormat.value === 'image/jpeg'
        ? 'jpg'
        : 'png';
  const a = document.createElement('a');
  a.download = `long-stitched-${Date.now()}.${ext}`;
  a.href = canvas.toDataURL(stitchFormat.value, 0.92);
  a.click();
}

watch([activeMode, pages, stitchWidth, stitchPadding, stitchGap, stitchBgColor], () => {
  if (activeMode.value === 'long-stitch') {
    nextTick(() => renderLongStitchCanvas());
  }
});

onMounted(() => {
  loadSampleDocumentPages();
});
</script>

<template>
  <div class="pdf-toolkit-root">
    <!-- Top Mode Switcher -->
    <div class="mode-tabs-bar">
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: activeMode === 'pdf-builder' }"
        @click="activeMode = 'pdf-builder'"
      >
        📄
        {{
          isEn
            ? 'Multi-Image / Scan to Standard A4 PDF Builder'
            : '多张图片 / 扫描件排版合成标准 A4 PDF（纯前端二进制直出）'
        }}
      </button>
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: activeMode === 'long-stitch' }"
        @click="activeMode = 'long-stitch'"
      >
        📜
        {{
          isEn
            ? 'Document Pages to Seamless Vertical Long Image'
            : '多页文档 / 截图无缝拼接高清长图工作台'
        }}
      </button>
    </div>

    <div class="workspace-grid">
      <!-- Left Column: Page Queue & Upload -->
      <div class="queue-panel">
        <div class="panel-card">
          <div class="header-row">
            <div>
              <h3 class="section-title">
                {{
                  isEn
                    ? `1. Document Page Queue (${pages.length} Pages)`
                    : `1. 文档页面队列（共 ${pages.length} 页 · 支持拖拽排序与旋转）`
                }}
              </h3>
              <p class="section-sub">
                {{
                  isEn
                    ? '100% local processing. Contracts, IDs, and invoices never leave your browser.'
                    : '所有合同扫描件、身份证、发票图片 100% 在本地浏览器内存合成，绝不上传任何服务器。'
                }}
              </p>
            </div>
            <div class="top-mini-btns">
              <button type="button" class="chip-btn" @click="loadSampleDocumentPages">
                ✨ {{ isEn ? 'Reload 3-Page Contract Sample' : '载入 3 页合同发票示例' }}
              </button>
              <button
                v-if="pages.length > 0"
                type="button"
                class="chip-btn danger"
                @click="pages = []"
              >
                🗑️ {{ isEn ? 'Clear' : '清空' }}
              </button>
            </div>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="hidden-input"
            @change="(e) => { const t = e.target as HTMLInputElement; if (t.files?.length) handleFilesUpload(t.files); t.value = ''; }"
          />

          <div
            class="dropzone"
            :class="{ dragging: isDragging }"
            @click="fileInputRef?.click()"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="(e) => { isDragging = false; if (e.dataTransfer?.files?.length) handleFilesUpload(e.dataTransfer.files); }"
          >
            <div class="drop-icon">🗂️</div>
            <p class="drop-title">
              {{
                isEn
                  ? 'Click or Drag Document Scans / Screenshots (JPG / PNG / WebP) Here'
                  : '点击或拖拽多张图片 / 合同扫描件 / 发票截图到此处添加页面'
              }}
            </p>
          </div>

          <!-- Pages List -->
          <div v-if="pages.length > 0" class="page-list">
            <div v-for="(p, idx) in pages" :key="p.id" class="page-item-row">
              <span class="page-num-badge">P{{ idx + 1 }}</span>
              <div class="page-thumb-box">
                <img
                  :src="p.dataUrl"
                  :alt="p.name"
                  class="page-thumb"
                  :style="{ transform: `rotate(${p.rotation}deg)` }"
                />
              </div>
              <div class="page-meta">
                <strong class="page-name">{{ p.name }}</strong>
                <span class="page-dim">
                  {{ p.width }}×{{ p.height }}px · {{ formatBytes(p.sizeBytes) }}
                  <template v-if="p.rotation"> · ↻ {{ p.rotation }}°</template>
                </span>
              </div>
              <div class="page-controls">
                <button
                  type="button"
                  class="icon-btn"
                  :disabled="idx === 0"
                  title="Move Up"
                  @click="movePage(idx, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  :disabled="idx === pages.length - 1"
                  title="Move Down"
                  @click="movePage(idx, 1)"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  title="Rotate 90°"
                  @click="rotatePage(idx)"
                >
                  ↻ 90°
                </button>
                <button
                  type="button"
                  class="icon-btn danger"
                  title="Remove"
                  @click="removePage(idx)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: PDF / Long-Image Settings & Export -->
      <div class="settings-panel">
        <!-- MODE 1 SETTINGS: PDF BUILDER -->
        <div v-if="activeMode === 'pdf-builder'" class="panel-card">
          <h3 class="section-title">
            {{ isEn ? '2. PDF 1.4 Page Layout & Anti-Fraud Watermark' : '2. A4 页面排版、防伪水印与二进制导出配置' }}
          </h3>

          <div class="ctrl-box">
            <label>{{ isEn ? 'Output PDF File Name' : '导出 PDF 文件名' }}</label>
            <input v-model="pdfFileName" type="text" class="text-input" placeholder="merged-document" />
          </div>

          <div class="form-2col">
            <div class="ctrl-box">
              <label>{{ isEn ? 'Page Size & Orientation' : '页面尺寸规格' }}</label>
              <select v-model="pageOrientation" class="select-input">
                <option value="a4-portrait">{{ isEn ? 'A4 Portrait (210×297mm)' : 'A4 纵向标准打印 (210×297mm)' }}</option>
                <option value="a4-landscape">{{ isEn ? 'A4 Landscape (297×210mm)' : 'A4 横向宽幅排版 (297×210mm)' }}</option>
                <option value="original-fit">{{ isEn ? 'Original Image Aspect Ratio' : '原图比例自适应无裁切' }}</option>
              </select>
            </div>

            <div class="ctrl-box">
              <label>{{ isEn ? 'Page White Margin' : '页面白边留白' }}</label>
              <select v-model="pageMargin" class="select-input">
                <option value="none">{{ isEn ? 'Zero Margin (Full Bleed)' : '无边距满版铺满' }}</option>
                <option value="standard">{{ isEn ? 'Standard Margin (12mm)' : '标准公文白边 (12mm)' }}</option>
                <option value="wide">{{ isEn ? 'Wide Margin (24mm)' : '宽白边装订预留 (24mm)' }}</option>
              </select>
            </div>
          </div>

          <div class="ctrl-box">
            <div class="ctrl-top">
              <label>{{ isEn ? 'Anti-Fraud Diagonal Watermark' : '斜体防伪安全水印（证件/合同防盗用）' }}</label>
              <input v-model="enableWatermark" type="checkbox" />
            </div>
            <input
              v-model="watermarkText"
              type="text"
              class="text-input"
              :disabled="!enableWatermark"
              :placeholder="isEn ? 'CONFIDENTIAL - FOR VERIFICATION ONLY' : '仅供办理业务使用 · 他用无效'"
            />
          </div>

          <div class="ctrl-box">
            <div class="ctrl-top">
              <label>{{ isEn ? 'JPEG Stream Compression Quality' : '内嵌图像压缩画质 (DCTDecode)' }}</label>
              <span class="val-badge">{{ jpegQuality }}%</span>
            </div>
            <input
              v-model.number="jpegQuality"
              type="range"
              min="50"
              max="98"
              step="2"
              class="range-slider"
            />
          </div>

          <label class="checkbox-line">
            <input v-model="showPageNumbers" type="checkbox" />
            <span>{{ isEn ? 'Print Page Footer (Page X / N)' : '在每页底部自动印制页码 (Page X / N)' }}</span>
          </label>

          <button
            type="button"
            class="primary-export-btn"
            :disabled="pages.length === 0 || isBuildingPdf"
            @click="generateAndDownloadPdf"
          >
            {{
              isBuildingPdf
                ? isEn
                  ? '⏳ Packing Binary PDF 1.4...'
                  : '⏳ 正在合成二进制 PDF 1.4 文件...'
                : isEn
                  ? `📥 Generate & Download .PDF (${pages.length} Pages)`
                  : `📥 立即合成并下载标准 .PDF 文件（共 ${pages.length} 页）`
            }}
          </button>

          <div v-if="lastGeneratedPdfBytes > 0" class="success-pill">
            ✅
            {{
              isEn
                ? `Successfully generated compliant PDF 1.4 binary (${formatBytes(lastGeneratedPdfBytes)})`
                : `已成功生成标准 PDF 1.4 文件，体积 ${formatBytes(lastGeneratedPdfBytes)}，可直接用微信/Adobe/浏览器打开！`
            }}
          </div>
        </div>

        <!-- MODE 2 SETTINGS: VERTICAL LONG IMAGE STITCHER -->
        <div v-else class="panel-card">
          <h3 class="section-title">
            {{ isEn ? '2. Seamless Vertical Long-Image Stitcher' : '2. 多页文档无缝拼接高清长图参数' }}
          </h3>

          <div class="form-2col">
            <div class="ctrl-box">
              <label>{{ isEn ? 'Output Width (px)' : '长图输出宽度 (px)' }}</label>
              <select v-model.number="stitchWidth" class="select-input">
                <option :value="1080">1080 px (手机高清标准)</option>
                <option :value="1200">1200 px (公众号/文档推荐)</option>
                <option :value="1600">1600 px (超清印刷级)</option>
              </select>
            </div>

            <div class="ctrl-box">
              <label>{{ isEn ? 'Export Format' : '导出图片格式' }}</label>
              <select v-model="stitchFormat" class="select-input">
                <option value="image/png">PNG (无损文字锐利)</option>
                <option value="image/webp">WebP (体积最小)</option>
                <option value="image/jpeg">JPEG (通用兼容)</option>
              </select>
            </div>
          </div>

          <div class="form-2col">
            <div class="ctrl-box">
              <div class="ctrl-top">
                <label>{{ isEn ? 'Outer Padding' : '外框留白边距' }}</label>
                <span class="val-badge">{{ stitchPadding }}px</span>
              </div>
              <input v-model.number="stitchPadding" type="range" min="0" max="60" step="4" class="range-slider" />
            </div>

            <div class="ctrl-box">
              <div class="ctrl-top">
                <label>{{ isEn ? 'Page Divider Gap' : '页面之间间距' }}</label>
                <span class="val-badge">{{ stitchGap }}px</span>
              </div>
              <input v-model.number="stitchGap" type="range" min="0" max="48" step="4" class="range-slider" />
            </div>
          </div>

          <button
            type="button"
            class="primary-export-btn"
            :disabled="pages.length === 0"
            @click="downloadStitchedLongImage"
          >
            📥 {{ isEn ? 'Download Stitched Long Image' : '下载无缝拼接高清长图' }}
          </button>

          <div class="stitch-preview-scroll">
            <canvas ref="stitchCanvasRef" class="stitch-canvas"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.pdf-toolkit-root {
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

.workspace-grid {
  display: grid;
  grid-template-columns: 1.12fr 0.88fr;
  gap: 18px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.panel-card {
  padding: 18px 20px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.section-sub {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.top-mini-btns {
  display: flex;
  gap: 8px;
}

.chip-btn {
  padding: 5px 11px;
  border-radius: 8px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.danger {
    border-color: rgba(239, 68, 68, 0.35);
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.hidden-input {
  display: none;
}

.dropzone {
  padding: 26px 18px;
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
  font-size: 28px;
  margin-bottom: 4px;
}

.drop-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.page-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.page-num-badge {
  padding: 3px 8px;
  border-radius: 6px;
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
}

.page-thumb-box {
  width: 52px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.page-thumb {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.page-meta {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.page-name {
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-all;
}

.page-dim {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.page-controls {
  display: flex;
  gap: 6px;
}

.icon-btn {
  padding: 5px 9px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.danger:hover {
    color: #ef4444;
    border-color: #ef4444;
  }
}

.ctrl-box {
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
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
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
}

.text-input,
.select-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12.5px;
}

.form-2col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.checkbox-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
}

.primary-export-btn {
  padding: 12px 16px;
  border-radius: 11px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.success-pill {
  padding: 10px 12px;
  border-radius: 10px;
  background-color: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-size: 12.5px;
  font-weight: 700;
}

.stitch-preview-scroll {
  max-height: 440px;
  overflow-y: auto;
  padding: 12px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px dashed var(--border-color);
  display: flex;
  justify-content: center;
}

.stitch-canvas {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}
</style>
