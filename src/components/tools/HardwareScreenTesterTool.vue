<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

type ActiveTab = 'screen' | 'hz' | 'mouse' | 'keyboard';
const activeTab = ref<ActiveTab>('screen');

// ==========================================
// Tab 1: Dead Pixel & Backlight Bleed Fullscreen Test
// ==========================================
interface ScreenPattern {
  id: string;
  nameZh: string;
  nameEn: string;
  tipZh: string;
  tipEn: string;
  cssBg: string;
  isGrid?: boolean;
}

const patterns: ScreenPattern[] = [
  {
    id: 'black',
    nameZh: '纯黑 (查亮点与边缘漏光)',
    nameEn: 'Pure Black (Stuck Subpixels & Backlight Bleed)',
    tipZh: '在暗室观察屏幕四角边缘是否泛黄/发白漏光，以及画面中是否有常亮红/绿/蓝/白点',
    tipEn: 'Check corners for IPS glow / backlight bleed and look for bright stuck subpixels',
    cssBg: '#000000',
  },
  {
    id: 'white',
    nameZh: '纯白 (查暗点/坏点与阴阳屏)',
    nameEn: 'Pure White (Dead Pixels & Color Uniformity)',
    tipZh: '检查是否有永远不发光的黑点（死点）、灰斑，以及屏幕左右冷暖色温是否一致',
    tipEn: 'Inspect for dark dead pixels, dust spots, and left-to-right color temperature tint',
    cssBg: '#ffffff',
  },
  {
    id: 'red',
    nameZh: '纯红 (检测红色子像素)',
    nameEn: 'Pure Red (Red Subpixel Channel)',
    tipZh: '若有黑点说明该位置的红色子像素损坏；若有其他颜色杂点说明子像素串扰',
    tipEn: 'Dark dots indicate dead red subpixels',
    cssBg: '#ff0000',
  },
  {
    id: 'green',
    nameZh: '纯绿 (检测绿色子像素)',
    nameEn: 'Pure Green (Green Subpixel Channel)',
    tipZh: '人眼对绿色最敏感，仔细扫视是否有黑点或常亮暗点',
    tipEn: 'Human eyes are most sensitive to green—scan carefully for dead subpixels',
    cssBg: '#00ff00',
  },
  {
    id: 'blue',
    nameZh: '纯蓝 (检测蓝色子像素)',
    nameEn: 'Pure Blue (Blue Subpixel Channel)',
    tipZh: '检查蓝色通道是否均匀、有无不亮黑点',
    tipEn: 'Inspect blue subpixel uniformity across the panel',
    cssBg: '#0000ff',
  },
  {
    id: 'cyan',
    nameZh: '青色 (绿+蓝通道混合)',
    nameEn: 'Cyan (Green + Blue Channels)',
    tipZh: '检测绿蓝双子像素协同发光均匀度',
    tipEn: 'Tests Green + Blue combined subpixel response',
    cssBg: '#00ffff',
  },
  {
    id: 'magenta',
    nameZh: '品红 (红+蓝通道混合)',
    nameEn: 'Magenta (Red + Blue Channels)',
    tipZh: '检测红蓝双子像素协同发光均匀度',
    tipEn: 'Tests Red + Blue combined subpixel response',
    cssBg: '#ff00ff',
  },
  {
    id: 'yellow',
    nameZh: '纯黄 (红+绿通道混合)',
    nameEn: 'Yellow (Red + Green Channels)',
    tipZh: '检测红绿双子像素协同发光与色偏',
    tipEn: 'Tests Red + Green combined subpixel response',
    cssBg: '#ffff00',
  },
  {
    id: 'gradient',
    nameZh: '256级灰阶渐变 (测色彩断层)',
    nameEn: '256-Step Grayscale Gradient (Color Banding)',
    tipZh: '优质 8-bit/10-bit 面板过渡丝滑自然；劣质面板会出现明显竖条纹色彩断层',
    tipEn: 'Smooth transition indicates true 8-bit/10-bit panel without severe banding',
    cssBg: 'linear-gradient(90deg, #000000 0%, #ffffff 100%)',
  },
  {
    id: 'grid',
    nameZh: '几何网格与文字锐度',
    nameEn: 'Alignment Grid & Sharpness Pattern',
    tipZh: '检查显示器几何畸变、像素排列清晰度与边缘聚焦',
    tipEn: 'Verify geometric alignment, scaling sharpness, and subpixel text clarity',
    cssBg: '#0f172a',
    isGrid: true,
  },
];

const currentPatternIdx = ref(0);
const isFullscreenOpen = ref(false);
const showFullscreenHud = ref(true);
const fullscreenBoxRef = ref<HTMLElement | null>(null);
let hudTimer: ReturnType<typeof setTimeout> | null = null;

const activePattern = computed(() => patterns[currentPatternIdx.value] || patterns[0]);

function selectPattern(idx: number) {
  currentPatternIdx.value = (idx + patterns.length) % patterns.length;
  triggerHud();
}

function nextPattern() {
  selectPattern(currentPatternIdx.value + 1);
}

function prevPattern() {
  selectPattern(currentPatternIdx.value - 1);
}

function triggerHud() {
  showFullscreenHud.value = true;
  if (hudTimer) clearTimeout(hudTimer);
  hudTimer = setTimeout(() => {
    showFullscreenHud.value = false;
  }, 2400);
}

async function enterFullscreenTest(startIdx?: number) {
  if (typeof startIdx === 'number') {
    currentPatternIdx.value = startIdx;
  }
  isFullscreenOpen.value = true;
  triggerHud();
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {
    // Fallback to fixed viewport overlay if browser blocks fullscreen
  }
}

async function exitFullscreenTest() {
  isFullscreenOpen.value = false;
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      // ignore
    }
  }
}

// ==========================================
// Tab 2: Real-Time Display Refresh Rate (Hz) & Motion Track
// ==========================================
const measuredFps = ref(60);
const estimatedStandardHz = ref(60);
const avgFrameMs = ref(16.67);
const frameJitterMs = ref(0.2);
const droppedFramesCount = ref(0);
const motionCanvasRef = ref<HTMLCanvasElement | null>(null);

let rafId: number | null = null;
let frameDeltas: number[] = [];
let lastFrameTime = 0;

function snapStandardHz(fps: number): number {
  const tiers = [60, 75, 90, 100, 120, 144, 165, 180, 240, 360];
  let closest = 60;
  let minDiff = Infinity;
  for (const t of tiers) {
    const diff = Math.abs(fps - t);
    if (diff < minDiff) {
      minDiff = diff;
      closest = t;
    }
  }
  return minDiff <= 8 ? closest : Math.round(fps);
}

function renderMotionComparison(now: number) {
  const canvas = motionCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Vertical reference lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 60; x < w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const speedPxPerSec = 420;
  const lanes = [
    {
      label: isEn.value
        ? `Native Full Rate (${measuredFps.value} FPS)`
        : `当前屏幕满帧 (${measuredFps.value} FPS)`,
      fpsLimit: 0,
      color: '#10b981',
      y: 38,
    },
    {
      label: '30 FPS (Half Rate)',
      fpsLimit: 30,
      color: '#f59e0b',
      y: 102,
    },
    {
      label: '15 FPS (Low Stutter)',
      fpsLimit: 15,
      color: '#ef4444',
      y: 166,
    },
  ];

  for (const lane of lanes) {
    // Lane divider
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(lane.label, 14, lane.y - 14);

    let effectiveTimeSec = now / 1000;
    if (lane.fpsLimit > 0) {
      const stepSec = 1 / lane.fpsLimit;
      effectiveTimeSec = Math.floor(effectiveTimeSec / stepSec) * stepSec;
    }
    const xPos = ((effectiveTimeSec * speedPxPerSec) % (w - 80)) + 20;

    // Draw moving UFO pill capsule
    ctx.fillStyle = lane.color;
    ctx.beginPath();
    ctx.roundRect(xPos, lane.y - 8, 56, 26, 13);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('UFO', xPos + 16, lane.y + 9);
  }
}

function startHzLoop() {
  stopHzLoop();
  frameDeltas = [];
  lastFrameTime = performance.now();

  const tick = (now: number) => {
    const dt = now - lastFrameTime;
    lastFrameTime = now;

    if (dt > 0 && dt < 250) {
      frameDeltas.push(dt);
      if (frameDeltas.length > 90) frameDeltas.shift();

      if (frameDeltas.length >= 10) {
        const sum = frameDeltas.reduce((a, b) => a + b, 0);
        const mean = sum / frameDeltas.length;
        const fps = 1000 / mean;
        measuredFps.value = Math.round(fps);
        estimatedStandardHz.value = snapStandardHz(fps);
        avgFrameMs.value = Number(mean.toFixed(2));

        const variance =
          frameDeltas.reduce((acc, v) => acc + Math.abs(v - mean), 0) / frameDeltas.length;
        frameJitterMs.value = Number(variance.toFixed(2));

        if (dt > mean * 1.85) {
          droppedFramesCount.value += 1;
        }
      }
    }

    if (activeTab.value === 'hz') {
      renderMotionComparison(now);
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

function stopHzLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ==========================================
// Tab 3: Mouse Switch Double-Click Fault Detector
// ==========================================
interface MouseButtonStats {
  totalClicks: number;
  faultDoubleClicks: number;
  lastTimestamp: number;
  minIntervalMs: number | null;
  lastIntervalMs: number | null;
}

interface ClickLogItem {
  id: number;
  buttonName: string;
  intervalMs: number | null;
  isFault: boolean;
  timeStr: string;
}

const faultThresholdMs = ref(80);
const mouseStats = ref<Record<number, MouseButtonStats>>({
  0: { totalClicks: 0, faultDoubleClicks: 0, lastTimestamp: 0, minIntervalMs: null, lastIntervalMs: null },
  1: { totalClicks: 0, faultDoubleClicks: 0, lastTimestamp: 0, minIntervalMs: null, lastIntervalMs: null },
  2: { totalClicks: 0, faultDoubleClicks: 0, lastTimestamp: 0, minIntervalMs: null, lastIntervalMs: null },
});
const clickLogs = ref<ClickLogItem[]>([]);
let clickSeq = 0;

function onMouseTargetDown(e: MouseEvent) {
  e.preventDefault();
  const btn = e.button; // 0: Left, 1: Middle, 2: Right
  if (!(btn in mouseStats.value)) return;

  const now = performance.now();
  const stat = mouseStats.value[btn];
  stat.totalClicks += 1;

  let interval: number | null = null;
  let isFault = false;

  if (stat.lastTimestamp > 0) {
    interval = Math.round(now - stat.lastTimestamp);
    stat.lastIntervalMs = interval;
    if (stat.minIntervalMs === null || interval < stat.minIntervalMs) {
      stat.minIntervalMs = interval;
    }
    if (interval < faultThresholdMs.value) {
      stat.faultDoubleClicks += 1;
      isFault = true;
    }
  }
  stat.lastTimestamp = now;

  const btnLabel =
    btn === 0
      ? isEn.value
        ? 'Left Button'
        : '左键 (Left)'
      : btn === 1
        ? isEn.value
          ? 'Middle Wheel'
          : '中键滚轮 (Middle)'
        : isEn.value
          ? 'Right Button'
          : '右键 (Right)';

  clickSeq += 1;
  clickLogs.value.unshift({
    id: clickSeq,
    buttonName: btnLabel,
    intervalMs: interval,
    isFault,
    timeStr: new Date().toLocaleTimeString(),
  });
  if (clickLogs.value.length > 16) {
    clickLogs.value.pop();
  }
}

function resetMouseTest() {
  mouseStats.value = {
    0: { totalClicks: 0, faultDoubleClicks: 0, lastTimestamp: 0, minIntervalMs: null, lastIntervalMs: null },
    1: { totalClicks: 0, faultDoubleClicks: 0, lastTimestamp: 0, minIntervalMs: null, lastIntervalMs: null },
    2: { totalClicks: 0, faultDoubleClicks: 0, lastTimestamp: 0, minIntervalMs: null, lastIntervalMs: null },
  };
  clickLogs.value = [];
}

const totalFaultCount = computed(
  () =>
    mouseStats.value[0].faultDoubleClicks +
    mouseStats.value[1].faultDoubleClicks +
    mouseStats.value[2].faultDoubleClicks
);

// ==========================================
// Tab 4: Keyboard Rollover (NKRO) & Key Tester
// ==========================================
const currentlyPressedCodes = ref<Set<string>>(new Set());
const testedCodes = ref<Set<string>>(new Set());
const maxSimultaneousKeys = ref(0);
const lastKeyInfo = ref<{ code: string; key: string } | null>(null);
const keyHistory = ref<string[]>([]);

const keyRows = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'ControlRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'],
];

function formatKeyLabel(code: string): string {
  return code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace('Backquote', '`')
    .replace('Minus', '-')
    .replace('Equal', '=')
    .replace('BracketLeft', '[')
    .replace('BracketRight', ']')
    .replace('Backslash', '\\')
    .replace('Semicolon', ';')
    .replace('Quote', "'")
    .replace('Comma', ',')
    .replace('Period', '.')
    .replace('Slash', '/')
    .replace('ControlLeft', 'Ctrl')
    .replace('ControlRight', 'Ctrl')
    .replace('ShiftLeft', 'Shift')
    .replace('ShiftRight', 'Shift')
    .replace('AltLeft', 'Alt')
    .replace('AltRight', 'Alt')
    .replace('MetaLeft', 'Win/Cmd')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓');
}

function resetKeyboardTest() {
  currentlyPressedCodes.value = new Set();
  testedCodes.value = new Set();
  maxSimultaneousKeys.value = 0;
  lastKeyInfo.value = null;
  keyHistory.value = [];
}

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (isFullscreenOpen.value) {
    if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      e.preventDefault();
      nextPattern();
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      e.preventDefault();
      prevPattern();
    } else if (e.code === 'Escape') {
      exitFullscreenTest();
    }
    return;
  }

  if (activeTab.value === 'keyboard') {
    e.preventDefault();
    const nextPressed = new Set(currentlyPressedCodes.value);
    nextPressed.add(e.code);
    currentlyPressedCodes.value = nextPressed;

    const nextTested = new Set(testedCodes.value);
    nextTested.add(e.code);
    testedCodes.value = nextTested;

    if (nextPressed.size > maxSimultaneousKeys.value) {
      maxSimultaneousKeys.value = nextPressed.size;
    }
    lastKeyInfo.value = { code: e.code, key: e.key === ' ' ? 'Space' : e.key };
    if (!e.repeat) {
      keyHistory.value.unshift(formatKeyLabel(e.code));
      if (keyHistory.value.length > 18) keyHistory.value.pop();
    }
  }
}

function handleGlobalKeyUp(e: KeyboardEvent) {
  if (activeTab.value === 'keyboard') {
    const nextPressed = new Set(currentlyPressedCodes.value);
    nextPressed.delete(e.code);
    currentlyPressedCodes.value = nextPressed;
  }
}

function handleFullscreenChange() {
  if (!document.fullscreenElement && isFullscreenOpen.value) {
    isFullscreenOpen.value = false;
  }
}

watch(activeTab, (tab) => {
  if (tab === 'hz') {
    startHzLoop();
  }
});

onMounted(() => {
  startHzLoop();
  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('keyup', handleGlobalKeyUp);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  stopHzLoop();
  if (hudTimer) clearTimeout(hudTimer);
  window.removeEventListener('keydown', handleGlobalKeyDown);
  window.removeEventListener('keyup', handleGlobalKeyUp);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<template>
  <div class="hw-tool-root">
    <!-- Top 4-in-1 Diagnostic Navigation Bar -->
    <div class="tool-card">
      <div class="diag-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="diag-tab"
          :class="{ active: activeTab === 'screen' }"
          @click="activeTab = 'screen'"
        >
          🖥️ {{ isEn ? '1. Dead Pixel & Bleed Test' : '1. 屏幕坏点/漏光全屏检测' }}
        </button>
        <button
          type="button"
          role="tab"
          class="diag-tab"
          :class="{ active: activeTab === 'hz' }"
          @click="activeTab = 'hz'"
        >
          ⚡ {{ isEn ? '2. Live Refresh Rate (Hz) & UFO' : '2. 真实刷新率 (Hz) 与掉帧测试' }}
        </button>
        <button
          type="button"
          role="tab"
          class="diag-tab"
          :class="{ active: activeTab === 'mouse' }"
          @click="activeTab = 'mouse'"
        >
          🖱️ {{ isEn ? '3. Mouse Double-Click Detector' : '3. 鼠标微动双击故障检测' }}
        </button>
        <button
          type="button"
          role="tab"
          class="diag-tab"
          :class="{ active: activeTab === 'keyboard' }"
          @click="activeTab = 'keyboard'"
        >
          ⌨️ {{ isEn ? '4. Keyboard NKRO & Key Test' : '4. 键盘按键与全键无冲测试' }}
        </button>
      </div>

      <!-- TAB 1: Dead Pixel & Backlight Bleed -->
      <div v-if="activeTab === 'screen'" class="tab-panel">
        <div class="panel-top-row">
          <div>
            <h3 class="section-title">
              {{
                isEn
                  ? '10-Step Fullscreen Monitor Dead Pixel, Stuck Subpixel & Backlight Bleed Inspector'
                  : '10 种标准纯色/灰阶/网格全屏验机图案（点击任意色块立即进入全屏检测）'
              }}
            </h3>
            <p class="section-sub">
              {{
                isEn
                  ? 'In fullscreen mode: Left-click or press Space / Arrow keys to cycle colors, press ESC to exit.'
                  : '进入全屏后：点击鼠标左键或按【空格键 / 方向键】切换下一张测试图，按【ESC】键退出全屏。'
              }}
            </p>
          </div>

          <button type="button" class="primary-action-btn" @click="enterFullscreenTest()">
            ⛶ {{ isEn ? 'Launch Fullscreen Test Now' : '立即进入全屏验机模式' }}
          </button>
        </div>

        <div class="pattern-grid">
          <button
            v-for="(pat, idx) in patterns"
            :key="pat.id"
            type="button"
            class="pattern-card"
            :class="{ active: currentPatternIdx === idx }"
            @click="enterFullscreenTest(idx)"
          >
            <span
              class="swatch-box"
              :class="{ 'is-grid': pat.isGrid }"
              :style="{ background: pat.cssBg }"
            ></span>
            <span class="pat-name">{{ isEn ? pat.nameEn : pat.nameZh }}</span>
          </button>
        </div>

        <!-- Inline Preview Stage -->
        <div
          class="inline-screen-stage"
          :class="{ 'is-grid': activePattern.isGrid }"
          :style="{ background: activePattern.cssBg }"
          @click="nextPattern"
        >
          <div class="stage-overlay-card">
            <span class="stage-badge">
              {{ currentPatternIdx + 1 }} / {{ patterns.length }} ·
              {{ isEn ? activePattern.nameEn : activePattern.nameZh }}
            </span>
            <p class="stage-tip">{{ isEn ? activePattern.tipEn : activePattern.tipZh }}</p>
            <div class="stage-btns" @click.stop>
              <button type="button" class="mini-btn" @click="prevPattern">
                ← {{ isEn ? 'Prev' : '上一色' }}
              </button>
              <button type="button" class="mini-btn accent" @click="enterFullscreenTest()">
                ⛶ {{ isEn ? 'Fullscreen' : '全屏放大检视' }}
              </button>
              <button type="button" class="mini-btn" @click="nextPattern">
                {{ isEn ? 'Next' : '下一色' }} →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: Display Refresh Rate (Hz) & Motion Track -->
      <div v-else-if="activeTab === 'hz'" class="tab-panel">
        <div class="hz-metrics-grid">
          <div class="metric-card highlight">
            <span class="m-label">{{ isEn ? 'Measured Real-Time FPS' : '实时实测帧率 (FPS)' }}</span>
            <span class="m-val">{{ measuredFps }} <small>Hz / FPS</small></span>
            <span class="m-sub">
              {{ isEn ? 'Detected Tier:' : '匹配标准刷新率档位：' }}
              <strong>{{ estimatedStandardHz }} Hz</strong>
            </span>
          </div>

          <div class="metric-card">
            <span class="m-label">{{ isEn ? 'Average Frame Interval' : '平均帧间隔耗时' }}</span>
            <span class="m-val">{{ avgFrameMs }} <small>ms</small></span>
            <span class="m-sub">
              {{ isEn ? '60Hz = 16.67ms · 120Hz = 8.33ms' : '60Hz 约 16.7ms · 144Hz 约 6.9ms' }}
            </span>
          </div>

          <div class="metric-card">
            <span class="m-label">{{ isEn ? 'Frame Time Variance (Jitter)' : '帧率抖动偏差 (Jitter)' }}</span>
            <span class="m-val">{{ frameJitterMs }} <small>ms</small></span>
            <span class="m-sub">
              {{
                frameJitterMs < 1.2
                  ? isEn
                    ? '✓ Ultra-stable VSync timing'
                    : '✓ 垂直同步极度稳定'
                  : isEn
                    ? '⚠ Background tab/GPU load detected'
                    : '⚠ 存在轻微后台负载波动'
              }}
            </span>
          </div>

          <div class="metric-card">
            <span class="m-label">{{ isEn ? 'Stutter / Dropped Frames' : '累计掉帧/卡顿次数' }}</span>
            <span class="m-val">{{ droppedFramesCount }}</span>
            <span class="m-sub">
              <button type="button" class="text-reset-btn" @click="droppedFramesCount = 0">
                {{ isEn ? 'Reset Counter' : '清零计数' }}
              </button>
            </span>
          </div>
        </div>

        <div class="ufo-stage-wrap">
          <div class="ufo-header">
            <strong>
              🛸
              {{
                isEn
                  ? 'Multi-Framerate Motion Clarity Track (Native Hz vs 30 FPS vs 15 FPS)'
                  : '多帧率动态顺滑度与拖影对比跑道（满帧 vs 30FPS vs 15FPS）'
              }}
            </strong>
            <span>
              {{
                isEn
                  ? 'Tip: Enable 120Hz/144Hz/240Hz in OS Display Settings if stuck at 60Hz'
                  : '提示：若高刷屏仅显示 60Hz，请前往系统“高级显示器设置”开启 120Hz/144Hz'
              }}
            </span>
          </div>
          <canvas ref="motionCanvasRef" width="760" height="205" class="motion-canvas"></canvas>
        </div>
      </div>

      <!-- TAB 3: Mouse Switch Double-Click Fault Detector -->
      <div v-else-if="activeTab === 'mouse'" class="tab-panel">
        <div class="panel-top-row">
          <div>
            <h3 class="section-title">
              {{
                isEn
                  ? 'Mouse Micro-Switch Bounce & Accidental Double-Click Detector'
                  : '鼠标微动老化连击 / 误双击毫秒级捕捉器'
              }}
            </h3>
            <p class="section-sub">
              {{
                isEn
                  ? 'Click normally at a steady pace inside the test pad below. Any two clicks faster than the bounce threshold (<80ms) trigger a hardware fault alert.'
                  : '请在下方感应区内以正常速度单次点击左键、中键或右键。若微动簧片氧化产生 <80ms 的机械回弹连击，系统将立即标红报警！'
              }}
            </p>
          </div>

          <div class="mouse-top-ctrls">
            <label class="thresh-label">
              {{ isEn ? 'Fault Threshold:' : '连击故障判定阈值：' }}
              <input v-model.number="faultThresholdMs" type="number" min="30" max="150" class="num-mini" />
              ms
            </label>
            <button type="button" class="clear-btn" @click="resetMouseTest">
              {{ isEn ? 'Reset Stats' : '重置测试数据' }}
            </button>
          </div>
        </div>

        <!-- Interactive Click Pad -->
        <div
          class="mouse-click-pad"
          :class="{ 'has-fault': totalFaultCount > 0 }"
          @mousedown="onMouseTargetDown"
          @contextmenu.prevent
        >
          <div class="pad-icon">{{ totalFaultCount > 0 ? '⚠️' : '🖱️' }}</div>
          <div class="pad-title">
            {{
              isEn
                ? 'Click Left, Middle, or Right Mouse Button Here (Single Clicks)'
                : '在此区域内单次点击【鼠标左键 / 滚轮中键 / 右键】进行微动寿命测试'
            }}
          </div>
          <div class="pad-status" :class="{ fault: totalFaultCount > 0 }">
            {{
              totalFaultCount > 0
                ? isEn
                  ? `⚠️ Detected ${totalFaultCount} abnormal fast double-click bounce(s) (<${faultThresholdMs}ms)!`
                  : `⚠️ 警报：已捕捉到 ${totalFaultCount} 次微动异常连击故障（间隔 <${faultThresholdMs}ms）！`
                : isEn
                  ? '✓ Switch status normal — 0 abnormal double-click bounces detected'
                  : '✓ 当前微动状态正常 — 暂未检测到异常机械连击'
            }}
          </div>
        </div>

        <!-- 3 Mouse Buttons Breakdown -->
        <div class="mouse-btn-grid">
          <div
            v-for="(btnKey, idx) in [0, 1, 2]"
            :key="btnKey"
            class="mouse-btn-card"
            :class="{ fault: mouseStats[btnKey].faultDoubleClicks > 0 }"
          >
            <div class="mb-head">
              <strong>
                {{
                  idx === 0
                    ? isEn
                      ? 'Left Button'
                      : '鼠标左键 (Left)'
                    : idx === 1
                      ? isEn
                        ? 'Middle Wheel'
                        : '滚轮中键 (Middle)'
                      : isEn
                        ? 'Right Button'
                        : '鼠标右键 (Right)'
                }}
              </strong>
              <span class="fault-pill" :class="{ bad: mouseStats[btnKey].faultDoubleClicks > 0 }">
                {{
                  isEn
                    ? `Faults: ${mouseStats[btnKey].faultDoubleClicks}`
                    : `异常连击: ${mouseStats[btnKey].faultDoubleClicks}`
                }}
              </span>
            </div>
            <div class="mb-metrics">
              <span>
                {{ isEn ? 'Clicks:' : '总点击：' }}
                <strong>{{ mouseStats[btnKey].totalClicks }}</strong>
              </span>
              <span>
                {{ isEn ? 'Last Interval:' : '上次间隔：' }}
                <strong>{{
                  mouseStats[btnKey].lastIntervalMs !== null
                    ? `${mouseStats[btnKey].lastIntervalMs} ms`
                    : '—'
                }}</strong>
              </span>
              <span>
                {{ isEn ? 'Shortest:' : '最短间隔：' }}
                <strong>{{
                  mouseStats[btnKey].minIntervalMs !== null
                    ? `${mouseStats[btnKey].minIntervalMs} ms`
                    : '—'
                }}</strong>
              </span>
            </div>
          </div>
        </div>

        <!-- Event Log -->
        <div v-if="clickLogs.length > 0" class="click-log-box">
          <div v-for="log in clickLogs" :key="log.id" class="log-row" :class="{ fault: log.isFault }">
            <span class="log-btn">{{ log.buttonName }}</span>
            <span class="log-delta">
              {{
                log.intervalMs !== null
                  ? isEn
                    ? `Interval: ${log.intervalMs} ms`
                    : `距上次点击间隔：${log.intervalMs} ms`
                  : isEn
                    ? 'First Click'
                    : '首次点击'
              }}
            </span>
            <span class="log-tag">
              {{
                log.isFault
                  ? isEn
                    ? '⚠️ SWITCH BOUNCE FAULT'
                    : '⚠️ 疑似微动连击故障'
                  : '✓ OK'
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- TAB 4: Keyboard NKRO & Key Tester -->
      <div v-else class="tab-panel">
        <div class="panel-top-row">
          <div class="kb-metrics">
            <span class="kb-stat-pill">
              {{ isEn ? 'Currently Pressed:' : '当前同时按下：' }}
              <strong>{{ currentlyPressedCodes.size }}</strong>
            </span>
            <span class="kb-stat-pill accent">
              {{ isEn ? 'Peak Rollover (NKRO):' : '最高无冲并发数 (NKRO)：' }}
              <strong>{{ maxSimultaneousKeys }} {{ isEn ? 'Keys' : '键' }}</strong>
            </span>
            <span class="kb-stat-pill">
              {{ isEn ? 'Tested Keys:' : '已点亮按键数：' }}
              <strong>{{ testedCodes.size }}</strong>
            </span>
            <span v-if="lastKeyInfo" class="kb-stat-pill">
              Code: <code>{{ lastKeyInfo.code }}</code>
            </span>
          </div>

          <button type="button" class="clear-btn" @click="resetKeyboardTest">
            {{ isEn ? 'Clear Key Matrix' : '重置键盘状态' }}
          </button>
        </div>

        <div class="keyboard-chassis">
          <div v-for="(row, rIdx) in keyRows" :key="rIdx" class="kb-row">
            <div
              v-for="code in row"
              :key="code"
              class="key-cap"
              :class="{
                pressed: currentlyPressedCodes.has(code),
                tested: testedCodes.has(code),
                wide: ['Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight'].includes(code),
                space: code === 'Space',
              }"
            >
              {{ formatKeyLabel(code) }}
            </div>
          </div>
        </div>

        <div v-if="keyHistory.length > 0" class="key-history-bar">
          <span class="kh-label">{{ isEn ? 'Recent Keys:' : '最近触发按键流：' }}</span>
          <span v-for="(k, i) in keyHistory" :key="i" class="kh-badge">{{ k }}</span>
        </div>
      </div>
    </div>

    <!-- Fullscreen Viewport Overlay for Tab 1 -->
    <div
      v-if="isFullscreenOpen"
      ref="fullscreenBoxRef"
      class="fullscreen-test-layer"
      :class="{ 'is-grid': activePattern.isGrid }"
      :style="{ background: activePattern.cssBg }"
      @click="nextPattern"
      @mousemove="triggerHud"
    >
      <div v-if="showFullscreenHud" class="fs-hud" @click.stop>
        <div class="fs-title">
          {{ currentPatternIdx + 1 }}/{{ patterns.length }} ·
          {{ isEn ? activePattern.nameEn : activePattern.nameZh }}
        </div>
        <div class="fs-desc">{{ isEn ? activePattern.tipEn : activePattern.tipZh }}</div>
        <div class="fs-actions">
          <button type="button" @click="prevPattern">← {{ isEn ? 'Prev' : '上一项' }}</button>
          <button type="button" @click="nextPattern">{{ isEn ? 'Next (Click / Space)' : '下一项 (点击或按空格)' }} →</button>
          <button type="button" class="danger" @click="exitFullscreenTest">
            ✕ {{ isEn ? 'Exit (ESC)' : '退出全屏 (ESC)' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.hw-tool-root {
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

.diag-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 20px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

.diag-tab {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;

  &.active {
    background-color: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
}

.panel-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.section-sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.primary-action-btn {
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background-color: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.pattern-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 16px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.pattern-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  &.active {
    border-color: var(--accent);
    background-color: var(--accent-soft);
    color: var(--accent);
  }
}

.swatch-box {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  flex-shrink: 0;

  &.is-grid {
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.35) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 1px, transparent 1px) !important;
    background-size: 8px 8px !important;
  }
}

.inline-screen-stage {
  height: 230px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &.is-grid {
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.25) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 1px, transparent 1px) !important;
    background-size: 32px 32px !important;
  }
}

.stage-overlay-card {
  padding: 14px 20px;
  border-radius: 12px;
  background-color: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(8px);
  color: #f8fafc;
  text-align: center;
  max-width: 90%;
}

.stage-badge {
  font-size: 13px;
  font-weight: 800;
  color: #38bdf8;
}

.stage-tip {
  margin: 6px 0 12px;
  font-size: 12px;
  color: #cbd5e1;
}

.stage-btns {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.mini-btn {
  padding: 5px 12px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.accent {
    background-color: var(--accent);
    border-color: var(--accent);
  }
}

.hz-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
}

.metric-card {
  padding: 14px 16px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.highlight {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
  }
}

.m-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.m-val {
  font-size: 26px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);

  small {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
  }
}

.m-sub {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.text-reset-btn {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 11.5px;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
}

.ufo-stage-wrap {
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  background-color: #0f172a;
}

.ufo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  background-color: var(--bg-muted);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);

  strong {
    color: var(--text-primary);
  }
}

.motion-canvas {
  width: 100%;
  height: 205px;
  display: block;
}

.mouse-top-ctrls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thresh-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.num-mini {
  width: 62px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}

.clear-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mouse-click-pad {
  padding: 36px 20px;
  border-radius: 14px;
  border: 2px dashed var(--accent-border);
  background-color: var(--bg-muted);
  text-align: center;
  cursor: pointer;
  user-select: none;
  margin-bottom: 16px;
  transition: all 0.15s ease;

  &:active {
    transform: scale(0.995);
    background-color: var(--accent-soft);
  }

  &.has-fault {
    border-color: #ef4444;
    background-color: rgba(239, 68, 68, 0.08);
  }
}

.pad-icon {
  font-size: 34px;
  margin-bottom: 6px;
}

.pad-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.pad-status {
  font-size: 13px;
  font-weight: 700;
  color: #10b981;

  &.fault {
    color: #ef4444;
  }
}

.mouse-btn-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}

.mouse-btn-card {
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);

  &.fault {
    border-color: #ef4444;
  }
}

.mb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.fault-pill {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  background-color: rgba(16, 185, 129, 0.14);
  color: #10b981;

  &.bad {
    background-color: rgba(239, 68, 68, 0.16);
    color: #ef4444;
  }
}

.mb-metrics {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.click-log-box {
  max-height: 190px;
  overflow-y: auto;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 7px;
  background-color: var(--bg-surface);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;

  &.fault {
    background-color: rgba(239, 68, 68, 0.14);
    color: #ef4444;
    font-weight: 700;
  }
}

.kb-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.kb-stat-pill {
  padding: 5px 11px;
  border-radius: 999px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  font-size: 12.5px;
  color: var(--text-secondary);

  &.accent {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.keyboard-chassis {
  padding: 16px;
  border-radius: 14px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: auto;
}

.kb-row {
  display: flex;
  gap: 6px;
  min-width: 680px;
}

.key-cap {
  flex: 1;
  min-width: 40px;
  height: 42px;
  border-radius: 8px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 0 var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  user-select: none;
  transition: all 0.08s ease;

  &.wide {
    flex: 1.65;
  }
  &.space {
    flex: 4.5;
  }
  &.tested {
    border-color: #10b981;
    background-color: rgba(16, 185, 129, 0.14);
    color: #10b981;
  }
  &.pressed {
    background-color: var(--accent);
    border-color: var(--accent);
    color: #fff;
    transform: translateY(2px);
  }
}

.key-history-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
}

.kh-label {
  color: var(--text-secondary);
  font-weight: 700;
}

.kh-badge {
  padding: 2px 8px;
  border-radius: 6px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}

.fullscreen-test-layer {
  position: fixed;
  inset: 0;
  z-index: 99999;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 36px;

  &.is-grid {
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 1px, transparent 1px) !important;
    background-size: 40px 40px !important;
  }
}

.fs-hud {
  padding: 16px 24px;
  border-radius: 14px;
  background-color: rgba(15, 23, 42, 0.86);
  backdrop-filter: blur(10px);
  color: #fff;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.fs-title {
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 4px;
}

.fs-desc {
  font-size: 12.5px;
  color: #cbd5e1;
  margin-bottom: 12px;
}

.fs-actions {
  display: flex;
  justify-content: center;
  gap: 10px;

  button {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;

    &.danger {
      background-color: #ef4444;
      border-color: #ef4444;
    }
  }
}
</style>
