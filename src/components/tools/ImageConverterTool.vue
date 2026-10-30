<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  initImageCodecWasm,
  inspectImageHeaderWithWasm,
  processRgbaBufferWithWasm,
  type ImageHeaderInspection,
} from '@/wasm-pkg/tool-image-codec';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const wasmExports = ref<Awaited<ReturnType<typeof initImageCodecWasm>> | null>(null);
const wasmReady = ref(false);

const targetMime = ref<'image/webp' | 'image/jpeg' | 'image/png' | 'image/avif'>('image/webp');
const quality = ref<number>(82);
const scalePercent = ref<number>(100);
const quantizeLevel = ref<number>(1);
const isDragging = ref(false);
const isProcessing = ref(false);

interface ProcessedImageItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  width: number;
  height: number;
  outWidth: number;
  outHeight: number;
  headerInfo: ImageHeaderInspection;
  outputBlob: Blob | null;
  outputUrl: string;
  outputSize: number;
  savedPercent: number;
  status: 'processing' | 'done' | 'error';
  errorMsg?: string;
}

const items = ref<ProcessedImageItem[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  try {
    wasmExports.value = await initImageCodecWasm();
    wasmReady.value = true;
  } catch (e) {
    console.error('Failed to load tool_image_codec.wasm:', e);
  }
});

const extMap: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/avif': 'avif',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

async function processSingleItem(item: ProcessedImageItem) {
  item.status = 'processing';
  try {
    // 1. Read first 64KB for Rust Wasm binary header & EXIF/GPS inspection
    const sliceBuffer = await item.file.slice(0, 65536).arrayBuffer();
    const headerBytes = new Uint8Array(sliceBuffer);
    if (wasmExports.value) {
      item.headerInfo = inspectImageHeaderWithWasm(wasmExports.value, headerBytes);
    }

    // 2. Decode image via browser ImageBitmap / HTMLImageElement
    const imgUrl = URL.createObjectURL(item.file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(isEn.value ? 'Unsupported image format in this browser' : '当前浏览器不支持直接解码该格式'));
      el.src = imgUrl;
    });
    URL.revokeObjectURL(imgUrl);

    item.width = img.naturalWidth || img.width;
    item.height = img.naturalHeight || img.height;

    const scale = scalePercent.value / 100;
    const outW = Math.max(1, Math.round(item.width * scale));
    const outH = Math.max(1, Math.round(item.height * scale));
    item.outWidth = outW;
    item.outHeight = outH;

    // 3. Draw onto clean Canvas (automatically strips all EXIF, GPS, XMP & IPTC segments)
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Fill white background if exporting to JPEG (which has no alpha channel)
    if (targetMime.value === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(img, 0, 0, outW, outH);

    // 4. Pass RGBA buffer through Rust Wasm for color quantization & domain guard check
    if (wasmExports.value) {
      const imgData = ctx.getImageData(0, 0, outW, outH);
      processRgbaBufferWithWasm(wasmExports.value, imgData.data, outW, quantizeLevel.value);
      ctx.putImageData(imgData, 0, 0);
    }

    // 5. Encode to target format Blob
    const q = targetMime.value === 'image/png' ? undefined : quality.value / 100;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Encoding failed'));
        },
        targetMime.value,
        q
      );
    });

    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    item.outputBlob = blob;
    item.outputUrl = URL.createObjectURL(blob);
    item.outputSize = blob.size;
    item.savedPercent =
      item.originalSize > 0
        ? Math.round(((item.originalSize - blob.size) / item.originalSize) * 1000) / 10
        : 0;
    item.status = 'done';
  } catch (err: any) {
    item.status = 'error';
    item.errorMsg = err?.message || 'Error';
  }
}

async function handleFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || /\.(heic|avif|webp|png|jpe?g)$/i.test(f.name));
  if (files.length === 0) return;

  isProcessing.value = true;
  const newItems: ProcessedImageItem[] = files.map((file, idx) => ({
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    file,
    name: file.name.replace(/\.[^.]+$/, ''),
    originalSize: file.size,
    width: 0,
    height: 0,
    outWidth: 0,
    outHeight: 0,
    headerInfo: {
      format: 'DETECTING',
      hasExif: false,
      hasGps: false,
      hasCamera: false,
      metadataBytes: 0,
      authorized: true,
    },
    outputBlob: null,
    outputUrl: '',
    outputSize: 0,
    savedPercent: 0,
    status: 'processing',
  }));

  items.value.unshift(...newItems);
  for (const item of newItems) {
    await processSingleItem(item);
  }
  isProcessing.value = false;
}

function onFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement | null;
  if (input?.files) {
    handleFiles(input.files);
    input.value = '';
  }
}

function onDropFiles(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files) {
    handleFiles(e.dataTransfer.files);
  }
}

async function reprocessAll() {
  if (items.value.length === 0) return;
  isProcessing.value = true;
  for (const item of items.value) {
    await processSingleItem(item);
  }
  isProcessing.value = false;
}

async function generateDemoImage() {
  // Generates a colorful high-res test image with simulated JPEG APP1 EXIF/GPS header bytes
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 1280, 720);
  grad.addColorStop(0, '#1e3a8a');
  grad.addColorStop(0.5, '#0f766e');
  grad.addColorStop(1, '#7c2d12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);

  // Decorative circles & text
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + (i % 4) * 0.04})`;
    ctx.beginPath();
    ctx.arc(100 + i * 65, 160 + ((i * 97) % 420), 40 + (i % 5) * 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('Yunsin.top · Rust Wasm Image Benchmark', 90, 320);
  ctx.font = '28px monospace';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('1280x720 Sample Photo · 100% Local Compression & EXIF Strip', 90, 385);

  const jpegBlob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.98)
  );
  const rawBuf = new Uint8Array(await jpegBlob.arrayBuffer());

  // Inject a synthetic JPEG APP1 Exif + GPS + Apple camera segment right after SOI (0xFFD8)
  const fakeExifPayload = new TextEncoder().encode('Exif\0\0Apple iPhone 16 Pro GPS Latitude 30.67N 104.06E ');
  const segLen = fakeExifPayload.length + 2;
  const withExif = new Uint8Array(rawBuf.length + segLen + 2);
  withExif[0] = 0xff;
  withExif[1] = 0xd8;
  withExif[2] = 0xff;
  withExif[3] = 0xe1;
  withExif[4] = (segLen >> 8) & 0xff;
  withExif[5] = segLen & 0xff;
  withExif.set(fakeExifPayload, 6);
  withExif.set(rawBuf.subarray(2), 6 + fakeExifPayload.length);

  const demoFile = new File([withExif], 'iPhone_Sample_With_GPS_EXIF.jpg', {
    type: 'image/jpeg',
  });
  await handleFiles([demoFile]);
}

function clearAll() {
  for (const item of items.value) {
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
  }
  items.value = [];
}

const totalStats = computed(() => {
  const done = items.value.filter((i) => i.status === 'done');
  const orig = done.reduce((acc, i) => acc + i.originalSize, 0);
  const out = done.reduce((acc, i) => acc + i.outputSize, 0);
  const saved = orig > 0 ? Math.round(((orig - out) / orig) * 1000) / 10 : 0;
  return { count: done.length, orig, out, saved };
});
</script>

<template>
  <div class="img-tool-root">
    <!-- Control Bar -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. Output Format & Compression Settings' : '1. 目标格式与隐私压缩参数配置' }}
          </h2>
          <span class="wasm-status" :class="{ ready: wasmReady }">
            <span class="status-dot"></span>
            {{
              wasmReady
                ? isEn
                  ? 'Rust Wasm Codec Ready (23.2 KB)'
                  : 'Rust Wasm 图像引擎已就绪 (23.2 KB)'
                : isEn
                  ? 'Loading Wasm...'
                  : '加载 Wasm 中...'
            }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" @click="generateDemoImage">
            {{ isEn ? '✨ Generate Sample Photo (with GPS EXIF)' : '✨ 一键生成带 GPS/EXIF 的测试照片' }}
          </button>
          <button v-if="items.length > 0" type="button" class="clear-btn" @click="clearAll">
            {{ isEn ? 'Clear All' : '清空列表' }}
          </button>
        </div>
      </div>

      <div class="controls-grid">
        <div class="ctrl-box">
          <label>{{ isEn ? 'Target Format' : '输出目标格式' }}</label>
          <select v-model="targetMime" class="select-input" @change="reprocessAll">
            <option value="image/webp">WebP ({{ isEn ? 'Recommended · Smallest' : '强烈推荐 · 体积最小支持透明' }})</option>
            <option value="image/avif">AVIF ({{ isEn ? 'Next-Gen Ultra Compression' : '下一代超清极限压缩' }})</option>
            <option value="image/jpeg">JPEG ({{ isEn ? 'Universal Compatibility' : '全平台兼容照片格式' }})</option>
            <option value="image/png">PNG ({{ isEn ? 'Lossless Graphics' : '无损透明图标/截图' }})</option>
          </select>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Compression Quality' : '压缩画质 (Quality)' }}</label>
            <span class="val-badge">{{ quality }}%</span>
          </div>
          <input
            v-model.number="quality"
            type="range"
            min="10"
            max="100"
            step="2"
            class="range-slider"
            :disabled="targetMime === 'image/png'"
            @change="reprocessAll"
          />
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Resize Scale' : '分辨率缩放 (Resize)' }}</label>
            <span class="val-badge">{{ scalePercent }}%</span>
          </div>
          <input
            v-model.number="scalePercent"
            type="range"
            min="25"
            max="100"
            step="5"
            class="range-slider"
            @change="reprocessAll"
          />
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Rust Wasm Color Quantization' : 'Rust Wasm 像素量化降噪' }}</label>
          <select v-model.number="quantizeLevel" class="select-input" @change="reprocessAll">
            <option :value="1">{{ isEn ? 'Off (Original 24-bit RGB)' : '关闭（保持原始真彩色）' }}</option>
            <option :value="4">{{ isEn ? 'Light Quantization (-15% size)' : '轻度量化（肉眼无感，再省 ~15% 体积）' }}</option>
            <option :value="8">{{ isEn ? 'Aggressive Quantization (-30% size)' : '深度量化（适合截图/文档，再省 ~30% 体积）' }}</option>
          </select>
        </div>
      </div>

      <!-- Dropzone -->
      <div
        class="dropzone"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDropFiles"
        @click="fileInputRef?.click()"
      >
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*,.heic,.avif"
          style="display: none"
          @change="onFileInputChange"
        />
        <div class="drop-icon">🖼️</div>
        <p class="drop-title">
          {{
            isEn
              ? 'Drag & Drop unlimited images here, or click to select files'
              : '拖拽任意数量的图片到此处，或点击选择本地文件'
          }}
        </p>
        <p class="drop-sub">
          {{
            isEn
              ? '100% Client-Side Rust Wasm + Canvas pipeline · Automatic GPS/Camera EXIF stripping · Zero server upload'
              : '100% 浏览器本地处理（无单次张数与大小限制）· 自动扫描并抹除照片中的 GPS 定位与拍摄设备隐私'
          }}
        </p>
      </div>
    </div>

    <!-- Results List -->
    <div v-if="items.length > 0" class="tool-card">
      <div class="summary-bar">
        <div class="summary-metrics">
          <span>
            {{ isEn ? 'Processed:' : '已处理：' }} <strong>{{ totalStats.count }}</strong>
          </span>
          <span>·</span>
          <span>
            {{ isEn ? 'Original:' : '原始总大小：' }} <strong>{{ formatBytes(totalStats.orig) }}</strong>
          </span>
          <span>→</span>
          <span>
            {{ isEn ? 'Compressed:' : '压缩后总大小：' }} <strong class="accent-num">{{ formatBytes(totalStats.out) }}</strong>
          </span>
          <span v-if="totalStats.saved > 0" class="saved-badge">
            {{ isEn ? `Saved ${totalStats.saved}%` : `累计节省 ${totalStats.saved}%` }}
          </span>
        </div>
      </div>

      <div class="image-list">
        <div v-for="item in items" :key="item.id" class="image-row">
          <div class="thumb-wrap">
            <img v-if="item.outputUrl" :src="item.outputUrl" :alt="item.name" class="thumb-img" />
          </div>

          <div class="info-col">
            <div class="file-title-line">
              <span class="file-name">{{ item.file.name }}</span>
              <span class="format-pill">{{ item.headerInfo.format }} → {{ extMap[targetMime].toUpperCase() }}</span>
            </div>

            <div class="meta-line">
              <span>{{ item.width }}×{{ item.height }}px</span>
              <span v-if="item.outWidth !== item.width">→ {{ item.outWidth }}×{{ item.outHeight }}px</span>
              <span>·</span>
              <span v-if="item.headerInfo.hasExif" class="exif-cleaned-badge">
                🛡️
                {{
                  isEn
                    ? `Stripped ${formatBytes(item.headerInfo.metadataBytes)} EXIF${item.headerInfo.hasGps ? ' + GPS Location' : ''}${item.headerInfo.hasCamera ? ' + Camera Info' : ''}`
                    : `已抹除 ${formatBytes(item.headerInfo.metadataBytes)} 隐私元数据${item.headerInfo.hasGps ? '（含 GPS 坐标）' : ''}${item.headerInfo.hasCamera ? '（含相机型号）' : ''}`
                }}
              </span>
              <span v-else class="exif-clean-badge">
                ✓ {{ isEn ? 'Clean (No EXIF/GPS leak)' : '纯净无隐私元数据' }}
              </span>
            </div>
          </div>

          <div class="size-col">
            <div class="size-compare">
              <span class="old-size">{{ formatBytes(item.originalSize) }}</span>
              <span class="arrow">→</span>
              <span class="new-size">{{ formatBytes(item.outputSize) }}</span>
            </div>
            <span
              class="ratio-tag"
              :class="{ positive: item.savedPercent > 0, neutral: item.savedPercent <= 0 }"
            >
              {{ item.savedPercent > 0 ? `-${item.savedPercent}%` : `+${Math.abs(item.savedPercent)}%` }}
            </span>
          </div>

          <div class="dl-col">
            <a
              v-if="item.status === 'done' && item.outputUrl"
              :href="item.outputUrl"
              :download="`${item.name}_optimized.${extMap[targetMime]}`"
              class="dl-btn"
            >
              {{ isEn ? '⬇ Download' : '⬇ 下载图片' }}
            </a>
            <span v-else-if="item.status === 'processing'" class="proc-txt">
              {{ isEn ? 'Processing...' : '处理中...' }}
            </span>
            <span v-else class="err-txt">{{ item.errorMsg }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.img-tool-root {
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
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);
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

  &.ready {
    background-color: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-btn {
  padding: 6px 12px;
  border-radius: 9px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.clear-btn {
  padding: 6px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;

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

.select-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.dropzone {
  padding: 36px 20px;
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
  margin-bottom: 8px;
}

.drop-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.drop-sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px dashed var(--border-color);
}

.summary-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.accent-num {
  color: var(--accent);
}

.saved-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background-color: rgba(16, 185, 129, 0.14);
  color: #10b981;
  font-size: 12px;
  font-weight: 700;
}

.image-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}

.thumb-wrap {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-col {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.file-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.file-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.format-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 6px;
  background-color: var(--accent-soft);
  color: var(--accent);
}

.meta-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.exif-cleaned-badge {
  color: #d97706;
  font-weight: 700;
}

.exif-clean-badge {
  color: #10b981;
  font-weight: 600;
}

.size-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.size-compare {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: monospace;
  font-size: 13px;
}

.old-size {
  text-decoration: line-through;
  color: var(--text-muted);
}

.new-size {
  font-weight: 800;
  color: var(--text-primary);
}

.ratio-tag {
  font-size: 11.5px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 6px;

  &.positive {
    background-color: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }
  &.neutral {
    background-color: var(--bg-surface);
    color: var(--text-muted);
  }
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: 9px;
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
}
</style>
