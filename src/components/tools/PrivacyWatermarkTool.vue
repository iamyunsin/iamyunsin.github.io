<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const todayStr = new Date().toISOString().slice(0, 10);

interface TemplatePreset {
  id: string;
  labelZh: string;
  labelEn: string;
  textZh: string;
  textEn: string;
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'rent',
    labelZh: '🏠 租房合同备案',
    labelEn: '🏠 Rental Lease',
    textZh: '仅供办理房屋租赁合同使用 他用无效',
    textEn: 'FOR RENTAL LEASE AGREEMENT ONLY · INVALID FOR OTHER USE',
  },
  {
    id: 'hr',
    labelZh: '💼 入职背调存档',
    labelEn: '💼 HR Onboarding',
    textZh: '仅供办理入职手续存档使用 再次复印无效',
    textEn: 'FOR HR ONBOARDING ARCHIVE ONLY · NO SECONDARY COPY',
  },
  {
    id: 'kyc',
    labelZh: '🏢 企业实名认证',
    labelEn: '🏢 KYC Verification',
    textZh: '仅供平台实名认证审核使用 他用无效',
    textEn: 'FOR KYC IDENTITY VERIFICATION ONLY · DO NOT REUSE',
  },
  {
    id: 'bank',
    labelZh: '🏦 金融开户/贷款',
    labelEn: '🏦 Banking / Loan',
    textZh: '仅供办理银行开户业务使用 谨防冒用',
    textEn: 'FOR BANK ACCOUNT APPLICATION ONLY · CONFIDENTIAL',
  },
];

interface ColorOption {
  id: string;
  nameZh: string;
  nameEn: string;
  hex: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'red', nameZh: '防伪警示红', nameEn: 'Security Red', hex: '#E11D48' },
  { id: 'blue', nameZh: '政务公文蓝', nameEn: 'Official Blue', hex: '#1D4ED8' },
  { id: 'black', nameZh: '碳素印章黑', nameEn: 'Carbon Black', hex: '#0F172A' },
  { id: 'white', nameZh: '反白亮色印', nameEn: 'Pure White', hex: '#FFFFFF' },
];

interface MosaicRect {
  x: number; // normalized 0..1
  y: number;
  w: number;
  h: number;
}

const watermarkText = ref<string>(
  props.lang === 'en'
    ? 'FOR RENTAL LEASE AGREEMENT ONLY · INVALID FOR OTHER USE'
    : '仅供办理房屋租赁合同使用 他用无效'
);
const appendDateStamp = ref<boolean>(true);
const angleDeg = ref<number>(-28);
const opacityPercent = ref<number>(36);
const fontSizePx = ref<number>(22);
const tileGapPx = ref<number>(135);
const selectedColorHex = ref<string>('#E11D48');
const antiAiGuilloche = ref<boolean>(true);
const layoutMode = ref<'single' | 'a4'>('single');

// Front & Back images
const frontInputRef = ref<HTMLInputElement | null>(null);
const backInputRef = ref<HTMLInputElement | null>(null);
const previewCanvasRef = ref<HTMLCanvasElement | null>(null);

const frontImg = ref<HTMLImageElement | null>(null);
const backImg = ref<HTMLImageElement | null>(null);

// Interactive mosaic redaction rectangles (normalized coordinates 0..1 on preview canvas)
const mosaicRects = ref<MosaicRect[]>([]);
const isDrawingRect = ref<boolean>(false);
const dragStart = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const dragCurrent = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const exportUrl = ref<string>('');
const exportBytes = ref<number>(0);

const fullWatermarkLine = computed(() => {
  const base = watermarkText.value.trim() || (isEn.value ? 'CONFIDENTIAL' : '仅供指定业务办理使用 他用无效');
  return appendDateStamp.value ? `${base} (${todayStr})` : base;
});

function applyTemplate(tpl: TemplatePreset) {
  watermarkText.value = isEn.value ? tpl.textEn : tpl.textZh;
}

/**
 * Generates realistic synthetic Front & Back ID card samples so users can test
 * full-screen tiled watermarks, Anti-AI guilloche patterns, mosaic redaction, and A4 1:1 layout immediately.
 */
async function loadDemoIdCards() {
  const createCardUrl = (isFront: boolean): string => {
    const c = document.createElement('canvas');
    c.width = 856;
    c.height = 540;
    const ctx = c.getContext('2d')!;

    // Card base with rounded corners & subtle security background tint
    const grad = ctx.createLinearGradient(0, 0, 856, 540);
    grad.addColorStop(0, '#F8FAFC');
    grad.addColorStop(0.5, '#EFF6FF');
    grad.addColorStop(1, '#F1F5F9');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 856, 540, 28);
    ctx.fill();

    // Subtle background security rings
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.lineWidth = 2;
    for (let r = 60; r < 520; r += 36) {
      ctx.beginPath();
      ctx.arc(428, 270, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Card border
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 852, 536);

    if (isFront) {
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(
        isEn.value ? 'SAMPLE CITIZEN IDENTITY CARD (FRONT)' : '居民身份证样本（正面人像页 · 演示数据）',
        56,
        68
      );

      const fields = isEn.value
        ? [
            ['Name', 'ALEXANDER YUNSIN'],
            ['Gender / Ethnicity', 'Male   ·   Han'],
            ['Date of Birth', '1995 - 08 - 16'],
            ['Address', 'Room 1208, Tech Innovation Plaza, High-Tech Zone'],
          ]
        : [
            ['姓  名', '林 云 昕（样本演示）'],
            ['性  别', '男        民族  汉'],
            ['出  生', '1995 年 08 月 16 日'],
            ['住  址', '四川省成都市高新区天府软件园 E 区 1208 号'],
          ];

      let y = 138;
      for (const [label, val] of fields) {
        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 21px sans-serif';
        ctx.fillText(label, 56, y);
        ctx.fillStyle = '#1E293B';
        ctx.font = '23px sans-serif';
        ctx.fillText(val, 168, y);
        y += 58;
      }

      // Bottom ID Number
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(isEn.value ? 'ID Number' : '公民身份号码', 56, 468);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 31px monospace';
      ctx.fillText('510107199508168888', 230, 470);

      // Portrait placeholder silhouette on right
      ctx.fillStyle = '#DBEAFE';
      ctx.beginPath();
      ctx.roundRect(595, 110, 200, 265, 14);
      ctx.fill();
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.arc(695, 198, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(695, 325, 72, 58, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else {
      // Back side
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(135, 155, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FDE047';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 135, 166);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 38px serif';
      ctx.fillText(
        isEn.value ? 'REPUBLIC CITIZEN IDENTITY CARD' : '中 华 人 民 共 和 国 居 民 身 份 证',
        228,
        168
      );

      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(isEn.value ? 'Issuing Authority' : '签发机关', 120, 375);
      ctx.fillText(isEn.value ? 'Valid Period' : '有效期限', 120, 442);

      ctx.fillStyle = '#1E293B';
      ctx.font = '24px sans-serif';
      ctx.fillText(
        isEn.value ? 'Chengdu Municipal Bureau of Public Security' : '成都市公安局高新技术产业开发区分局',
        265,
        375
      );
      ctx.fillText('2020.08.16 - 2040.08.16', 265, 442);
    }

    return c.toDataURL('image/png');
  };

  const fImg = new Image();
  const bImg = new Image();
  await Promise.all([
    new Promise<void>((res) => {
      fImg.onload = () => res();
      fImg.src = createCardUrl(true);
    }),
    new Promise<void>((res) => {
      bImg.onload = () => res();
      bImg.src = createCardUrl(false);
    }),
  ]);
  frontImg.value = fImg;
  backImg.value = bImg;
  // Default pre-masked last 6 digits of ID number in single mode so user sees redaction immediately
  mosaicRects.value = [{ x: 0.52, y: 0.81, w: 0.27, h: 0.09 }];
  renderCanvas();
}

function onUploadImage(e: Event, side: 'front' | 'back') {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    if (side === 'front') {
      frontImg.value = img;
      mosaicRects.value = [];
    } else {
      backImg.value = img;
      layoutMode.value = 'a4';
    }
    renderCanvas();
  };
  img.src = url;
  input.value = '';
}

function addAutoIdMask() {
  if (layoutMode.value === 'single') {
    mosaicRects.value.push({ x: 0.27, y: 0.81, w: 0.52, h: 0.095 });
  } else {
    mosaicRects.value.push({ x: 0.36, y: 0.41, w: 0.31, h: 0.036 });
  }
  renderCanvas();
}

function clearMosaicRects() {
  mosaicRects.value = [];
  renderCanvas();
}

function applyPixelMosaicRegion(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  blockSize = 14
) {
  const x0 = Math.max(0, Math.floor(Math.min(rx, rx + rw)));
  const y0 = Math.max(0, Math.floor(Math.min(ry, ry + rh)));
  const w = Math.min(ctx.canvas.width - x0, Math.ceil(Math.abs(rw)));
  const h = Math.min(ctx.canvas.height - y0, Math.ceil(Math.abs(rh)));
  if (w < 4 || h < 4) return;

  const imgData = ctx.getImageData(x0, y0, w, h);
  const d = imgData.data;

  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      const sampleX = Math.min(w - 1, bx + (blockSize >> 1));
      const sampleY = Math.min(h - 1, by + (blockSize >> 1));
      const sIdx = (sampleY * w + sampleX) * 4;
      const r = d[sIdx];
      const g = d[sIdx + 1];
      const b = d[sIdx + 2];

      for (let py = by; py < Math.min(h, by + blockSize); py++) {
        for (let px = bx; px < Math.min(w, bx + blockSize); px++) {
          const pIdx = (py * w + px) * 4;
          d[pIdx] = r;
          d[pIdx + 1] = g;
          d[pIdx + 2] = b;
        }
      }
    }
  }
  ctx.putImageData(imgData, x0, y0);
}

function drawSecurityWatermarkOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  const alpha = opacityPercent.value / 100;
  const color = selectedColorHex.value;
  const rad = (angleDeg.value * Math.PI) / 180;

  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);

  const diag = Math.ceil(Math.sqrt(w * w + h * h));
  const fSize = fontSizePx.value;
  ctx.font = `bold ${fSize}px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;

  const text = fullWatermarkLine.value;
  const textWidth = Math.max(160, ctx.measureText(text).width);
  const stepX = textWidth + tileGapPx.value;
  const stepY = Math.max(54, Math.round(tileGapPx.value * 0.72));

  let rowIdx = 0;
  for (let y = -diag; y <= diag; y += stepY) {
    const rowShift = (rowIdx % 2) * (stepX / 2);
    for (let x = -diag; x <= diag; x += stepX) {
      const tx = x + rowShift;
      ctx.fillText(text, tx, y);

      // Anti-AI Inpainting Guilloche Sine Wave + Micro-Stipple Pattern
      if (antiAiGuilloche.value) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.65;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        for (let gx = 0; gx <= textWidth; gx += 6) {
          const wy = y - fSize * 0.32 + Math.sin(gx * 0.14 + rowIdx) * (fSize * 0.24);
          if (gx === 0) ctx.moveTo(tx + gx, wy);
          else ctx.lineTo(tx + gx, wy);
        }
        ctx.stroke();

        // Secondary security micro-dots
        for (let dx = 8; dx < textWidth; dx += 22) {
          const dy = y - fSize * 0.65 + ((dx * 7) % Math.max(8, fSize));
          ctx.fillRect(tx + dx, dy, 2, 2);
        }
        ctx.restore();
      }
    }
    rowIdx++;
  }

  ctx.restore();
}

function renderCanvas() {
  if (!previewCanvasRef.value || !frontImg.value) return;
  const canvas = previewCanvasRef.value;
  const ctx = canvas.getContext('2d')!;

  if (layoutMode.value === 'single') {
    canvas.width = frontImg.value.width;
    canvas.height = frontImg.value.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frontImg.value, 0, 0);
  } else {
    // A4 150 DPI Print Sheet (1240 x 1754 px) with 1:1 centered ID Front & Back
    canvas.width = 1240;
    canvas.height = 1754;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header note on A4 sheet
    ctx.fillStyle = '#64748B';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isEn.value
        ? `A4 1:1 Identity Card Verification Copy · Generated Locally (${todayStr})`
        : `A4 身份证正反面 1:1 标准复印件 · 纯本地防伪加注 (${todayStr})`,
      canvas.width / 2,
      85
    );
    ctx.textAlign = 'left';

    const cardW = 640;
    const cardH = Math.round((frontImg.value.height / frontImg.value.width) * cardW);
    const cx = Math.round((canvas.width - cardW) / 2);

    // Draw Front Card
    ctx.drawImage(frontImg.value, cx, 180, cardW, cardH);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(cx, 180, cardW, cardH);

    // Draw Back Card
    const bImg = backImg.value || frontImg.value;
    const bH = Math.round((bImg.height / bImg.width) * cardW);
    ctx.drawImage(bImg, cx, 180 + cardH + 110, cardW, bH);
    ctx.strokeRect(cx, 180 + cardH + 110, cardW, bH);
  }

  // Apply interactive Mosaic redaction boxes BEFORE watermark so watermark sits on top of mosaic too!
  for (const r of mosaicRects.value) {
    applyPixelMosaicRegion(
      ctx,
      r.x * canvas.width,
      r.y * canvas.height,
      r.w * canvas.width,
      r.h * canvas.height,
      14
    );
  }

  // Active dragging rectangle preview
  if (isDrawingRect.value) {
    const rx = dragStart.value.x * canvas.width;
    const ry = dragStart.value.y * canvas.height;
    const rw = (dragCurrent.value.x - dragStart.value.x) * canvas.width;
    const rh = (dragCurrent.value.y - dragStart.value.y) * canvas.height;
    applyPixelMosaicRegion(ctx, rx, ry, rw, rh, 14);
    ctx.save();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  // Draw tiled security watermark + Anti-AI Guilloche lines
  drawSecurityWatermarkOverlay(ctx, canvas.width, canvas.height);

  if (!isDrawingRect.value) {
    canvas.toBlob(
      (b) => {
        if (!b) return;
        if (exportUrl.value) URL.revokeObjectURL(exportUrl.value);
        exportUrl.value = URL.createObjectURL(b);
        exportBytes.value = b.size;
      },
      'image/jpeg',
      0.93
    );
  }
}

function getNormalizedCanvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const canvas = previewCanvasRef.value!;
  const rect = canvas.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
  const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
  };
}

function onPointerDown(e: MouseEvent) {
  isDrawingRect.value = true;
  const pt = getNormalizedCanvasCoords(e);
  dragStart.value = pt;
  dragCurrent.value = pt;
}

function onPointerMove(e: MouseEvent) {
  if (!isDrawingRect.value) return;
  dragCurrent.value = getNormalizedCanvasCoords(e);
  renderCanvas();
}

function onPointerUp() {
  if (!isDrawingRect.value) return;
  isDrawingRect.value = false;
  const w = dragCurrent.value.x - dragStart.value.x;
  const h = dragCurrent.value.y - dragStart.value.y;
  if (Math.abs(w) > 0.015 && Math.abs(h) > 0.015) {
    mosaicRects.value.push({
      x: Math.min(dragStart.value.x, dragCurrent.value.x),
      y: Math.min(dragStart.value.y, dragCurrent.value.y),
      w: Math.abs(w),
      h: Math.abs(h),
    });
  }
  renderCanvas();
}

watch(
  [
    watermarkText,
    appendDateStamp,
    angleDeg,
    opacityPercent,
    fontSizePx,
    tileGapPx,
    selectedColorHex,
    antiAiGuilloche,
    layoutMode,
  ],
  () => {
    renderCanvas();
  }
);

onMounted(() => {
  loadDemoIdCards();
});
</script>

<template>
  <div class="watermark-tool">
    <!-- Config Card -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. Anti-Counterfeit Watermark & Mosaic Redaction' : '1. 证件防盗用满屏水印、防 AI 干扰纹与敏感号段打码' }}
          </h2>
          <span class="privacy-pill">
            🔒 {{ isEn ? '100% Offline in Browser · Zero Leak Risk' : '断网可用 · 身份证/营业执照绝不上传服务器' }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" @click="loadDemoIdCards">
            {{ isEn ? '🪪 Load Sample ID Card' : '🪪 恢复样本身份证演示' }}
          </button>
          <button type="button" class="upload-btn" @click="frontInputRef?.click()">
            {{ isEn ? '📂 Upload ID / License (Front)' : '📂 选择证件照/正面图' }}
          </button>
          <button type="button" class="upload-sec-btn" @click="backInputRef?.click()">
            {{ isEn ? '➕ Upload Back Side (A4 Sheet)' : '➕ 上传反面图 (合成 A4 打印页)' }}
          </button>
          <input ref="frontInputRef" type="file" accept="image/*" style="display: none" @change="(e) => onUploadImage(e, 'front')" />
          <input ref="backInputRef" type="file" accept="image/*" style="display: none" @change="(e) => onUploadImage(e, 'back')" />
        </div>
      </div>

      <!-- Quick Scene Presets -->
      <div class="preset-row">
        <span class="preset-label">{{ isEn ? 'Quick Legal Templates:' : '常用防冒用法律效力模板：' }}</span>
        <button
          v-for="tpl in TEMPLATES"
          :key="tpl.id"
          type="button"
          class="tpl-chip"
          @click="applyTemplate(tpl)"
        >
          {{ isEn ? tpl.labelEn : tpl.labelZh }}
        </button>
      </div>

      <!-- Text Input + Date Toggle -->
      <div class="text-input-bar">
        <input
          v-model="watermarkText"
          type="text"
          class="text-input"
          :placeholder="isEn ? 'Enter custom watermark text...' : '输入自定义防盗用水印文字，如：仅供办理XX业务使用 他用无效'"
        />
        <label class="checkbox-pill">
          <input v-model="appendDateStamp" type="checkbox" />
          <span>{{ isEn ? `Append Today (${todayStr})` : `自动附带今日日期 (${todayStr})` }}</span>
        </label>
        <label class="checkbox-pill highlight-pill">
          <input v-model="antiAiGuilloche" type="checkbox" />
          <span>🛡️ {{ isEn ? 'Anti-AI Removal Guilloche Wave' : '防 AI 去水印高频微噪点干扰纹' }}</span>
        </label>
      </div>

      <!-- Sliders Grid -->
      <div class="controls-grid">
        <div class="ctrl-box">
          <label>{{ isEn ? 'Stamp Ink Color' : '防伪印油颜色' }}</label>
          <div class="color-row">
            <button
              v-for="c in COLOR_OPTIONS"
              :key="c.id"
              type="button"
              class="color-chip"
              :class="{ active: selectedColorHex === c.hex }"
              @click="selectedColorHex = c.hex"
            >
              <span class="color-dot" :style="{ backgroundColor: c.hex }"></span>
              <span>{{ isEn ? c.nameEn : c.nameZh }}</span>
            </button>
          </div>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Opacity & Angle' : '透明度与旋转角度' }}</label>
            <span class="val-badge">{{ opacityPercent }}% / {{ angleDeg }}°</span>
          </div>
          <div class="dual-sliders">
            <input v-model.number="opacityPercent" type="range" min="10" max="85" class="range-slider" />
            <input v-model.number="angleDeg" type="range" min="-60" max="60" class="range-slider" />
          </div>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Font Size & Tile Spacing' : '字号大小与平铺间距' }}</label>
            <span class="val-badge">{{ fontSizePx }}px / {{ tileGapPx }}px</span>
          </div>
          <div class="dual-sliders">
            <input v-model.number="fontSizePx" type="range" min="14" max="46" class="range-slider" />
            <input v-model.number="tileGapPx" type="range" min="60" max="260" class="range-slider" />
          </div>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Output Layout Mode' : '输出排版模式' }}</label>
          <div class="mode-switch">
            <button
              type="button"
              class="mode-btn"
              :class="{ active: layoutMode === 'single' }"
              @click="layoutMode = 'single'"
            >
              {{ isEn ? '🖼️ Single Card' : '🖼️ 单张原图加水印' }}
            </button>
            <button
              type="button"
              class="mode-btn"
              :class="{ active: layoutMode === 'a4' }"
              @click="layoutMode = 'a4'"
            >
              {{ isEn ? '📄 A4 Front+Back Sheet' : '📄 A4 正反面 1:1 打印页' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive Canvas Stage -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h3 class="section-title">
            {{ isEn ? '2. Interactive Preview (Drag on Image to Mosaic Sensitive Digits)' : '2. 实时防伪预览（按住鼠标在图片上拖拽即可框选打码敏感号段）' }}
          </h3>
        </div>

        <div class="head-actions">
          <button type="button" class="mosaic-btn" @click="addAutoIdMask">
            {{ isEn ? '⚡ Auto-Mask ID Digits' : '⚡ 一键遮挡公民身份号码段' }}
          </button>
          <button
            v-if="mosaicRects.length > 0"
            type="button"
            class="clear-btn"
            @click="clearMosaicRects"
          >
            {{ isEn ? `Clear Mosaic (${mosaicRects.length})` : `清除打码框 (${mosaicRects.length})` }}
          </button>
          <a
            v-if="exportUrl"
            :href="exportUrl"
            :download="`Protected_ID_${layoutMode}_${todayStr}.jpg`"
            class="dl-btn"
          >
            ⬇ {{ isEn ? `Download Protected Image (${Math.round(exportBytes / 1024)} KB)` : `下载安全加注证件图 (${Math.round(exportBytes / 1024)} KB)` }}
          </a>
        </div>
      </div>

      <div class="canvas-viewport">
        <canvas
          ref="previewCanvasRef"
          class="watermark-canvas"
          @mousedown="onPointerDown"
          @mousemove="onPointerMove"
          @mouseup="onPointerUp"
          @mouseleave="onPointerUp"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.watermark-tool {
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

.card-head {
  display: flex;
  align-items: center;
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
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}

.privacy-pill {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background-color: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-btn,
.clear-btn {
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.upload-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid var(--accent);
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.upload-sec-btn,
.mosaic-btn {
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.preset-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.preset-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.tpl-chip {
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
}

.text-input-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.text-input {
  flex: 1 1 320px;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.checkbox-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;

  &.highlight-pill {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.ctrl-box {
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 12px;
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
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &.active {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.dual-sliders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.mode-btn {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
}

.canvas-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-radius: 14px;
  background: repeating-conic-gradient(var(--bg-muted) 0% 25%, var(--bg-surface) 0% 50%) 50% / 16px 16px;
  border: 1px solid var(--border-color);
  overflow: auto;
}

.watermark-canvas {
  max-width: 100%;
  max-height: 540px;
  width: auto;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
  cursor: crosshair;
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 9px;
  background-color: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}
</style>
