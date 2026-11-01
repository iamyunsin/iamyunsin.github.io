<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

interface ExtractedFrame {
  id: string;
  index: number;
  timeSec: number;
  width: number;
  height: number;
  pngUrl: string;
  webpUrl: string;
  selected: boolean;
  canvas: HTMLCanvasElement;
}

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const demoCanvasRef = ref<HTMLCanvasElement | null>(null);

const isDragging = ref(false);
const isBatching = ref(false);
const batchProgress = ref(0);

const sourceMode = ref<'demo' | 'video'>('demo');
const fileName = ref('SciFi_Odyssey_Trailer_1080p.mp4');
const videoUrl = ref('');
const duration = ref(9.0);
const currentTime = ref(0.0);
const videoWidth = ref(1280);
const videoHeight = ref(720);

// Batch extraction controls
const batchMode = ref<'count' | 'interval'>('count');
const targetCount = ref<6 | 9 | 12 | 16>(9);
const intervalSec = ref<0.5 | 1 | 2 | 5>(1);

// Composite export settings
const gridColumns = ref<3 | 4>(3);
const subtitleSlicePercent = ref<number>(22);
const compositePreviewUrl = ref('');
const compositeTitle = ref('');
const compositeWidth = ref(0);
const compositeHeight = ref(0);

const frames = ref<ExtractedFrame[]>([]);

const DEMO_LINES = [
  {
    zh: '“在所有的平行宇宙里，数据从未真正离开过你的本地内存。”',
    en: '"Across every parallel universe, your data never left local memory."',
    theme: ['#090d16', '#1e3a8a', '#38bdf8'],
    scene: 'SCENE 01 · ORBITAL STATION',
  },
  {
    zh: '“传统的云端工具要求你交出原片，而我们把引擎装进了浏览器。”',
    en: '"Cloud tools ask for your raw footage; we put the engine inside the browser."',
    theme: ['#0f172a', '#065f46', '#34d399'],
    scene: 'SCENE 02 · QUANTUM CORE',
  },
  {
    zh: '“每一帧都是时间的切片，1/30 秒的微调足以定格最完美的瞬间。”',
    en: '"Every frame is a slice of time—1/30s stepping captures the exact moment."',
    theme: ['#1e1b4b', '#6d28d9', '#c084fc'],
    scene: 'SCENE 03 · NEBULA HORIZON',
  },
  {
    zh: '“把第一帧完整保留，再把后续台词逐行叠起，故事便有了重量。”',
    en: '"Keep the first frame whole, stack every subtitle beneath, and the story speaks."',
    theme: ['#27171c', '#9d174d', '#f472b6'],
    scene: 'SCENE 04 · EVENT HORIZON',
  },
  {
    zh: '“零服务器上传，100% 隐私安全，这就是极客的多媒体工作台。”',
    en: '"Zero server uploads, 100% private—welcome to the indie media workbench."',
    theme: ['#111827', '#b45309', '#fbbf24'],
    scene: 'SCENE 05 · FINAL TRANSMISSION',
  },
];

function formatTimecode(sec: number): string {
  const s = Math.max(0, sec);
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  const whole = Math.floor(rem);
  const ms = Math.round((rem - whole) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function renderDemoFrameAt(ctx: CanvasRenderingContext2D, w: number, h: number, tSec: number) {
  const idx = Math.min(
    DEMO_LINES.length - 1,
    Math.floor((tSec / Math.max(0.1, duration.value)) * DEMO_LINES.length)
  );
  const scene = DEMO_LINES[idx];
  const localProgress = ((tSec * 1.3) % 3) / 3;

  // Cinematic letterbox background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, scene.theme[0]);
  grad.addColorStop(0.6, scene.theme[1]);
  grad.addColorStop(1, '#050811');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Sci-fi planet / geometric rings
  const cx = w * (0.35 + localProgress * 0.3);
  const cy = h * 0.42;
  const r = h * 0.19;

  const orb = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  orb.addColorStop(0, scene.theme[2]);
  orb.addColorStop(0.7, scene.theme[1]);
  orb.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Orbital ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.28 + localProgress * 0.35);
  ctx.strokeStyle = scene.theme[2];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.75, r * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Top & Bottom cinema letterbox bars
  const barH = Math.round(h * 0.09);
  ctx.fillStyle = 'rgba(3, 7, 18, 0.86)';
  ctx.fillRect(0, 0, w, barH);
  ctx.fillRect(0, h - barH, w, barH);

  // Top HUD metadata
  ctx.fillStyle = '#94a3b8';
  ctx.font = `bold ${Math.round(h * 0.024)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(`${scene.scene}   |   TC ${formatTimecode(tSec)}   |   ${w}×${h} RAW`, 28, Math.round(barH * 0.62));

  // Bottom 22% Subtitle Band with classic movie dual-language caption
  const subZoneY = Math.round(h * 0.78);
  const subGrad = ctx.createLinearGradient(0, subZoneY, 0, h - barH);
  subGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  subGrad.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  ctx.fillStyle = subGrad;
  ctx.fillRect(0, subZoneY, w, h - barH - subZoneY);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';

  // Primary Chinese/English subtitle line
  const mainFont = Math.round(h * 0.038);
  ctx.font = `bold ${mainFont}px system-ui, -apple-system, "Microsoft YaHei", sans-serif`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
  ctx.fillStyle = '#ffffff';
  const primaryLine = isEn.value ? scene.en : scene.zh;
  const secondaryLine = isEn.value ? scene.zh : scene.en;

  ctx.strokeText(primaryLine, w / 2, h - barH - Math.round(h * 0.062));
  ctx.fillText(primaryLine, w / 2, h - barH - Math.round(h * 0.062));

  // Secondary subtitle line
  const subFont = Math.round(h * 0.023);
  ctx.font = `600 ${subFont}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#fde047';
  ctx.strokeText(secondaryLine, w / 2, h - barH - Math.round(h * 0.022));
  ctx.fillText(secondaryLine, w / 2, h - barH - Math.round(h * 0.022));
  ctx.restore();
}

function updateDemoPreview() {
  if (sourceMode.value !== 'demo' || !demoCanvasRef.value) return;
  const c = demoCanvasRef.value;
  c.width = videoWidth.value;
  c.height = videoHeight.value;
  const ctx = c.getContext('2d');
  if (ctx) {
    renderDemoFrameAt(ctx, c.width, c.height, currentTime.value);
  }
}

async function seekTo(sec: number): Promise<void> {
  const clamped = Math.max(0, Math.min(duration.value, Number(sec.toFixed(3))));
  currentTime.value = clamped;

  if (sourceMode.value === 'demo') {
    updateDemoPreview();
    return;
  }

  const el = videoRef.value;
  if (!el) return;
  if (Math.abs(el.currentTime - clamped) < 0.004) return;

  await new Promise<void>((resolve) => {
    const onSeeked = () => {
      el.removeEventListener('seeked', onSeeked);
      resolve();
    };
    el.addEventListener('seeked', onSeeked, { once: true });
    el.currentTime = clamped;
  });
}

async function stepTime(deltaSec: number) {
  await seekTo(currentTime.value + deltaSec);
}

function captureSnapshotCanvasAtCurrent(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = videoWidth.value;
  c.height = videoHeight.value;
  const ctx = c.getContext('2d')!;

  if (sourceMode.value === 'demo') {
    renderDemoFrameAt(ctx, c.width, c.height, currentTime.value);
  } else if (videoRef.value) {
    ctx.drawImage(videoRef.value, 0, 0, c.width, c.height);
  }
  return c;
}

function createFrameRecord(c: HTMLCanvasElement, tSec: number): ExtractedFrame {
  return {
    id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    index: frames.value.length + 1,
    timeSec: Number(tSec.toFixed(3)),
    width: c.width,
    height: c.height,
    pngUrl: c.toDataURL('image/png'),
    webpUrl: c.toDataURL('image/webp', 0.92),
    selected: true,
    canvas: c,
  };
}

function captureCurrentFrame() {
  const c = captureSnapshotCanvasAtCurrent();
  frames.value.push(createFrameRecord(c, currentTime.value));
}

async function runBatchExtraction() {
  if (isBatching.value) return;
  isBatching.value = true;
  batchProgress.value = 5;
  frames.value = [];

  const timestamps: number[] = [];
  if (batchMode.value === 'count') {
    const n = targetCount.value;
    const span = Math.max(0.1, duration.value);
    for (let i = 0; i < n; i++) {
      timestamps.push(Number(((span * (i + 0.5)) / n).toFixed(3)));
    }
  } else {
    const step = intervalSec.value;
    for (let t = 0; t <= duration.value && timestamps.length < 36; t += step) {
      timestamps.push(Number(t.toFixed(3)));
    }
  }

  for (let i = 0; i < timestamps.length; i++) {
    await seekTo(timestamps[i]);
    const c = captureSnapshotCanvasAtCurrent();
    frames.value.push({
      ...createFrameRecord(c, timestamps[i]),
      index: i + 1,
    });
    batchProgress.value = Math.round(((i + 1) / timestamps.length) * 100);
    await new Promise((r) => setTimeout(r, 15));
  }

  isBatching.value = false;
  generateStoryboardSheet();
}

const selectedFrames = computed(() => frames.value.filter((f) => f.selected));

function generateStoryboardSheet() {
  const list = selectedFrames.value;
  if (list.length === 0) return;

  const cols = gridColumns.value;
  const rows = Math.ceil(list.length / cols);
  const cellW = 420;
  const ratio = videoHeight.value / Math.max(1, videoWidth.value);
  const cellH = Math.round(cellW * ratio);
  const pad = 16;
  const headerH = 68;

  const outW = cols * cellW + (cols + 1) * pad;
  const outH = headerH + rows * cellH + (rows + 1) * pad;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, outW, outH);

  // Header metadata bar
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`🎬 ${fileName.value}`, pad, 34);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText(
    `Resolution: ${videoWidth.value}x${videoHeight.value}  |  Duration: ${formatTimecode(duration.value)}  |  Keyframes: ${list.length} (${cols}x${rows} Contact Sheet)`,
    pad,
    56
  );

  list.forEach((f, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = pad + col * (cellW + pad);
    const y = headerH + pad + row * (cellH + pad);

    ctx.drawImage(f.canvas, 0, 0, f.width, f.height, x, y, cellW, cellH);

    // Timestamp pill overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(x + 8, y + 8, 108, 22);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`#${idx + 1} ${formatTimecode(f.timeSec)}`, x + 14, y + 23);
  });

  compositeTitle.value = isEn.value
    ? `${cols}×${rows} Video Storyboard Contact Sheet`
    : `${cols}×${rows} 视频分镜故事板网格拼图`;
  compositeWidth.value = outW;
  compositeHeight.value = outH;
  compositePreviewUrl.value = canvas.toDataURL('image/png');
}

function generateSubtitleStitchImage() {
  const list = selectedFrames.value;
  if (list.length === 0) return;

  const baseW = Math.min(1280, list[0].width);
  const scale = baseW / list[0].width;
  const fullH = Math.round(list[0].height * scale);
  const sliceRatio = Math.max(0.12, Math.min(0.4, subtitleSlicePercent.value / 100));
  const sliceH = Math.round(fullH * sliceRatio);

  const totalH = fullH + Math.max(0, list.length - 1) * sliceH;
  const canvas = document.createElement('canvas');
  canvas.width = baseW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // Draw 1st frame full height
  ctx.drawImage(list[0].canvas, 0, 0, list[0].width, list[0].height, 0, 0, baseW, fullH);

  // Stack bottom subtitle slices of subsequent frames
  const srcSliceY = Math.round(list[0].height * (1 - sliceRatio));
  const srcSliceH = list[0].height - srcSliceY;

  for (let i = 1; i < list.length; i++) {
    const destY = fullH + (i - 1) * sliceH;
    ctx.drawImage(
      list[i].canvas,
      0,
      srcSliceY,
      list[i].width,
      srcSliceH,
      0,
      destY,
      baseW,
      sliceH
    );
    // Subtle cinematic separator line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(0, destY, baseW, 1);
  }

  compositeTitle.value = isEn.value
    ? `Movie Subtitle Collage (${list.length} scenes, bottom ${subtitleSlicePercent.value}% slice)`
    : `影视台词底部拼接长图（共 ${list.length} 幕，底部 ${subtitleSlicePercent.value}% 切片叠拼）`;
  compositeWidth.value = baseW;
  compositeHeight.value = totalH;
  compositePreviewUrl.value = canvas.toDataURL('image/png');
}

async function loadDemoSequence() {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
    videoUrl.value = '';
  }
  sourceMode.value = 'demo';
  fileName.value = 'SciFi_Odyssey_Trailer_1080p.mp4';
  duration.value = 9.0;
  videoWidth.value = 1280;
  videoHeight.value = 720;
  currentTime.value = 0;
  targetCount.value = 6;
  await new Promise((r) => setTimeout(r, 20));
  updateDemoPreview();
  await runBatchExtraction();
  generateSubtitleStitchImage();
}

function handleVideoFile(file: File) {
  if (!file) return;
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
  sourceMode.value = 'video';
  fileName.value = file.name;
  videoUrl.value = URL.createObjectURL(file);
  frames.value = [];
  compositePreviewUrl.value = '';
}

function onVideoLoadedMetadata() {
  const el = videoRef.value;
  if (!el) return;
  duration.value = Number.isFinite(el.duration) && el.duration > 0 ? Number(el.duration.toFixed(2)) : 10;
  videoWidth.value = el.videoWidth || 1280;
  videoHeight.value = el.videoHeight || 720;
  currentTime.value = 0;
  runBatchExtraction();
}

function onVideoTimeUpdate() {
  if (videoRef.value && !isBatching.value) {
    currentTime.value = Number(videoRef.value.currentTime.toFixed(3));
  }
}

function removeFrame(id: string) {
  frames.value = frames.value.filter((f) => f.id !== id);
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

onMounted(() => {
  loadDemoSequence();
});

onUnmounted(() => {
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
});
</script>

<template>
  <div class="vfe-root">
    <!-- Section 1: Upload / Demo & Frame-Accurate Stepping Monitor -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. Frame-Accurate Stepping & Keyframe Extractor' : '1. 逐帧微调监视器与批量高清截帧工作台' }}
          </h2>
          <span class="res-badge">
            {{ videoWidth }}×{{ videoHeight }}px · {{ formatTimecode(currentTime) }} / {{ formatTimecode(duration) }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" @click="loadDemoSequence">
            {{ isEn ? '🎬 Load Multi-Scene Subtitle Demo' : '🎬 加载内置多镜头台词演示流' }}
          </button>
          <button type="button" class="upload-btn" @click="fileInputRef?.click()">
            {{ isEn ? '📂 Select Local Video File' : '📂 选择本地视频文件' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.m4v"
            style="display: none"
            @change="onFileChange"
          />
        </div>
      </div>

      <!-- Monitor & Side Controls -->
      <div class="monitor-layout">
        <!-- Left: Video / Demo Canvas Monitor -->
        <div
          class="monitor-col"
          :class="{ dragging: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <div class="video-viewport">
            <canvas
              v-show="sourceMode === 'demo'"
              ref="demoCanvasRef"
              class="viewport-media"
            ></canvas>
            <video
              v-if="sourceMode === 'video'"
              ref="videoRef"
              :src="videoUrl"
              controls
              playsinline
              class="viewport-media"
              @loadedmetadata="onVideoLoadedMetadata"
              @timeupdate="onVideoTimeUpdate"
            ></video>
          </div>

          <!-- Timeline scrubber -->
          <div class="scrubber-row">
            <span class="tc-label">{{ formatTimecode(currentTime) }}</span>
            <input
              :value="currentTime"
              type="range"
              min="0"
              :max="duration"
              step="0.033"
              class="range-slider"
              @input="(e) => seekTo(Number((e.target as HTMLInputElement).value))"
            />
            <span class="tc-label">{{ formatTimecode(duration) }}</span>
          </div>

          <!-- Frame Stepping Bar -->
          <div class="stepping-bar">
            <button type="button" class="step-btn" @click="stepTime(-1)">⏪ -1s</button>
            <button type="button" class="step-btn" @click="stepTime(-1 / 30)">
              {{ isEn ? '⏮ -1 Frame (1/30s)' : '⏮ -1帧 (1/30s)' }}
            </button>
            <button type="button" class="capture-main-btn" @click="captureCurrentFrame">
              {{ isEn ? '📸 Capture Current HD Frame' : '📸 抓取当前高清帧' }}
            </button>
            <button type="button" class="step-btn" @click="stepTime(1 / 30)">
              {{ isEn ? '⏭ +1 Frame (1/30s)' : '⏭ +1帧 (1/30s)' }}
            </button>
            <button type="button" class="step-btn" @click="stepTime(1)">+1s ⏩</button>
          </div>
        </div>

        <!-- Right: Auto Batch Extraction & Collage Controls -->
        <div class="side-panel">
          <div class="panel-box">
            <h3 class="box-title">{{ isEn ? '⚡ Auto Batch Extraction' : '⚡ 自动批量关键帧抽取' }}</h3>

            <div class="radio-tabs">
              <button
                type="button"
                class="tab-pill"
                :class="{ active: batchMode === 'count' }"
                @click="batchMode = 'count'"
              >
                {{ isEn ? 'Evenly Spaced N Frames' : '按固定张数均匀抽帧' }}
              </button>
              <button
                type="button"
                class="tab-pill"
                :class="{ active: batchMode === 'interval' }"
                @click="batchMode = 'interval'"
              >
                {{ isEn ? 'Every N Seconds' : '按固定秒数间隔抽帧' }}
              </button>
            </div>

            <div v-if="batchMode === 'count'" class="field-group">
              <label>{{ isEn ? 'Number of Keyframes' : '均匀抽取总张数' }}</label>
              <select v-model.number="targetCount" class="select-input">
                <option :value="6">{{ isEn ? '6 Frames (Subtitle Strip Ideal)' : '6 张（电影台词长图推荐）' }}</option>
                <option :value="9">{{ isEn ? '9 Frames (3×3 Storyboard Grid)' : '9 张（3×3 九宫格故事板推荐）' }}</option>
                <option :value="12">{{ isEn ? '12 Frames (3×4 / 4×3 Grid)' : '12 张（3×4 分镜网格）' }}</option>
                <option :value="16">{{ isEn ? '16 Frames (4×4 Contact Sheet)' : '16 张（4×4 全景缩略图矩阵）' }}</option>
              </select>
            </div>

            <div v-else class="field-group">
              <label>{{ isEn ? 'Time Interval' : '抽帧时间间隔' }}</label>
              <select v-model.number="intervalSec" class="select-input">
                <option :value="0.5">{{ isEn ? 'Every 0.5 Seconds' : '每 0.5 秒抓取 1 帧' }}</option>
                <option :value="1">{{ isEn ? 'Every 1.0 Second' : '每 1.0 秒抓取 1 帧' }}</option>
                <option :value="2">{{ isEn ? 'Every 2.0 Seconds' : '每 2.0 秒抓取 1 帧' }}</option>
                <option :value="5">{{ isEn ? 'Every 5.0 Seconds' : '每 5.0 秒抓取 1 帧' }}</option>
              </select>
            </div>

            <button
              type="button"
              class="action-full-btn"
              :disabled="isBatching"
              @click="runBatchExtraction"
            >
              {{
                isBatching
                  ? `${isEn ? 'Extracting...' : '正在批量抽帧...'} (${batchProgress}%)`
                  : isEn
                    ? '🚀 Run Auto Batch Extraction'
                    : '🚀 立即执行批量自动抽帧'
              }}
            </button>
          </div>

          <div class="panel-box">
            <h3 class="box-title">{{ isEn ? '🖼️ Composite Collage Generator' : '🖼️ 故事板网格与影视台词长图合成' }}</h3>

            <div class="field-group">
              <div class="ctrl-top">
                <label>{{ isEn ? 'Subtitle Bottom Slice Ratio' : '台词长图底部截取比例' }}</label>
                <span class="val-badge">{{ subtitleSlicePercent }}%</span>
              </div>
              <input
                v-model.number="subtitleSlicePercent"
                type="range"
                min="14"
                max="35"
                step="1"
                class="range-slider"
              />
            </div>

            <div class="field-group">
              <label>{{ isEn ? 'Storyboard Grid Columns' : '故事板网格列数' }}</label>
              <select v-model.number="gridColumns" class="select-input">
                <option :value="3">{{ isEn ? '3 Columns (3×3 Classic)' : '3 列网格（适合 3×3 九宫格）' }}</option>
                <option :value="4">{{ isEn ? '4 Columns (4×4 Contact Sheet)' : '4 列网格（适合 4×4 故事板）' }}</option>
              </select>
            </div>

            <div class="collage-btns">
              <button
                type="button"
                class="collage-btn primary"
                :disabled="selectedFrames.length === 0"
                @click="generateSubtitleStitchImage"
              >
                {{ isEn ? '📜 Stitch Movie Subtitle Strip' : '📜 生成影视台词拼接长图' }}
              </button>
              <button
                type="button"
                class="collage-btn"
                :disabled="selectedFrames.length === 0"
                @click="generateStoryboardSheet"
              >
                {{ isEn ? '🧩 Build Storyboard Grid' : '🧩 生成视频故事板网格图' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Composite Preview (Subtitle Strip or Storyboard Contact Sheet) -->
    <div v-if="compositePreviewUrl" class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h3 class="sub-title">✨ {{ compositeTitle }}</h3>
          <span class="res-badge">{{ compositeWidth }}×{{ compositeHeight }}px</span>
        </div>
        <a
          :href="compositePreviewUrl"
          :download="`${fileName.replace(/\.[^.]+$/, '')}_composite_${compositeWidth}x${compositeHeight}.png`"
          class="dl-btn"
        >
          {{ isEn ? '⬇ Download HD Composite PNG' : '⬇ 下载高清合成大图 (PNG)' }}
        </a>
      </div>

      <div class="composite-stage">
        <img :src="compositePreviewUrl" alt="Composite output preview" class="composite-img" />
      </div>
    </div>

    <!-- Section 3: Extracted Keyframes Gallery -->
    <div v-if="frames.length > 0" class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h3 class="sub-title">
            {{
              isEn
                ? `📸 Captured Frames Gallery (${selectedFrames.length} / ${frames.length} selected)`
                : `📸 已抓取高清视频帧画廊（已选 ${selectedFrames.length} / ${frames.length} 张）`
            }}
          </h3>
        </div>
        <div class="head-actions">
          <button
            type="button"
            class="step-btn"
            @click="frames.forEach((f) => (f.selected = true))"
          >
            {{ isEn ? 'Select All' : '全选' }}
          </button>
          <button type="button" class="step-btn" @click="frames = []">
            {{ isEn ? 'Clear Gallery' : '清空画廊' }}
          </button>
        </div>
      </div>

      <div class="gallery-grid">
        <div
          v-for="item in frames"
          :key="item.id"
          class="gallery-card"
          :class="{ unselected: !item.selected }"
        >
          <div class="gallery-top">
            <label class="chk-label">
              <input v-model="item.selected" type="checkbox" />
              <span>#{{ item.index }} · {{ formatTimecode(item.timeSec) }}</span>
            </label>
            <button type="button" class="del-btn" @click="removeFrame(item.id)">✕</button>
          </div>

          <img :src="item.pngUrl" :alt="`Frame ${item.index}`" class="gallery-img" />

          <div class="gallery-actions">
            <a
              :href="item.pngUrl"
              :download="`${fileName.replace(/\.[^.]+$/, '')}_${item.timeSec}s.png`"
              class="mini-dl"
            >
              ⬇ PNG
            </a>
            <a
              :href="item.webpUrl"
              :download="`${fileName.replace(/\.[^.]+$/, '')}_${item.timeSec}s.webp`"
              class="mini-dl accent"
            >
              ⬇ WebP
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.vfe-root {
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

.res-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  font-family: monospace;
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
  padding: 7px 13px;
  border-radius: 9px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.monitor-layout {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.monitor-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.video-viewport {
  border-radius: 14px;
  overflow: hidden;
  background-color: #050811;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
}

.viewport-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.scrubber-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
}

.tc-label {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.stepping-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.step-btn {
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.capture-main-btn {
  flex: 1;
  min-width: 160px;
  padding: 8px 14px;
  border-radius: 9px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-box {
  padding: 14px 16px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.box-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--text-primary);
}

.radio-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.tab-pill {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }
}

.ctrl-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.val-badge {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  font-family: monospace;
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

.action-full-btn {
  width: 100%;
  padding: 9px 14px;
  border-radius: 9px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.collage-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collage-btn {
  width: 100%;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid var(--accent-border);
  background-color: var(--bg-surface);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &.primary {
    background-color: var(--accent-soft);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.composite-stage {
  max-height: 540px;
  overflow-y: auto;
  border-radius: 12px;
  background-color: #070b14;
  border: 1px solid var(--border-color);
  padding: 12px;
  display: flex;
  justify-content: center;
}

.composite-img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
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

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}

.gallery-card {
  padding: 10px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.unselected {
    opacity: 0.45;
  }
}

.gallery-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-family: monospace;
  color: var(--text-secondary);
}

.chk-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: 700;
}

.del-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
}

.gallery-img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 8px;
  background-color: #000;
}

.gallery-actions {
  display: flex;
  gap: 6px;
}

.mini-dl {
  flex: 1;
  text-align: center;
  padding: 5px 8px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;
  background-color: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-color);

  &.accent {
    background-color: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }
}
</style>
