<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { encodeAudioBufferToWav } from '@/utils/gifCodec';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

const fileInputRef = ref<HTMLInputElement | null>(null);
const waveCanvasRef = ref<HTMLCanvasElement | null>(null);

const trackName = ref<string>('Yunsin_Cyberpunk_Synth_Demo.wav');
const sampleRate = ref<number>(44100);
const numChannels = ref<number>(2);
const durationSec = ref<number>(12);

const startSec = ref<number>(1.2);
const endSec = ref<number>(9.6);
const fadeInSec = ref<number>(1.0);
const fadeOutSec = ref<number>(1.5);
const gainPercent = ref<number>(100);
const playbackRate = ref<number>(1.0);

const isPlaying = ref<boolean>(false);
const playheadSec = ref<number>(1.2);
const draggingHandle = ref<'start' | 'end' | 'playhead' | null>(null);

const wavExportUrl = ref<string>('');
const wavExportSize = ref<number>(0);

let audioCtx: AudioContext | null = null;
let currentBuffer: AudioBuffer | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeGainNode: GainNode | null = null;
let playStartWallTime = 0;
let playStartOffsetSec = 0;
let rafId = 0;

// Downsampled waveform peaks for fast 60fps canvas rendering
let leftPeaks = new Float32Array(0);
let rightPeaks = new Float32Array(0);

const selectedDuration = computed(() => Math.max(0.1, endSec.value - startSec.value));

function formatTime(sec: number): string {
  const s = Math.max(0, sec);
  const mins = Math.floor(s / 60);
  const rem = s - mins * 60;
  return `${String(mins).padStart(2, '0')}:${rem.toFixed(2).padStart(5, '0')}`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getOrCreateAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/**
 * Generates a rich 12-second stereo warm synthwave arpeggio + bass chord progression
 * so users can immediately test waveform scrubbing, fade envelopes, gain, and WAV ringtone export.
 */
function generateDemoSynthTrack() {
  stopPlayback();
  const ctx = getOrCreateAudioContext();
  const sr = 44100;
  const dur = 12.0;
  const totalSamples = Math.floor(sr * dur);
  const buf = ctx.createBuffer(2, totalSamples, sr);

  const chL = buf.getChannelData(0);
  const chR = buf.getChannelData(1);

  // 4-bar chord progression (Am7 -> Fmaj7 -> Cmaj7 -> G6)
  const chords = [
    [220.0, 261.63, 329.63, 392.0], // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [196.0, 246.94, 293.66, 392.0], // G6
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sr;
    const barIdx = Math.min(3, Math.floor(t / 3.0));
    const chord = chords[barIdx];

    // Warm pad + arpeggiated pluck
    const step = Math.floor((t * 8) % 4);
    const arpFreq = chord[step] * 2;
    const noteLocalT = (t * 8) % 1;
    const pluckEnv = Math.exp(-noteLocalT * 4.5);

    const bass = Math.sin(2 * Math.PI * (chord[0] * 0.5) * t) * 0.32;
    const padL =
      (Math.sin(2 * Math.PI * chord[0] * t) +
        Math.sin(2 * Math.PI * chord[1] * 1.002 * t) +
        Math.sin(2 * Math.PI * chord[2] * t)) *
      0.14;
    const padR =
      (Math.sin(2 * Math.PI * chord[0] * 0.998 * t) +
        Math.sin(2 * Math.PI * chord[2] * t) +
        Math.sin(2 * Math.PI * chord[3] * 1.003 * t)) *
      0.14;

    const pluck =
      (Math.sin(2 * Math.PI * arpFreq * t) + 0.4 * Math.sin(2 * Math.PI * arpFreq * 2 * t)) *
      pluckEnv *
      0.26;

    // Gentle rhythmic pulse envelope
    const pulse = 0.78 + 0.22 * Math.sin(2 * Math.PI * 2 * t);

    chL[i] = Math.max(-0.98, Math.min(0.98, (bass + padL + pluck * 0.9) * pulse));
    chR[i] = Math.max(-0.98, Math.min(0.98, (bass + padR + pluck * 1.1) * pulse));
  }

  trackName.value = 'Yunsin_Synthwave_Ringtone_Demo.wav';
  loadAudioBuffer(buf);
}

function loadAudioBuffer(buf: AudioBuffer) {
  currentBuffer = buf;
  sampleRate.value = buf.sampleRate;
  numChannels.value = buf.numberOfChannels;
  durationSec.value = Number(buf.duration.toFixed(2));

  startSec.value = Number((buf.duration * 0.08).toFixed(2));
  endSec.value = Number((buf.duration * 0.85).toFixed(2));
  playheadSec.value = startSec.value;
  fadeInSec.value = Math.min(1.2, Number((selectedDuration.value * 0.15).toFixed(1)));
  fadeOutSec.value = Math.min(1.5, Number((selectedDuration.value * 0.18).toFixed(1)));

  computeWaveformPeaks(buf, 360);
  drawWaveform();
  rebuildWavExport();
}

function computeWaveformPeaks(buf: AudioBuffer, buckets = 360) {
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
  const step = Math.max(1, Math.floor(buf.length / buckets));

  leftPeaks = new Float32Array(buckets);
  rightPeaks = new Float32Array(buckets);

  for (let b = 0; b < buckets; b++) {
    const start = b * step;
    const end = Math.min(buf.length, start + step);
    let maxL = 0;
    let maxR = 0;
    for (let i = start; i < end; i += 2) {
      const al = Math.abs(ch0[i]);
      const ar = Math.abs(ch1[i]);
      if (al > maxL) maxL = al;
      if (ar > maxR) maxR = ar;
    }
    leftPeaks[b] = maxL;
    rightPeaks[b] = maxR;
  }
}

async function onFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  stopPlayback();

  try {
    const ctx = getOrCreateAudioContext();
    const arrayBuf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    trackName.value = file.name.replace(/\.[^.]+$/, '') + '_trimmed.wav';
    loadAudioBuffer(decoded);
  } catch (err) {
    console.error('Audio decode error:', err);
  } finally {
    input.value = '';
  }
}

function rebuildWavExport() {
  if (!currentBuffer) return;
  const blob = encodeAudioBufferToWav(currentBuffer, {
    startSec: startSec.value,
    endSec: endSec.value,
    fadeInSec: fadeInSec.value,
    fadeOutSec: fadeOutSec.value,
    gain: gainPercent.value / 100,
  });
  if (wavExportUrl.value) URL.revokeObjectURL(wavExportUrl.value);
  wavExportUrl.value = URL.createObjectURL(blob);
  wavExportSize.value = blob.size;
}

function drawWaveform() {
  const canvas = waveCanvasRef.value;
  if (!canvas || leftPeaks.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 860;
  const cssH = 230;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Dark studio background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, cssW, cssH);

  const dur = Math.max(0.01, durationSec.value);
  const startX = (startSec.value / dur) * cssW;
  const endX = (endSec.value / dur) * cssW;
  const playX = (playheadSec.value / dur) * cssW;

  // Highlight active trim region
  ctx.fillStyle = 'rgba(59, 130, 246, 0.14)';
  ctx.fillRect(startX, 0, Math.max(2, endX - startX), cssH);

  // Center zero-crossing line
  const midY = cssH / 2;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(cssW, midY);
  ctx.stroke();

  // Draw stereo bars
  const n = leftPeaks.length;
  const barW = cssW / n;
  const gainMul = gainPercent.value / 100;

  for (let i = 0; i < n; i++) {
    const x = i * barW;
    const tSec = (i / n) * dur;
    const inSelection = tSec >= startSec.value && tSec <= endSec.value;

    // Apply visual fade-in / fade-out envelope preview
    let env = gainMul;
    if (inSelection) {
      if (fadeInSec.value > 0 && tSec - startSec.value < fadeInSec.value) {
        env *= (tSec - startSec.value) / fadeInSec.value;
      }
      if (fadeOutSec.value > 0 && endSec.value - tSec < fadeOutSec.value) {
        env *= (endSec.value - tSec) / fadeOutSec.value;
      }
    }

    const hL = Math.min(midY - 12, leftPeaks[i] * env * (midY - 16));
    const hR = Math.min(midY - 12, rightPeaks[i] * env * (midY - 16));

    ctx.fillStyle = inSelection ? '#38BDF8' : 'rgba(100, 116, 139, 0.38)';
    ctx.fillRect(x + 0.5, midY - hL, Math.max(1.2, barW - 1.2), hL);

    ctx.fillStyle = inSelection ? '#818CF8' : 'rgba(100, 116, 139, 0.28)';
    ctx.fillRect(x + 0.5, midY + 1, Math.max(1.2, barW - 1.2), hR);
  }

  // Draw Fade-In / Fade-Out Envelope Curve Overlay
  const fadeInEndX = Math.min(endX, startX + (fadeInSec.value / dur) * cssW);
  const fadeOutStartX = Math.max(startX, endX - (fadeOutSec.value / dur) * cssW);
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(startX, cssH - 18);
  ctx.lineTo(fadeInEndX, 18);
  ctx.lineTo(fadeOutStartX, 18);
  ctx.lineTo(endX, cssH - 18);
  ctx.stroke();

  // Dim outside trim handles
  ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
  ctx.fillRect(0, 0, startX, cssH);
  ctx.fillRect(endX, 0, cssW - endX, cssH);

  // Start Handle
  ctx.fillStyle = '#10B981';
  ctx.fillRect(startX - 2, 0, 4, cssH);
  ctx.beginPath();
  ctx.roundRect(startX - 10, 8, 20, 28, 5);
  ctx.fill();

  // End Handle
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(endX - 2, 0, 4, cssH);
  ctx.beginPath();
  ctx.roundRect(endX - 10, cssH - 36, 20, 28, 5);
  ctx.fill();

  // Playhead Line
  ctx.strokeStyle = '#F43F5E';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(playX, 0);
  ctx.lineTo(playX, cssH);
  ctx.stroke();
}

function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  if (!currentBuffer) return;
  stopPlayback();

  const ctx = getOrCreateAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const source = ctx.createBufferSource();
  source.buffer = currentBuffer;
  source.playbackRate.value = playbackRate.value;

  const gainNode = ctx.createGain();
  const clipDur = Math.max(0.05, endSec.value - startSec.value);
  const now = ctx.currentTime;
  const peakGain = gainPercent.value / 100;

  gainNode.gain.setValueAtTime(0.001, now);
  if (fadeInSec.value > 0.02) {
    gainNode.gain.linearRampToValueAtTime(
      peakGain,
      now + Math.min(clipDur, fadeInSec.value) / playbackRate.value
    );
  } else {
    gainNode.gain.setValueAtTime(peakGain, now);
  }

  if (fadeOutSec.value > 0.02 && clipDur > fadeOutSec.value) {
    const fadeStart = now + (clipDur - fadeOutSec.value) / playbackRate.value;
    gainNode.gain.setValueAtTime(peakGain, fadeStart);
    gainNode.gain.linearRampToValueAtTime(0.001, now + clipDur / playbackRate.value);
  }

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(0, startSec.value, clipDur);
  activeSource = source;
  activeGainNode = gainNode;
  isPlaying.value = true;
  playStartWallTime = performance.now();
  playStartOffsetSec = startSec.value;

  source.onended = () => {
    isPlaying.value = false;
    playheadSec.value = startSec.value;
    cancelAnimationFrame(rafId);
    drawWaveform();
  };

  const tick = () => {
    if (!isPlaying.value) return;
    const elapsed = ((performance.now() - playStartWallTime) / 1000) * playbackRate.value;
    playheadSec.value = Math.min(endSec.value, playStartOffsetSec + elapsed);
    drawWaveform();
    if (playheadSec.value < endSec.value) {
      rafId = requestAnimationFrame(tick);
    }
  };
  rafId = requestAnimationFrame(tick);
}

function stopPlayback() {
  cancelAnimationFrame(rafId);
  if (activeSource) {
    try {
      activeSource.onended = null;
      activeSource.stop();
      activeSource.disconnect();
    } catch {}
    activeSource = null;
  }
  if (activeGainNode) {
    try {
      activeGainNode.disconnect();
    } catch {}
    activeGainNode = null;
  }
  isPlaying.value = false;
}

function onWavePointerDown(e: MouseEvent) {
  const canvas = waveCanvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, x / rect.width));
  const clickSec = ratio * durationSec.value;

  const startX = (startSec.value / durationSec.value) * rect.width;
  const endX = (endSec.value / durationSec.value) * rect.width;

  if (Math.abs(x - startX) <= 16) {
    draggingHandle.value = 'start';
  } else if (Math.abs(x - endX) <= 16) {
    draggingHandle.value = 'end';
  } else {
    draggingHandle.value = 'playhead';
    playheadSec.value = Number(clickSec.toFixed(2));
    drawWaveform();
  }
}

function onWavePointerMove(e: MouseEvent) {
  if (!draggingHandle.value || !waveCanvasRef.value) return;
  const rect = waveCanvasRef.value.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const sec = Number((ratio * durationSec.value).toFixed(2));

  if (draggingHandle.value === 'start') {
    startSec.value = Math.min(sec, Math.max(0, endSec.value - 0.2));
    playheadSec.value = startSec.value;
  } else if (draggingHandle.value === 'end') {
    endSec.value = Math.max(sec, Math.min(durationSec.value, startSec.value + 0.2));
  } else {
    playheadSec.value = sec;
  }
  drawWaveform();
}

function onWavePointerUp() {
  if (!draggingHandle.value) return;
  draggingHandle.value = null;
  rebuildWavExport();
}

watch([startSec, endSec, fadeInSec, fadeOutSec, gainPercent], () => {
  drawWaveform();
  rebuildWavExport();
});

onMounted(() => {
  generateDemoSynthTrack();
});

onUnmounted(() => {
  stopPlayback();
  if (wavExportUrl.value) URL.revokeObjectURL(wavExportUrl.value);
});
</script>

<template>
  <div class="audio-trimmer-tool">
    <!-- Top Bar & Waveform Studio -->
    <div class="tool-card">
      <div class="card-head">
        <div class="head-left">
          <h2 class="section-title">
            {{ isEn ? '1. Visual Waveform Cutter, Fade Envelope & Ringtone Maker' : '1. 可视化音频波形剪辑、首尾淡入淡出与无损铃声导出' }}
          </h2>
          <span class="privacy-pill">
            🎵 {{ isEn ? 'Web Audio API + 16-Bit PCM WAV · Zero Server Upload' : 'Web Audio 毫秒级帧精剪 · 零上传提取视频背景音乐' }}
          </span>
        </div>

        <div class="head-actions">
          <button type="button" class="demo-btn" @click="generateDemoSynthTrack">
            {{ isEn ? '🎹 Load Demo Synth Track' : '🎹 生成内置合成器演示曲' }}
          </button>
          <button type="button" class="upload-btn" @click="fileInputRef?.click()">
            {{ isEn ? '📂 Open Audio / Video File' : '📂 导入本地音频或 MP4 视频提取伴奏' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.flac,.aac"
            style="display: none"
            @change="onFileUpload"
          />
        </div>
      </div>

      <!-- Track Metadata Strip -->
      <div class="track-meta-bar">
        <span>📁 <strong>{{ trackName }}</strong></span>
        <span>·</span>
        <span>{{ sampleRate }} Hz · {{ numChannels === 2 ? (isEn ? 'Stereo' : '双声道立体声') : 'Mono' }}</span>
        <span>·</span>
        <span>
          {{ isEn ? 'Selected Clip:' : '当前截取区间：' }}
          <strong class="accent-num">{{ formatTime(startSec) }} → {{ formatTime(endSec) }} ({{ selectedDuration.toFixed(2) }}s)</strong>
        </span>
      </div>

      <!-- Interactive Stereo Waveform Canvas -->
      <div class="wave-stage">
        <canvas
          ref="waveCanvasRef"
          class="wave-canvas"
          @mousedown="onWavePointerDown"
          @mousemove="onWavePointerMove"
          @mouseup="onWavePointerUp"
          @mouseleave="onWavePointerUp"
        ></canvas>
        <div class="wave-legend">
          <span class="leg-item"><i class="dot green"></i> {{ isEn ? 'Drag Green Bar: Start Time' : '绿线手柄：拖拽起点' }}</span>
          <span class="leg-item"><i class="dot amber"></i> {{ isEn ? 'Drag Amber Bar: End Time' : '黄线手柄：拖拽终点' }}</span>
          <span class="leg-item"><i class="dot emerald-line"></i> {{ isEn ? 'Fade Envelope Curve' : '绿色折线：淡入淡出音量包络' }}</span>
        </div>
      </div>

      <!-- Playback & Export Transport Bar -->
      <div class="transport-bar">
        <button type="button" class="play-btn" @click="togglePlayback">
          {{ isPlaying ? (isEn ? '⏹ Stop Preview' : '⏹ 停止试听') : (isEn ? '▶ Preview Selected Clip' : '▶ 实时试听截取片段（含淡入淡出）') }}
        </button>

        <a
          v-if="wavExportUrl"
          :href="wavExportUrl"
          :download="trackName"
          class="export-wav-btn"
        >
          ⬇ {{ isEn ? `Export 16-Bit PCM WAV (${formatBytes(wavExportSize)})` : `一键导出 16-Bit 无损 WAV 音频 (${formatBytes(wavExportSize)})` }}
        </a>
      </div>

      <!-- Precision Controls Grid -->
      <div class="controls-grid">
        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Trim Start / End (sec)' : '起止时间微调 (秒)' }}</label>
            <span class="val-badge">{{ startSec.toFixed(1) }}s - {{ endSec.toFixed(1) }}s</span>
          </div>
          <div class="dual-sliders">
            <input
              v-model.number="startSec"
              type="range"
              min="0"
              :max="Math.max(0.1, endSec - 0.2)"
              step="0.1"
              class="range-slider"
            />
            <input
              v-model.number="endSec"
              type="range"
              :min="Math.min(durationSec, startSec + 0.2)"
              :max="durationSec"
              step="0.1"
              class="range-slider"
            />
          </div>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Fade-In / Fade-Out (0~5s)' : '首尾平滑淡入 / 淡出 (0~5秒)' }}</label>
            <span class="val-badge">{{ fadeInSec.toFixed(1) }}s / {{ fadeOutSec.toFixed(1) }}s</span>
          </div>
          <div class="dual-sliders">
            <input v-model.number="fadeInSec" type="range" min="0" max="5" step="0.1" class="range-slider" />
            <input v-model.number="fadeOutSec" type="range" min="0" max="5" step="0.1" class="range-slider" />
          </div>
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Volume Gain Boost' : '音量增益放大 (Gain)' }}</label>
            <span class="val-badge">{{ gainPercent }}%</span>
          </div>
          <input v-model.number="gainPercent" type="range" min="30" max="200" step="5" class="range-slider" />
        </div>

        <div class="ctrl-box">
          <div class="ctrl-top">
            <label>{{ isEn ? 'Preview Speed' : '试听倍速调节' }}</label>
            <span class="val-badge">{{ playbackRate.toFixed(2) }}x</span>
          </div>
          <input v-model.number="playbackRate" type="range" min="0.5" max="2.0" step="0.05" class="range-slider" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.audio-trimmer-tool {
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
  margin-bottom: 14px;
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
  border: 1px solid var(--accent);
  background-color: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.track-meta-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background-color: var(--bg-muted);
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.accent-num {
  color: var(--accent);
}

.wave-stage {
  margin-bottom: 16px;
}

.wave-canvas {
  width: 100%;
  height: 230px;
  display: block;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  cursor: ew-resize;
}

.wave-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.leg-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;

  &.green {
    background-color: #10b981;
  }
  &.amber {
    background-color: #f59e0b;
  }
  &.emerald-line {
    background-color: #34d399;
    height: 3px;
  }
}

.transport-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.play-btn {
  flex: 1 1 240px;
  padding: 11px 18px;
  border-radius: 10px;
  border: 1px solid var(--accent-border);
  background-color: var(--accent-soft);
  color: var(--accent);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.export-wav-btn {
  flex: 1 1 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px 18px;
  border-radius: 10px;
  background-color: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
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

.dual-sliders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}
</style>
