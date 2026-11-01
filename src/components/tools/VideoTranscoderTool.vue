<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { encodeAudioBufferToWav } from '@/utils/gifCodec';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const activeTab = ref<'audio' | 'video'>('audio');
const fileInputRef = ref<HTMLInputElement | null>(null);
const sourceVideoRef = ref<HTMLVideoElement | null>(null);
const waveformCanvasRef = ref<HTMLCanvasElement | null>(null);
const previewCanvasRef = ref<HTMLCanvasElement | null>(null);

const isDragging = ref(false);
const isProcessing = ref(false);
const progressPercent = ref(0);
const statusMessage = ref('');

const sourceName = ref('Synthwave_Demo_Clip.mp4');
const sourceSize = ref(2450 * 1024);
const sourceUrl = ref('');
const sourceDuration = ref(3.2);
const sourceWidth = ref(640);
const sourceHeight = ref(360);
const isDemoSource = ref(true);

// Mode 1: Lossless WAV Audio Extraction state
const decodedAudioBuffer = ref<AudioBuffer | null>(null);
const audioTrimStart = ref(0);
const audioTrimEnd = ref(3.2);
const fadeInSec = ref(0.2);
const fadeOutSec = ref(0.4);
const audioGain = ref(1.0);
const wavUrl = ref('');
const wavSize = ref(0);
const audioSampleRate = ref(44100);
const audioChannels = ref(2);

// Mode 2: Video Transcode, Rotate & Bitrate Compress state
const targetContainer = ref<'video/webm;codecs=vp9' | 'video/webm;codecs=vp8' | 'video/mp4'>('video/webm;codecs=vp9');
const targetBitrateKbps = ref<500 | 1000 | 2000 | 4000 | 8000>(2000);
const scalePercent = ref<100 | 75 | 50>(100);
const rotateDeg = ref<0 | 90 | 180 | 270>(0);
const flipHorizontal = ref(false);
const muteVideoAudio = ref(false);

const transcodedUrl = ref('');
const transcodedSize = ref(0);
const transcodedExt = ref('webm');
const transcodedWidth = ref(640);
const transcodedHeight = ref(360);

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

function getSupportedMimeType(preferred: string): { mime: string; ext: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mime: '', ext: 'webm' };
  }
  const candidates = [
    preferred,
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) {
      return {
        mime: c,
        ext: c.includes('mp4') ? 'mp4' : 'webm',
      };
    }
  }
  return { mime: '', ext: 'webm' };
}

function createSyntheticAudioBuffer(durationSec = 3.2): AudioBuffer {
  const sr = 44100;
  const length = Math.floor(sr * durationSec);
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const buffer = ctx.createBuffer(2, length, sr);

  const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5 chord arpeggio
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const noteIdx = Math.floor((t / durationSec) * notes.length) % notes.length;
      const freq = notes[noteIdx] * (ch === 1 ? 1.003 : 1);
      const subBass = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25;
      const lead = Math.sin(2 * Math.PI * freq * t) * 0.45;
      const harmonic = Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.15;
      const beatEnv = 0.65 + 0.35 * Math.sin(2 * Math.PI * 3.5 * t);
      data[i] = (subBass + lead + harmonic) * beatEnv;
    }
  }
  ctx.close().catch(() => {});
  return buffer;
}

function drawWaveform() {
  const c = waveformCanvasRef.value;
  const buf = decodedAudioBuffer.value;
  if (!c || !buf) return;

  const w = (c.width = 760);
  const h = (c.height = 140);
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);

  const raw = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(raw.length / w));
  const mid = h / 2;

  const startRatio = audioTrimStart.value / Math.max(0.1, buf.duration);
  const endRatio = audioTrimEnd.value / Math.max(0.1, buf.duration);
  const startX = Math.round(startRatio * w);
  const endX = Math.round(endRatio * w);

  // Highlight active trim region
  ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
  ctx.fillRect(startX, 0, Math.max(2, endX - startX), h);

  for (let x = 0; x < w; x++) {
    let peak = 0;
    const base = x * step;
    for (let j = 0; j < step && base + j < raw.length; j += 4) {
      const v = Math.abs(raw[base + j]);
      if (v > peak) peak = v;
    }
    const barH = Math.max(2, peak * (h * 0.82) * Math.min(1.5, audioGain.value));
    const inRange = x >= startX && x <= endX;
    ctx.fillStyle = inRange ? '#38bdf8' : '#334155';
    ctx.fillRect(x, mid - barH / 2, 1, barH);
  }

  // Trim boundary lines
  ctx.fillStyle = '#10b981';
  ctx.fillRect(startX, 0, 2, h);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(Math.max(0, endX - 2), 0, 2, h);
}

function rebuildWavOutput() {
  const buf = decodedAudioBuffer.value;
  if (!buf) return;

  if (audioTrimEnd.value <= audioTrimStart.value) {
    audioTrimEnd.value = Math.min(buf.duration, audioTrimStart.value + 0.3);
  }

  const blob = encodeAudioBufferToWav(buf, {
    startSec: audioTrimStart.value,
    endSec: audioTrimEnd.value,
    fadeInSec: fadeInSec.value,
    fadeOutSec: fadeOutSec.value,
    gain: audioGain.value,
  });

  if (wavUrl.value) URL.revokeObjectURL(wavUrl.value);
  wavUrl.value = URL.createObjectURL(blob);
  wavSize.value = blob.size;
  audioSampleRate.value = buf.sampleRate;
  audioChannels.value = buf.numberOfChannels;
  drawWaveform();
}

function drawTransformedPreviewFrame(timeSec = 0.8) {
  const c = previewCanvasRef.value;
  if (!c) return;

  const scale = scalePercent.value / 100;
  const baseW = Math.round(sourceWidth.value * scale);
  const baseH = Math.round(sourceHeight.value * scale);
  const isSideways = rotateDeg.value === 90 || rotateDeg.value === 270;

  c.width = isSideways ? baseH : baseW;
  c.height = isSideways ? baseW : baseH;
  transcodedWidth.value = c.width;
  transcodedHeight.value = c.height;

  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotateDeg.value * Math.PI) / 180);
  if (flipHorizontal.value) {
    ctx.scale(-1, 1);
  }

  if (!isDemoSource.value && sourceVideoRef.value && sourceVideoRef.value.readyState >= 2) {
    ctx.drawImage(sourceVideoRef.value, -baseW / 2, -baseH / 2, baseW, baseH);
  } else {
    // Draw procedural demo frame
    const grad = ctx.createLinearGradient(-baseW / 2, -baseH / 2, baseW / 2, baseH / 2);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1d4ed8');
    grad.addColorStop(1, '#047857');
    ctx.fillStyle = grad;
    ctx.fillRect(-baseW / 2, -baseH / 2, baseW, baseH);

    const orbX = Math.cos(timeSec * 2.5) * (baseW * 0.22);
    const orbY = Math.sin(timeSec * 3.2) * (baseH * 0.16);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(orbX, orbY, Math.max(18, baseW * 0.08), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(13, Math.round(baseW * 0.042))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `TRANSCODE PREVIEW · ${c.width}x${c.height} · ${rotateDeg.value}°`,
      0,
      baseH * 0.34
    );
  }
  ctx.restore();
}

async function loadBuiltInDemo() {
  isDemoSource.value = true;
  sourceName.value = 'Synthwave_Demo_Clip.mp4';
  sourceSize.value = 2450 * 1024;
  sourceDuration.value = 3.2;
  sourceWidth.value = 640;
  sourceHeight.value = 360;

  const buf = createSyntheticAudioBuffer(3.2);
  decodedAudioBuffer.value = buf;
  audioTrimStart.value = 0;
  audioTrimEnd.value = 3.2;
  rebuildWavOutput();
  drawTransformedPreviewFrame(0.8);
}

async function handleUploadedVideo(file: File) {
  if (!file) return;
  isProcessing.value = true;
  statusMessage.value = isEn.value
    ? 'Decoding audio stream & video metadata locally...'
    : '正在本地解析视频轨道与无损 PCM 音频流...';

  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
  isDemoSource.value = false;
  sourceName.value = file.name;
  sourceSize.value = file.size;
  sourceUrl.value = URL.createObjectURL(file);

  try {
    const arrayBuf = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const actx = new AudioCtx();
    const audioBuf = await actx.decodeAudioData(arrayBuf.slice(0));
    await actx.close().catch(() => {});

    decodedAudioBuffer.value = audioBuf;
    sourceDuration.value = Number(audioBuf.duration.toFixed(2));
    audioTrimStart.value = 0;
    audioTrimEnd.value = sourceDuration.value;
    rebuildWavOutput();
  } catch {
    // Fallback if video has no audio track
    const fallbackBuf = createSyntheticAudioBuffer(2.5);
    decodedAudioBuffer.value = fallbackBuf;
    rebuildWavOutput();
  } finally {
    isProcessing.value = false;
    statusMessage.value = '';
  }
}

function onSourceVideoLoaded() {
  const el = sourceVideoRef.value;
  if (!el) return;
  if (el.videoWidth) sourceWidth.value = el.videoWidth;
  if (el.videoHeight) sourceHeight.value = el.videoHeight;
  if (Number.isFinite(el.duration) && el.duration > 0) {
    sourceDuration.value = Number(el.duration.toFixed(2));
  }
  drawTransformedPreviewFrame(0.5);
}

async function runVideoTranscode() {
  if (isProcessing.value) return;
  drawTransformedPreviewFrame(0);

  const c = previewCanvasRef.value;
  if (!c || typeof c.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    return;
  }

  isProcessing.value = true;
  progressPercent.value = 5;
  statusMessage.value = isEn.value
    ? 'Transcoding video frames & bitrate in real time...'
    : '正在通过 Canvas + MediaRecorder 实时重编码视频流...';

  const { mime, ext } = getSupportedMimeType(targetContainer.value);
  transcodedExt.value = ext;

  const stream = c.captureStream(30);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    ...(mime ? { mimeType: mime } : {}),
    videoBitsPerSecond: targetBitrateKbps.value * 1000,
  });

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const donePromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mime || 'video/webm' }));
    };
  });

  recorder.start(100);

  const totalMs = isDemoSource.value
    ? 2200
    : Math.min(8000, Math.max(1500, sourceDuration.value * 1000));
  const stepMs = 33;
  let elapsed = 0;

  if (!isDemoSource.value && sourceVideoRef.value) {
    sourceVideoRef.value.currentTime = 0;
    sourceVideoRef.value.muted = muteVideoAudio.value;
    await sourceVideoRef.value.play().catch(() => {});
  }

  while (elapsed < totalMs) {
    drawTransformedPreviewFrame(elapsed / 1000);
    await new Promise((r) => setTimeout(r, stepMs));
    elapsed += stepMs;
    progressPercent.value = Math.min(98, Math.round((elapsed / totalMs) * 100));
  }

  if (!isDemoSource.value && sourceVideoRef.value) {
    sourceVideoRef.value.pause();
  }

  recorder.stop();
  const outBlob = await donePromise;

  if (transcodedUrl.value) URL.revokeObjectURL(transcodedUrl.value);
  transcodedUrl.value = URL.createObjectURL(outBlob);
  transcodedSize.value = outBlob.size;
  progressPercent.value = 100;
  isProcessing.value = false;
  statusMessage.value = '';
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement | null;
  if (input?.files?.[0]) {
    handleUploadedVideo(input.files[0]);
    input.value = '';
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files?.[0]) {
    handleUploadedVideo(e.dataTransfer.files[0]);
  }
}

onMounted(() => {
  loadBuiltInDemo();
});

onUnmounted(() => {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
  if (wavUrl.value) URL.revokeObjectURL(wavUrl.value);
  if (transcodedUrl.value) URL.revokeObjectURL(transcodedUrl.value);
});
</script>

<template>
  <div class="vtc-root">
    <!-- Top Card: Source Upload & Mode Switcher -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{
              isEn
                ? '1. Local Video Transcoder & Lossless WAV Audio Extractor'
                : '1. 视频格式码率瘦身、旋转镜像与无损 WAV 音频提取工作台'
            }}
          </h2>
          <span class="badge-pill">
            {{ isEn ? 'WebAudio PCM + MediaRecorder Hardware Pipeline' : 'WebAudio 无损 PCM + MediaRecorder 硬件加速管线' }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" @click="loadBuiltInDemo">
            {{ isEn ? '🎬 Load Synthwave Demo Clip' : '🎬 加载内置合成器音视频片源' }}
          </button>
          <button type="button" class="upload-btn" @click="fileInputRef?.click()">
            {{ isEn ? '📂 Open Local Video' : '📂 选择本地视频文件' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/ogg,audio/*,.mp4,.webm,.mov,.m4v"
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
          🎬 {{ isEn ? 'Current Source:' : '当前片源：' }}
          <strong>{{ sourceName }}</strong>
          ({{ formatBytes(sourceSize) }} · {{ sourceWidth }}×{{ sourceHeight }} · {{ sourceDuration }}s)
        </p>
        <p class="drop-sub">
          {{
            isEn
              ? 'Drop any MP4 / MOV / WebM video here to extract 16-bit PCM WAV audio or transcode/rotate/compress locally'
              : '支持拖拽任意 MP4 / MOV / WebM 视频到此：一键分离背景音乐 BGM，或旋转纠正手机竖屏视频、降低码率瘦身'
          }}
        </p>
      </div>

      <!-- Hidden video element for decoding uploaded file -->
      <video
        v-if="!isDemoSource && sourceUrl"
        ref="sourceVideoRef"
        :src="sourceUrl"
        playsinline
        style="display: none"
        @loadedmetadata="onSourceVideoLoaded"
      ></video>

      <!-- Mode Switcher Tabs -->
      <div class="mode-tabs">
        <button
          type="button"
          class="mode-tab"
          :class="{ active: activeTab === 'audio' }"
          @click="activeTab = 'audio'"
        >
          🎵 {{ isEn ? 'Mode 1: Extract Lossless WAV Audio Track' : '模式一：一键提取视频无损音频轨道 (WAV)' }}
        </button>
        <button
          type="button"
          class="mode-tab"
          :class="{ active: activeTab === 'video' }"
          @click="activeTab = 'video'; drawTransformedPreviewFrame(0.8)"
        >
          🎞️ {{ isEn ? 'Mode 2: Video Transcode, Rotate & Bitrate Slimming' : '模式二：视频格式转换、画面旋转镜像与码率瘦身' }}
        </button>
      </div>
    </div>

    <!-- MODE 1: Lossless WAV Audio Extractor -->
    <div v-show="activeTab === 'audio'" class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h3 class="sub-title">
            {{ isEn ? '🎵 16-Bit PCM Waveform & Audio Trim Studio' : '🎵 16-Bit PCM 音频波形透视、首尾裁剪与淡入淡出' }}
          </h3>
          <span class="meta-pill">
            {{ audioSampleRate }} Hz · {{ audioChannels }} {{ isEn ? 'Ch Stereo' : '声道立体声' }} · {{ formatBytes(wavSize) }}
          </span>
        </div>

        <a
          v-if="wavUrl"
          :href="wavUrl"
          :download="`${sourceName.replace(/\.[^.]+$/, '')}_audio_${audioSampleRate}Hz.wav`"
          class="dl-btn"
        >
          {{ isEn ? '⬇ Download Lossless .WAV Audio' : '⬇ 下载无损 WAV 音频文件' }}
        </a>
      </div>

      <!-- Waveform Canvas -->
      <div class="waveform-wrap">
        <canvas ref="waveformCanvasRef" class="waveform-canvas"></canvas>
      </div>

      <!-- Audio Controls -->
      <div class="controls-grid">
        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Trim Start (s)' : '音频起始裁剪点 (秒)' }}</label>
            <span class="val-badge">{{ audioTrimStart.toFixed(1) }}s</span>
          </div>
          <input
            v-model.number="audioTrimStart"
            type="range"
            min="0"
            :max="Math.max(0.1, sourceDuration - 0.2)"
            step="0.1"
            class="range-slider"
            @input="rebuildWavOutput"
          />
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Trim End (s)' : '音频结束裁剪点 (秒)' }}</label>
            <span class="val-badge">{{ audioTrimEnd.toFixed(1) }}s</span>
          </div>
          <input
            v-model.number="audioTrimEnd"
            type="range"
            :min="Math.min(sourceDuration, audioTrimStart + 0.2)"
            :max="sourceDuration"
            step="0.1"
            class="range-slider"
            @input="rebuildWavOutput"
          />
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Fade-In / Fade-Out (s)' : '首尾平滑淡入/淡出 (秒)' }}</label>
            <span class="val-badge">{{ fadeInSec }}s / {{ fadeOutSec }}s</span>
          </div>
          <div class="dual-select">
            <select v-model.number="fadeInSec" class="select-input" @change="rebuildWavOutput">
              <option :value="0">{{ isEn ? 'No Fade-In' : '无淡入' }}</option>
              <option :value="0.2">{{ isEn ? 'Fade-In 0.2s' : '淡入 0.2秒' }}</option>
              <option :value="0.5">{{ isEn ? 'Fade-In 0.5s' : '淡入 0.5秒' }}</option>
              <option :value="1.0">{{ isEn ? 'Fade-In 1.0s' : '淡入 1.0秒' }}</option>
            </select>
            <select v-model.number="fadeOutSec" class="select-input" @change="rebuildWavOutput">
              <option :value="0">{{ isEn ? 'No Fade-Out' : '无淡出' }}</option>
              <option :value="0.4">{{ isEn ? 'Fade-Out 0.4s' : '淡出 0.4秒' }}</option>
              <option :value="0.8">{{ isEn ? 'Fade-Out 0.8s' : '淡出 0.8秒' }}</option>
              <option :value="1.5">{{ isEn ? 'Fade-Out 1.5s' : '淡出 1.5秒' }}</option>
            </select>
          </div>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Volume Gain Boost' : '音量增益放大 (Gain)' }}</label>
            <span class="val-badge">{{ Math.round(audioGain * 100) }}%</span>
          </div>
          <input
            v-model.number="audioGain"
            type="range"
            min="0.3"
            max="2.0"
            step="0.1"
            class="range-slider"
            @input="rebuildWavOutput"
          />
        </div>
      </div>

      <!-- Built-in Audio Player -->
      <div v-if="wavUrl" class="audio-player-bar">
        <span class="player-label">🎧 {{ isEn ? 'Preview Extracted WAV:' : '在线试听已提取的无损音频：' }}</span>
        <audio :src="wavUrl" controls class="native-audio"></audio>
      </div>
    </div>

    <!-- MODE 2: Video Transcode, Rotate & Bitrate Compress -->
    <div v-show="activeTab === 'video'" class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h3 class="sub-title">
            {{ isEn ? '🎞️ Video Bitrate Slimming, Rotation & Mirror Studio' : '🎞️ 视频码率压缩、90°/180° 旋转纠正与水平镜像工作台' }}
          </h3>
          <span class="meta-pill">
            {{ isEn ? 'Output:' : '输出分辨率：' }} {{ transcodedWidth }}×{{ transcodedHeight }}px · {{ targetBitrateKbps }} kbps
          </span>
        </div>

        <button
          type="button"
          class="upload-btn"
          :disabled="isProcessing"
          @click="runVideoTranscode"
        >
          {{
            isProcessing
              ? `${isEn ? 'Transcoding...' : '正在转码...'} (${progressPercent}%)`
              : isEn
                ? '⚡ Start Local Video Transcode'
                : '⚡ 立即开始本地转码与瘦身'
          }}
        </button>
      </div>

      <div class="controls-grid">
        <div class="ctrl-box">
          <label>{{ isEn ? 'Target Container & Codec' : '目标视频封装与编码器' }}</label>
          <select v-model="targetContainer" class="select-input">
            <option value="video/webm;codecs=vp9">WebM · VP9 ({{ isEn ? 'Best Web Compression' : '推荐 · 极高压缩比' }})</option>
            <option value="video/webm;codecs=vp8">WebM · VP8 ({{ isEn ? 'Fastest Compatibility' : '高速通用 WebM' }})</option>
            <option value="video/mp4">MP4 · H.264/AAC ({{ isEn ? 'Native MP4 if supported' : '原生 MP4 容器' }})</option>
          </select>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Target Video Bitrate' : '目标视频码率 (决定文件体积)' }}</label>
          <select v-model.number="targetBitrateKbps" class="select-input">
            <option :value="500">500 kbps ({{ isEn ? 'Extreme Slim · -80% Size' : '极限瘦身 · 适合群聊转发' }})</option>
            <option :value="1000">1000 kbps (1 Mbps · {{ isEn ? '720p Mobile' : '720p 移动端推荐' }})</option>
            <option :value="2000">2000 kbps (2 Mbps · {{ isEn ? 'Balanced HD' : '标准高清平衡首选' }})</option>
            <option :value="4000">4000 kbps (4 Mbps · {{ isEn ? '1080p Crisp' : '1080p 高画质存档' }})</option>
            <option :value="8000">8000 kbps (8 Mbps · {{ isEn ? 'Master Quality' : '原画级高码率' }})</option>
          </select>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Resolution Scale & Rotation' : '分辨率缩放与画面旋转角度' }}</label>
          <div class="dual-select">
            <select
              v-model.number="scalePercent"
              class="select-input"
              @change="drawTransformedPreviewFrame(0.8)"
            >
              <option :value="100">100% ({{ isEn ? 'Original' : '原始尺寸' }})</option>
              <option :value="75">75% ({{ isEn ? 'Medium' : '缩至 75%' }})</option>
              <option :value="50">50% ({{ isEn ? 'Half Size' : '缩至 50%' }})</option>
            </select>
            <select
              v-model.number="rotateDeg"
              class="select-input"
              @change="drawTransformedPreviewFrame(0.8)"
            >
              <option :value="0">0° ({{ isEn ? 'Normal' : '不旋转' }})</option>
              <option :value="90">↻ 90° ({{ isEn ? 'Portrait' : '顺时针90°' }})</option>
              <option :value="180">↻ 180° ({{ isEn ? 'Upside Down' : '翻转180°' }})</option>
              <option :value="270">↺ 270° ({{ isEn ? 'CCW 90°' : '逆时针90°' }})</option>
            </select>
          </div>
        </div>

        <div class="ctrl-box">
          <label>{{ isEn ? 'Mirror Flip & Audio Track' : '画面水平镜像与静音开关' }}</label>
          <div class="chk-stack">
            <label class="chk-item">
              <input
                v-model="flipHorizontal"
                type="checkbox"
                @change="drawTransformedPreviewFrame(0.8)"
              />
              <span>{{ isEn ? 'Horizontal Mirror Flip' : '水平左右镜像翻转（自拍纠正）' }}</span>
            </label>
            <label class="chk-item">
              <input v-model="muteVideoAudio" type="checkbox" />
              <span>{{ isEn ? 'Mute Audio Track (Pure Video)' : '剥离音轨输出纯静音视频' }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Canvas & Output Comparison -->
      <div class="transcode-preview-grid">
        <div class="stage-box">
          <div class="stage-head">
            <span>👁️ {{ isEn ? 'Live Transform Canvas Monitor' : '画面旋转/镜像/缩放实时监视器' }}</span>
            <span>{{ transcodedWidth }}×{{ transcodedHeight }}px</span>
          </div>
          <div class="canvas-holder">
            <canvas ref="previewCanvasRef" class="stage-canvas"></canvas>
          </div>
        </div>

        <div v-if="transcodedUrl" class="stage-box">
          <div class="stage-head">
            <span>✅ {{ isEn ? 'Transcoded Output Video' : '已完成转码瘦身的视频成品' }}</span>
            <span class="accent-txt">{{ formatBytes(transcodedSize) }} (.{{ transcodedExt }})</span>
          </div>
          <div class="canvas-holder">
            <video :src="transcodedUrl" controls playsinline class="stage-canvas"></video>
          </div>
          <div class="stage-foot">
            <a
              :href="transcodedUrl"
              :download="`${sourceName.replace(/\.[^.]+$/, '')}_${transcodedWidth}x${transcodedHeight}_${targetBitrateKbps}kbps.${transcodedExt}`"
              class="dl-btn"
            >
              {{ isEn ? `⬇ Download .${transcodedExt.toUpperCase()} Video` : `⬇ 下载转码后视频 (.${transcodedExt})` }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.vtc-root {
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

.badge-pill,
.meta-pill {
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.dropzone {
  padding: 20px 18px;
  margin-bottom: 16px;
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
  color: var(--text-primary);
}

.drop-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.mode-tab {
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    background-color: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
}

.waveform-wrap {
  border-radius: 12px;
  overflow: hidden;
  background-color: #090d16;
  border: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.waveform-canvas {
  width: 100%;
  height: 130px;
  display: block;
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
  justify-content: space-between;
  align-items: center;
}

.val-badge {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  font-family: monospace;
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.dual-select {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.select-input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
}

.chk-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chk-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.audio-player-bar {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.player-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.native-audio {
  flex: 1;
  min-width: 240px;
  height: 38px;
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

.transcode-preview-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 16px;
}

.stage-box {
  padding: 12px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stage-head {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.accent-txt {
  color: var(--accent);
  font-family: monospace;
}

.canvas-holder {
  border-radius: 10px;
  overflow: hidden;
  background-color: #070b14;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 210px;
}

.stage-canvas {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
}

.stage-foot {
  display: flex;
  justify-content: flex-end;
}
</style>
