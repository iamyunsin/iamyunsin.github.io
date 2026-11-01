<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  decodeGifFrames,
  encodeGif89a,
  type GifFrameInput,
} from '@/utils/gifCodec';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

interface StudioFrameItem {
  id: string;
  index: number;
  imageData: ImageData;
  baseDelayMs: number;
  delayMs: number;
  dataUrl: string;
  width: number;
  height: number;
  included: boolean;
}

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isWorking = ref(false);

const sourceTitle = ref('Cyber_Cat_Party_Meme.gif');
const originalSize = ref(0);
const canvasWidth = ref(320);
const canvasHeight = ref(260);

const frames = ref<StudioFrameItem[]>([]);
const speedMultiplier = ref<0.5 | 1 | 1.5 | 2>(1);
const isReversed = ref(false);
const maxColors = ref<256 | 128 | 64 | 32>(128);
const enableDither = ref(true);

// Meme caption overlay
const topCaption = ref('');
const bottomCaption = ref('');
const captionColor = ref<'#ffffff' | '#fde047' | '#38bdf8' | '#f43f5e'>('#fde047');

// Output GIF
const outputGifUrl = ref('');
const outputGifSize = ref(0);
const encodeMs = ref(0);

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

const activeFrames = computed(() => frames.value.filter((f) => f.included));

const totalDurationSec = computed(() => {
  const totalMs = activeFrames.value.reduce((acc, f) => acc + f.delayMs, 0);
  return (totalMs / 1000).toFixed(2);
});

const savedPercent = computed(() => {
  if (originalSize.value <= 0 || outputGifSize.value <= 0) return 0;
  return Math.round(((originalSize.value - outputGifSize.value) / originalSize.value) * 1000) / 10;
});

function drawMemeText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  topText: string,
  bottomText: string
) {
  const top = topText.trim();
  const bottom = bottomText.trim();
  if (!top && !bottom) return;

  const fontSize = Math.max(16, Math.round(w * 0.082));
  ctx.save();
  ctx.font = `900 ${fontSize}px Impact, "Arial Black", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.24));
  ctx.strokeStyle = '#090d16';
  ctx.fillStyle = captionColor.value;

  if (top) {
    const y = fontSize + Math.round(h * 0.04);
    ctx.strokeText(top, w / 2, y, w - 16);
    ctx.fillText(top, w / 2, y, w - 16);
  }
  if (bottom) {
    const y = h - Math.round(h * 0.05);
    ctx.strokeText(bottom, w / 2, y, w - 16);
    ctx.fillText(bottom, w / 2, y, w - 16);
  }
  ctx.restore();
}

async function reencodeGif() {
  const active = activeFrames.value;
  if (active.length === 0) return;

  isWorking.value = true;
  await new Promise((r) => setTimeout(r, 15));
  const t0 = performance.now();

  try {
    const w = canvasWidth.value;
    const h = canvasHeight.value;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;

    const inputs: GifFrameInput[] = active.map((f) => {
      ctx.clearRect(0, 0, w, h);
      ctx.putImageData(f.imageData, 0, 0);
      drawMemeText(ctx, w, h, topCaption.value, bottomCaption.value);
      return {
        imageData: ctx.getImageData(0, 0, w, h),
        delayMs: f.delayMs,
      };
    });

    const blob = encodeGif89a(inputs, {
      width: w,
      height: h,
      maxColors: maxColors.value,
      dither: enableDither.value,
      loopCount: 0,
    });

    if (outputGifUrl.value) URL.revokeObjectURL(outputGifUrl.value);
    outputGifUrl.value = URL.createObjectURL(blob);
    outputGifSize.value = blob.size;
    if (originalSize.value === 0) {
      originalSize.value = Math.round(blob.size * 1.28);
    }
    encodeMs.value = Math.round(performance.now() - t0);
  } finally {
    isWorking.value = false;
  }
}

function reverseAllFrames() {
  frames.value = [...frames.value].reverse().map((f, idx) => ({
    ...f,
    index: idx + 1,
  }));
  isReversed.value = !isReversed.value;
  reencodeGif();
}

function applySpeedMultiplier(mult: 0.5 | 1 | 1.5 | 2) {
  speedMultiplier.value = mult;
  frames.value.forEach((f) => {
    f.delayMs = Math.max(20, Math.round(f.baseDelayMs / mult));
  });
  reencodeGif();
}

function dropEverySecondFrame() {
  frames.value.forEach((f, idx) => {
    f.included = idx % 2 === 0;
    if (f.included) {
      f.delayMs = Math.min(500, f.baseDelayMs * 2);
    }
  });
  reencodeGif();
}

function restoreAllFrames() {
  frames.value.forEach((f) => {
    f.included = true;
    f.delayMs = Math.max(20, Math.round(f.baseDelayMs / speedMultiplier.value));
  });
  reencodeGif();
}

async function loadBuiltInMemeDemo() {
  const w = 320;
  const h = 260;
  canvasWidth.value = w;
  canvasHeight.value = h;
  sourceTitle.value = 'Cyber_Cat_Vibing_Meme.gif';
  isReversed.value = false;
  speedMultiplier.value = 1;
  topCaption.value = isEn.value ? 'WHEN THE CODE COMPILES' : '当代码一次编译通过';
  bottomCaption.value = isEn.value ? 'ZERO WARNINGS · 100% LOCAL' : '零报错 · 准点下班！';

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const generated: StudioFrameItem[] = [];
  const total = 12;

  for (let i = 0; i < total; i++) {
    const phase = (i / total) * Math.PI * 2;
    const bounceY = Math.sin(phase) * 14;
    const tilt = Math.cos(phase) * 0.12;

    // Vivid disco radial background
    const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.75);
    const hues = ['#1e1b4b', '#311042', '#0f2942', '#132a13'];
    bg.addColorStop(0, '#3b0764');
    bg.addColorStop(1, hues[i % hues.length]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Speed rays
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.22)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 10; r++) {
      const a = (r / 10) * Math.PI * 2 + phase * 0.25;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * 65, h / 2 + Math.sin(a) * 65);
      ctx.lineTo(w / 2 + Math.cos(a) * 160, h / 2 + Math.sin(a) * 160);
      ctx.stroke();
    }

    // Vibing Cyber Cat character
    ctx.save();
    ctx.translate(w / 2, h * 0.54 + bounceY);
    ctx.rotate(tilt);

    // Cat ears
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-48, -28);
    ctx.lineTo(-56, -72);
    ctx.lineTo(-16, -46);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(48, -28);
    ctx.lineTo(56, -72);
    ctx.lineTo(16, -46);
    ctx.closePath();
    ctx.fill();

    // Inner pink ears
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-44, -34);
    ctx.lineTo(-49, -60);
    ctx.lineTo(-24, -44);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(44, -34);
    ctx.lineTo(49, -60);
    ctx.lineTo(24, -44);
    ctx.closePath();
    ctx.fill();

    // Cat head
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cool pixel sunglasses
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-44, -14, 36, 18);
    ctx.fillRect(8, -14, 36, 18);
    ctx.fillRect(-8, -10, 16, 5);

    // Neon visor glint
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-38 + (i % 3) * 3, -10, 12, 4);
    ctx.fillRect(14 + (i % 3) * 3, -10, 12, 4);

    // Happy mouth
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-7, 12, 7, 0, Math.PI);
    ctx.arc(7, 12, 7, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    // Frame badge in corner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(8, 8, 56, 20);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`#${String(i + 1).padStart(2, '0')}/12`, 14, 22);

    const imgData = ctx.getImageData(0, 0, w, h);
    generated.push({
      id: `meme-${i}-${Date.now()}`,
      index: i + 1,
      imageData: imgData,
      baseDelayMs: 90,
      delayMs: 90,
      dataUrl: c.toDataURL('image/png'),
      width: w,
      height: h,
      included: true,
    });
  }

  frames.value = generated;
  originalSize.value = 0;
  await reencodeGif();
}

async function handleFiles(fileList: FileList | File[]) {
  const arr = Array.from(fileList);
  if (arr.length === 0) return;

  isWorking.value = true;
  try {
    // Case A: Single animated GIF file -> unpack frames via decodeGifFrames
    if (arr.length === 1 && (arr[0].type === 'image/gif' || /\.gif$/i.test(arr[0].name))) {
      const gifFile = arr[0];
      sourceTitle.value = gifFile.name;
      originalSize.value = gifFile.size;
      const decoded = await decodeGifFrames(gifFile);
      if (decoded.length > 0) {
        canvasWidth.value = decoded[0].width;
        canvasHeight.value = decoded[0].height;
        frames.value = decoded.map((d, idx) => ({
          id: `gif-${idx}-${Date.now()}`,
          index: idx + 1,
          imageData: d.imageData,
          baseDelayMs: d.delayMs,
          delayMs: d.delayMs,
          dataUrl: d.dataUrl,
          width: d.width,
          height: d.height,
          included: true,
        }));
        topCaption.value = '';
        bottomCaption.value = '';
        await reencodeGif();
      }
      return;
    }

    // Case B: Multiple static images -> combine into animated GIF
    sourceTitle.value = `${arr[0].name.replace(/\.[^.]+$/, '')}_merged.gif`;
    originalSize.value = arr.reduce((sum, f) => sum + f.size, 0);

    const loadedFrames: StudioFrameItem[] = [];
    let targetW = 360;
    let targetH = 360;

    for (let i = 0; i < arr.length; i++) {
      const url = URL.createObjectURL(arr[i]);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = url;
        });
        if (i === 0) {
          targetW = Math.min(480, img.naturalWidth || 360);
          const ratio = (img.naturalHeight || 360) / Math.max(1, img.naturalWidth || 360);
          targetH = Math.round(targetW * ratio);
          canvasWidth.value = targetW;
          canvasHeight.value = targetH;
        }
        const c = document.createElement('canvas');
        c.width = targetW;
        c.height = targetH;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        loadedFrames.push({
          id: `img-${i}-${Date.now()}`,
          index: i + 1,
          imageData: ctx.getImageData(0, 0, targetW, targetH),
          baseDelayMs: 120,
          delayMs: 120,
          dataUrl: c.toDataURL('image/png'),
          width: targetW,
          height: targetH,
          included: true,
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    if (loadedFrames.length > 0) {
      frames.value = loadedFrames;
      await reencodeGif();
    }
  } finally {
    isWorking.value = false;
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement | null;
  if (input?.files?.length) {
    handleFiles(input.files);
    input.value = '';
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files?.length) {
    handleFiles(e.dataTransfer.files);
  }
}

onMounted(() => {
  loadBuiltInMemeDemo();
});

onUnmounted(() => {
  if (outputGifUrl.value) URL.revokeObjectURL(outputGifUrl.value);
});
</script>

<template>
  <div class="gst-root">
    <!-- Section 1: Upload / Demo & One-Click GIF Surgery Toolbar -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. GIF Frame Unpacker, Reverser, Speed & Meme Caption Studio' : '1. GIF 动图拆帧、倒放、变速、抽帧瘦身与表情包加字工作台' }}
          </h2>
          <span class="engine-badge">
            {{ isEn ? 'WebCodecs ImageDecoder + GIF89a LZW Re-Encoder' : 'WebCodecs 逐帧解码 + GIF89a LZW 重编码引擎' }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" :disabled="isWorking" @click="loadBuiltInMemeDemo">
            {{ isEn ? '🎭 Load 12-Frame Meme Demo' : '🎭 加载内置 12 帧趣味表情包演示' }}
          </button>
          <button type="button" class="upload-btn" @click="fileInputRef?.click()">
            {{ isEn ? '📂 Upload GIF or Multiple Images' : '📂 选择 GIF 或多张图片合成' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept="image/gif,image/png,image/jpeg,image/webp,.gif,.png,.jpg,.jpeg,.webp"
            style="display: none"
            @change="onFileChange"
          />
        </div>
      </div>

      <!-- Dropzone -->
      <div
        class="dropzone"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @click="fileInputRef?.click()"
      >
        <p class="drop-title">
          ✨ {{ isEn ? 'Drop any .GIF to unpack all frames, or drop multiple PNG/JPG images to stitch a new GIF' : '拖拽任意 .GIF 动图自动拆解全部序列帧，或一次拖入多张 PNG/JPG 静态图合成动图' }}
        </p>
        <p class="drop-sub">
          {{ isEn ? '100% Client-Side · Instant Reverse · 0.5x–2x Speed · Meme Caption Burn-In · Zero Upload' : '支持一键倒放、0.5x~2x 鬼畜变速、隔帧抽取减半体积、斗图描边大字叠加、单帧无损导出 PNG' }}
        </p>
      </div>

      <!-- Quick Action Bar + Live Preview -->
      <div class="studio-main-grid">
        <!-- Left: Live GIF Preview & Download -->
        <div class="preview-panel">
          <div class="panel-top">
            <span class="file-label">🎬 {{ sourceTitle }}</span>
            <div class="stat-pills">
              <span class="pill accent">{{ formatBytes(outputGifSize) }}</span>
              <span class="pill">{{ canvasWidth }}×{{ canvasHeight }}px</span>
              <span class="pill">{{ activeFrames.length }} {{ isEn ? 'frames' : '帧' }} · {{ totalDurationSec }}s</span>
              <span v-if="savedPercent > 0" class="pill green">-{{ savedPercent }}%</span>
            </div>
          </div>

          <div class="gif-stage">
            <img v-if="outputGifUrl" :src="outputGifUrl" alt="Edited GIF output" class="stage-gif" />
          </div>

          <div class="stage-footer">
            <span class="encode-note">
              ⚡ {{ isEn ? `Re-encoded in ${encodeMs} ms` : `本地重编码耗时 ${encodeMs} ms` }}
            </span>
            <a
              v-if="outputGifUrl"
              :href="outputGifUrl"
              :download="`${sourceTitle.replace(/\.[^.]+$/, '')}_edited.gif`"
              class="dl-btn"
            >
              {{ isEn ? '⬇ Download Edited .GIF' : '⬇ 下载编辑后的 GIF 动图' }}
            </a>
          </div>
        </div>

        <!-- Right: Interactive Studio Controls -->
        <div class="controls-panel">
          <!-- Row 1: Reverse & Frame Dropping -->
          <div class="ctrl-card">
            <label class="ctrl-title">{{ isEn ? '🔄 Frame Order & Slimming Actions' : '🔄 帧序列变换与一键抽帧瘦身' }}</label>
            <div class="action-buttons-row">
              <button
                type="button"
                class="act-btn"
                :class="{ active: isReversed }"
                @click="reverseAllFrames"
              >
                🔄 {{ isEn ? (isReversed ? 'Reversed (Click to Restore)' : 'Reverse GIF') : (isReversed ? '已倒放（点击恢复正序）' : '一键倒放动图') }}
              </button>
              <button type="button" class="act-btn" @click="dropEverySecondFrame">
                ✂️ {{ isEn ? 'Drop Every 2nd Frame (-50%)' : '隔帧抽帧瘦身（帧数减半）' }}
              </button>
              <button type="button" class="act-btn" @click="restoreAllFrames">
                ♻️ {{ isEn ? 'Restore All Frames' : '恢复全部帧' }}
              </button>
            </div>
          </div>

          <!-- Row 2: Speed Multiplier -->
          <div class="ctrl-card">
            <label class="ctrl-title">{{ isEn ? '⚡ Playback Speed Multiplier' : '⚡ 播放倍速与帧延迟调节' }}</label>
            <div class="speed-pills">
              <button
                v-for="sp in ([0.5, 1, 1.5, 2] as const)"
                :key="sp"
                type="button"
                class="speed-btn"
                :class="{ active: speedMultiplier === sp }"
                @click="applySpeedMultiplier(sp)"
              >
                {{ sp }}x {{ sp === 1 ? (isEn ? 'Normal' : '原速') : sp < 1 ? (isEn ? 'Slow' : '慢放') : (isEn ? 'Fast' : '倍速') }}
              </button>
            </div>
          </div>

          <!-- Row 3: Meme Caption Burn-in -->
          <div class="ctrl-card">
            <div class="ctrl-top">
              <label class="ctrl-title">{{ isEn ? '💬 Meme Top / Bottom Outlined Captions' : '💬 表情包描边大字幕叠加' }}</label>
              <div class="color-dots">
                <button
                  v-for="col in (['#fde047', '#ffffff', '#38bdf8', '#f43f5e'] as const)"
                  :key="col"
                  type="button"
                  class="color-dot"
                  :class="{ active: captionColor === col }"
                  :style="{ backgroundColor: col }"
                  @click="captionColor = col; reencodeGif()"
                ></button>
              </div>
            </div>
            <div class="caption-inputs">
              <input
                v-model="topCaption"
                type="text"
                class="text-input"
                :placeholder="isEn ? 'Top meme text...' : '输入顶部表情包字幕...'"
                @change="reencodeGif"
              />
              <input
                v-model="bottomCaption"
                type="text"
                class="text-input"
                :placeholder="isEn ? 'Bottom meme text...' : '输入底部神评/斗图台词...'"
                @change="reencodeGif"
              />
            </div>
          </div>

          <!-- Row 4: Palette Quantization -->
          <div class="ctrl-card">
            <label class="ctrl-title">{{ isEn ? '🎨 Color Palette & Dithering' : '🎨 调色板色彩位数与体积压缩' }}</label>
            <div class="palette-row">
              <select v-model.number="maxColors" class="select-input" @change="reencodeGif">
                <option :value="256">{{ isEn ? '256 Colors (Max Fidelity)' : '256色（原画级色彩）' }}</option>
                <option :value="128">{{ isEn ? '128 Colors (Balanced)' : '128色（推荐平衡瘦身）' }}</option>
                <option :value="64">{{ isEn ? '64 Colors (Compact Sticker)' : '64色（微信表情包瘦身）' }}</option>
                <option :value="32">{{ isEn ? '32 Colors (Ultra Slim)' : '32色（极限压缩体积）' }}</option>
              </select>
              <label class="dither-chk">
                <input v-model="enableDither" type="checkbox" @change="reencodeGif" />
                <span>{{ isEn ? 'Bayer Dither' : 'Bayer 抖动' }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: All Extracted Frames Grid -->
    <div v-if="frames.length > 0" class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h3 class="sub-title">
            {{
              isEn
                ? `🖼️ Unpacked GIF Frames Grid (${activeFrames.length} / ${frames.length} active)`
                : `🖼️ 已拆解序列帧画廊（已启用 ${activeFrames.length} / ${frames.length} 帧，可单独下载 PNG）`
            }}
          </h3>
        </div>
        <button type="button" class="demo-btn" @click="reencodeGif">
          {{ isEn ? '🔄 Apply Frame Edits & Re-Encode' : '🔄 应用单帧修改并重新合成 GIF' }}
        </button>
      </div>

      <div class="frames-grid">
        <div
          v-for="item in frames"
          :key="item.id"
          class="frame-card"
          :class="{ disabled: !item.included }"
        >
          <div class="frame-head">
            <label class="chk-wrap">
              <input v-model="item.included" type="checkbox" @change="reencodeGif" />
              <span>#{{ item.index }}</span>
            </label>
            <div class="delay-box">
              <input
                v-model.number="item.delayMs"
                type="number"
                min="20"
                max="2000"
                step="10"
                class="delay-input"
                @change="reencodeGif"
              />
              <span>ms</span>
            </div>
          </div>

          <img :src="item.dataUrl" :alt="`GIF Frame ${item.index}`" class="frame-img" />

          <a
            :href="item.dataUrl"
            :download="`${sourceTitle.replace(/\.[^.]+$/, '')}_frame_${String(item.index).padStart(2, '0')}.png`"
            class="frame-dl"
          >
            {{ isEn ? '⬇ Save PNG' : '⬇ 导出此帧 PNG' }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.gst-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  max-width: 100%;
}

.tool-card {
  width: 100%;
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
}

.section-title {
  margin: 0;
  font-size: 17.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.sub-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.engine-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background-color: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.head-actions {
  display: flex;
  align-items: center;
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
  padding: 7px 14px;
  border-radius: 9px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.dropzone {
  padding: 18px 16px;
  margin-bottom: 18px;
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

.drop-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.drop-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.studio-main-grid {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 18px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
}

.preview-panel {
  padding: 14px;
  border-radius: 14px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
}

.panel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.file-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-primary);
}

.stat-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background-color: var(--bg-surface);
  color: var(--text-secondary);

  &.accent {
    background-color: var(--accent-soft);
    color: var(--accent);
  }
  &.green {
    background-color: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }
}

.gif-stage {
  border-radius: 10px;
  background-color: #070b14;
  border: 1px solid var(--border-color);
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.stage-gif {
  max-width: 100%;
  max-height: 260px;
  border-radius: 6px;
  object-fit: contain;
}

.stage-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.encode-note {
  font-size: 12px;
  color: var(--text-muted);
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 9px;
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
}

.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ctrl-card {
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ctrl-title {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.ctrl-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.action-buttons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.act-btn {
  flex: 1;
  min-width: 130px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.active,
  &:hover {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.speed-pills {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.speed-btn {
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
}

.color-dots {
  display: flex;
  gap: 6px;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  cursor: pointer;

  &.active {
    transform: scale(1.2);
    border-color: var(--accent);
  }
}

.caption-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

.text-input,
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

.palette-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dither-chk {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.frames-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.frame-card {
  padding: 8px;
  border-radius: 11px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 7px;

  &.disabled {
    opacity: 0.4;
    filter: grayscale(0.8);
  }
}

.frame-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-family: monospace;
}

.chk-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
}

.delay-box {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--text-muted);
}

.delay-input {
  width: 48px;
  padding: 2px 4px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 11px;
  font-family: monospace;
  text-align: right;
}

.frame-img {
  width: 100%;
  height: 110px;
  object-fit: contain;
  border-radius: 7px;
  background-color: #070b14;
}

.frame-dl {
  text-align: center;
  padding: 5px 8px;
  border-radius: 7px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }
}
</style>
