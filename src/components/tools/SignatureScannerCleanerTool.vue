<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

type ToolMode = 'signature' | 'document';
type InkColorMode = 'original' | 'black' | 'blue' | 'red';

const activeMode = ref<ToolMode>('signature');
const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Mode 1: Transparent Signature & Stamp Extractor controls
const lumaThreshold = ref<number>(172);
const edgeFeather = ref<number>(14);
const strokeDilation = ref<number>(0); // 0 = original, 1 = +1px bold, 2 = +2px bold
const inkColorMode = ref<InkColorMode>('original');
const autoCropPadding = ref<boolean>(true);

// Mode 2: Document Scan Shadow Whitener controls
const shadowCleanStrength = ref<number>(82);
const textContrast = ref<number>(75);
const keepRedStampInDoc = ref<boolean>(true);

// Live contract preview controls
const contractScale = ref<number>(100);
const contractOffsetY = ref<number>(-8);

// Canvas & image state
const sourceCanvasRef = ref<HTMLCanvasElement | null>(null);
const outputCanvasRef = ref<HTMLCanvasElement | null>(null);
const hasSource = ref(false);
const sourceFileName = ref('demo-signature-stamp.png');
const sourceWidth = ref(0);
const sourceHeight = ref(0);
const outWidth = ref(0);
const outHeight = ref(0);
const outputDataUrl = ref('');
const transparentRatio = ref(0);
const processingMs = ref(0);

let rawSourceImageData: ImageData | null = null;

function synthesizeDemoCanvas(mode: ToolMode) {
  const c = document.createElement('canvas');
  if (mode === 'signature') {
    c.width = 720;
    c.height = 340;
  } else {
    c.width = 720;
    c.height = 480;
  }
  const ctx = c.getContext('2d');
  if (!ctx) return;

  // 1. Simulate uneven mobile phone lighting shadow on gray paper
  const grad = ctx.createRadialGradient(
    c.width * 0.28,
    c.height * 0.25,
    40,
    c.width * 0.65,
    c.height * 0.85,
    c.width * 0.95
  );
  grad.addColorStop(0, '#f3f1ec');
  grad.addColorStop(0.55, '#d6d3cd');
  grad.addColorStop(1, '#a9a49c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Add subtle paper grain noise
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = ((i * 1103515245 + 12345) & 0x7fffffff) % 9 - 4;
    d[i] = Math.max(0, Math.min(255, d[i] + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  if (mode === 'document') {
    // Draw simulated contract paragraphs on shadowed paper
    ctx.fillStyle = '#2d3138';
    ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(
      isEn.value ? 'TECHNICAL CONSULTING SERVICE AGREEMENT' : '技术开发与咨询服务合同（手机实拍阴影件）',
      48,
      58
    );

    ctx.font = '14.5px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#383c44';
    const lines = isEn.value
      ? [
          '1. Scope of Work: Provider shall deliver 100% local WebAssembly modules and UI.',
          '2. Confidentiality: All contract scans and signatures are processed in browser RAM.',
          '3. Payment Schedule: 50% upon kickoff, 50% upon final milestone acceptance.',
          '4. Governing Law: This Agreement shall become effective upon signature and seal.',
        ]
      : [
          '第一条 服务内容：乙方为甲方提供纯前端本地化图像处理与电子单据技术支持。',
          '第二条 保密条款：双方往来合同、手写签名与印章均在浏览器内存处理，严禁外传。',
          '第三条 结算方式：首付款 50% 于合同签订后 3 个工作日内支付，尾款验收后结清。',
          '第四条 生效条件：本合同一式贰份，经甲乙双方签字盖章后立即生效，具同等效力。',
        ];
    lines.forEach((line, idx) => {
      ctx.fillText(line, 48, 108 + idx * 38);
    });

    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(isEn.value ? 'Authorized Signature & Seal:' : '甲方代表（签字/盖章）：', 48, 305);
  }

  // 2. Draw realistic fountain-pen cursive handwritten signature
  const offsetY = mode === 'document' ? 140 : 0;
  ctx.save();
  ctx.translate(0, offsetY);
  ctx.strokeStyle = '#1e2430';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Stylized signature strokes ("Lin Yuanxin / 林原心")
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(95, 195);
  ctx.bezierCurveTo(135, 115, 175, 110, 162, 205);
  ctx.bezierCurveTo(152, 240, 195, 145, 238, 152);
  ctx.bezierCurveTo(265, 156, 245, 215, 292, 188);
  ctx.stroke();

  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(275, 138);
  ctx.bezierCurveTo(325, 128, 358, 145, 330, 212);
  ctx.bezierCurveTo(312, 245, 378, 165, 425, 174);
  ctx.stroke();

  // Expressiveflourish underline
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(110, 238);
  ctx.bezierCurveTo(240, 212, 370, 224, 465, 198);
  ctx.stroke();

  // 3. Draw realistic circular red corporate seal stamp on the right
  const cx = 535;
  const cy = 175;
  const radius = 66;
  ctx.strokeStyle = 'rgba(208, 38, 38, 0.88)';
  ctx.fillStyle = 'rgba(208, 38, 38, 0.86)';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
  ctx.stroke();

  // Five-pointed star in center of stamp
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = ((i * 72 - 90) * Math.PI) / 180;
    const innerAngle = (((i * 72 + 36) - 90) * Math.PI) / 180;
    const ox = cx + Math.cos(outerAngle) * 20;
    const oy = cy + Math.sin(outerAngle) * 20;
    const ix = cx + Math.cos(innerAngle) * 8;
    const iy = cy + Math.sin(innerAngle) * 8;
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 13.5px "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.fillText('原心极客工作室', cx, cy - 30);
  ctx.font = 'bold 11.5px "JetBrains Mono", sans-serif';
  ctx.fillText('CONTRACT SEAL', cx, cy + 36);
  ctx.font = '10px monospace';
  ctx.fillText('3101150982741', cx, cy + 50);
  ctx.restore();

  loadFromCanvas(c, mode === 'signature' ? 'demo-signature-stamp.png' : 'demo-shadow-contract.png');
}

function loadDemo(mode?: ToolMode) {
  if (mode) {
    activeMode.value = mode;
  }
  synthesizeDemoCanvas(activeMode.value);
}

function loadFromCanvas(c: HTMLCanvasElement, name: string) {
  sourceFileName.value = name.replace(/\.[^.]+$/, '');
  sourceWidth.value = c.width;
  sourceHeight.value = c.height;

  const sCanvas = sourceCanvasRef.value;
  if (sCanvas) {
    sCanvas.width = c.width;
    sCanvas.height = c.height;
    const sCtx = sCanvas.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(c, 0, 0);
      rawSourceImageData = sCtx.getImageData(0, 0, c.width, c.height);
    }
  } else {
    const ctx = c.getContext('2d');
    if (ctx) rawSourceImageData = ctx.getImageData(0, 0, c.width, c.height);
  }
  hasSource.value = true;
  runProcessing();
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    handleImageFile(input.files[0]);
  }
  input.value = '';
}

function onDropFile(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    handleImageFile(e.dataTransfer.files[0]);
  }
}

function handleImageFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const temp = document.createElement('canvas');
      temp.width = w;
      temp.height = h;
      const ctx = temp.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        loadFromCanvas(temp, file.name);
      }
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

/**
 * Compute Integral Image (Summed-Area Table) for fast O(1) local illumination background estimation
 */
function computeIntegralLuma(data: Uint8ClampedArray, w: number, h: number): Float64Array {
  const integral = new Float64Array((w + 1) * (h + 1));
  const stride = w + 1;
  for (let y = 1; y <= h; y++) {
    let rowSum = 0;
    const srcRowOffset = (y - 1) * w * 4;
    for (let x = 1; x <= w; x++) {
      const idx = srcRowOffset + (x - 1) * 4;
      const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      rowSum += luma;
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }
  return integral;
}

function getBoxMeanLuma(
  integral: Float64Array,
  w: number,
  h: number,
  x: number,
  y: number,
  radius: number
): number {
  const stride = w + 1;
  const x0 = Math.max(0, x - radius);
  const y0 = Math.max(0, y - radius);
  const x1 = Math.min(w, x + radius + 1);
  const y1 = Math.min(h, y + radius + 1);
  const count = (x1 - x0) * (y1 - y0);
  const sum =
    integral[y1 * stride + x1] -
    integral[y0 * stride + x1] -
    integral[y1 * stride + x0] +
    integral[y0 * stride + x0];
  return sum / Math.max(1, count);
}

function runProcessing() {
  if (!rawSourceImageData) return;
  const t0 = performance.now();
  const w = rawSourceImageData.width;
  const h = rawSourceImageData.height;
  const src = rawSourceImageData.data;

  // Draw source canvas if available
  if (sourceCanvasRef.value) {
    sourceCanvasRef.value.width = w;
    sourceCanvasRef.value.height = h;
    const sCtx = sourceCanvasRef.value.getContext('2d');
    sCtx?.putImageData(rawSourceImageData, 0, 0);
  }

  const integral = computeIntegralLuma(src, w, h);
  const radius = Math.max(16, Math.round(Math.min(w, h) * 0.06));

  if (activeMode.value === 'signature') {
    // Mode 1: Extract transparent signature & red stamp
    const alphaMap = new Uint8ClampedArray(w * h);
    const outBuffer = new Uint8ClampedArray(w * h * 4);
    const threshRatio = lumaThreshold.value / 255; // e.g. 172/255 = 0.67
    const featherRange = Math.max(0.02, edgeFeather.value / 255);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pIdx = y * w + x;
        const i = pIdx * 4;
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const localBg = Math.max(80, getBoxMeanLuma(integral, w, h, x, y, radius));

        // Red seal / blue ink chroma boost so red stamps on gray paper don't get washed out
        const redDominance = Math.max(0, r - (g + b) * 0.5);
        const blueDominance = Math.max(0, b - (r + g) * 0.5);
        const chromaScore = Math.max(redDominance * 1.35, blueDominance * 1.15);

        // Normalized darkness relative to local uneven paper background
        const relLuma = (luma - chromaScore * 0.65) / localBg;
        const cutoff = threshRatio + 0.16;

        let alpha = 0;
        if (relLuma < cutoff) {
          const norm = (cutoff - relLuma) / featherRange;
          alpha = Math.min(255, Math.max(0, Math.round(norm * 255)));
        }
        alphaMap[pIdx] = alpha;
      }
    }

    // Optional Morphological Dilation (+1px / +2px stroke boldness)
    let finalAlpha = alphaMap;
    const dilateRadius = strokeDilation.value;
    if (dilateRadius > 0) {
      const dilated = new Uint8ClampedArray(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let maxA = 0;
          for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= h) continue;
            for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= w) continue;
              const a = alphaMap[ny * w + nx];
              if (a > maxA) maxA = a;
            }
          }
          dilated[y * w + x] = maxA;
        }
      }
      finalAlpha = dilated;
    }

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let transparentCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pIdx = y * w + x;
        const i = pIdx * 4;
        const a = finalAlpha[pIdx];
        if (a < 15) {
          transparentCount++;
          outBuffer[i + 3] = 0;
          continue;
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const isRedSeal = r - Math.max(g, b) > 28;

        if (inkColorMode.value === 'black') {
          outBuffer[i] = 15;
          outBuffer[i + 1] = 23;
          outBuffer[i + 2] = 42;
        } else if (inkColorMode.value === 'blue') {
          outBuffer[i] = 29;
          outBuffer[i + 1] = 78;
          outBuffer[i + 2] = 216;
        } else if (inkColorMode.value === 'red') {
          outBuffer[i] = 220;
          outBuffer[i + 1] = 38;
          outBuffer[i + 2] = 38;
        } else {
          // 'original': crisp dark ink for pen strokes + vibrant crimson for red seal
          if (isRedSeal) {
            outBuffer[i] = Math.min(240, Math.round(r * 1.15));
            outBuffer[i + 1] = Math.round(g * 0.45);
            outBuffer[i + 2] = Math.round(b * 0.45);
          } else {
            outBuffer[i] = Math.round(r * 0.35);
            outBuffer[i + 1] = Math.round(g * 0.38);
            outBuffer[i + 2] = Math.round(b * 0.45);
          }
        }
        outBuffer[i + 3] = a;
      }
    }

    transparentRatio.value = Math.round((transparentCount / (w * h)) * 100);

    // Render to output canvas (with optional auto-crop around non-empty bounding box)
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = w;
    fullCanvas.height = h;
    fullCanvas.getContext('2d')?.putImageData(new ImageData(outBuffer, w, h), 0, 0);

    let cropX = 0;
    let cropY = 0;
    let cropW = w;
    let cropH = h;
    if (autoCropPadding.value && maxX > minX && maxY > minY) {
      const pad = 18;
      cropX = Math.max(0, minX - pad);
      cropY = Math.max(0, minY - pad);
      cropW = Math.min(w - cropX, maxX - minX + pad * 2);
      cropH = Math.min(h - cropY, maxY - minY + pad * 2);
    }

    outWidth.value = cropW;
    outHeight.value = cropH;
    const outCanvas = outputCanvasRef.value || document.createElement('canvas');
    outCanvas.width = cropW;
    outCanvas.height = cropH;
    const outCtx = outCanvas.getContext('2d');
    if (outCtx) {
      outCtx.clearRect(0, 0, cropW, cropH);
      outCtx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }
    outputDataUrl.value = outCanvas.toDataURL('image/png');
  } else {
    // Mode 2: Document Scan Shadow Whitener (removes gray paper shadow -> pure white printable document)
    const outBuffer = new Uint8ClampedArray(w * h * 4);
    const whiteStrength = shadowCleanStrength.value / 100; // 0..1
    const contrastGain = 1 + (textContrast.value / 100) * 2.2;
    let whitePixelCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pIdx = y * w + x;
        const i = pIdx * 4;
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const localBg = Math.max(65, getBoxMeanLuma(integral, w, h, x, y, radius));

        // Homomorphic division: normalize pixel against local paper illumination
        const normLuma = Math.min(1, luma / localBg);
        const bleedThreshold = 0.92 - whiteStrength * 0.18;

        const isRedSeal = keepRedStampInDoc.value && r - Math.max(g, b) > 26 && normLuma < 0.94;

        if (isRedSeal) {
          outBuffer[i] = Math.min(235, Math.round(r * 1.18));
          outBuffer[i + 1] = Math.round(g * 0.42);
          outBuffer[i + 2] = Math.round(b * 0.42);
          outBuffer[i + 3] = 255;
        } else if (normLuma >= bleedThreshold) {
          outBuffer[i] = 255;
          outBuffer[i + 1] = 255;
          outBuffer[i + 2] = 255;
          outBuffer[i + 3] = 255;
          whitePixelCount++;
        } else {
          // Darken text strokes via steep S-curve
          const ratio = normLuma / bleedThreshold;
          const curved = Math.pow(ratio, contrastGain);
          const v = Math.max(12, Math.min(255, Math.round(curved * 255)));
          outBuffer[i] = v;
          outBuffer[i + 1] = v;
          outBuffer[i + 2] = v;
          outBuffer[i + 3] = 255;
        }
      }
    }

    transparentRatio.value = Math.round((whitePixelCount / (w * h)) * 100);
    outWidth.value = w;
    outHeight.value = h;
    const outCanvas = outputCanvasRef.value || document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    outCanvas.getContext('2d')?.putImageData(new ImageData(outBuffer, w, h), 0, 0);
    outputDataUrl.value = outCanvas.toDataURL('image/png');
  }

  processingMs.value = Math.max(1, Math.round(performance.now() - t0));
}

function downloadPng() {
  if (!outputDataUrl.value) return;
  const a = document.createElement('a');
  a.href = outputDataUrl.value;
  a.download =
    activeMode.value === 'signature'
      ? `${sourceFileName.value}_transparent_signature.png`
      : `${sourceFileName.value}_whitened_scan.png`;
  a.click();
}

function switchMode(mode: ToolMode) {
  activeMode.value = mode;
  if (sourceFileName.value.startsWith('demo-')) {
    synthesizeDemoCanvas(mode);
  } else {
    runProcessing();
  }
}

watch(
  [
    lumaThreshold,
    edgeFeather,
    strokeDilation,
    inkColorMode,
    autoCropPadding,
    shadowCleanStrength,
    textContrast,
    keepRedStampInDoc,
  ],
  () => {
    runProcessing();
  }
);

onMounted(() => {
  synthesizeDemoCanvas('signature');
});
</script>

<template>
  <div class="sig-tool-root">
    <!-- Top Mode Switcher & Demo Loader -->
    <div class="tool-card">
      <div class="mode-bar">
        <div class="mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="mode-tab"
            :class="{ active: activeMode === 'signature' }"
            @click="switchMode('signature')"
          >
            {{
              isEn
                ? '✍️ Mode 1: Transparent Signature & Red Stamp Extractor'
                : '✍️ 模式一：手写签名/红章一键抠出 100% 透明底'
            }}
          </button>
          <button
            type="button"
            role="tab"
            class="mode-tab"
            :class="{ active: activeMode === 'document' }"
            @click="switchMode('document')"
          >
            {{
              isEn
                ? '📄 Mode 2: Document Photo Shadow Whitener'
                : '📄 模式二：手机拍文档去阴影黑底漂白'
            }}
          </button>
        </div>

        <div class="top-actions">
          <button type="button" class="demo-btn" @click="loadDemo()">
            {{
              isEn
                ? '✍️ Load Handwritten Signature & Shadow Contract Demo'
                : '✍️ 加载手写签名照与阴影合同示例'
            }}
          </button>
          <button type="button" class="upload-btn" @click="fileInputRef?.click()">
            {{ isEn ? '📂 Upload Local Photo' : '📂 上传手机实拍照片' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onFileChange"
          />
        </div>
      </div>

      <!-- Mode 1 Controls -->
      <div v-if="activeMode === 'signature'" class="controls-grid">
        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Adaptive Background Threshold' : '自适应纸张去底阈值' }}</label>
            <span class="val-badge">{{ lumaThreshold }}</span>
          </div>
          <input
            v-model.number="lumaThreshold"
            type="range"
            min="115"
            max="230"
            step="1"
            class="range-slider"
          />
          <span class="ctrl-hint">
            {{
              isEn
                ? 'Lower removes more gray paper shadow; higher preserves faint pen strokes'
                : '向左消除顽固灰底阴影，向右保留浅色笔锋细节'
            }}
          </span>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Anti-Aliasing Edge Feathering' : '笔迹边缘柔化抗锯齿' }}</label>
            <span class="val-badge">{{ edgeFeather }}px</span>
          </div>
          <input
            v-model.number="edgeFeather"
            type="range"
            min="2"
            max="36"
            step="1"
            class="range-slider"
          />
          <span class="ctrl-hint">
            {{
              isEn
                ? 'Smooths jagged pixel edges so signatures look natural on Word/PDF'
                : '消除生硬毛刺，让签名贴在 Word/PDF 上自然融为一体'
            }}
          </span>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Stroke Boldness Dilation' : '笔迹粗细膨胀增强' }}</label>
          <div class="pill-group">
            <button
              type="button"
              class="choice-pill"
              :class="{ active: strokeDilation === 0 }"
              @click="strokeDilation = 0"
            >
              {{ isEn ? 'Original' : '原粗细' }}
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: strokeDilation === 1 }"
              @click="strokeDilation = 1"
            >
              {{ isEn ? '+1px Bold' : '+1px 加粗' }}
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: strokeDilation === 2 }"
              @click="strokeDilation = 2"
            >
              {{ isEn ? '+2px Heavy' : '+2px 浓墨' }}
            </button>
          </div>
          <label class="checkbox-row">
            <input v-model="autoCropPadding" type="checkbox" />
            <span>{{ isEn ? 'Auto-crop empty margins' : '自动裁切四周多余空白' }}</span>
          </label>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Ink Color Remapping' : '笔迹与印泥色彩映射' }}</label>
          <select v-model="inkColorMode" class="select-input">
            <option value="original">
              {{ isEn ? 'Keep Original Ink + Red Seal' : '保留原色（黑笔 + 鲜红印章共存）' }}
            </option>
            <option value="black">
              {{ isEn ? 'Executive Carbon Black (#0f172a)' : '纯黑商务碳素签 (#0f172a)' }}
            </option>
            <option value="blue">
              {{ isEn ? 'Fountain Pen Royal Blue (#1d4ed8)' : '钢笔宝蓝签 (#1d4ed8)' }}
            </option>
            <option value="red">
              {{ isEn ? 'Official Seal Vermilion (#dc2626)' : '印泥朱红章 (#dc2626)' }}
            </option>
          </select>
        </div>
      </div>

      <!-- Mode 2 Controls -->
      <div v-else class="controls-grid controls-grid-3">
        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Shadow & Uneven Light Removal' : '去手机阴影与底色漂白强度' }}</label>
            <span class="val-badge">{{ shadowCleanStrength }}%</span>
          </div>
          <input
            v-model.number="shadowCleanStrength"
            type="range"
            min="30"
            max="98"
            step="2"
            class="range-slider"
          />
          <span class="ctrl-hint">
            {{
              isEn
                ? 'Local illumination division turns gray/yellow paper 100% pure white'
                : '局部光照背景差分算法，彻底消除手部或灯光投影黑块'
            }}
          </span>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Text Crispness & Contrast' : '文字黑度锐化对比度' }}</label>
            <span class="val-badge">{{ textContrast }}%</span>
          </div>
          <input
            v-model.number="textContrast"
            type="range"
            min="20"
            max="100"
            step="2"
            class="range-slider"
          />
          <span class="ctrl-hint">
            {{
              isEn
                ? 'Deepens faded gray text for laser printing clarity'
                : '加深发虚的浅灰字迹，达到激光打印机扫描仪级清晰度'
            }}
          </span>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Color Seal Protection' : '彩色公章与批注保护' }}</label>
          <label class="checkbox-row" style="margin-top: 6px">
            <input v-model="keepRedStampInDoc" type="checkbox" />
            <span>
              {{
                isEn
                  ? 'Preserve red stamps & red ink while whitening paper'
                  : '漂白灰底的同时保留鲜艳红色公章与红笔批注'
              }}
            </span>
          </label>
        </div>
      </div>

      <!-- Dual Canvas Comparison Workbench -->
      <div
        class="workbench-grid"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDropFile"
      >
        <!-- Left: Source Photo -->
        <div class="canvas-panel">
          <div class="panel-header">
            <span class="panel-tag">
              📷 {{ isEn ? 'Original Smartphone Photo (Gray Shadow)' : '手机实拍原图（发灰带阴影）' }}
            </span>
            <span class="panel-dim">{{ sourceWidth }} × {{ sourceHeight }} px</span>
          </div>
          <div class="canvas-stage raw-stage">
            <canvas ref="sourceCanvasRef" class="preview-canvas"></canvas>
          </div>
        </div>

        <!-- Right: Processed Output -->
        <div class="canvas-panel">
          <div class="panel-header">
            <span class="panel-tag accent-tag">
              ✨
              {{
                activeMode === 'signature'
                  ? isEn
                    ? '100% Transparent PNG (Checkerboard View)'
                    : '抠图结果（棋盘格代表 100% 透明背景）'
                  : isEn
                    ? 'Whitened Printable Document Scan'
                    : '去阴影漂白结果（打印级纯白底）'
              }}
            </span>
            <span class="panel-dim">
              {{ outWidth }} × {{ outHeight }} px · {{ processingMs }} ms
            </span>
          </div>
          <div
            class="canvas-stage"
            :class="activeMode === 'signature' ? 'checkerboard-stage' : 'white-stage'"
          >
            <canvas ref="outputCanvasRef" class="preview-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Export Action Bar -->
      <div class="export-bar">
        <div class="export-metrics">
          <span class="metric-pill">
            🔒 {{ isEn ? '100% Client-Side RAM Processing' : '100% 浏览器内存计算 · 私密签名绝不上传' }}
          </span>
          <span class="metric-pill">
            {{
              activeMode === 'signature'
                ? isEn
                  ? `Removed ${transparentRatio}% Paper Background`
                  : `已剔除 ${transparentRatio}% 纸张灰底像素`
                : isEn
                  ? `Whitened ${transparentRatio}% Shadowed Area`
                  : `已漂白 ${transparentRatio}% 阴影底色区域`
            }}
          </span>
        </div>

        <button type="button" class="primary-dl-btn" @click="downloadPng">
          {{
            activeMode === 'signature'
              ? isEn
                ? '⬇ Download Transparent Signature PNG'
                : '⬇ 一键下载透明底电子签名 (PNG)'
              : isEn
                ? '⬇ Download Whitened Printable Scan (PNG)'
                : '⬇ 一键下载纯白底高清扫描件 (PNG)'
          }}
        </button>
      </div>
    </div>

    <!-- Live Contract Signing Preview (Mode 1 Exclusive Value-Add) -->
    <div v-if="activeMode === 'signature' && outputDataUrl" class="tool-card">
      <div class="card-head">
        <div>
          <h3 class="section-title">
            📑
            {{
              isEn
                ? 'Live Contract Signing & Stamping Preview (Verify Zero Gray Box)'
                : '合同落款盖章实景预览（实时检验贴入 Word / PDF 无白框遮挡文字）'
            }}
          </h3>
          <p class="section-sub">
            {{
              isEn
                ? 'Notice how the extracted signature and seal float seamlessly over the contract text lines without any opaque gray rectangle.'
                : '观察抠出后的签名与红章直接压在合同横线与文字上方，100% 镂空无任何灰白矩形遮挡。'
            }}
          </p>
        </div>

        <div class="contract-ctrls">
          <label>
            {{ isEn ? 'Signature Scale:' : '签名缩放：' }}
            <input v-model.number="contractScale" type="range" min="60" max="140" step="5" />
            <span>{{ contractScale }}%</span>
          </label>
          <label>
            {{ isEn ? 'Vertical Offset:' : '上下微调：' }}
            <input v-model.number="contractOffsetY" type="range" min="-35" max="25" step="1" />
          </label>
        </div>
      </div>

      <div class="mock-contract-paper">
        <div class="contract-clause">
          {{
            isEn
              ? 'Article 8: This Agreement is executed in duplicate and shall enter into force immediately upon electronic or handwritten signature and official seal by both parties.'
              : '第八条 合同生效：本协议一式贰份，甲乙双方加盖公章或手写签字后即刻生效，电子扫描件与原件具有同等法律效力。'
          }}
        </div>

        <div class="contract-sign-row">
          <div class="sign-block">
            <div class="sign-line">
              <span class="sign-label">
                {{ isEn ? 'Party A (Signature / Seal):' : '甲方（授权代表签字 / 盖章）：' }}
              </span>
              <span class="sign-underline"></span>
              <img
                :src="outputDataUrl"
                alt="Extracted transparent signature"
                class="floating-sig-img"
                :style="{
                  transform: `translate(-50%, calc(-50% + ${contractOffsetY}px)) scale(${contractScale / 100})`,
                }"
              />
            </div>
            <div class="sign-date">
              {{ isEn ? 'Date Executed: 2026-11-01' : '签署日期：2026 年 11 月 01 日' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.sig-tool-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tool-card {
  padding: 22px 24px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);

  @media (max-width: 640px) {
    padding: 16px 14px;
  }
}

.mode-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.mode-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-tab {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    background-color: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
}

.top-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-btn {
  padding: 7px 13px;
  border-radius: 9px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.upload-btn {
  padding: 7px 13px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;

  &.controls-grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    &.controls-grid-3 {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    &.controls-grid-3 {
      grid-template-columns: 1fr;
    }
  }
}

.ctrl-box {
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
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
  font-family: 'JetBrains Mono', monospace;
}

.ctrl-hint {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.select-input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
}

.pill-group {
  display: flex;
  gap: 6px;
}

.choice-pill {
  flex: 1;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.workbench-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
}

.canvas-panel {
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  background-color: var(--bg-muted);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 700;
}

.panel-tag {
  color: var(--text-primary);

  &.accent-tag {
    color: var(--accent);
  }
}

.panel-dim {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}

.canvas-stage {
  min-height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

.raw-stage {
  background-color: #27272a;
}

.checkerboard-stage {
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
}

.white-stage {
  background-color: #ffffff;
}

.preview-canvas {
  max-width: 100%;
  max-height: 280px;
  height: auto;
  border-radius: 6px;
}

.export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-color);
}

.export-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.primary-dl-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.92;
  }
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.section-sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.contract-ctrls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);

  label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.mock-contract-paper {
  padding: 26px 32px;
  border-radius: 12px;
  background-color: #ffffff;
  color: #1e293b;
  border: 1px solid #cbd5e1;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  font-family: 'Songti SC', 'SimSun', Georgia, serif;
}

.contract-clause {
  font-size: 14px;
  line-height: 1.75;
  margin-bottom: 34px;
  color: #334155;
}

.contract-sign-row {
  display: flex;
  justify-content: flex-end;
}

.sign-block {
  position: relative;
  min-width: 340px;
  max-width: 100%;
}

.sign-line {
  position: relative;
  display: flex;
  align-items: flex-end;
  margin-bottom: 14px;
  font-size: 14.5px;
  font-weight: 700;
}

.sign-underline {
  flex: 1;
  border-bottom: 1.5px solid #1e293b;
  height: 24px;
  margin-left: 8px;
}

.floating-sig-img {
  position: absolute;
  left: 65%;
  top: 50%;
  max-width: 240px;
  max-height: 110px;
  pointer-events: none;
  transform-origin: center center;
}

.sign-date {
  font-size: 13.5px;
  color: #475569;
}
</style>
