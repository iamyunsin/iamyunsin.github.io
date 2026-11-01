<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, triggerRef } from 'vue';
import {
  initImageCodecWasm,
  inspectImageHeaderWithWasm,
  processRgbaBufferWithWasm,
  encodeWebpWithWasm,
  encodeAvifWithWasm,
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
  outputExt: string;
  savedPercent: number;
  status: 'processing' | 'done' | 'error';
  errorMsg?: string;
}

const items = ref<ProcessedImageItem[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const encoderSupport = ref<{ webp: boolean; avif: boolean }>({ webp: true, avif: true });

function detectCanvasEncoderSupport(): { webp: boolean; avif: boolean } {
  if (typeof document === 'undefined') return { webp: true, avif: true };
  try {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 2, 2);
    }
    const webpUrl = c.toDataURL('image/webp', 0.8);
    const avifUrl = c.toDataURL('image/avif', 0.8);
    return {
      webp: webpUrl.startsWith('data:image/webp'),
      avif: avifUrl.startsWith('data:image/avif'),
    };
  } catch {
    return { webp: false, avif: false };
  }
}

onMounted(async () => {
  encoderSupport.value = detectCanvasEncoderSupport();
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

// ==========================================
// Zero-Dependency Client-Side PKZip Archive Generator
// ==========================================
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date = new Date()): { dosDate: number; dosTime: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosDate = ((Math.max(1980, year) - 1980) << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  return { dosDate: dosDate & 0xffff, dosTime: dosTime & 0xffff };
}

interface ZipEntry {
  filename: string;
  data: Uint8Array;
}

function createZipArchive(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const processed = entries.map((e) => {
    const nameBytes = encoder.encode(e.filename);
    const crc = computeCrc32(e.data);
    return {
      nameBytes,
      data: e.data,
      crc,
    };
  });

  const { dosDate, dosTime } = getDosDateTime();
  let localTotal = 0;
  let cdTotal = 0;
  for (const p of processed) {
    localTotal += 30 + p.nameBytes.length + p.data.length;
    cdTotal += 46 + p.nameBytes.length;
  }
  const totalSize = localTotal + cdTotal + 22;
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  let offset = 0;
  const localOffsets: number[] = [];

  // 1. Write Local File Headers + File Data
  for (const p of processed) {
    localOffsets.push(offset);
    view.setUint32(offset, 0x04034b50, true); // Local file header signature
    view.setUint16(offset + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(offset + 6, 0x0800, true); // General purpose bit flag (UTF-8 filename)
    view.setUint16(offset + 8, 0, true); // Compression method (0 = Stored)
    view.setUint16(offset + 10, dosTime, true);
    view.setUint16(offset + 12, dosDate, true);
    view.setUint32(offset + 14, p.crc, true);
    view.setUint32(offset + 18, p.data.length, true); // Compressed size
    view.setUint32(offset + 22, p.data.length, true); // Uncompressed size
    view.setUint16(offset + 26, p.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true); // Extra field length
    offset += 30;
    buffer.set(p.nameBytes, offset);
    offset += p.nameBytes.length;
    buffer.set(p.data, offset);
    offset += p.data.length;
  }

  // 2. Write Central Directory Headers
  const cdOffset = offset;
  for (let i = 0; i < processed.length; i++) {
    const p = processed[i];
    view.setUint32(offset, 0x02014b50, true); // Central directory signature
    view.setUint16(offset + 4, 20, true); // Version made by
    view.setUint16(offset + 6, 20, true); // Version needed to extract
    view.setUint16(offset + 8, 0x0800, true); // UTF-8 filename flag
    view.setUint16(offset + 10, 0, true); // Compression method 0
    view.setUint16(offset + 12, dosTime, true);
    view.setUint16(offset + 14, dosDate, true);
    view.setUint32(offset + 16, p.crc, true);
    view.setUint32(offset + 20, p.data.length, true);
    view.setUint32(offset + 24, p.data.length, true);
    view.setUint16(offset + 28, p.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true); // Extra field length
    view.setUint16(offset + 32, 0, true); // File comment length
    view.setUint16(offset + 34, 0, true); // Disk number start
    view.setUint16(offset + 36, 0, true); // Internal file attributes
    view.setUint32(offset + 38, 0, true); // External file attributes
    view.setUint32(offset + 42, localOffsets[i], true); // Local header offset
    offset += 46;
    buffer.set(p.nameBytes, offset);
    offset += p.nameBytes.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  const cdSize = offset - cdOffset;
  view.setUint32(offset, 0x06054b50, true); // EOCD signature
  view.setUint16(offset + 4, 0, true); // Disk number
  view.setUint16(offset + 6, 0, true); // Disk with central directory
  view.setUint16(offset + 8, processed.length, true); // Entries on this disk
  view.setUint16(offset + 10, processed.length, true); // Total entries
  view.setUint32(offset + 12, cdSize, true); // Size of central directory
  view.setUint32(offset + 16, cdOffset, true); // Offset of start of central directory
  view.setUint16(offset + 20, 0, true); // Comment length

  return new Blob([buffer], { type: 'application/zip' });
}

const isArchiving = ref(false);

async function downloadAllAsZip() {
  const doneItems = items.value.filter((i) => i.status === 'done' && i.outputBlob);
  if (doneItems.length === 0 || isArchiving.value) return;

  isArchiving.value = true;
  try {
    const usedNames = new Set<string>();
    const entries: ZipEntry[] = [];

    for (const item of doneItems) {
      if (!item.outputBlob) continue;
      const ext = item.outputExt || extMap[targetMime.value] || 'jpg';
      const baseName = item.name.trim() || 'image';
      let filename = `${baseName}_optimized.${ext}`;
      let counter = 1;
      while (usedNames.has(filename)) {
        filename = `${baseName}_optimized(${counter}).${ext}`;
        counter++;
      }
      usedNames.add(filename);

      const arrayBuffer = await item.outputBlob.arrayBuffer();
      entries.push({
        filename,
        data: new Uint8Array(arrayBuffer),
      });
    }

    if (entries.length === 0) return;

    const zipBlob = createZipArchive(entries);
    const downloadUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `compressed_images_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (err) {
    console.error('Failed to create ZIP package:', err);
  } finally {
    isArchiving.value = false;
  }
}

async function downloadAllSeparately() {
  const doneItems = items.value.filter((i) => i.status === 'done' && i.outputUrl);
  if (doneItems.length === 0) return;

  for (let idx = 0; idx < doneItems.length; idx++) {
    const item = doneItems[idx];
    const ext = item.outputExt || extMap[targetMime.value] || 'jpg';
    const link = document.createElement('a');
    link.href = item.outputUrl;
    link.download = `${item.name}_optimized.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (idx < doneItems.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

function detectAlphaChannel(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 16) {
    if (rgba[i] < 250) return true;
  }
  return false;
}

function stripJpegMetadataLossless(bytes: Uint8Array): Blob | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const chunks: Uint8Array[] = [bytes.subarray(0, 2)];
  let pos = 2;
  while (pos < bytes.length) {
    if (bytes[pos] !== 0xff) return null;
    while (pos < bytes.length && bytes[pos] === 0xff) pos++;
    if (pos >= bytes.length) break;
    const marker = bytes[pos];
    pos++;

    if (marker === 0xd9) {
      chunks.push(new Uint8Array([0xff, 0xd9]));
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(new Uint8Array([0xff, marker]));
      continue;
    }
    if (pos + 2 > bytes.length) return null;
    const segLen = (bytes[pos] << 8) | bytes[pos + 1];
    if (segLen < 2 || pos + segLen > bytes.length) return null;

    if (marker === 0xda) {
      // SOS (Start of Scan): copy marker + rest of compressed bitstream to end
      chunks.push(bytes.subarray(pos - 2));
      break;
    }
    // Strip APP1..APP15 (0xE1..0xEF: EXIF, GPS, XMP, IPTC, MakerNote, ICC) and COM (0xFE)
    const isMetadataSegment = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadataSegment) {
      chunks.push(bytes.subarray(pos - 2, pos + segLen));
    }
    pos += segLen;
  }
  return new Blob(chunks, { type: 'image/jpeg' });
}

function stripPngMetadataLossless(bytes: Uint8Array): Blob | null {
  if (
    bytes.length < 8 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }
  const chunks: Uint8Array[] = [bytes.subarray(0, 8)];
  let pos = 8;
  const stripTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  while (pos + 12 <= bytes.length) {
    const len =
      ((bytes[pos] << 24) |
        (bytes[pos + 1] << 16) |
        (bytes[pos + 2] << 8) |
        bytes[pos + 3]) >>>
      0;
    const totalChunk = 12 + len;
    if (pos + totalChunk > bytes.length) return null;
    const typeStr = String.fromCharCode(
      bytes[pos + 4],
      bytes[pos + 5],
      bytes[pos + 6],
      bytes[pos + 7]
    );
    if (!stripTypes.has(typeStr)) {
      chunks.push(bytes.subarray(pos, pos + totalChunk));
    }
    pos += totalChunk;
    if (typeStr === 'IEND') break;
  }
  return new Blob(chunks, { type: 'image/png' });
}

async function tryLosslessMetadataStrip(
  file: File
): Promise<{ blob: Blob; ext: string } | null> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      const stripped = stripJpegMetadataLossless(buf);
      if (stripped && stripped.size > 0 && stripped.size <= file.size) {
        return { blob: stripped, ext: 'jpg' };
      }
    } else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      const stripped = stripPngMetadataLossless(buf);
      if (stripped && stripped.size > 0 && stripped.size <= file.size) {
        return { blob: stripped, ext: 'png' };
      }
    }
  } catch {}
  return null;
}

function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  mime: string,
  q?: number
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Encoding failed'));
      },
      mime,
      q
    );
  });
}

async function encodeWithNativeOrWasm(
  canvas: HTMLCanvasElement,
  imgData: ImageData,
  mime: 'image/webp' | 'image/jpeg' | 'image/png' | 'image/avif',
  qPercent: number,
  hasAlpha: boolean
): Promise<Blob> {
  if (mime === 'image/webp') {
    if (encoderSupport.value.webp) {
      const nativeBlob = await canvasToBlobAsync(canvas, 'image/webp', qPercent / 100);
      if (nativeBlob.type === 'image/webp') {
        return nativeBlob;
      }
      encoderSupport.value.webp = false;
    }
    try {
      return await encodeWebpWithWasm(imgData, qPercent);
    } catch (wasmErr) {
      console.warn('Wasm WebP fallback to JPEG/PNG:', wasmErr);
      return canvasToBlobAsync(
        canvas,
        hasAlpha ? 'image/png' : 'image/jpeg',
        hasAlpha ? undefined : qPercent / 100
      );
    }
  }

  if (mime === 'image/avif') {
    if (encoderSupport.value.avif) {
      const nativeBlob = await canvasToBlobAsync(canvas, 'image/avif', qPercent / 100);
      if (nativeBlob.type === 'image/avif') {
        return nativeBlob;
      }
      encoderSupport.value.avif = false;
    }
    try {
      return await encodeAvifWithWasm(imgData, qPercent);
    } catch (wasmErr) {
      console.warn('Wasm AVIF fallback to WebP:', wasmErr);
      return encodeWebpWithWasm(imgData, qPercent);
    }
  }

  return canvasToBlobAsync(
    canvas,
    mime,
    mime === 'image/png' ? undefined : qPercent / 100
  );
}

async function processSingleItem(item: ProcessedImageItem) {
  const target = items.value.find((i) => i.id === item.id) || item;
  target.status = 'processing';
  triggerRef(items);

  try {
    // 1. Read first 64KB for Rust Wasm binary header & EXIF/GPS inspection
    const sliceBuffer = await target.file.slice(0, 65536).arrayBuffer();
    const headerBytes = new Uint8Array(sliceBuffer);
    if (wasmExports.value) {
      target.headerInfo = inspectImageHeaderWithWasm(wasmExports.value, headerBytes);
      triggerRef(items);
    }

    // 2. Decode image via browser ImageBitmap / HTMLImageElement
    const imgUrl = URL.createObjectURL(target.file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(isEn.value ? 'Unsupported image format in this browser' : '当前浏览器不支持直接解码该格式'));
      el.src = imgUrl;
    });
    URL.revokeObjectURL(imgUrl);

    target.width = img.naturalWidth || img.width;
    target.height = img.naturalHeight || img.height;

    const scale = scalePercent.value / 100;
    const outW = Math.max(1, Math.round(target.width * scale));
    const outH = Math.max(1, Math.round(target.height * scale));
    target.outWidth = outW;
    target.outHeight = outH;
    triggerRef(items);

    // 3. Draw onto clean Canvas (automatically strips all EXIF, GPS, XMP & IPTC segments)
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    if (targetMime.value === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(img, 0, 0, outW, outH);

    // 4. Inspect alpha channel & pass RGBA buffer through Rust Wasm quantization
    const finalImgData = ctx.getImageData(0, 0, outW, outH);
    const hasAlpha = detectAlphaChannel(finalImgData.data);

    if (wasmExports.value) {
      processRgbaBufferWithWasm(wasmExports.value, finalImgData.data, outW, quantizeLevel.value);
      ctx.putImageData(finalImgData, 0, 0);
    }

    // 5. Encode to target format Blob via Native Canvas or On-Demand Wasm (@jsquash/webp, @jsquash/avif)
    const requestedMime = targetMime.value;
    let blob = await encodeWithNativeOrWasm(
      canvas,
      finalImgData,
      requestedMime,
      quality.value,
      hasAlpha
    );

    // Adaptive quality step-down: if lossy output is still >= 96% of original size, step down quality to achieve genuine compression
    if (
      requestedMime !== 'image/png' &&
      target.originalSize > 0 &&
      blob.size >= target.originalSize * 0.96
    ) {
      const startQ = quality.value;
      const candidateQualities = [
        Math.min(startQ - 12, 72),
        Math.min(startQ - 26, 58),
        Math.min(startQ - 40, 44),
      ].filter((qVal) => qVal >= 20 && qVal < startQ);

      for (const candQ of candidateQualities) {
        const candBlob = await encodeWithNativeOrWasm(
          canvas,
          finalImgData,
          requestedMime,
          candQ,
          hasAlpha
        );
        if (candBlob.size < blob.size) {
          blob = candBlob;
        }
        if (blob.size <= target.originalSize * 0.88) {
          break;
        }
      }
    }

    let finalExt = extMap[blob.type] || extMap[requestedMime] || 'webp';

    // 6. Never-inflate guardrail: if 100% scale and re-encoded blob is still >= originalSize, compare with lossless binary EXIF-stripped file
    if (scalePercent.value === 100 && blob.size >= target.originalSize) {
      const stripped = await tryLosslessMetadataStrip(target.file);
      if (stripped && stripped.blob.size < blob.size) {
        // Use lossless stripped file if user selected PNG/JPEG or if even lowest lossy step exceeded original
        blob = stripped.blob;
        finalExt = stripped.ext;
      }
    }

    if (target.outputUrl) URL.revokeObjectURL(target.outputUrl);
    target.outputBlob = blob;
    target.outputUrl = URL.createObjectURL(blob);
    target.outputSize = blob.size;
    target.outputExt = finalExt;
    target.savedPercent =
      target.originalSize > 0
        ? Math.round(((target.originalSize - blob.size) / target.originalSize) * 1000) / 10
        : 0;
    target.status = 'done';
    triggerRef(items);
    items.value = [...items.value];
  } catch (err: any) {
    target.status = 'error';
    target.errorMsg = err?.message || 'Error';
    triggerRef(items);
    items.value = [...items.value];
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
    outputExt: extMap[targetMime.value] || 'webp',
    savedPercent: 0,
    status: 'processing',
  }));

  items.value.unshift(...newItems);
  triggerRef(items);

  for (const rawItem of newItems) {
    const reactiveItem = items.value.find((i) => i.id === rawItem.id) || rawItem;
    await processSingleItem(reactiveItem);
  }
  isProcessing.value = false;
  triggerRef(items);
  items.value = [...items.value];
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
  triggerRef(items);
  items.value = [...items.value];
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
  triggerRef(items);
}

onUnmounted(() => {
  for (const item of items.value) {
    if (item.outputUrl) {
      try {
        URL.revokeObjectURL(item.outputUrl);
      } catch {}
    }
  }
});

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

        <div class="summary-actions">
          <button
            type="button"
            class="batch-btn batch-zip-btn"
            :disabled="totalStats.count === 0 || isArchiving"
            @click="downloadAllAsZip"
          >
            <span v-if="isArchiving" class="spin-icon">⏳</span>
            <span v-else>📦</span>
            {{
              isArchiving
                ? (isEn ? 'Archiving ZIP...' : '正在打包 ZIP...')
                : (isEn ? `Download All as ZIP (${totalStats.count})` : `打包 ZIP 下载全部 (${totalStats.count})`)
            }}
          </button>
          <button
            v-if="totalStats.count > 1"
            type="button"
            class="batch-btn batch-separate-btn"
            :disabled="totalStats.count === 0 || isArchiving"
            @click="downloadAllSeparately"
          >
            <span>⬇️</span>
            {{ isEn ? 'Download Separately' : '批量逐张下载' }}
          </button>
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
              <span class="format-pill">{{ item.headerInfo.format }} → {{ (item.outputExt || extMap[targetMime]).toUpperCase() }}</span>
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
              :download="`${item.name}_optimized.${item.outputExt || extMap[targetMime]}`"
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
  min-width: 0;
  max-width: 100%;
}

.tool-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 22px 24px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);

  @media (max-width: 640px) {
    padding: 16px 14px;
    border-radius: 12px;
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
  min-width: 0;
}

.section-title {
  margin: 0;
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);

  @media (max-width: 640px) {
    font-size: 16px;
  }
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
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 640px) {
    width: 100%;
  }
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

  @media (max-width: 640px) {
    flex: 1;
    text-align: center;
  }
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
    gap: 10px;
  }
}

.ctrl-box {
  min-width: 0;
  max-width: 100%;
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
  width: 100%;
  max-width: 100%;
  min-width: 0;
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

  @media (max-width: 640px) {
    padding: 24px 14px;
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
  flex-wrap: wrap;
  gap: 12px;
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
  flex: 1 1 180px;
  min-width: 0;
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
  word-break: break-all;
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
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
}

.summary-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 640px) {
    width: 100%;
  }
}

.batch-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    flex: 1;
  }
}

.batch-zip-btn {
  background-color: var(--accent);
  color: #fff;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }
}

.batch-separate-btn {
  background-color: var(--bg-surface);
  border-color: var(--border-color);
  color: var(--text-primary);

  &:hover:not(:disabled) {
    background-color: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }
}

.spin-icon {
  display: inline-block;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
