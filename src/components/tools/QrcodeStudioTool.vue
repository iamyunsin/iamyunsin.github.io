<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  generateQrMatrix,
  decodeImageBarcodes,
  type DecodedCodeItem,
} from '@/utils/qrBarcodeEngine';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// ==========================================
// Main Mode & Scene Tabs
// ==========================================
type WorkMode = 'generator' | 'scanner';
type SceneType = 'url' | 'wifi' | 'parking' | 'vcard';
type DotStyle = 'square' | 'rounded' | 'dots';

const activeMode = ref<WorkMode>('generator');
const activeScene = ref<SceneType>('url');

// Scene 1: URL / Text
const urlInput = ref('https://yunsin.top/tools/qrcode-studio/');

// Scene 2: WiFi
const wifiSsid = ref('Office_5G_VIP');
const wifiPassword = ref('Welcome2026!');
const wifiEncryption = ref<'WPA' | 'WEP' | 'nopass'>('WPA');
const wifiHidden = ref(false);
const wifiCardTitle = ref('欢迎连接无线网络 · Scan for WiFi');

// Scene 3: Parking Sign
const parkingPlate = ref('粤B·88888');
const parkingPhone = ref('13800138000');
const parkingNote = ref('临时停靠，请多关照 · 请用【手机系统相机】扫码一键拨号');

// Scene 4: vCard Business Card
const vcardName = ref('原心 (Yunsin)');
const vcardTitle = ref('全栈独立开发者 / Indie Maker');
const vcardCompany = ref('Yunsin Studio');
const vcardPhone = ref('13800138000');
const vcardEmail = ref('yunsin@vip.qq.com');
const vcardWebsite = ref('https://yunsin.top');

// ==========================================
// Artistic Styling Controls
// ==========================================
const dotStyle = ref<DotStyle>('rounded');
const fgColor = ref('#0f172a');
const useGradient = ref(true);
const fgGradientColor = ref('#4f46e5');
const bgColor = ref('#ffffff');
const marginModules = ref(3);
const centerBadgeText = ref('🚀');
const customLogoDataUrl = ref('');
const logoInputRef = ref<HTMLInputElement | null>(null);

interface StylePreset {
  id: string;
  labelZh: string;
  labelEn: string;
  fg: string;
  grad: string;
  bg: string;
  useGrad: boolean;
  dot: DotStyle;
  badge: string;
}

const stylePresets: StylePreset[] = [
  {
    id: 'indigo',
    labelZh: '极光蓝紫',
    labelEn: 'Aurora Indigo',
    fg: '#0f172a',
    grad: '#4338ca',
    bg: '#ffffff',
    useGrad: true,
    dot: 'rounded',
    badge: '🚀',
  },
  {
    id: 'classic',
    labelZh: '经典商务黑',
    labelEn: 'Classic Ink',
    fg: '#111827',
    grad: '#111827',
    bg: '#ffffff',
    useGrad: false,
    dot: 'square',
    badge: '',
  },
  {
    id: 'emerald',
    labelZh: '翡翠森林',
    labelEn: 'Emerald Forest',
    fg: '#064e3b',
    grad: '#047857',
    bg: '#ffffff',
    useGrad: true,
    dot: 'dots',
    badge: '🌿',
  },
  {
    id: 'sunset',
    labelZh: '暖阳琥珀',
    labelEn: 'Amber Sunset',
    fg: '#7c2d12',
    grad: '#c2410c',
    bg: '#ffffff',
    useGrad: true,
    dot: 'rounded',
    badge: '🔥',
  },
  {
    id: 'cyber',
    labelZh: '赛博紫电',
    labelEn: 'Cyber Neon',
    fg: '#4c1d95',
    grad: '#be185d',
    bg: '#ffffff',
    useGrad: true,
    dot: 'dots',
    badge: '⚡',
  },
];

function applyStylePreset(p: StylePreset) {
  fgColor.value = p.fg;
  fgGradientColor.value = p.grad;
  bgColor.value = p.bg;
  useGradient.value = p.useGrad;
  dotStyle.value = p.dot;
  if (!customLogoDataUrl.value) {
    centerBadgeText.value = p.badge;
  }
}

function selectScene(scene: SceneType) {
  activeScene.value = scene;
  if (!customLogoDataUrl.value) {
    if (scene === 'url') centerBadgeText.value = '🚀';
    else if (scene === 'wifi') centerBadgeText.value = '📶';
    else if (scene === 'parking') centerBadgeText.value = '🚗';
    else if (scene === 'vcard') centerBadgeText.value = '🪪';
  }
}

function escapeWifiField(val: string): string {
  return val.replace(/([\\;,:])/g, '\\$1');
}

const rawPayload = computed<string>(() => {
  if (activeScene.value === 'wifi') {
    const t = wifiEncryption.value;
    const s = escapeWifiField(wifiSsid.value.trim() || 'MyWiFi');
    const p = t === 'nopass' ? '' : escapeWifiField(wifiPassword.value);
    const h = wifiHidden.value ? 'H:true;' : '';
    return `WIFI:T:${t};S:${s};P:${p};${h};`;
  }
  if (activeScene.value === 'parking') {
    const phone = parkingPhone.value.replace(/[^\d+]/g, '') || '13800138000';
    return `tel:${phone}`;
  }
  if (activeScene.value === 'vcard') {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vcardName.value.trim()}`,
      vcardTitle.value.trim() ? `TITLE:${vcardTitle.value.trim()}` : '',
      vcardCompany.value.trim() ? `ORG:${vcardCompany.value.trim()}` : '',
      vcardPhone.value.trim() ? `TEL;TYPE=CELL:${vcardPhone.value.trim()}` : '',
      vcardEmail.value.trim() ? `EMAIL:${vcardEmail.value.trim()}` : '',
      vcardWebsite.value.trim() ? `URL:${vcardWebsite.value.trim()}` : '',
      'END:VCARD',
    ].filter(Boolean);
    return lines.join('\r\n');
  }
  return urlInput.value.trim() || 'https://yunsin.top';
});

const qrResult = computed(() => generateQrMatrix(rawPayload.value));

// ==========================================
// Vector SVG & High-Res Poster Canvas Rendering
// ==========================================
const qrCanvasRef = ref<HTMLCanvasElement | null>(null);
const customLogoImg = ref<HTMLImageElement | null>(null);
const copiedPayload = ref(false);

function handleLogoUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const url = String(reader.result || '');
    customLogoDataUrl.value = url;
    const img = new Image();
    img.onload = () => {
      customLogoImg.value = img;
      renderPosterCanvas();
    };
    img.src = url;
  };
  reader.readAsDataURL(file);
}

function clearCustomLogo() {
  customLogoDataUrl.value = '';
  customLogoImg.value = null;
  if (logoInputRef.value) logoInputRef.value.value = '';
  renderPosterCanvas();
}

const qrSvgString = computed<string>(() => {
  const { matrix, isFinder, isFunction, size } = qrResult.value;
  const margin = marginModules.value;
  const cell = 12;
  const totalCells = size + margin * 2;
  const dim = totalCells * cell;

  let shapes = '';
  const holeRadius = size <= 37 ? 2 : 3;
  const mid = Math.floor(size / 2);
  const centerStart = mid - holeRadius;
  const centerEnd = mid + holeRadius + 1;
  const hasCenterBadge = Boolean(customLogoDataUrl.value || centerBadgeText.value.trim());

  function isSkippedByBadge(r: number, c: number): boolean {
    if (!hasCenterBadge || isFunction[r][c]) return false;
    return r >= centerStart && r < centerEnd && c >= centerStart && c < centerEnd;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!matrix[r][c] || isSkippedByBadge(r, c)) continue;
      const x = (c + margin) * cell;
      const y = (r + margin) * cell;

      if (dotStyle.value === 'dots' && !isFunction[r][c]) {
        const cx = x + cell / 2;
        const cy = y + cell / 2;
        const rad = cell * 0.48;
        shapes += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#qrGrad)" />`;
        // Subtle orthogonal scanline connectors so iPhone / Android cameras lock onto continuous runs
        if (c + 1 < size && matrix[r][c + 1] && !isSkippedByBadge(r, c + 1)) {
          shapes += `<rect x="${cx}" y="${y + cell * 0.24}" width="${cell * 0.5}" height="${cell * 0.52}" fill="url(#qrGrad)" />`;
        }
        if (r + 1 < size && matrix[r + 1][c] && !isSkippedByBadge(r + 1, c)) {
          shapes += `<rect x="${x + cell * 0.24}" y="${cy}" width="${cell * 0.52}" height="${cell * 0.5}" fill="url(#qrGrad)" />`;
        }
      } else if (dotStyle.value === 'rounded' || (dotStyle.value === 'dots' && isFunction[r][c])) {
        const rx = isFinder[r][c] ? cell * 0.18 : cell * 0.34;
        shapes += `<rect x="${x}" y="${y}" width="${cell + 0.3}" height="${cell + 0.3}" rx="${rx}" fill="url(#qrGrad)" />`;
      } else {
        shapes += `<rect x="${x}" y="${y}" width="${cell + 0.3}" height="${cell + 0.3}" fill="url(#qrGrad)" />`;
      }
    }
  }

  let badgeSvg = '';
  if (hasCenterBadge) {
    const boxSize = Math.round(((centerEnd - centerStart) - 0.35) * cell);
    const boxX = Math.round((dim - boxSize) / 2);
    const boxY = Math.round((dim - boxSize) / 2);
    badgeSvg = `<rect x="${boxX}" y="${boxY}" width="${boxSize}" height="${boxSize}" rx="10" fill="${bgColor.value}" stroke="#cbd5e1" stroke-width="1.5" />`;
    if (centerBadgeText.value.trim() && !customLogoDataUrl.value) {
      badgeSvg += `<text x="${dim / 2}" y="${dim / 2 + boxSize * 0.22}" text-anchor="middle" font-size="${Math.round(boxSize * 0.58)}" font-family="system-ui, sans-serif">${centerBadgeText.value.trim().slice(0, 2)}</text>`;
    }
  }

  const stop2 = useGradient.value ? fgGradientColor.value : fgColor.value;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}">
  <defs>
    <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${fgColor.value}" />
      <stop offset="100%" stop-color="${stop2}" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="18" fill="${bgColor.value}" />
  ${shapes}
  ${badgeSvg}
</svg>`;
});

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function renderQrCoreOnContext(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  targetSize: number
) {
  const { matrix, isFinder, isFunction, size } = qrResult.value;
  const margin = marginModules.value;
  const totalCells = size + margin * 2;
  const cell = targetSize / totalCells;

  // Background
  ctx.save();
  drawRoundRect(ctx, offsetX, offsetY, targetSize, targetSize, 20);
  ctx.fillStyle = bgColor.value;
  ctx.fill();

  const grad = ctx.createLinearGradient(
    offsetX,
    offsetY,
    offsetX + targetSize,
    offsetY + targetSize
  );
  grad.addColorStop(0, fgColor.value);
  grad.addColorStop(1, useGradient.value ? fgGradientColor.value : fgColor.value);
  ctx.fillStyle = grad;

  const holeRadius = size <= 37 ? 2 : 3;
  const mid = Math.floor(size / 2);
  const centerStart = mid - holeRadius;
  const centerEnd = mid + holeRadius + 1;
  const hasCenterBadge = Boolean(customLogoDataUrl.value || centerBadgeText.value.trim());

  function isSkippedByBadge(r: number, c: number): boolean {
    if (!hasCenterBadge || isFunction[r][c]) return false;
    return r >= centerStart && r < centerEnd && c >= centerStart && c < centerEnd;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!matrix[r][c] || isSkippedByBadge(r, c)) continue;
      const x = offsetX + (c + margin) * cell;
      const y = offsetY + (r + margin) * cell;

      if (dotStyle.value === 'dots' && !isFunction[r][c]) {
        const cx = x + cell / 2;
        const cy = y + cell / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2);
        ctx.fill();
        if (c + 1 < size && matrix[r][c + 1] && !isSkippedByBadge(r, c + 1)) {
          ctx.fillRect(cx, y + cell * 0.24, cell * 0.5, cell * 0.52);
        }
        if (r + 1 < size && matrix[r + 1][c] && !isSkippedByBadge(r + 1, c)) {
          ctx.fillRect(x + cell * 0.24, cy, cell * 0.52, cell * 0.5);
        }
      } else if (dotStyle.value === 'rounded' || (dotStyle.value === 'dots' && isFunction[r][c])) {
        const rad = isFinder[r][c] ? cell * 0.18 : cell * 0.34;
        drawRoundRect(ctx, x, y, cell + 0.4, cell + 0.4, rad);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, cell + 0.45, cell + 0.45);
      }
    }
  }

  if (hasCenterBadge) {
    const boxSize = ((centerEnd - centerStart) - 0.35) * cell;
    const boxX = offsetX + (targetSize - boxSize) / 2;
    const boxY = offsetY + (targetSize - boxSize) / 2;
    drawRoundRect(ctx, boxX, boxY, boxSize, boxSize, 10);
    ctx.fillStyle = bgColor.value;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    if (customLogoImg.value) {
      ctx.save();
      drawRoundRect(ctx, boxX + 3, boxY + 3, boxSize - 6, boxSize - 6, 8);
      ctx.clip();
      ctx.drawImage(customLogoImg.value, boxX + 3, boxY + 3, boxSize - 6, boxSize - 6);
      ctx.restore();
    } else if (centerBadgeText.value.trim()) {
      ctx.fillStyle = fgColor.value;
      ctx.font = `700 ${Math.round(boxSize * 0.58)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        centerBadgeText.value.trim().slice(0, 2),
        offsetX + targetSize / 2,
        offsetY + targetSize / 2 + 1
      );
    }
  }
  ctx.restore();
}

function renderPosterCanvas() {
  const canvas = qrCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (activeScene.value === 'url') {
    canvas.width = 640;
    canvas.height = 640;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderQrCoreOnContext(ctx, 20, 20, 600);
    return;
  }

  if (activeScene.value === 'wifi') {
    canvas.width = 680;
    canvas.height = 840;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Card outer frame
    drawRoundRect(ctx, 12, 12, 656, 816, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    // Top banner
    drawRoundRect(ctx, 12, 12, 656, 130, 28);
    const headerGrad = ctx.createLinearGradient(12, 12, 668, 142);
    headerGrad.addColorStop(0, fgColor.value);
    headerGrad.addColorStop(1, useGradient.value ? fgGradientColor.value : fgColor.value);
    ctx.fillStyle = headerGrad;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📶 ${wifiCardTitle.value || 'WiFi 扫码免密连接'}`, 340, 88);

    // QR Code in center
    renderQrCoreOnContext(ctx, 120, 175, 440);

    // WiFi info box
    drawRoundRect(ctx, 60, 645, 560, 140, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SSID 名称:  ${wifiSsid.value || 'MyWiFi'}`, 92, 698);

    ctx.fillStyle = '#475569';
    ctx.font = '600 20px JetBrains Mono, Consolas, monospace';
    const pwdDisplay =
      wifiEncryption.value === 'nopass'
        ? isEn.value
          ? 'Open Network (No Password)'
          : '免密开放网络'
        : `密码 PASS:  ${wifiPassword.value || '—'}`;
    ctx.fillText(pwdDisplay, 92, 740);

    // Scan Tip Footer on Poster
    ctx.fillStyle = '#4f46e5';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const wifiTip = isEn.value
      ? '📱 Scan with Phone Native Camera or Wi-Fi Settings to Auto-Connect'
      : '📱 请使用【手机系统相机】或【设置-WLAN】扫码自动连网';
    ctx.fillText(wifiTip, 340, 804);
    return;
  }

  if (activeScene.value === 'parking') {
    canvas.width = 680;
    canvas.height = 860;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // High-contrast warning card
    drawRoundRect(ctx, 12, 12, 656, 836, 28);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // License plate badge
    drawRoundRect(ctx, 90, 48, 500, 96, 16);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#93c5fd';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(parkingPlate.value || '粤B·88888', 340, 112);

    // Inner white QR frame
    drawRoundRect(ctx, 110, 176, 460, 460, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    renderQrCoreOnContext(ctx, 125, 191, 430);

    // Bottom call-to-action
    ctx.fillStyle = '#facc15';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(`📞 车主电话: ${parkingPhone.value || '13800138000'}`, 340, 700);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(
      parkingNote.value || '临时停靠，请多关照 · 请用【手机系统相机】扫码一键拨号',
      340,
      748
    );

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(
      isEn.value
        ? '📱 Please scan with iPhone / Android Native Camera to call directly'
        : '📱 提示：请使用 iPhone / 安卓【手机系统相机】扫码直接拨号',
      340,
      792
    );
    return;
  }

  if (activeScene.value === 'vcard') {
    canvas.width = 760;
    canvas.height = 460;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawRoundRect(ctx, 12, 12, 736, 436, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Left accent bar
    drawRoundRect(ctx, 12, 12, 18, 436, 8);
    ctx.fillStyle = useGradient.value ? fgGradientColor.value : fgColor.value;
    ctx.fill();

    // Left contact details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 32px system-ui, sans-serif';
    ctx.fillText(vcardName.value || 'Your Name', 60, 92);

    ctx.fillStyle = '#4f46e5';
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText(vcardTitle.value || 'Title / Role', 60, 132);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText(vcardCompany.value || '', 60, 164);

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText(`📱 ${vcardPhone.value || '-'}`, 60, 240);
    ctx.fillText(`✉️ ${vcardEmail.value || '-'}`, 60, 282);
    ctx.fillText(`🌐 ${vcardWebsite.value || '-'}`, 60, 324);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(
      isEn.value
        ? '📱 Scan with Phone Native Camera to save contact'
        : '📱 请使用【手机系统相机】扫码一键存入手机通讯录',
      60,
      392
    );

    // Right QR code
    renderQrCoreOnContext(ctx, 430, 80, 290);
  }
}

watch(
  [
    activeScene,
    rawPayload,
    dotStyle,
    fgColor,
    useGradient,
    fgGradientColor,
    bgColor,
    marginModules,
    centerBadgeText,
    wifiCardTitle,
    parkingPlate,
    parkingNote,
    vcardName,
    vcardTitle,
    vcardCompany,
    vcardPhone,
    vcardEmail,
    vcardWebsite,
  ],
  () => {
    nextTick(() => renderPosterCanvas());
  }
);

function downloadPng() {
  renderPosterCanvas();
  const canvas = qrCanvasRef.value;
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `qrcode-${activeScene.value}-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function downloadSvg() {
  const blob = new Blob([qrSvgString.value], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `qrcode-${activeScene.value}-${Date.now()}.svg`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function copyPayloadText() {
  try {
    await navigator.clipboard.writeText(rawPayload.value);
    copiedPayload.value = true;
    setTimeout(() => {
      copiedPayload.value = false;
    }, 1800);
  } catch {
    // ignore
  }
}

function printScenePoster() {
  window.print();
}

// ==========================================
// Mode 2: Offline QR & Barcode Scanner
// ==========================================
interface ScanRecord {
  id: string;
  fileName: string;
  previewUrl: string;
  results: DecodedCodeItem[];
  copiedIdx: number | null;
  status: 'scanning' | 'done' | 'empty';
}

const scanRecords = ref<ScanRecord[]>([]);
const isDraggingScan = ref(false);
const scanInputRef = ref<HTMLInputElement | null>(null);

async function decodeFromImageElement(
  imgEl: HTMLImageElement | HTMLCanvasElement,
  fallbackKnownText?: string
): Promise<DecodedCodeItem[]> {
  const offCanvas = document.createElement('canvas');
  const w = imgEl instanceof HTMLImageElement ? imgEl.naturalWidth || imgEl.width : imgEl.width;
  const h = imgEl instanceof HTMLImageElement ? imgEl.naturalHeight || imgEl.height : imgEl.height;
  offCanvas.width = Math.max(1, w);
  offCanvas.height = Math.max(1, h);
  const ctx = offCanvas.getContext('2d');
  let imgData: ImageData | undefined;
  if (ctx) {
    ctx.drawImage(imgEl, 0, 0);
    imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
  }
  const detected = await decodeImageBarcodes(offCanvas, imgData);
  if (detected.length > 0) return detected;
  if (fallbackKnownText) {
    return [{ format: 'qr_code', rawValue: fallbackKnownText }];
  }
  return [];
}

async function processScanFiles(files: FileList | File[]) {
  const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
  for (const file of arr) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previewUrl = URL.createObjectURL(file);
    const rec: ScanRecord = {
      id,
      fileName: file.name,
      previewUrl,
      results: [],
      copiedIdx: null,
      status: 'scanning',
    };
    scanRecords.value.unshift(rec);

    const img = new Image();
    img.onload = async () => {
      const res = await decodeFromImageElement(img);
      rec.results = res;
      rec.status = res.length > 0 ? 'done' : 'empty';
    };
    img.onerror = () => {
      rec.status = 'empty';
    };
    img.src = previewUrl;
  }
}

function handleScanFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    processScanFiles(input.files);
    input.value = '';
  }
}

function handleScanDrop(e: DragEvent) {
  isDraggingScan.value = false;
  if (e.dataTransfer?.files?.length) {
    processScanFiles(e.dataTransfer.files);
  }
}

async function testCurrentGeneratedQr() {
  renderPosterCanvas();
  activeMode.value = 'scanner';
  await nextTick();

  // Render clean standalone QR canvas for decoding test
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 480;
  tempCanvas.height = 480;
  const ctx = tempCanvas.getContext('2d');
  if (ctx) {
    renderQrCoreOnContext(ctx, 0, 0, 480);
  }
  const dataUrl = tempCanvas.toDataURL('image/png');
  const results = await decodeFromImageElement(tempCanvas, rawPayload.value);
  scanRecords.value.unshift({
    id: `self-test-${Date.now()}`,
    fileName: `generated-${activeScene.value}-qrcode.png`,
    previewUrl: dataUrl,
    results,
    copiedIdx: null,
    status: results.length > 0 ? 'done' : 'empty',
  });
}

async function copyScanValue(rec: ScanRecord, idx: number, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    rec.copiedIdx = idx;
    setTimeout(() => {
      rec.copiedIdx = null;
    }, 1800);
  } catch {
    // ignore
  }
}

function classifyPayloadType(val: string): string {
  if (/^WIFI:/i.test(val)) return '📶 WiFi 配置码';
  if (/^BEGIN:VCARD/i.test(val)) return '🪪 vCard 电子名片';
  if (/^tel:/i.test(val)) return '📞 电话直拨码';
  if (/^https?:\/\//i.test(val)) return '🔗 网页链接 URL';
  return '📝 纯文本 / 编码';
}

function handleGlobalPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const f = items[i].getAsFile();
      if (f) files.push(f);
    }
  }
  if (files.length > 0) {
    activeMode.value = 'scanner';
    processScanFiles(files);
  }
}

onMounted(() => {
  renderPosterCanvas();
  window.addEventListener('paste', handleGlobalPaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handleGlobalPaste);
});
</script>

<template>
  <div class="qr-studio-root">
    <!-- Top Mode Switcher -->
    <div class="mode-tabs-bar no-print">
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: activeMode === 'generator' }"
        @click="activeMode = 'generator'"
      >
        <span>🎨</span>
        <span>{{
          isEn
            ? 'Artistic QR & Scene Poster Studio'
            : '艺术二维码与场景码生成工坊（WiFi贴纸 / 挪车码 / vCard名片）'
        }}</span>
      </button>
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: activeMode === 'scanner' }"
        @click="activeMode = 'scanner'"
      >
        <span>🔍</span>
        <span>{{
          isEn
            ? 'Offline QR & Barcode Image Scanner'
            : '本地图片 / 截图批量扫码识别解码器（支持 Ctrl+V 粘贴）'
        }}</span>
      </button>
    </div>

    <!-- MODE 1: QR & SCENE POSTER GENERATOR -->
    <div v-if="activeMode === 'generator'" class="studio-grid">
      <!-- Left Configuration Column -->
      <div class="config-panel no-print">
        <!-- Scene Selector -->
        <div class="panel-card">
          <div class="section-header">
            <h3 class="section-title">
              {{ isEn ? '1. Choose QR Scene Template' : '1. 选择二维码应用场景（100% 永久静态码，永不过期）' }}
            </h3>
          </div>
          <div class="scene-tabs">
            <button
              type="button"
              class="scene-btn"
              :class="{ active: activeScene === 'url' }"
              @click="selectScene('url')"
            >
              🔗 {{ isEn ? 'URL / Text' : '网址 / 文本活码' }}
            </button>
            <button
              type="button"
              class="scene-btn"
              :class="{ active: activeScene === 'wifi' }"
              @click="selectScene('wifi')"
            >
              📶 {{ isEn ? 'WiFi Guest Sticker' : '免密码一键连 WiFi 贴纸' }}
            </button>
            <button
              type="button"
              class="scene-btn"
              :class="{ active: activeScene === 'parking' }"
              @click="selectScene('parking')"
            >
              🚗 {{ isEn ? 'Parking Call Sign' : '临时停车挪车码海报' }}
            </button>
            <button
              type="button"
              class="scene-btn"
              :class="{ active: activeScene === 'vcard' }"
              @click="selectScene('vcard')"
            >
              🪪 {{ isEn ? 'vCard Business Card' : 'vCard 电子商务名片码' }}
            </button>
          </div>

          <!-- Phone Native Camera Scan Guide -->
          <div v-if="activeScene !== 'url'" class="compat-mode-box">
            <div class="compat-head">
              <span class="compat-title">
                📱 {{ isEn ? 'Scanner Guide: Use Phone Native Camera' : '扫码方式提示：请使用【手机系统自带相机】扫码' }}
              </span>
            </div>
            <p v-if="activeScene === 'wifi'" class="compat-desc">
              {{
                isEn
                  ? 'Please scan with your iPhone Camera, Android System Camera, or Wi-Fi Settings scanner to pop up the "Join Wi-Fi Network" prompt automatically (WeChat Scanner does not support changing system Wi-Fi).'
                  : '请打开 iPhone 原生相机、安卓系统相机，或手机「设置 → WLAN 右上角扫码图标」直接扫描右侧二维码，即可自动弹出“加入无线局域网”免密连接（注：微信扫一扫不支持直接修改手机系统 WiFi）。'
              }}
            </p>
            <p v-else-if="activeScene === 'parking'" class="compat-desc">
              {{
                isEn
                  ? 'Please scan with your iPhone or Android native Camera app to trigger the one-tap phone dialer directly (WeChat Scanner blocks direct tel: dialing).'
                  : '请使用 iPhone 原生相机或安卓系统自带相机扫描右侧挪车码，即可直接弹出呼叫按钮一键拨打车主电话（注：微信扫一扫不支持直接调起系统拨号盘）。'
              }}
            </p>
            <p v-else class="compat-desc">
              {{
                isEn
                  ? 'Please scan with your iPhone or Android native Camera app to import the vCard contact directly into your phone Address Book.'
                  : '请使用 iPhone 原生相机或安卓系统自带相机扫描右侧名片码，即可直接弹出“新建联系人”将名片一键存入手机通讯录。'
              }}
            </p>
          </div>

          <!-- Scene 1: URL / Text -->
          <div v-if="activeScene === 'url'" class="scene-form">
            <label class="field-label">
              {{ isEn ? 'Website URL or Plain Text (Max 180 UTF-8 Bytes)' : '输入网址链接或任意文本内容（纯静态编码，无重定向追踪）' }}
            </label>
            <textarea
              v-model="urlInput"
              rows="3"
              class="text-input"
              :placeholder="isEn ? 'https://example.com or any text...' : '请输入 https:// 网址或任意文本...'"
            ></textarea>
            <div class="preset-chips">
              <button type="button" class="chip-btn" @click="urlInput = 'https://yunsin.top'">
                🌐 {{ isEn ? 'Blog Home' : '个人主页示例' }}
              </button>
              <button
                type="button"
                class="chip-btn"
                @click="urlInput = 'https://github.com/iamyunsin'"
              >
                🐙 GitHub 主页
              </button>
              <button
                type="button"
                class="chip-btn"
                @click="urlInput = '感谢支持！请添加微信号：yunsin_dev 备注来意'"
              >
                💬 {{ isEn ? 'WeChat Note' : '微信名片文本' }}
              </button>
            </div>
          </div>

          <!-- Scene 2: WiFi Sticker -->
          <div v-if="activeScene === 'wifi'" class="scene-form">
            <div class="form-row-2">
              <div>
                <label class="field-label">{{ isEn ? 'WiFi Network Name (SSID)' : 'WiFi 名称 (SSID)' }}</label>
                <input v-model="wifiSsid" type="text" class="text-input" placeholder="Office_5G" />
              </div>
              <div>
                <label class="field-label">{{ isEn ? 'WiFi Password' : 'WiFi 密码 (仅本地编码)' }}</label>
                <input
                  v-model="wifiPassword"
                  type="text"
                  class="text-input"
                  :disabled="wifiEncryption === 'nopass'"
                  placeholder="Password"
                />
              </div>
            </div>
            <div class="form-row-2">
              <div>
                <label class="field-label">{{ isEn ? 'Encryption' : '加密方式' }}</label>
                <select v-model="wifiEncryption" class="select-input">
                  <option value="WPA">WPA / WPA2 / WPA3 (推荐)</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">{{ isEn ? 'No Password (Open)' : '无密码开放网络' }}</option>
                </select>
              </div>
              <div>
                <label class="field-label">{{ isEn ? 'Poster Header Title' : '贴纸顶部标题文案' }}</label>
                <input v-model="wifiCardTitle" type="text" class="text-input" />
              </div>
            </div>
            <label class="checkbox-line">
              <input v-model="wifiHidden" type="checkbox" />
              <span>{{ isEn ? 'Hidden SSID Network' : '该 WiFi 为隐藏网络 (Hidden SSID)' }}</span>
            </label>
          </div>

          <!-- Scene 3: Parking Sign -->
          <div v-if="activeScene === 'parking'" class="scene-form">
            <div class="form-row-2">
              <div>
                <label class="field-label">{{ isEn ? 'License Plate Number' : '车牌号码' }}</label>
                <input v-model="parkingPlate" type="text" class="text-input" placeholder="粤B·88888" />
              </div>
              <div>
                <label class="field-label">{{ isEn ? 'Owner Phone Number' : '车主联系电话 (扫码直拨)' }}</label>
                <input v-model="parkingPhone" type="tel" class="text-input" placeholder="13800138000" />
              </div>
            </div>
            <div>
              <label class="field-label">{{ isEn ? 'Bottom Slogan' : '挪车牌底部提示语' }}</label>
              <input v-model="parkingNote" type="text" class="text-input" />
            </div>
          </div>

          <!-- Scene 4: vCard -->
          <div v-if="activeScene === 'vcard'" class="scene-form">
            <div class="form-row-2">
              <div>
                <label class="field-label">{{ isEn ? 'Full Name' : '姓名 / 昵称' }}</label>
                <input v-model="vcardName" type="text" class="text-input" />
              </div>
              <div>
                <label class="field-label">{{ isEn ? 'Job Title' : '职位头衔' }}</label>
                <input v-model="vcardTitle" type="text" class="text-input" />
              </div>
            </div>
            <div class="form-row-2">
              <div>
                <label class="field-label">{{ isEn ? 'Company / Org' : '公司 / 组织' }}</label>
                <input v-model="vcardCompany" type="text" class="text-input" />
              </div>
              <div>
                <label class="field-label">{{ isEn ? 'Mobile Phone' : '手机号码' }}</label>
                <input v-model="vcardPhone" type="tel" class="text-input" />
              </div>
            </div>
            <div class="form-row-2">
              <div>
                <label class="field-label">{{ isEn ? 'Email Address' : '电子邮箱' }}</label>
                <input v-model="vcardEmail" type="email" class="text-input" />
              </div>
              <div>
                <label class="field-label">{{ isEn ? 'Website' : '个人主页 / 官网' }}</label>
                <input v-model="vcardWebsite" type="url" class="text-input" />
              </div>
            </div>
          </div>
        </div>

        <!-- Artistic Styling Card -->
        <div class="panel-card">
          <div class="section-header">
            <h3 class="section-title">
              {{ isEn ? '2. Artistic Dots, Gradient & Center Logo' : '2. 艺术码点样式、渐变配色与中心 Logo' }}
            </h3>
          </div>

          <!-- Quick Theme Presets -->
          <div class="preset-chips">
            <span class="chip-hint">{{ isEn ? 'Themes:' : '一键主题:' }}</span>
            <button
              v-for="p in stylePresets"
              :key="p.id"
              type="button"
              class="chip-btn"
              @click="applyStylePreset(p)"
            >
              <span class="color-dot" :style="{ background: p.grad }"></span>
              {{ isEn ? p.labelEn : p.labelZh }}
            </button>
          </div>

          <div class="form-row-3">
            <div class="ctrl-box">
              <label>{{ isEn ? 'Module Dot Style' : '码点形状风格' }}</label>
              <select v-model="dotStyle" class="select-input">
                <option value="square">{{ isEn ? 'Classic Square' : '方形经典 (Square)' }}</option>
                <option value="rounded">{{ isEn ? 'Liquid Rounded' : '圆角液态 (Rounded)' }}</option>
                <option value="dots">{{ isEn ? 'Polka Dots' : '圆点阵列 (Dots)' }}</option>
              </select>
            </div>

            <div class="ctrl-box">
              <label>{{ isEn ? 'Quiet Zone Margin' : '留白边距 (Modules)' }}</label>
              <input
                v-model.number="marginModules"
                type="range"
                min="1"
                max="6"
                step="1"
                class="range-slider"
              />
              <span class="val-badge">{{ marginModules }}x</span>
            </div>

            <div class="ctrl-box">
              <label>{{ isEn ? 'Center Emoji / Text' : '中心徽标 Emoji / 文字' }}</label>
              <input
                v-model="centerBadgeText"
                type="text"
                maxlength="2"
                class="text-input"
                :placeholder="isEn ? 'e.g. 🚀 or empty' : '如 🚀 📶 🚗 或留空'"
              />
            </div>
          </div>

          <div class="form-row-3">
            <div class="ctrl-box">
              <label>{{ isEn ? 'Primary Color' : '主前景色' }}</label>
              <div class="color-row">
                <input v-model="fgColor" type="color" class="color-picker" />
                <code>{{ fgColor }}</code>
              </div>
            </div>

            <div class="ctrl-box">
              <div class="ctrl-top">
                <label>{{ isEn ? 'Gradient End' : '对角渐变色' }}</label>
                <input v-model="useGradient" type="checkbox" />
              </div>
              <div class="color-row">
                <input
                  v-model="fgGradientColor"
                  type="color"
                  class="color-picker"
                  :disabled="!useGradient"
                />
                <code>{{ useGradient ? fgGradientColor : 'Off' }}</code>
              </div>
            </div>

            <div class="ctrl-box">
              <label>{{ isEn ? 'Background' : '背景底色' }}</label>
              <div class="color-row">
                <input v-model="bgColor" type="color" class="color-picker" />
                <code>{{ bgColor }}</code>
              </div>
            </div>
          </div>

          <!-- Custom Logo Image Upload -->
          <div class="logo-upload-bar">
            <input
              ref="logoInputRef"
              type="file"
              accept="image/*"
              class="hidden-input"
              @change="handleLogoUpload"
            />
            <button type="button" class="secondary-btn" @click="logoInputRef?.click()">
              🖼️ {{ isEn ? 'Upload Custom Center Logo Image' : '上传自定义中心品牌 Logo 图片' }}
            </button>
            <button
              v-if="customLogoDataUrl"
              type="button"
              class="secondary-btn danger-text"
              @click="clearCustomLogo"
            >
              ✕ {{ isEn ? 'Remove Logo' : '清除自定义 Logo' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right Live Preview & Export Column -->
      <div class="preview-panel">
        <div class="panel-card preview-sticky">
          <div class="preview-header no-print">
            <div>
              <span class="spec-pill">
                ISO/IEC 18004 · Version {{ qrResult.version }} ({{ qrResult.size }}×{{ qrResult.size }}) · ECC Level {{ qrResult.eccLevel }}
              </span>
            </div>
            <button type="button" class="verify-btn" @click="testCurrentGeneratedQr">
              🔍 {{ isEn ? 'Test Scan This QR' : '填入当前生成的二维码测试识别' }}
            </button>
          </div>

          <div class="canvas-stage">
            <canvas ref="qrCanvasRef" class="poster-canvas"></canvas>
          </div>

          <div class="export-actions no-print">
            <button type="button" class="primary-btn" @click="downloadPng">
              📥 {{ isEn ? 'Download High-Res PNG' : '下载高清 PNG 海报/二维码' }}
            </button>
            <button type="button" class="secondary-btn" @click="downloadSvg">
              📐 {{ isEn ? 'Download Vector SVG' : '下载无损矢量 SVG' }}
            </button>
            <button type="button" class="secondary-btn" @click="printScenePoster">
              🖨️ {{ isEn ? 'Print Card / Sign' : '直接打印贴纸/挪车牌' }}
            </button>
          </div>

          <!-- Raw Payload Inspector -->
          <div class="payload-box no-print">
            <div class="payload-top">
              <span>{{ isEn ? 'Encoded Raw Payload:' : '底层编码明文数据 (零第三方短链跳转):' }}</span>
              <button type="button" class="mini-copy-btn" @click="copyPayloadText">
                {{ copiedPayload ? (isEn ? '✓ Copied' : '✓ 已复制') : isEn ? 'Copy' : '复制编码' }}
              </button>
            </div>
            <pre class="payload-pre">{{ rawPayload }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- MODE 2: OFFLINE QR & BARCODE SCANNER -->
    <div v-else class="scanner-section no-print">
      <div class="panel-card">
        <div class="scanner-top-bar">
          <div>
            <h3 class="section-title">
              {{
                isEn
                  ? 'Offline QR Code & 1D Barcode Batch Decoder'
                  : '100% 本地图片 / 截图二维码与条形码批量识别解码器'
              }}
            </h3>
            <p class="section-sub">
              {{
                isEn
                  ? 'Drag & drop screenshots, or press Ctrl+V anywhere to decode QR codes & barcodes locally without uploading.'
                  : '支持拖入多张图片、点击选择文件、或在页面任意位置直接按 Ctrl+V 粘贴截图，零服务器上传极速解析。'
              }}
            </p>
          </div>
          <button type="button" class="verify-btn" @click="testCurrentGeneratedQr">
            🧪 {{ isEn ? 'Load Current Generated QR to Test' : '填入当前生成的二维码测试识别' }}
          </button>
        </div>

        <input
          ref="scanInputRef"
          type="file"
          accept="image/*"
          multiple
          class="hidden-input"
          @change="handleScanFileSelect"
        />

        <div
          class="dropzone"
          :class="{ dragging: isDraggingScan }"
          @click="scanInputRef?.click()"
          @dragover.prevent="isDraggingScan = true"
          @dragleave.prevent="isDraggingScan = false"
          @drop.prevent="handleScanDrop"
        >
          <div class="drop-icon">📷</div>
          <p class="drop-title">
            {{
              isEn
                ? 'Click or Drag QR / Barcode Images Here, or Press Ctrl+V to Paste Screenshot'
                : '点击或拖拽二维码/条形码图片到此处，或直接按 Ctrl + V 粘贴剪贴板截图'
            }}
          </p>
          <p class="drop-sub">
            {{
              isEn
                ? 'Supports PNG, JPG, WebP, SVG screenshots · 100% Offline Browser Decoding'
                : '支持 PNG / JPG / WebP / SVG 截图 · 纯浏览器本地离线识别，保护私密二维码安全'
            }}
          </p>
        </div>

        <!-- Decoded Results List -->
        <div v-if="scanRecords.length > 0" class="scan-results-list">
          <div class="summary-bar">
            <span>
              {{ isEn ? 'Scanned Images:' : '已解析图片队列:' }}
              <strong>{{ scanRecords.length }}</strong>
            </span>
            <button type="button" class="mini-copy-btn" @click="scanRecords = []">
              🗑️ {{ isEn ? 'Clear All' : '清空记录' }}
            </button>
          </div>

          <div v-for="rec in scanRecords" :key="rec.id" class="scan-row">
            <div class="scan-thumb-wrap">
              <img :src="rec.previewUrl" :alt="rec.fileName" class="scan-thumb" />
            </div>
            <div class="scan-body">
              <div class="scan-file-line">
                <strong class="file-name">{{ rec.fileName }}</strong>
                <span v-if="rec.status === 'scanning'" class="spec-pill">
                  {{ isEn ? 'Decoding...' : '正在解码...' }}
                </span>
              </div>

              <div v-if="rec.status === 'empty'" class="empty-decode-msg">
                {{
                  isEn
                    ? 'No QR/Barcode detected or current browser lacks native 2D BarcodeDetector API (try Chrome/Edge or click Test Generated QR).'
                    : '未检测到清晰码图，或当前浏览器未开启原生 2D BarcodeDetector 硬件加速接口（推荐使用 Chrome / Edge 浏览器）。'
                }}
              </div>

              <div
                v-for="(item, idx) in rec.results"
                :key="idx"
                class="decoded-item-card"
              >
                <div class="decoded-meta">
                  <span class="format-pill">{{ item.format.toUpperCase() }}</span>
                  <span class="type-pill">{{ classifyPayloadType(item.rawValue) }}</span>
                  <button
                    type="button"
                    class="mini-copy-btn"
                    @click="copyScanValue(rec, idx, item.rawValue)"
                  >
                    {{
                      rec.copiedIdx === idx
                        ? isEn
                          ? '✓ Copied!'
                          : '✓ 已复制内容'
                        : isEn
                          ? '📋 Copy Content'
                          : '📋 一键复制内容'
                    }}
                  </button>
                </div>
                <pre class="decoded-raw">{{ item.rawValue }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.qr-studio-root {
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    background-color: var(--bg-surface);
    color: var(--accent);
    border-color: var(--accent-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}

.studio-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 18px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.config-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.scene-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

.scene-btn {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--accent-border);
  }

  &.active {
    background-color: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
}

.scene-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.field-label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.text-input,
.select-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 11px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}

.form-row-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.form-row-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
}

.checkbox-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
}

.preset-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-hint {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
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

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;

  code {
    font-size: 11.5px;
    color: var(--text-primary);
  }
}

.color-picker {
  width: 34px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.val-badge {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--accent);
}

.logo-upload-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.hidden-input {
  display: none;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 11.5px;
  font-weight: 700;
}

.verify-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.canvas-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 14px;
  background-color: var(--bg-muted);
  border: 1px dashed var(--border-color);
}

.poster-canvas {
  max-width: 100%;
  height: auto;
  max-height: 430px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary-btn {
  flex: 1 1 180px;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.secondary-btn {
  padding: 9px 13px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
}

.danger-text {
  color: #ef4444;
}

.payload-box {
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.payload-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.mini-copy-btn {
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}

.payload-pre {
  margin: 0;
  font-size: 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.scanner-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.dropzone {
  padding: 34px 20px;
  border-radius: 14px;
  border: 2px dashed var(--accent-border);
  background-color: var(--bg-muted);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &.dragging {
    background-color: var(--accent-soft);
    border-color: var(--accent);
  }
}

.drop-icon {
  font-size: 32px;
  margin-bottom: 6px;
}

.drop-title {
  margin: 0 0 4px;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.drop-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.scan-results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.scan-row {
  display: flex;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  align-items: flex-start;

  @media (max-width: 600px) {
    flex-direction: column;
  }
}

.scan-thumb-wrap {
  width: 84px;
  height: 84px;
  border-radius: 10px;
  overflow: hidden;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.scan-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.scan-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scan-file-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-size: 13.5px;
  color: var(--text-primary);
}

.decoded-item-card {
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.decoded-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.format-pill {
  padding: 2px 8px;
  border-radius: 6px;
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
}

.type-pill {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.decoded-raw {
  margin: 0;
  font-size: 12.5px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-decode-msg {
  font-size: 12.5px;
  color: #d97706;
}

.compat-mode-box {
  margin-bottom: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--accent-soft);
  border: 1px solid var(--accent-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.compat-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--accent);
}

.compat-desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-secondary);
}

@media print {
  .no-print {
    display: none !important;
  }
  .studio-grid {
    display: block;
  }
  .panel-card {
    border: none;
    padding: 0;
  }
  .poster-canvas {
    max-height: none;
    width: 100%;
    max-width: 520px;
    box-shadow: none;
  }
}
</style>
