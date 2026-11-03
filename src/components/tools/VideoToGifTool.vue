<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { encodeGif89a, type GifFrameInput } from '@/utils/gifCodec';

interface Props {
  lang?: 'zh' | 'en';
  initialWidth?: 240 | 320 | 480 | 640;
  initialFps?: 5 | 8 | 10 | 15 | 20 | 25;
  initialMaxColors?: 256 | 128 | 64 | 32;
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
  initialWidth: 320,
  initialFps: 10,
  initialMaxColors: 128,
});

const isEn = computed(() => props.lang === 'en');

interface CapturedFrameItem {
  id: string;
  index: number;
  timeSec: number;
  dataUrl: string;
  imageData: ImageData;
  included: boolean;
}

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

const isDragging = ref(false);
const isGenerating = ref(false);
const progressPercent = ref(0);
const statusText = ref('');

const sourceMode = ref<'none' | 'video' | 'demo'>('none');
const sourceName = ref('');
const sourceSize = ref(0);
const videoUrl = ref('');
const videoDuration = ref(3.0);
const sourceWidth = ref(640);
const sourceHeight = ref(360);

// Interactive parameters
const startTime = ref(0);
const endTime = ref(3.0);
const fps = ref<5 | 8 | 10 | 15 | 20 | 25>(props.initialFps);
const targetWidth = ref<240 | 320 | 480 | 640>(props.initialWidth);
const maxColors = ref<256 | 128 | 64 | 32>(props.initialMaxColors);
const enableDither = ref(true);
const topCaption = ref('');
const bottomCaption = ref('');

// Extracted frames & encoded GIF output
const frames = ref<CapturedFrameItem[]>([]);
const gifUrl = ref('');
const gifSize = ref(0);
const gifWidth = ref(320);
const gifHeight = ref(180);
const encodeElapsedMs = ref(0);

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

const targetHeight = computed(() => {
  const ratio = sourceWidth.value > 0 ? sourceHeight.value / sourceWidth.value : 9 / 16;
  return Math.max(2, Math.round((targetWidth.value * ratio) / 2) * 2);
});

const includedFramesCount = computed(() => frames.value.filter((f) => f.included).length);

const rawUncompressedBytes = computed(() => {
  return includedFramesCount.value * gifWidth.value * gifHeight.value * 4;
});

const compressionRatio = computed(() => {
  if (rawUncompressedBytes.value <= 0 || gifSize.value <= 0) return 0;
  return Math.max(0, Math.round((1 - gifSize.value / rawUncompressedBytes.value) * 1000) / 10);
});

function drawCaptionsOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  topText: string,
  bottomText: string
) {
  const top = topText.trim();
  const bottom = bottomText.trim();
  if (!top && !bottom) return;

  const fontSize = Math.max(14, Math.round(w * 0.068));
  ctx.save();
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.22));
  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#ffffff';

  if (top) {
    const y = fontSize + Math.round(h * 0.04);
    ctx.strokeText(top, w / 2, y, w - 16);
    ctx.fillText(top, w / 2, y, w - 16);
  }
  if (bottom) {
    const y = h - Math.round(h * 0.045);
    ctx.strokeText(bottom, w / 2, y, w - 16);
    ctx.fillText(bottom, w / 2, y, w - 16);
  }
  ctx.restore();
}

async function encodeFromCapturedFrames() {
  const active = frames.value.filter((f) => f.included);
  if (active.length === 0) return;

  isGenerating.value = true;
  statusText.value = isEn.value
    ? 'Quantizing palette & encoding GIF89a LZW bitstream...'
    : '正在进行调色板量化与 GIF89a LZW 二进制编码...';

  await new Promise((r) => setTimeout(r, 20));
  const t0 = performance.now();

  try {
    const w = active[0].imageData.width;
    const h = active[0].imageData.height;
    const delayMs = Math.max(20, Math.round(1000 / fps.value));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const gifInputs: GifFrameInput[] = active.map((f) => {
      ctx.putImageData(f.imageData, 0, 0);
      drawCaptionsOnCanvas(ctx, w, h, topCaption.value, bottomCaption.value);
      return {
        imageData: ctx.getImageData(0, 0, w, h),
        delayMs,
      };
    });

    const blob = encodeGif89a(gifInputs, {
      width: w,
      height: h,
      maxColors: maxColors.value,
      dither: enableDither.value,
      loopCount: 0,
    });

    if (gifUrl.value) URL.revokeObjectURL(gifUrl.value);
    gifUrl.value = URL.createObjectURL(blob);
    gifSize.value = blob.size;
    gifWidth.value = w;
    gifHeight.value = h;
    encodeElapsedMs.value = Math.round(performance.now() - t0);
  } finally {
    isGenerating.value = false;
    statusText.value = '';
  }
}

async function loadDemoAnimation() {
  if (isGenerating.value) return;
  isGenerating.value = true;
  progressPercent.value = 10;
  statusText.value = isEn.value
    ? 'Synthesizing procedural 3D cyber-wave animation frames...'
    : '正在合成 3 秒程序化赛博粒子动画序列帧...';

  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
    videoUrl.value = '';
  }

  sourceMode.value = 'demo';
  sourceName.value = 'Cyber_Rocket_Demo_Animation.mp4';
  sourceSize.value = 1480 * 1024;
  sourceWidth.value = 640;
  sourceHeight.value = 360;
  videoDuration.value = 2.4;
  startTime.value = 0;
  endTime.value = 2.4;
  if (!bottomCaption.value) {
    bottomCaption.value = isEn.value ? '100% Local GIF89a Engine' : '100% 浏览器本地 GIF89a 引擎';
  }

  const w = targetWidth.value;
  const h = targetHeight.value;
  const totalFrames = Math.min(36, Math.max(8, Math.round((endTime.value - startTime.value) * fps.value)));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const generated: CapturedFrameItem[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    const tSec = Number((startTime.value + (i / fps.value)).toFixed(2));
    const angle = progress * Math.PI * 2;

    // Animated gradient sky
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f766e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Moving synthwave grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
    ctx.lineWidth = 1;
    const horizon = Math.round(h * 0.58);
    for (let row = 0; row < 6; row++) {
      const yOffset = ((row + progress * 2) % 6) / 6;
      const y = horizon + Math.pow(yOffset, 1.7) * (h - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Orbiting neon rings & bouncing sphere
    const cx = w * 0.5 + Math.cos(angle) * (w * 0.22);
    const cy = h * 0.44 + Math.sin(angle * 2) * (h * 0.12);
    const radius = Math.max(16, Math.round(w * 0.085));

    // Glow trail
    for (let trail = 4; trail >= 1; trail--) {
      const ta = angle - trail * 0.16;
      const tx = w * 0.5 + Math.cos(ta) * (w * 0.22);
      const ty = h * 0.44 + Math.sin(ta * 2) * (h * 0.12);
      ctx.fillStyle = `rgba(244, 114, 182, ${0.18 / trail})`;
      ctx.beginPath();
      ctx.arc(tx, ty, radius * (1 - trail * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }

    // Main orb
    const orbGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, radius);
    orbGrad.addColorStop(0, '#fde047');
    orbGrad.addColorStop(0.55, '#f97316');
    orbGrad.addColorStop(1, '#db2777');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // HUD timestamp badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(10, 10, Math.round(w * 0.42), 22);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`FRAME #${String(i + 1).padStart(2, '0')} · ${tSec.toFixed(2)}s`, 16, 25);

    const imgData = ctx.getImageData(0, 0, w, h);
    generated.push({
      id: `demo-${i}-${Date.now()}`,
      index: i + 1,
      timeSec: tSec,
      dataUrl: canvas.toDataURL('image/png'),
      imageData: imgData,
      included: true,
    });

    progressPercent.value = Math.round(((i + 1) / totalFrames) * 80);
  }

  frames.value = generated;
  await encodeFromCapturedFrames();
  progressPercent.value = 100;
}

async function handleVideoFile(file: File) {
  if (!file) return;
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);

  sourceMode.value = 'video';
  sourceName.value = file.name;
  sourceSize.value = file.size;
  videoUrl.value = URL.createObjectURL(file);
}

function onVideoLoadedMetadata() {
  const el = videoRef.value;
  if (!el) return;
  const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 3.0;
  videoDuration.value = Number(dur.toFixed(2));
  sourceWidth.value = el.videoWidth || 640;
  sourceHeight.value = el.videoHeight || 360;
  startTime.value = 0;
  endTime.value = Number(Math.min(dur, 5.0).toFixed(2));
  extractFramesFromVideoAndEncode();
}

function seekVideo(sec: number): Promise<void> {
  return new Promise((resolve) => {
    const el = videoRef.value;
    if (!el) return resolve();
    const clamped = Math.max(0, Math.min(videoDuration.value, sec));
    if (Math.abs(el.currentTime - clamped) < 0.005) {
      return resolve();
    }
    const onSeeked = () => {
      el.removeEventListener('seeked', onSeeked);
      resolve();
    };
    el.addEventListener('seeked', onSeeked, { once: true });
    el.currentTime = clamped;
  });
}

async function extractFramesFromVideoAndEncode() {
  if (sourceMode.value === 'demo') {
    await loadDemoAnimation();
    return;
  }
  const el = videoRef.value;
  if (!el || sourceMode.value !== 'video') return;

  if (endTime.value <= startTime.value) {
    endTime.value = Math.min(videoDuration.value, startTime.value + 0.5);
  }

  isGenerating.value = true;
  progressPercent.value = 5;
  el.pause();

  const w = targetWidth.value;
  const h = targetHeight.value;
  const clipDuration = Math.max(0.2, endTime.value - startTime.value);
  const count = Math.min(60, Math.max(2, Math.round(clipDuration * fps.value)));
  const stepSec = clipDuration / count;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const captured: CapturedFrameItem[] = [];

  for (let i = 0; i < count; i++) {
    const t = Number((startTime.value + i * stepSec).toFixed(2));
    statusText.value = isEn.value
      ? `Sampling frame ${i + 1} / ${count} (${t}s)...`
      : `正在采样视频帧 ${i + 1} / ${count} (${t}s)...`;
    await seekVideo(t);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(el, 0, 0, w, h);

    captured.push({
      id: `vid-${i}-${Date.now()}`,
      index: i + 1,
      timeSec: t,
      dataUrl: canvas.toDataURL('image/png'),
      imageData: ctx.getImageData(0, 0, w, h),
      included: true,
    });
    progressPercent.value = Math.round(((i + 1) / count) * 75);
  }

  frames.value = captured;
  await encodeFromCapturedFrames();
  progressPercent.value = 100;
}

function setStartToCurrent() {
  if (!videoRef.value) return;
  startTime.value = Number(videoRef.value.currentTime.toFixed(2));
  if (endTime.value <= startTime.value) {
    endTime.value = Number(Math.min(videoDuration.value, startTime.value + 2).toFixed(2));
  }
}

function setEndToCurrent() {
  if (!videoRef.value) return;
  endTime.value = Number(videoRef.value.currentTime.toFixed(2));
  if (startTime.value >= endTime.value) {
    startTime.value = Number(Math.max(0, endTime.value - 2).toFixed(2));
  }
}

function toggleAllFrames(val: boolean) {
  frames.value.forEach((f) => {
    f.included = val;
  });
  if (val) {
    encodeFromCapturedFrames();
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement | null;
  if (input?.files?.[0]) {
    handleVideoFile(input.files[0]);
    input.value = '';
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files?.[0]) {
    handleVideoFile(e.dataTransfer.files[0]);
  }
}

onUnmounted(() => {
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
  if (gifUrl.value) URL.revokeObjectURL(gifUrl.value);
});
</script>

<template>
  <div class="v2g-root">
    <!-- Section 1: Upload / Demo & Parameters -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. Video Clip & GIF89a Compression Config' : '1. 视频片段截取与 GIF89a 调色板瘦身配置' }}
          </h2>
          <span class="engine-pill">
            <span class="dot"></span>
            {{ isEn ? 'Pure Client-Side GIF89a LZW + Bayer Dither' : '纯本地 GIF89a LZW + Bayer 抖动量化引擎' }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" :disabled="isGenerating" @click="loadDemoAnimation">
            {{ isEn ? '🎬 Load Demo Animation' : '🎬 加载内置演示动画流' }}
          </button>
          <button
            v-if="sourceMode !== 'none'"
            type="button"
            class="reencode-btn"
            :disabled="isGenerating"
            @click="extractFramesFromVideoAndEncode"
          >
            {{ isEn ? '⚡ Sample & Encode GIF' : '⚡ 重新采样并生成 GIF' }}
          </button>
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
        <input
          ref="fileInputRef"
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.m4v"
          style="display: none"
          @change="onFileChange"
        />
        <div class="drop-icon">🎞️</div>
        <p class="drop-title">
          {{
            sourceName
              ? `${isEn ? 'Loaded:' : '已加载：'} ${sourceName} (${sourceWidth}×${sourceHeight})`
              : isEn
                ? 'Drag & Drop MP4 / WebM / MOV video here, or click to select'
                : '拖拽 MP4 / WebM / MOV 视频到此处，或点击选择本地视频文件'
          }}
        </p>
        <p class="drop-sub">
          {{
            isEn
              ? 'Zero server uploads · No SharedArrayBuffer required · Works offline on desktop & mobile'
              : '100% 浏览器内存直接解码与 LZW 压缩 · 零上传不耗流量 · 无需等待云端排队'
          }}
        </p>
      </div>

      <!-- Controls Grid -->
      <div class="controls-grid">
        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Start Time (s)' : '起始时间 (秒)' }}</label>
            <span class="val-badge">{{ startTime.toFixed(1) }}s</span>
          </div>
          <input
            v-model.number="startTime"
            type="range"
            min="0"
            :max="Math.max(0.1, videoDuration - 0.2)"
            step="0.1"
            class="range-slider"
          />
          <button v-if="sourceMode === 'video'" type="button" class="mini-btn" @click="setStartToCurrent">
            {{ isEn ? '📍 Use Current Playhead' : '📍 设为当前播放时间' }}
          </button>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'End Time (s)' : '结束时间 (秒)' }}</label>
            <span class="val-badge">{{ endTime.toFixed(1) }}s</span>
          </div>
          <input
            v-model.number="endTime"
            type="range"
            :min="Math.min(videoDuration, startTime + 0.2)"
            :max="videoDuration"
            step="0.1"
            class="range-slider"
          />
          <button v-if="sourceMode === 'video'" type="button" class="mini-btn" @click="setEndToCurrent">
            {{ isEn ? '📍 Use Current Playhead' : '📍 设为当前播放时间' }}
          </button>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Frame Rate (FPS)' : '帧率 (FPS 流畅度)' }}</label>
          <select v-model.number="fps" class="select-input">
            <option :value="5">5 FPS ({{ isEn ? 'Ultra Small Size' : '极小体积 / 幻灯片感' }})</option>
            <option :value="8">8 FPS ({{ isEn ? 'WeChat Sticker' : '微信表情包推荐' }})</option>
            <option :value="10">10 FPS ({{ isEn ? 'Balanced Standard' : '标准动图平衡首选' }})</option>
            <option :value="15">15 FPS ({{ isEn ? 'Smooth UI Demo' : '流畅软件演示录屏' }})</option>
            <option :value="20">20 FPS ({{ isEn ? 'High Motion' : '高帧率丝滑运动' }})</option>
            <option :value="25">25 FPS ({{ isEn ? 'Cinema Fluidity' : '影院级高帧率' }})</option>
          </select>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Target Width' : '输出宽度 (自适应比例)' }}</label>
          <select v-model.number="targetWidth" class="select-input">
            <option :value="240">240px ({{ isEn ? 'Chat Emoji / Sticker' : '聊天表情包超小尺寸' }})</option>
            <option :value="320">320px ({{ isEn ? 'Social Media Feed' : '社交平台动图标准' }})</option>
            <option :value="480">480px ({{ isEn ? 'Blog & Article Embed' : '技术博客/公众号配图' }})</option>
            <option :value="640">640px ({{ isEn ? 'HD Product Showcase' : '高清产品功能演示' }})</option>
          </select>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Color Palette Quantization' : '调色板色彩压缩级别' }}</label>
          <select v-model.number="maxColors" class="select-input" @change="encodeFromCapturedFrames">
            <option :value="256">{{ isEn ? '256 Colors (Original)' : '256色原画（画质最细腻）' }}</option>
            <option :value="128">{{ isEn ? '128 Colors (Balanced)' : '128色平衡（推荐，省 ~20% 体积）' }}</option>
            <option :value="64">{{ isEn ? '64 Colors (High Compression)' : '64色高压缩（省 ~38% 体积）' }}</option>
            <option :value="32">{{ isEn ? '32 Colors (Extreme Slim)' : '32色极限瘦身（适合UI录屏/动漫）' }}</option>
          </select>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Bayer 4×4 Ordered Dithering' : 'Bayer 4×4 有序抖动抗色带' }}</label>
          <label class="switch-row">
            <input v-model="enableDither" type="checkbox" @change="encodeFromCapturedFrames" />
            <span>
              {{
                enableDither
                  ? isEn
                    ? 'Enabled (Smooth Gradients)'
                    : '已开启（消除渐变色阶断层）'
                  : isEn
                    ? 'Disabled (Smaller LZW Size)'
                    : '已关闭（纯色块更高压缩率）'
              }}
            </span>
          </label>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Top Caption Overlay' : '顶部字幕叠加 (可选)' }}</label>
          <input
            v-model="topCaption"
            type="text"
            class="text-input"
            :placeholder="isEn ? 'e.g. WAIT FOR IT...' : '例如：前方高能预警...'"
            @change="encodeFromCapturedFrames"
          />
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Bottom Caption Overlay' : '底部神评/台词字幕 (可选)' }}</label>
          <input
            v-model="bottomCaption"
            type="text"
            class="text-input"
            :placeholder="isEn ? 'e.g. 100% Client-Side GIF' : '例如：居然不用上传服务器！'"
            @change="encodeFromCapturedFrames"
          />
        </div>
      </div>

      <!-- Progress bar when encoding -->
      <div v-if="isGenerating" class="progress-banner">
        <div class="progress-info">
          <span>⏳ {{ statusText }}</span>
          <strong>{{ progressPercent }}%</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
      </div>
    </div>

    <!-- Section 2: Dual Preview (Source Video vs Output GIF) -->
    <div v-if="sourceMode !== 'none' || gifUrl" class="preview-grid">
      <!-- Source Video Player -->
      <div v-if="sourceMode === 'video'" class="tool-card preview-card">
        <div class="card-head">
          <h3 class="sub-title">{{ isEn ? '📹 Source Video Player' : '📹 原始视频预览与打点' }}</h3>
          <span class="meta-tag">{{ sourceWidth }}×{{ sourceHeight }} · {{ videoDuration }}s</span>
        </div>
        <div class="media-stage">
          <video
            ref="videoRef"
            :src="videoUrl"
            controls
            muted
            playsinline
            class="stage-media"
            @loadedmetadata="onVideoLoadedMetadata"
          ></video>
        </div>
      </div>

      <!-- Encoded GIF Output -->
      <div v-if="gifUrl" class="tool-card preview-card">
        <div class="card-head">
          <h3 class="sub-title">{{ isEn ? '✨ Generated Animated GIF' : '✨ 已生成的 GIF89a 动图成品' }}</h3>
          <div class="stat-pills">
            <span class="stat-pill accent">{{ formatBytes(gifSize) }}</span>
            <span class="stat-pill">{{ gifWidth }}×{{ gifHeight }}px</span>
            <span class="stat-pill">{{ includedFramesCount }} {{ isEn ? 'frames' : '帧' }}</span>
            <span v-if="compressionRatio > 0" class="stat-pill green">
              -{{ compressionRatio }}% {{ isEn ? 'vs RGBA' : '像素压缩率' }}
            </span>
          </div>
        </div>

        <div class="media-stage">
          <img :src="gifUrl" alt="Generated GIF preview" class="stage-media" />
        </div>

        <div class="gif-footer">
          <span class="elapsed-note">
            ⚡ {{ isEn ? `Encoded in ${encodeElapsedMs} ms` : `本地编码耗时 ${encodeElapsedMs} ms` }}
          </span>
          <a
            :href="gifUrl"
            :download="`${(sourceName || 'animation').replace(/\.[^.]+$/, '')}_${gifWidth}p_${fps}fps.gif`"
            class="dl-btn"
          >
            {{ isEn ? '⬇ Download .GIF File' : '⬇ 下载高清 GIF 动图' }}
          </a>
        </div>
      </div>
    </div>

    <!-- Section 3: Frame Strip with Checkboxes -->
    <div v-if="frames.length > 0" class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h3 class="sub-title">
            {{
              isEn
                ? `🎞️ Sampled Frame Strip (${includedFramesCount} / ${frames.length} selected)`
                : `🎞️ 抽帧时间轴胶片条（已勾选 ${includedFramesCount} / ${frames.length} 帧）`
            }}
          </h3>
          <span class="hint-text">
            {{
              isEn
                ? 'Uncheck unwanted frames and click Re-encode to trim glitches'
                : '取消勾选废帧/黑场帧后会自动重新合成纯净动图'
            }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="mini-btn" @click="toggleAllFrames(true)">
            {{ isEn ? 'Select All' : '全选所有帧' }}
          </button>
          <button type="button" class="mini-btn" @click=" encodeFromCapturedFrames()">
            {{ isEn ? '🔄 Apply Frame Selection' : '🔄 应用帧勾选并重编码' }}
          </button>
        </div>
      </div>

      <div class="frames-strip">
        <label
          v-for="frame in frames"
          :key="frame.id"
          class="frame-tile"
          :class="{ excluded: !frame.included }"
        >
          <div class="frame-top">
            <input
              v-model="frame.included"
              type="checkbox"
              @change="encodeFromCapturedFrames"
            />
            <span class="frame-idx">#{{ frame.index }}</span>
            <span class="frame-time">{{ frame.timeSec }}s</span>
          </div>
          <img :src="frame.dataUrl" :alt="`Frame ${frame.index}`" class="frame-thumb" />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.v2g-root {
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

.engine-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background-color: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: currentColor;
  }
}

.head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.reencode-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.dropzone {
  padding: 28px 20px;
  margin-bottom: 18px;
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
  font-size: 30px;
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
  font-family: monospace;
}

.select-input,
.text-input {
  width: 100%;
  padding: 7px 10px;
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

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.mini-btn {
  padding: 4px 9px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.progress-banner {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background-color: var(--accent-soft);
  border: 1px solid var(--accent-border);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.progress-track {
  height: 7px;
  border-radius: 999px;
  background-color: var(--bg-surface);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent);
  transition: width 0.2s ease;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;
}

.media-stage {
  border-radius: 12px;
  overflow: hidden;
  background-color: #090d16;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  max-height: 360px;
}

.stage-media {
  max-width: 100%;
  max-height: 340px;
  object-fit: contain;
  display: block;
}

.stat-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stat-pill {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  background-color: var(--bg-muted);
  color: var(--text-secondary);

  &.accent {
    background-color: var(--accent-soft);
    color: var(--accent);
  }
  &.green {
    background-color: rgba(16, 185, 129, 0.14);
    color: #10b981;
  }
}

.meta-tag {
  font-size: 12px;
  font-family: monospace;
  color: var(--text-muted);
}

.gif-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.elapsed-note {
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
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    opacity: 0.92;
  }
}

.hint-text {
  font-size: 12px;
  color: var(--text-muted);
}

.frames-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
}

.frame-tile {
  padding: 6px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.15s ease;

  &.excluded {
    opacity: 0.42;
    filter: grayscale(0.8);
  }
}

.frame-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-family: monospace;
  color: var(--text-secondary);
}

.frame-Idx {
  font-weight: 700;
}

.frame-thumb {
  width: 100%;
  height: 68px;
  object-fit: cover;
  border-radius: 6px;
  background-color: #000;
}
</style>
