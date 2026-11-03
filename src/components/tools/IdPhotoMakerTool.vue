<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
  initialPresetId?: string;
  initialBgId?: string;
  initialMaxKb?: number;
  initialMinKb?: number;
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
  initialPresetId: 'exam',
  initialBgId: 'blue',
  initialMaxKb: 30,
  initialMinKb: 15,
});

const isEn = computed(() => props.lang === 'en');

interface SizePreset {
  id: string;
  nameZh: string;
  nameEn: string;
  mmText: string;
  width: number;
  height: number;
  recMaxKb: number;
  recMinKb: number;
}

const SIZE_PRESETS: SizePreset[] = [
  {
    id: '1inch',
    nameZh: '一寸标准照 (简历/驾照/社保)',
    nameEn: '1-Inch Standard (25×35mm)',
    mmText: '25×35 mm · 300 DPI',
    width: 295,
    height: 413,
    recMaxKb: 50,
    recMinKb: 0,
  },
  {
    id: 'exam',
    nameZh: '公务员/教资/四六级报名照',
    nameEn: 'Civil Service / Exam Portal',
    mmText: '25×35 mm · 严控 15~30KB',
    width: 295,
    height: 413,
    recMaxKb: 30,
    recMinKb: 15,
  },
  {
    id: 'small1inch',
    nameZh: '小一寸 (驾驶证/护照回执)',
    nameEn: 'Small 1-Inch (22×32mm)',
    mmText: '22×32 mm · 300 DPI',
    width: 260,
    height: 378,
    recMaxKb: 40,
    recMinKb: 0,
  },
  {
    id: 'large1inch',
    nameZh: '大一寸 (中国护照/港澳通行证)',
    nameEn: 'Large 1-Inch (33×48mm)',
    mmText: '33×48 mm · 300 DPI',
    width: 390,
    height: 567,
    recMaxKb: 60,
    recMinKb: 10,
  },
  {
    id: '2inch',
    nameZh: '二寸标准照 (毕业证/职称考试)',
    nameEn: '2-Inch Standard (35×49mm)',
    mmText: '35×49 mm · 300 DPI',
    width: 413,
    height: 579,
    recMaxKb: 80,
    recMinKb: 0,
  },
  {
    id: 'visa',
    nameZh: '美国/日本签证方形照 (51×51mm)',
    nameEn: 'US / Japan Visa Square (2×2 inch)',
    mmText: '51×51 mm · 600×600 px',
    width: 600,
    height: 600,
    recMaxKb: 120,
    recMinKb: 20,
  },
];

interface BgPreset {
  id: string;
  nameZh: string;
  nameEn: string;
  topColor: string;
  bottomColor: string;
}

const BG_PRESETS: BgPreset[] = [
  { id: 'blue', nameZh: '政务蓝', nameEn: 'Official Blue', topColor: '#438EDB', bottomColor: '#438EDB' },
  { id: 'white', nameZh: '标准白', nameEn: 'Pure White', topColor: '#FFFFFF', bottomColor: '#FFFFFF' },
  { id: 'red', nameZh: '中国红', nameEn: 'Official Red', topColor: '#D9001B', bottomColor: '#D9001B' },
  { id: 'grad-blue', nameZh: '渐变蓝', nameEn: 'Gradient Blue', topColor: '#3B82F6', bottomColor: '#93C5FD' },
  { id: 'grad-grey', nameZh: '高级灰渐变', nameEn: 'Executive Grey', topColor: '#64748B', bottomColor: '#CBD5E1' },
  { id: 'original', nameZh: '保留原图背景', nameEn: 'Keep Original', topColor: 'transparent', bottomColor: 'transparent' },
];

const selectedPresetId = ref<string>(props.initialPresetId);
const selectedBgId = ref<string>(props.initialBgId);
const tolerance = ref<number>(36);
const feather = ref<number>(18);
const zoomScale = ref<number>(100);
const offsetX = ref<number>(0);
const offsetY = ref<number>(0);
const brightness = ref<number>(102);
const showGuideLines = ref<boolean>(true);
const suitOverlay = ref<'none' | 'navy' | 'black'>('none');

// Exact KB Target Sizer controls
const targetMaxKb = ref<number>(props.initialMaxKb);
const targetMinKb = ref<number>(props.initialMinKb);

// Source image & canvases
const fileInputRef = ref<HTMLInputElement | null>(null);
const singleCanvasRef = ref<HTMLCanvasElement | null>(null);
const printSheetCanvasRef = ref<HTMLCanvasElement | null>(null);

const sourceImg = ref<HTMLImageElement | null>(null);
const sampledBgRgb = ref<[number, number, number]>([232, 238, 245]);

// Output state
const singleBlobUrl = ref<string>('');
const singleByteSize = ref<number>(0);
const usedQuality = ref<number>(92);
const paddedBytesCount = ref<number>(0);
const printSheetUrl = ref<string>('');
const printPhotoCount = ref<number>(8);

const currentPreset = computed(
  () => SIZE_PRESETS.find((p) => p.id === selectedPresetId.value) || SIZE_PRESETS[0]
);
const currentBg = computed(
  () => BG_PRESETS.find((b) => b.id === selectedBgId.value) || BG_PRESETS[0]
);

function onPresetChange() {
  const p = currentPreset.value;
  targetMaxKb.value = p.recMaxKb;
  targetMinKb.value = p.recMinKb;
  renderAll();
}

function formatKb(bytes: number): string {
  if (!bytes) return '0.0 KB';
  return `${(bytes / 1024).toFixed(2)} KB (${bytes.toLocaleString()} Bytes)`;
}

/**
 * Generates a realistic high-resolution studio portrait with a light neutral wall background
 * so background matting, tolerance, feathering, KB sizer, and 6-inch layout can be tested immediately.
 */
async function loadDemoPortrait() {
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 800;
  const ctx = c.getContext('2d')!;

  // Light warm-grey indoor wall background (#E8EEF5)
  ctx.fillStyle = '#E8EEF5';
  ctx.fillRect(0, 0, 600, 800);

  // Subtle ambient lighting gradient in background to demonstrate tolerance slider
  const bgRad = ctx.createRadialGradient(300, 300, 80, 300, 350, 460);
  bgRad.addColorStop(0, '#EDF2F7');
  bgRad.addColorStop(1, '#E2E8F0');
  ctx.fillStyle = bgRad;
  ctx.fillRect(0, 0, 600, 800);

  // Neck
  ctx.fillStyle = '#E8B89A';
  ctx.beginPath();
  ctx.roundRect(245, 420, 110, 145, 30);
  ctx.fill();

  // Neck shadow
  ctx.fillStyle = 'rgba(160, 105, 75, 0.28)';
  ctx.beginPath();
  ctx.ellipse(300, 445, 54, 24, 0, 0, Math.PI);
  ctx.fill();

  // Shoulders / Business Shirt & Jacket
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(85, 800);
  ctx.quadraticCurveTo(95, 535, 240, 515);
  ctx.lineTo(360, 515);
  ctx.quadraticCurveTo(505, 535, 515, 800);
  ctx.closePath();
  ctx.fill();

  // White collar shirt V-neck
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(238, 512);
  ctx.lineTo(300, 650);
  ctx.lineTo(362, 512);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = '#991B1B';
  ctx.beginPath();
  ctx.moveTo(288, 545);
  ctx.lineTo(312, 545);
  ctx.lineTo(318, 655);
  ctx.lineTo(300, 685);
  ctx.lineTo(282, 655);
  ctx.closePath();
  ctx.fill();

  // Ears
  ctx.fillStyle = '#E5B293';
  ctx.beginPath();
  ctx.ellipse(185, 315, 20, 38, -0.08, 0, Math.PI * 2);
  ctx.ellipse(415, 315, 20, 38, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Head contour
  const faceGrad = ctx.createLinearGradient(200, 160, 400, 450);
  faceGrad.addColorStop(0, '#F5CBA7');
  faceGrad.addColorStop(1, '#E5B293');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(300, 305, 114, 148, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#1E1B18';
  ctx.beginPath();
  ctx.ellipse(300, 210, 122, 88, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(178, 215);
  ctx.quadraticCurveTo(185, 130, 300, 128);
  ctx.quadraticCurveTo(415, 130, 422, 215);
  ctx.quadraticCurveTo(418, 285, 406, 290);
  ctx.quadraticCurveTo(395, 210, 340, 198);
  ctx.quadraticCurveTo(250, 185, 194, 290);
  ctx.quadraticCurveTo(182, 285, 178, 215);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#27231F';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(232, 268);
  ctx.quadraticCurveTo(258, 258, 280, 266);
  ctx.moveTo(320, 266);
  ctx.quadraticCurveTo(342, 258, 368, 268);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(256, 294, 20, 11, 0, 0, Math.PI * 2);
  ctx.ellipse(344, 294, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.arc(256, 294, 9, 0, Math.PI * 2);
  ctx.arc(344, 294, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(259, 291, 3, 0, Math.PI * 2);
  ctx.arc(347, 291, 3, 0, Math.PI * 2);
  ctx.fill();

  // Nose bridge & tip
  ctx.strokeStyle = 'rgba(165, 108, 78, 0.55)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(300, 288);
  ctx.lineTo(296, 344);
  ctx.quadraticCurveTo(300, 352, 308, 346);
  ctx.stroke();

  // Gentle smile
  ctx.strokeStyle = '#BE6A5A';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(270, 386);
  ctx.quadraticCurveTo(300, 402, 330, 386);
  ctx.stroke();

  const dataUrl = c.toDataURL('image/png');
  await loadSourceFromUrl(dataUrl);
}

async function loadSourceFromUrl(url: string) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  sourceImg.value = img;
  sampleCornerBackgroundColor(img);
  zoomScale.value = 100;
  offsetX.value = 0;
  offsetY.value = 0;
  await renderAll();
}

function sampleCornerBackgroundColor(img: HTMLImageElement) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;
  // Sample top-left, top-right, and upper-left/right border pixels
  const sampleCoords = [
    [2, 2],
    [61, 2],
    [2, 18],
    [61, 18],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of sampleCoords) {
    const idx = (y * 64 + x) * 4;
    r += data[idx];
    g += data[idx + 1];
    b += data[idx + 2];
  }
  sampledBgRgb.value = [
    Math.round(r / sampleCoords.length),
    Math.round(g / sampleCoords.length),
    Math.round(b / sampleCoords.length),
  ];
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  loadSourceFromUrl(url).finally(() => {
    input.value = '';
  });
}

/**
 * Flood-fill + edge chroma tolerance matting from border pixels inward
 * so interior skin/shirt highlights are never accidentally erased.
 */
function applySmartBackgroundMatting(
  fgData: ImageData,
  bgRgb: [number, number, number],
  tol: number,
  featherVal: number
): HTMLCanvasElement {
  const w = fgData.width;
  const h = fgData.height;
  const data = new Uint8ClampedArray(fgData.data);
  const visited = new Uint8Array(w * h);
  const bgDist = new Float32Array(w * h).fill(999);

  const [br, bg, bb] = bgRgb;
  const maxTolDist = tol * 2.25;
  const softLimit = maxTolDist + featherVal * 2.2;

  const colorDist = (idx4: number) => {
    const dr = data[idx4] - br;
    const dg = data[idx4 + 1] - bg;
    const db = data[idx4 + 2] - bb;
    return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
  };

  // BFS flood fill starting from left, top, and right borders
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const pushSeed = (x: number, y: number) => {
    const pos = y * w + x;
    if (visited[pos]) return;
    const d = colorDist(pos * 4);
    if (d <= softLimit) {
      visited[pos] = 1;
      bgDist[pos] = d;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < w; x++) {
    pushSeed(x, 0);
  }
  for (let y = 0; y < Math.floor(h * 0.88); y++) {
    pushSeed(0, y);
    pushSeed(w - 1, y);
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr / w) | 0;

    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];
    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const npos = ny * w + nx;
      if (visited[npos]) continue;
      const d = colorDist(npos * 4);
      if (d <= softLimit) {
        visited[npos] = 1;
        bgDist[npos] = d;
        queue[tail++] = npos;
      }
    }
  }

  // Apply smooth alpha ramp along flood-filled background region
  for (let i = 0; i < w * h; i++) {
    if (!visited[i]) continue;
    const d = bgDist[i];
    const idx4 = i * 4;
    if (d <= maxTolDist) {
      data[idx4 + 3] = 0;
    } else {
      const ratio = (d - maxTolDist) / Math.max(1, softLimit - maxTolDist);
      data[idx4 + 3] = Math.min(255, Math.max(0, Math.round(ratio * 255)));
    }
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  outCanvas.getContext('2d')!.putImageData(new ImageData(data, w, h), 0, 0);
  return outCanvas;
}

/**
 * Pads a JPEG Uint8Array with a benign JPEG Comment (0xFFFE) segment before EOI (0xFFD9)
 * when an exam portal enforces a strict minimum KB threshold (e.g., >= 15 KB).
 */
function padJpegToMinBytes(jpegBytes: Uint8Array, minBytes: number): Uint8Array {
  if (jpegBytes.length >= minBytes) return jpegBytes;
  const deficit = minBytes - jpegBytes.length + 128; // Add slight safety margin above minimum
  const out = new Uint8Array(jpegBytes.length + deficit);
  // Copy everything up to the final 2 EOI bytes (0xFF 0xD9)
  const bodyEnd = Math.max(2, jpegBytes.length - 2);
  out.set(jpegBytes.subarray(0, bodyEnd), 0);

  let pos = bodyEnd;
  let remaining = deficit;
  while (remaining >= 4) {
    const chunkPayload = Math.min(remaining - 4, 65500);
    const segLen = chunkPayload + 2;
    out[pos] = 0xff;
    out[pos + 1] = 0xfe; // COM marker
    out[pos + 2] = (segLen >> 8) & 0xff;
    out[pos + 3] = segLen & 0xff;
    out.fill(0x20, pos + 4, pos + 4 + chunkPayload);
    pos += 4 + chunkPayload;
    remaining -= 4 + chunkPayload;
  }
  out[pos] = 0xff;
  out[pos + 1] = 0xd9;
  return out.subarray(0, pos + 2);
}

/**
 * Binary search JPEG quality to hit exact KB range [minKb, maxKb]
 */
async function encodeExactKbJpeg(
  sourceCanvas: HTMLCanvasElement,
  minKb: number,
  maxKb: number
): Promise<{ blob: Blob; qualityPercent: number; paddedBytes: number }> {
  const toBlobAtQ = (c: HTMLCanvasElement, q: number) =>
    new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), 'image/jpeg', q));

  if (maxKb <= 0) {
    const b = await toBlobAtQ(sourceCanvas, 0.94);
    return { blob: b, qualityPercent: 94, paddedBytes: 0 };
  }

  const maxBytes = maxKb * 1024;
  const minBytes = Math.min(maxBytes - 512, Math.max(0, minKb * 1024));

  let low = 0.08;
  let high = 0.99;
  let bestBlob: Blob | null = null;
  let bestQ = 0.85;

  for (let iter = 0; iter < 8; iter++) {
    const mid = (low + high) / 2;
    const candidate = await toBlobAtQ(sourceCanvas, mid);
    if (candidate.size <= maxBytes) {
      bestBlob = candidate;
      bestQ = mid;
      low = mid; // Try higher quality while staying under maxBytes
    } else {
      high = mid;
    }
  }

  if (!bestBlob) {
    bestBlob = await toBlobAtQ(sourceCanvas, 0.05);
    bestQ = 0.05;
  }

  let padded = 0;
  if (minBytes > 0 && bestBlob.size < minBytes) {
    const raw = new Uint8Array(await bestBlob.arrayBuffer());
    const paddedArr = padJpegToMinBytes(raw, minBytes);
    padded = paddedArr.length - raw.length;
    bestBlob = new Blob([paddedArr as BlobPart], { type: 'image/jpeg' });
  }

  return {
    blob: bestBlob,
    qualityPercent: Math.round(bestQ * 100),
    paddedBytes: padded,
  };
}

function drawSuitOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, style: 'navy' | 'black') {
  ctx.save();
  const coatColor = style === 'navy' ? '#172554' : '#18181B';
  const lapelColor = style === 'navy' ? '#1E3A8A' : '#27272A';

  // Suit shoulders
  ctx.fillStyle = coatColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, h);
  ctx.quadraticCurveTo(w * 0.02, h * 0.72, w * 0.34, h * 0.69);
  ctx.lineTo(w * 0.5, h * 0.89);
  ctx.lineTo(w * 0.66, h * 0.69);
  ctx.quadraticCurveTo(w * 0.98, h * 0.72, w * 1.05, h);
  ctx.closePath();
  ctx.fill();

  // White dress shirt V-zone
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h * 0.69);
  ctx.lineTo(w * 0.5, h * 0.9);
  ctx.lineTo(w * 0.65, h * 0.69);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = style === 'navy' ? '#B91C1C' : '#1D4ED8';
  ctx.beginPath();
  ctx.moveTo(w * 0.47, h * 0.73);
  ctx.lineTo(w * 0.53, h * 0.73);
  ctx.lineTo(w * 0.54, h * 0.88);
  ctx.lineTo(w * 0.5, h * 0.93);
  ctx.lineTo(w * 0.46, h * 0.88);
  ctx.closePath();
  ctx.fill();

  // Lapels
  ctx.strokeStyle = lapelColor;
  ctx.lineWidth = Math.max(2, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.69);
  ctx.lineTo(w * 0.48, h * 0.89);
  ctx.moveTo(w * 0.66, h * 0.69);
  ctx.lineTo(w * 0.52, h * 0.89);
  ctx.stroke();
  ctx.restore();
}

async function renderAll() {
  if (!sourceImg.value) return;
  const preset = currentPreset.value;
  const bg = currentBg.value;
  const w = preset.width;
  const h = preset.height;

  // Create clean offscreen export canvas (without guide lines)
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = w;
  exportCanvas.height = h;
  const ctx = exportCanvas.getContext('2d')!;

  // 1. Draw target background color / gradient
  if (bg.id !== 'original') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, bg.topColor);
    grad.addColorStop(1, bg.bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Prepare foreground canvas with crop/zoom/brightness
  const fgCanvas = document.createElement('canvas');
  fgCanvas.width = w;
  fgCanvas.height = h;
  const fgCtx = fgCanvas.getContext('2d')!;
  fgCtx.filter = `brightness(${brightness.value}%) contrast(103%)`;

  const img = sourceImg.value;
  const baseScale = Math.max(w / img.width, h / img.height);
  const finalScale = baseScale * (zoomScale.value / 100);
  const drawW = img.width * finalScale;
  const drawH = img.height * finalScale;
  const dx = (w - drawW) / 2 + offsetX.value;
  const dy = (h - drawH) / 2 + offsetY.value;

  fgCtx.drawImage(img, dx, dy, drawW, drawH);
  fgCtx.filter = 'none';

  if (bg.id !== 'original') {
    const fgImgData = fgCtx.getImageData(0, 0, w, h);
    const mattedCanvas = applySmartBackgroundMatting(
      fgImgData,
      sampledBgRgb.value,
      tolerance.value,
      feather.value
    );
    ctx.drawImage(mattedCanvas, 0, 0);
  } else {
    ctx.drawImage(fgCanvas, 0, 0);
  }

  if (suitOverlay.value !== 'none') {
    drawSuitOverlay(ctx, w, h, suitOverlay.value);
  }

  // 3. Render onto visible preview canvas (with optional alignment guidelines)
  if (singleCanvasRef.value) {
    const prevCanvas = singleCanvasRef.value;
    prevCanvas.width = w;
    prevCanvas.height = h;
    const pCtx = prevCanvas.getContext('2d')!;
    pCtx.clearRect(0, 0, w, h);
    pCtx.drawImage(exportCanvas, 0, 0);

    if (showGuideLines.value) {
      pCtx.save();
      pCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      pCtx.setLineDash([5, 4]);
      pCtx.lineWidth = 1.5;

      // Top hair margin line (10% from top)
      pCtx.beginPath();
      pCtx.moveTo(w * 0.15, h * 0.11);
      pCtx.lineTo(w * 0.85, h * 0.11);
      // Chin line (62% from top)
      pCtx.moveTo(w * 0.2, h * 0.62);
      pCtx.lineTo(w * 0.8, h * 0.62);
      // Vertical center axis
      pCtx.moveTo(w * 0.5, h * 0.06);
      pCtx.lineTo(w * 0.5, h * 0.94);
      pCtx.stroke();

      // Head oval guide
      pCtx.beginPath();
      pCtx.ellipse(w * 0.5, h * 0.37, w * 0.22, h * 0.24, 0, 0, Math.PI * 2);
      pCtx.stroke();
      pCtx.restore();
    }
  }

  // 4. Encode single photo with Exact KB Sizer
  const { blob, qualityPercent, paddedBytes } = await encodeExactKbJpeg(
    exportCanvas,
    targetMinKb.value,
    targetMaxKb.value
  );
  if (singleBlobUrl.value) URL.revokeObjectURL(singleBlobUrl.value);
  singleBlobUrl.value = URL.createObjectURL(blob);
  singleByteSize.value = blob.size;
  usedQuality.value = qualityPercent;
  paddedBytesCount.value = paddedBytes;

  // 5. Render 6-Inch (4x6 inch = 1800x1200 px at 300 DPI) Print Layout Sheet
  renderSixInchPrintSheet(exportCanvas);
}

function renderSixInchPrintSheet(singlePhotoCanvas: HTMLCanvasElement) {
  const sheetW = 1800;
  const sheetH = 1200;
  const sheetCanvas = printSheetCanvasRef.value || document.createElement('canvas');
  sheetCanvas.width = sheetW;
  sheetCanvas.height = sheetH;
  const ctx = sheetCanvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, sheetW, sheetH);

  const pw = singlePhotoCanvas.width;
  const ph = singlePhotoCanvas.height;
  const gap = 36;

  // Determine how many columns/rows fit comfortably on 1800x1200
  const cols = Math.min(4, Math.max(2, Math.floor((sheetW - 120) / (pw + gap))));
  const rows = Math.min(2, Math.max(1, Math.floor((sheetH - 140) / (ph + gap))));
  printPhotoCount.value = cols * rows;

  const totalGridW = cols * pw + (cols - 1) * gap;
  const totalGridH = rows * ph + (rows - 1) * gap;
  const startX = Math.round((sheetW - totalGridW) / 2);
  const startY = Math.round((sheetH - totalGridH) / 2) - 12;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (pw + gap);
      const y = startY + r * (ph + gap);

      ctx.drawImage(singlePhotoCanvas, x, y, pw, ph);

      // Subtle border & crop marks for scissor cutting
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, pw, ph);

      // Corner crop ticks
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      const tick = 12;
      ctx.beginPath();
      // Top-left
      ctx.moveTo(x - tick, y);
      ctx.lineTo(x - 3, y);
      ctx.moveTo(x, y - tick);
      ctx.lineTo(x, y - 3);
      // Top-right
      ctx.moveTo(x + pw + 3, y);
      ctx.lineTo(x + pw + tick, y);
      ctx.moveTo(x + pw, y - tick);
      ctx.lineTo(x + pw, y - 3);
      // Bottom-left
      ctx.moveTo(x - tick, y + ph);
      ctx.lineTo(x - 3, y + ph);
      ctx.moveTo(x, y + ph + 3);
      ctx.lineTo(x, y + ph + tick);
      // Bottom-right
      ctx.moveTo(x + pw + 3, y + ph);
      ctx.lineTo(x + pw + tick, y + ph);
      ctx.moveTo(x + pw, y + ph + 3);
      ctx.lineTo(x + pw, y + ph + tick);
      ctx.stroke();
    }
  }

  // Footer print guide label
  ctx.fillStyle = '#94A3B8';
  ctx.font = '22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `6-Inch Photo Paper (4×6" · 1800×1200px @ 300DPI) · ${currentPreset.value.nameZh} (${pw}×${ph}px × ${printPhotoCount.value})`,
    sheetW / 2,
    sheetH - 28
  );

  sheetCanvas.toBlob(
    (b) => {
      if (!b) return;
      if (printSheetUrl.value) URL.revokeObjectURL(printSheetUrl.value);
      printSheetUrl.value = URL.createObjectURL(b);
    },
    'image/jpeg',
    0.96
  );
}

watch(
  [
    selectedBgId,
    tolerance,
    feather,
    zoomScale,
    offsetX,
    offsetY,
    brightness,
    showGuideLines,
    suitOverlay,
    targetMaxKb,
    targetMinKb,
  ],
  () => {
    renderAll();
  }
);

onMounted(() => {
  loadDemoPortrait();
});
</script>

<template>
  <div class="id-photo-tool">
    <!-- Top Bar -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. ID Photo Size, Background & Exact KB Sizer' : '1. 证件照规格、智能换底与精准控 KB 参数' }}
          </h2>
          <span class="privacy-pill">
            🛡️ {{ isEn ? '100% Local Processing · Zero Upload' : '100% 浏览器本地抠图换底 · 零服务器上传' }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" @click="loadDemoPortrait">
            {{ isEn ? '🧑 Load Demo Portrait' : '🧑 恢复内置标准人像演示' }}
          </button>
          <button type="button" class="upload-btn" @click="fileInputRef?.click()">
            {{ isEn ? '📂 Upload Your Photo' : '📂 选择本地半身照/证件照' }}
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

      <!-- Controls Grid -->
      <div class="controls-grid">
        <!-- Preset Size -->
        <div class="ctrl-box">
          <label>{{ isEn ? 'Standard Dimension Preset (300 DPI)' : '证件照标准尺寸规格 (300 DPI)' }}</label>
          <select v-model="selectedPresetId" class="select-input" @change="onPresetChange">
            <option v-for="p in SIZE_PRESETS" :key="p.id" :value="p.id">
              {{ isEn ? p.nameEn : p.nameZh }} ({{ p.width }}×{{ p.height }}px)
            </option>
          </select>
          <span class="sub-hint">{{ currentPreset.mmText }}</span>
        </div>

        <!-- Background Swatches -->
        <div class="ctrl-box">
          <label>{{ isEn ? 'Target Background Color' : '一键更换底色 (红/蓝/白/渐变)' }}</label>
          <div class="bg-swatch-row">
            <button
              v-for="bg in BG_PRESETS"
              :key="bg.id"
              type="button"
              class="swatch-btn"
              :class="{ active: selectedBgId === bg.id }"
              :title="isEn ? bg.nameEn : bg.nameZh"
              @click="selectedBgId = bg.id"
            >
              <span
                class="swatch-dot"
                :style="{
                  background:
                    bg.id === 'original'
                      ? 'repeating-conic-gradient(#cbd5e1 0% 25%, #fff 0% 50%) 50% / 8px 8px'
                      : `linear-gradient(180deg, ${bg.topColor}, ${bg.bottomColor})`,
                }"
              ></span>
              <span class="swatch-label">{{ isEn ? bg.nameEn : bg.nameZh }}</span>
            </button>
          </div>
        </div>

        <!-- Matting Tolerance & Feather -->
        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Edge Matting Tolerance & Feather' : '智能抠图容差与发丝边缘羽化' }}</label>
            <span class="val-badge">{{ tolerance }} / {{ feather }}</span>
          </div>
          <div class="dual-sliders">
            <div class="mini-slider">
              <span>{{ isEn ? 'Tolerance' : '容差' }}</span>
              <input v-model.number="tolerance" type="range" min="5" max="90" class="range-slider" />
            </div>
            <div class="mini-slider">
              <span>{{ isEn ? 'Feather' : '羽化' }}</span>
              <input v-model.number="feather" type="range" min="2" max="45" class="range-slider" />
            </div>
          </div>
        </div>

        <!-- Exact KB Target Sizer -->
        <div class="ctrl-box highlight-box">
          <div class="ctrl-top">
            <label>🎯 {{ isEn ? 'Exact File Size (KB) Controller' : '报名系统精准控 KB 大小导出' }}</label>
            <span class="val-badge">{{ targetMinKb }}~{{ targetMaxKb }} KB</span>
          </div>
          <div class="kb-presets">
            <button
              type="button"
              class="kb-chip"
              :class="{ active: targetMaxKb === 20 && targetMinKb === 10 }"
              @click="targetMinKb = 10; targetMaxKb = 20"
            >
              10~20 KB
            </button>
            <button
              type="button"
              class="kb-chip"
              :class="{ active: targetMaxKb === 30 && targetMinKb === 15 }"
              @click="targetMinKb = 15; targetMaxKb = 30"
            >
              15~30 KB ({{ isEn ? 'Exam' : '公考/教资' }})
            </button>
            <button
              type="button"
              class="kb-chip"
              :class="{ active: targetMaxKb === 50 && targetMinKb === 20 }"
              @click="targetMinKb = 20; targetMaxKb = 50"
            >
              20~50 KB
            </button>
            <button
              type="button"
              class="kb-chip"
              :class="{ active: targetMaxKb === 100 && targetMinKb === 0 }"
              @click="targetMinKb = 0; targetMaxKb = 100"
            >
              ≤100 KB
            </button>
          </div>
        </div>
      </div>

      <!-- Fine-tune Position, Beauty & Suit Row -->
      <div class="secondary-controls">
        <div class="sec-item">
          <span>{{ isEn ? 'Zoom:' : '人物缩放:' }} <strong>{{ zoomScale }}%</strong></span>
          <input v-model.number="zoomScale" type="range" min="70" max="160" class="range-slider" />
        </div>
        <div class="sec-item">
          <span>{{ isEn ? 'Vertical Pos:' : '上下微调:' }} <strong>{{ offsetY }}px</strong></span>
          <input v-model.number="offsetY" type="range" min="-100" max="100" class="range-slider" />
        </div>
        <div class="sec-item">
          <span>{{ isEn ? 'Fill Light:' : '美颜补光:' }} <strong>{{ brightness }}%</strong></span>
          <input v-model.number="brightness" type="range" min="85" max="125" class="range-slider" />
        </div>
        <div class="sec-item">
          <span>{{ isEn ? 'Formal Suit:' : '正装西服领带叠加:' }}</span>
          <select v-model="suitOverlay" class="select-input">
            <option value="none">{{ isEn ? 'Keep Original Clothes' : '保持原图服装' }}</option>
            <option value="navy">{{ isEn ? 'Navy Suit + Red Tie' : '藏青正装 + 红领带' }}</option>
            <option value="black">{{ isEn ? 'Charcoal Suit + Blue Tie' : '深灰西装 + 蓝领带' }}</option>
          </select>
        </div>
        <label class="guide-toggle">
          <input v-model="showGuideLines" type="checkbox" />
          <span>{{ isEn ? 'Show Head Alignment Guides' : '显示人像居中辅助线（导出自动隐藏）' }}</span>
        </label>
      </div>
    </div>

    <!-- Preview & Export Dual Workbench -->
    <div class="workbench-grid">
      <!-- Left: Single ID Photo + Exact KB Verification -->
      <div class="tool-card preview-card">
        <div class="card-head">
          <h3 class="section-title">
            {{ isEn ? '2. Single Electronic ID Photo' : '2. 单张电子版证件照（报名上传专用）' }}
          </h3>
          <span class="kb-verified-pill">
            ✓ {{ formatKb(singleByteSize) }}
          </span>
        </div>

        <div class="single-canvas-stage">
          <canvas ref="singleCanvasRef" class="single-canvas"></canvas>
        </div>

        <div class="meta-summary">
          <div class="meta-row">
            <span>{{ isEn ? 'Pixel Dimensions:' : '标准像素尺寸：' }}</span>
            <strong>{{ currentPreset.width }} × {{ currentPreset.height }} px (300 DPI)</strong>
          </div>
          <div class="meta-row">
            <span>{{ isEn ? 'Actual File Size:' : '实测文件体积：' }}</span>
            <strong class="accent-text">{{ formatKb(singleByteSize) }}</strong>
          </div>
          <div class="meta-row">
            <span>{{ isEn ? 'Binary Search Quality:' : '二分法自适应画质：' }}</span>
            <strong>
              JPEG Q={{ usedQuality }}%
              <template v-if="paddedBytesCount > 0">
                ({{ isEn ? `+${paddedBytesCount}B lossless padding to meet min KB` : `已自动填充 ${paddedBytesCount}B 确保不低于最小 KB 限制` }})
              </template>
            </strong>
          </div>
        </div>

        <a
          v-if="singleBlobUrl"
          :href="singleBlobUrl"
          :download="`ID_Photo_${currentPreset.width}x${currentPreset.height}_${Math.round(singleByteSize / 1024)}KB.jpg`"
          class="primary-dl-btn"
        >
          ⬇ {{ isEn ? `Download Electronic Photo (${(singleByteSize / 1024).toFixed(1)} KB)` : `下载达标电子证件照 (${(singleByteSize / 1024).toFixed(1)} KB)` }}
        </a>
      </div>

      <!-- Right: 6-Inch Print Layout Sheet -->
      <div class="tool-card preview-card">
        <div class="card-head">
          <h3 class="section-title">
            {{ isEn ? '3. 6-Inch (4×6") Print Sheet Layout' : '3. 六寸相纸排版（带裁剪线 · 冲印仅需 1 元）' }}
          </h3>
          <span class="format-badge">1800×1200 px · {{ printPhotoCount }} {{ isEn ? 'Photos' : '张连排' }}</span>
        </div>

        <div class="sheet-canvas-stage">
          <canvas ref="printSheetCanvasRef" class="sheet-canvas"></canvas>
        </div>

        <p class="sheet-tip">
          💡
          {{
            isEn
              ? 'Tip: Save this 4×6 inch (1800×1200px) sheet and print it at any photo kiosk or online print shop for ~$0.15 instead of paying $5 for ID photo printing.'
              : '省钱技巧：下载此 6 寸（4×6 英寸 / 1800×1200px）排版图后，去淘宝/拼多多或照相馆按“普通 6 寸生活照”冲印仅需几毛钱，自带十字裁剪定位线！'
          }}
        </p>

        <a
          v-if="printSheetUrl"
          :href="printSheetUrl"
          :download="`6Inch_Print_Sheet_${currentPreset.id}_${printPhotoCount}up.jpg`"
          class="secondary-dl-btn"
        >
          🖨️ {{ isEn ? `Download 6-Inch Print Sheet (${printPhotoCount}-Up)` : `下载六寸冲印排版大图 (${printPhotoCount} 张含裁剪线)` }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.id-photo-tool {
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
  gap: 8px;
  flex-wrap: wrap;
}

.demo-btn {
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
  border: 1px solid var(--accent-border);
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.ctrl-box {
  padding: 13px 15px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.highlight-box {
    border-color: var(--accent-border);
    background-color: var(--accent-soft);
  }

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
}

.sub-hint {
  font-size: 11.5px;
  color: var(--text-muted);
}

.select-input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.bg-swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.swatch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &.active {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }
}

.swatch-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.dual-sliders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mini-slider {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-secondary);
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.kb-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kb-chip {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
}

.secondary-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.sec-item {
  flex: 1 1 160px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.guide-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.workbench-grid {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.preview-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.kb-verified-pill {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.format-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background-color: var(--accent-soft);
  color: var(--accent);
}

.single-canvas-stage,
.sheet-canvas-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  border-radius: 12px;
  background: repeating-conic-gradient(var(--bg-muted) 0% 25%, var(--bg-surface) 0% 50%) 50% / 16px 16px;
  border: 1px solid var(--border-color);
  margin-bottom: 14px;
}

.single-canvas {
  max-height: 290px;
  width: auto;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}

.sheet-canvas {
  max-width: 100%;
  max-height: 290px;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.meta-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  font-size: 12.5px;
  margin-bottom: 14px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-secondary);
}

.accent-text {
  color: #10b981;
}

.sheet-tip {
  margin: 0 0 14px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-secondary);
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--bg-muted);
}

.primary-dl-btn,
.secondary-dl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px 16px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 800;
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.92;
  }
}

.primary-dl-btn {
  background-color: var(--accent);
  color: #fff;
}

.secondary-dl-btn {
  background-color: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}
</style>
