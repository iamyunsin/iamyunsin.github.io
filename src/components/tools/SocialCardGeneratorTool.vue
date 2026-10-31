<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { AFFILIATE_LINKS } from '@/consts';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// --- Aspect Ratios ---
export type AspectRatioPreset = 'xhs-3-4' | 'twitter-16-9' | 'square-1-1' | 'wechat-banner-2-35-1';
export type CardTemplateType = 'quote' | 'tweet' | 'geek-code' | 'milestone';

interface RatioOption {
  key: AspectRatioPreset;
  width: number;
  height: number;
  label: string;
  labelEn: string;
  ratioCss: string;
  description: string;
  descriptionEn: string;
}

const RATIO_OPTIONS: RatioOption[] = [
  {
    key: 'xhs-3-4',
    width: 1242,
    height: 1660,
    label: '小红书 (3:4)',
    labelEn: 'Xiaohongshu (3:4)',
    ratioCss: '3 / 4',
    description: '瀑布流黄金比例，图文笔记封面高点击',
    descriptionEn: 'Vertical portrait for XHS & IG posts',
  },
  {
    key: 'twitter-16-9',
    width: 1200,
    height: 675,
    label: '推特 / 博客 (16:9)',
    labelEn: 'Twitter / OG (16:9)',
    ratioCss: '16 / 9',
    description: '推特推文大图与 OpenGraph 社交分享横幅',
    descriptionEn: 'Twitter card, LinkedIn & Blog OG banner',
  },
  {
    key: 'square-1-1',
    width: 1080,
    height: 1080,
    label: '经典方形 (1:1)',
    labelEn: 'Square (1:1)',
    ratioCss: '1 / 1',
    description: '即刻动态、朋友圈与 Instagram 金句卡片',
    descriptionEn: 'Square quote card for Jike & IG feed',
  },
  {
    key: 'wechat-banner-2-35-1',
    width: 900,
    height: 383,
    label: '公众号横幅 (2.35:1)',
    labelEn: 'WeChat Banner (2.35:1)',
    ratioCss: '900 / 383',
    description: '微信公众平台文章推送首图标准大图',
    descriptionEn: 'Official WeChat Article Top Banner',
  },
];

// --- 20+ Curated Color Themes (12 Free, 8 Pro) ---
export interface ThemeOption {
  id: string;
  name: string;
  nameEn: string;
  isPro: boolean;
  background: string;
  textColor: string;
  accentColor: string;
  surfaceBg: string;
  border: string;
}

const THEMES: ThemeOption[] = [
  // 12 Free Themes
  {
    id: 'midnight',
    name: '深邃夜空',
    nameEn: 'Midnight Deep',
    isPro: false,
    background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)',
    textColor: '#f8fafc',
    accentColor: '#38bdf8',
    surfaceBg: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.12)',
  },
  {
    id: 'cyberglow',
    name: '霓虹极光',
    nameEn: 'Cyber Glow',
    isPro: false,
    background: 'linear-gradient(135deg, #030712 0%, #0c4a6e 40%, #581c87 100%)',
    textColor: '#f8fafc',
    accentColor: '#22d3ee',
    surfaceBg: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(56, 189, 248, 0.3)',
  },
  {
    id: 'aurora',
    name: '北极光辉',
    nameEn: 'Aurora Borealis',
    isPro: false,
    background: 'linear-gradient(135deg, #022c22 0%, #065f46 45%, #064e3b 80%, #021a14 100%)',
    textColor: '#ecfdf5',
    accentColor: '#34d399',
    surfaceBg: 'rgba(255, 255, 255, 0.07)',
    border: 'rgba(52, 211, 153, 0.25)',
  },
  {
    id: 'sunset',
    name: '落日珊瑚',
    nameEn: 'Sunset Coral',
    isPro: false,
    background: 'linear-gradient(135deg, #9a3412 0%, #be123c 50%, #4c0519 100%)',
    textColor: '#ffffff',
    accentColor: '#fb923c',
    surfaceBg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
  },
  {
    id: 'emerald',
    name: '翡翠极客',
    nameEn: 'Emerald Tech',
    isPro: false,
    background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)',
    textColor: '#ecfdf5',
    accentColor: '#10b981',
    surfaceBg: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  {
    id: 'slate',
    name: '极简岩灰',
    nameEn: 'Slate Minimal',
    isPro: false,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    textColor: '#f1f5f9',
    accentColor: '#94a3b8',
    surfaceBg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  {
    id: 'indigo',
    name: '暗夜靓蓝',
    nameEn: 'Dark Indigo',
    isPro: false,
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    textColor: '#f8fafc',
    accentColor: '#818cf8',
    surfaceBg: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(129, 140, 248, 0.25)',
  },
  {
    id: 'sand',
    name: '暖阳沙丘',
    nameEn: 'Warm Sand',
    isPro: false,
    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fcd34d 100%)',
    textColor: '#1e293b',
    accentColor: '#d97706',
    surfaceBg: 'rgba(255, 255, 255, 0.75)',
    border: 'rgba(217, 119, 6, 0.25)',
  },
  {
    id: 'light',
    name: '清爽明亮',
    nameEn: 'Classic Light',
    isPro: false,
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
    textColor: '#0f172a',
    accentColor: '#2563eb',
    surfaceBg: 'rgba(255, 255, 255, 0.92)',
    border: 'rgba(0, 0, 0, 0.08)',
  },
  {
    id: 'neontokyo',
    name: '东京霓虹',
    nameEn: 'Neon Tokyo',
    isPro: false,
    background: 'linear-gradient(135deg, #18181b 0%, #831843 50%, #0e7490 100%)',
    textColor: '#fdf2f8',
    accentColor: '#f472b6',
    surfaceBg: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(244, 114, 182, 0.3)',
  },
  {
    id: 'monochrome',
    name: '黑白极致',
    nameEn: 'Monochrome',
    isPro: false,
    background: 'linear-gradient(135deg, #000000 0%, #171717 50%, #262626 100%)',
    textColor: '#ffffff',
    accentColor: '#e5e5e5',
    surfaceBg: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.15)',
  },
  {
    id: 'bronze',
    name: '复古黄铜',
    nameEn: 'Retro Bronze',
    isPro: false,
    background: 'linear-gradient(135deg, #1c1917 0%, #451a03 50%, #78350f 100%)',
    textColor: '#fef3c7',
    accentColor: '#f59e0b',
    surfaceBg: 'rgba(255, 255, 255, 0.07)',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  // 8 Pro Themes (Value-Exchange: Unlocked by Watermark)
  {
    id: 'stardust',
    name: '深空星尘',
    nameEn: 'Cosmic Stardust',
    isPro: true,
    background: 'linear-gradient(135deg, #09090b 0%, #1e112a 40%, #2e1065 75%, #030712 100%)',
    textColor: '#faf5ff',
    accentColor: '#c084fc',
    surfaceBg: 'rgba(255, 255, 255, 0.09)',
    border: 'rgba(192, 132, 252, 0.35)',
  },
  {
    id: 'amethyst',
    name: '皇家紫晶',
    nameEn: 'Royal Amethyst',
    isPro: true,
    background: 'linear-gradient(135deg, #3b0764 0%, #581c87 50%, #1e1b4b 100%)',
    textColor: '#f3e8ff',
    accentColor: '#e879f9',
    surfaceBg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(232, 121, 249, 0.3)',
  },
  {
    id: 'holographic',
    name: '全息幻彩',
    nameEn: 'Holographic',
    isPro: true,
    background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 35%, #0284c7 70%, #059669 100%)',
    textColor: '#ffffff',
    accentColor: '#fef08a',
    surfaceBg: 'rgba(0, 0, 0, 0.35)',
    border: 'rgba(255, 255, 255, 0.35)',
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克 2077',
    nameEn: 'Cyberpunk 2077',
    isPro: true,
    background: 'linear-gradient(135deg, #0a0a0a 0%, #18181b 40%, #854d0e 80%, #ca8a04 100%)',
    textColor: '#fef08a',
    accentColor: '#facc15',
    surfaceBg: 'rgba(0, 0, 0, 0.65)',
    border: 'rgba(250, 204, 21, 0.5)',
  },
  {
    id: 'titanium',
    name: '磨砂钛金',
    nameEn: 'Frosted Titanium',
    isPro: true,
    background: 'linear-gradient(135deg, #334155 0%, #475569 40%, #1e293b 100%)',
    textColor: '#f8fafc',
    accentColor: '#cbd5e1',
    surfaceBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.25)',
  },
  {
    id: 'velvet',
    name: '天鹅丝绒',
    nameEn: 'Velvet Rose',
    isPro: true,
    background: 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #1c1917 100%)',
    textColor: '#ffe4e6',
    accentColor: '#fb7185',
    surfaceBg: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(251, 113, 133, 0.3)',
  },
  {
    id: 'obsidian',
    name: '黑曜金甲',
    nameEn: 'Obsidian Gold',
    isPro: true,
    background: 'linear-gradient(135deg, #000000 0%, #0c0a09 50%, #1c1917 100%)',
    textColor: '#fef3c7',
    accentColor: '#fbbf24',
    surfaceBg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(251, 191, 36, 0.45)',
  },
  {
    id: 'matrix',
    name: '黑客帝国',
    nameEn: 'Matrix Cyber',
    isPro: true,
    background: 'linear-gradient(135deg, #000000 0%, #022c22 70%, #000000 100%)',
    textColor: '#4ade80',
    accentColor: '#22c55e',
    surfaceBg: 'rgba(0, 0, 0, 0.75)',
    border: 'rgba(34, 197, 94, 0.4)',
  },
];

// --- Reactive State ---
const selectedRatio = ref<AspectRatioPreset>('xhs-3-4');
const selectedTemplate = ref<CardTemplateType>('quote');
const selectedThemeId = ref<string>('midnight');
const customBg = ref<string>('#111827');
const useCustomBg = ref<boolean>(false);
const fontSizeScale = ref<number>(1.0);
const cardPadding = ref<number>(36);
const borderRadius = ref<number>(20);
const showNoise = ref<boolean>(true);
const watermarkEnabled = ref<boolean>(true);
const brandPillPosition = ref<'top-right' | 'bottom-center'>('top-right');

// Active Theme Object
const currentTheme = computed<ThemeOption>(() => {
  const found = THEMES.find((t) => t.id === selectedThemeId.value);
  return found || THEMES[0];
});

// Template 1: Quote
const quoteState = ref({
  tag: '独立思考 · 极客精神',
  headline: '普通人在做加法，高手在建飞轮，顶级黑客在写确定性代码。',
  bodyText: '不要用战术上的勤奋掩盖战略上的懒惰。用一次性解决问题的思维构筑自动化资产，让代码为你持续创造价值。',
  authorName: '原心 (Yunsin)',
  authorTitle: '独立开发者 · 全栈工程师',
  authorAvatar: '/site-images/avatar.jpeg',
  showQuoteMarks: true,
});

// Template 2: Tweet / Conversation
const tweetState = ref({
  authorName: '原心 Yunsin',
  authorHandle: '@iamyunsin',
  authorAvatar: '/site-images/avatar.jpeg',
  verified: true,
  content: '花了 3 天手写了 5 款 100% 浏览器本地运行的极客小工具：\n\n1. 零云端依赖，用户隐私 100% 本地安全\n2. 纯客户端高精离屏 Canvas & 矢量 PDF 打印\n3. 完全开源与长效被动收入飞轮\n\n极客就该用极致的工程解决真实痛点。#IndieHacker #WebDev #BuildInPublic',
  timestamp: '10:24 AM · Oct 31, 2026',
  likes: '1,428',
  retweets: '386',
  replies: '92',
  platformStyle: 'twitter' as 'twitter' | 'jike' | 'wechat',
});

// Template 3: Geek Code Snapshot
const codeState = ref({
  fileName: 'SocialCardGenerator.vue',
  language: 'typescript' as 'typescript' | 'javascript' | 'rust' | 'python' | 'go' | 'html' | 'json' | 'sql' | 'bash',
  codeSnippet: `// 100% Client-Side Retina Canvas Rendering Engine
export async function exportSocialCard(
  card: CardState,
  scale: number = 2
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = card.width * scale;
  canvas.height = card.height * scale;
  const ctx = canvas.getContext('2d')!;

  // Draw high-precision mesh gradient and tokens
  await renderVectorCard(ctx, card, scale);
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
}`,
  showLineNumbers: true,
  showMacButtons: true,
});

// Template 4: Indie Hacker Milestone
const milestoneState = ref({
  badgeText: '🚀 MILESTONE UNLOCKED · 里程碑达成',
  title: '极客被动收入工具箱 6 个月进展报告',
  metricValue: '$12,850',
  metricLabel: 'Monthly Recurring Revenue (MRR)',
  growthPercent: '+138% MoM ↗',
  subMetrics: [
    { label: '活跃独立创作者', value: '54,200+' },
    { label: '工具总生成次数', value: '186,000+' },
    { label: '平均留存周期', value: '42 Days' },
  ],
  founderQuote: '当你的代码每天都在为他人节省时间，收入只是水到渠成的副产品。',
  authorName: 'Yunsin @ IndieHacker',
});

// --- Toast Feedback ---
const toastMsg = ref<string>('');
const toastVisible = ref<boolean>(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string) {
  toastMsg.value = msg;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 3200);
}

// --- Watermark Value-Exchange Guard ---
function onSelectTheme(theme: ThemeOption) {
  if (theme.isPro && !watermarkEnabled.value) {
    showToast(
      isEn.value
        ? '💡 Pro themes require brand pill enabled! Re-enable watermark to unlock.'
        : '💡 Pro 独家主题需保留出处胶囊即可永久免费解锁！已为您开启水印。'
    );
    watermarkEnabled.value = true;
  }
  selectedThemeId.value = theme.id;
}

watch(watermarkEnabled, (newVal) => {
  if (!newVal && currentTheme.value.isPro) {
    // Fall back to Midnight
    selectedThemeId.value = 'midnight';
    showToast(
      isEn.value
        ? 'Watermark turned off. Pro theme fell back to free theme.'
        : '出处胶囊已关闭，已自动切换为基础免费主题。'
    );
  }
});

// --- Code Syntax Tokenizer (Zero-Dep Pure TypeScript) ---
interface CodeToken {
  type: 'keyword' | 'string' | 'number' | 'comment' | 'type' | 'punct' | 'text';
  text: string;
}

function tokenizeCode(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const lines = code.split('\n');

  const keywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'export', 'import', 'from',
    'as', 'if', 'else', 'for', 'while', 'async', 'await', 'class', 'extends',
    'interface', 'type', 'pub', 'fn', 'struct', 'impl', 'mut', 'def', 'def',
    'new', 'try', 'catch', 'throw', 'switch', 'case', 'break', 'continue'
  ]);

  const builtins = new Set([
    'string', 'number', 'boolean', 'Promise', 'Blob', 'HTMLCanvasElement',
    'CanvasRenderingContext2D', 'Array', 'Record', 'Uint8Array', 'usize',
    'i32', 'u8', 'Vec', 'Option', 'Result', 'void', 'any', 'CardState'
  ]);

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let i = 0;

    while (i < line.length) {
      // Comments
      if (line.slice(i, i + 2) === '//') {
        tokens.push({ type: 'comment', text: line.slice(i) });
        i = line.length;
        continue;
      }
      if (line[i] === '#' && (codeState.value.language === 'python' || codeState.value.language === 'bash')) {
        tokens.push({ type: 'comment', text: line.slice(i) });
        i = line.length;
        continue;
      }

      // Strings ('...', "...", `...`)
      if (line[i] === "'" || line[i] === '"' || line[i] === '`') {
        const quote = line[i];
        let j = i + 1;
        while (j < line.length && line[j] !== quote) {
          if (line[j] === '\\') j++;
          j++;
        }
        j = Math.min(line.length, j + 1);
        tokens.push({ type: 'string', text: line.slice(i, j) });
        i = j;
        continue;
      }

      // Numbers
      if (/\d/.test(line[i]) && (i === 0 || !/[a-zA-Z_$]/.test(line[i - 1]))) {
        let j = i;
        while (j < line.length && /[\d.xXa-fA-F_]/.test(line[j])) {
          j++;
        }
        tokens.push({ type: 'number', text: line.slice(i, j) });
        i = j;
        continue;
      }

      // Identifiers / keywords
      if (/[a-zA-Z_$]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) {
          j++;
        }
        const word = line.slice(i, j);
        if (keywords.has(word)) {
          tokens.push({ type: 'keyword', text: word });
        } else if (builtins.has(word)) {
          tokens.push({ type: 'type', text: word });
        } else {
          tokens.push({ type: 'text', text: word });
        }
        i = j;
        continue;
      }

      // Punctuations / symbols
      tokens.push({ type: 'punct', text: line[i] });
      i++;
    }

    if (l < lines.length - 1) {
      tokens.push({ type: 'punct', text: '\n' });
    }
  }

  return tokens;
}

// Tokenized code lines
const tokenizedLines = computed(() => {
  const rawLines = codeState.value.codeSnippet.split('\n');
  return rawLines.map((line) => tokenizeCode(line));
});

// --- High-Resolution Canvas 2D Rendering Engine (2x Retina Offscreen) ---
const previewContainerRef = ref<HTMLDivElement | null>(null);

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }

    let currentLine = '';
    for (let i = 0; i < para.length; i++) {
      const char = para[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }
  return lines;
}

async function renderCardToCanvas(scale: number = 2): Promise<HTMLCanvasElement> {
  const currentRatio = RATIO_OPTIONS.find((r) => r.key === selectedRatio.value) || RATIO_OPTIONS[0];
  const targetW = currentRatio.width;
  const targetH = currentRatio.height;

  const canvas = document.createElement('canvas');
  canvas.width = targetW * scale;
  canvas.height = targetH * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  ctx.scale(scale, scale);

  // 1. Draw Background
  const theme = currentTheme.value;
  if (useCustomBg.value) {
    ctx.fillStyle = customBg.value;
    ctx.fillRect(0, 0, targetW, targetH);
  } else {
    // Simple gradient emulation
    const grad = ctx.createLinearGradient(0, 0, targetW, targetH);
    if (theme.id === 'sunset') {
      grad.addColorStop(0, '#9a3412');
      grad.addColorStop(0.5, '#be123c');
      grad.addColorStop(1, '#4c0519');
    } else if (theme.id === 'aurora') {
      grad.addColorStop(0, '#022c22');
      grad.addColorStop(0.5, '#065f46');
      grad.addColorStop(1, '#021a14');
    } else if (theme.id === 'sand') {
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(0.5, '#fed7aa');
      grad.addColorStop(1, '#fcd34d');
    } else if (theme.id === 'light') {
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(0.5, '#f1f5f9');
      grad.addColorStop(1, '#e2e8f0');
    } else if (theme.id === 'cyberpunk') {
      grad.addColorStop(0, '#0a0a0a');
      grad.addColorStop(0.4, '#18181b');
      grad.addColorStop(1, '#ca8a04');
    } else if (theme.id === 'holographic') {
      grad.addColorStop(0, '#db2777');
      grad.addColorStop(0.35, '#7c3aed');
      grad.addColorStop(0.7, '#0284c7');
      grad.addColorStop(1, '#059669');
    } else {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#111827');
      grad.addColorStop(1, '#1e1b4b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // 2. Draw Subtle Grain Texture (if enabled)
  if (showNoise.value) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let x = 0; x < targetW; x += 16) {
      for (let y = 0; y < targetH; y += 16) {
        if ((x + y * 7) % 5 === 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  // 3. Card Surface (Glassmorphism container)
  const pad = cardPadding.value * 2;
  const cardX = pad;
  const cardY = pad;
  const cardW = targetW - pad * 2;
  const cardH = targetH - pad * 2;
  const rad = borderRadius.value * 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, rad);
  ctx.fillStyle = theme.surfaceBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme.border;
  ctx.stroke();
  ctx.clip();

  // 4. Draw Template Contents
  const innerPad = 48;
  const contentX = cardX + innerPad;
  let contentY = cardY + innerPad;
  const contentW = cardW - innerPad * 2;

  if (selectedTemplate.value === 'quote') {
    // Quote Mode
    // Tag pill
    if (quoteState.value.tag) {
      ctx.font = `600 ${22 * fontSizeScale.value}px sans-serif`;
      const tagText = quoteState.value.tag;
      const tagMetrics = ctx.measureText(tagText);
      const tagW = tagMetrics.width + 32;
      const tagH = 38 * fontSizeScale.value;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(contentX, contentY, tagW, tagH, tagH / 2);
      ctx.fill();

      ctx.fillStyle = theme.accentColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, contentX + 16, contentY + tagH / 2);
      contentY += tagH + 32;
    }

    // Headline
    ctx.font = `800 ${44 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.textColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, quoteState.value.headline, contentW);
    for (const line of headlineLines) {
      ctx.fillText(line, contentX, contentY);
      contentY += 56 * fontSizeScale.value;
    }
    contentY += 24;

    // Body Text
    if (quoteState.value.bodyText) {
      ctx.font = `400 ${26 * fontSizeScale.value}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const bodyLines = wrapText(ctx, quoteState.value.bodyText, contentW);
      for (const line of bodyLines) {
        ctx.fillText(line, contentX, contentY);
        contentY += 38 * fontSizeScale.value;
      }
    }

    // Author Section (fixed near bottom of card)
    const authorY = cardY + cardH - 120;
    ctx.font = `700 ${28 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.textColor;
    ctx.fillText(quoteState.value.authorName, contentX + 80, authorY);

    ctx.font = `400 ${20 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(quoteState.value.authorTitle, contentX + 80, authorY + 36);

    // Avatar Placeholder Circle
    ctx.beginPath();
    ctx.arc(contentX + 36, authorY + 28, 28, 0, Math.PI * 2);
    ctx.fillStyle = theme.accentColor;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(quoteState.value.authorName.slice(0, 1) || 'Y', contentX + 36, authorY + 28);
    ctx.textAlign = 'left';

  } else if (selectedTemplate.value === 'tweet') {
    // Tweet Mode
    // Avatar circle
    ctx.beginPath();
    ctx.arc(contentX + 36, contentY + 36, 36, 0, Math.PI * 2);
    ctx.fillStyle = theme.accentColor;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tweetState.value.authorName.slice(0, 1) || 'T', contentX + 36, contentY + 36);
    ctx.textAlign = 'left';

    // Name & Handle
    ctx.font = `700 ${28 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.textColor;
    ctx.textBaseline = 'top';
    ctx.fillText(tweetState.value.authorName, contentX + 88, contentY + 12);

    ctx.font = `400 ${22 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(tweetState.value.authorHandle, contentX + 88, contentY + 46);

    contentY += 100;

    // Tweet Content
    ctx.font = `400 ${30 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.textColor;
    const tweetLines = wrapText(ctx, tweetState.value.content, contentW);
    for (const line of tweetLines) {
      ctx.fillText(line, contentX, contentY);
      contentY += 46 * fontSizeScale.value;
    }

    contentY += 30;
    // Timestamp
    ctx.font = `400 ${20 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(tweetState.value.timestamp, contentX, contentY);

    // Stats Row
    contentY += 40;
    ctx.font = `600 ${22 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.textColor;
    ctx.fillText(`💬 ${tweetState.value.replies}    🔁 ${tweetState.value.retweets}    ❤️ ${tweetState.value.likes}`, contentX, contentY);

  } else if (selectedTemplate.value === 'geek-code') {
    // Geek Code Mode
    // macOS Header Buttons
    if (codeState.value.showMacButtons) {
      const btnRadius = 8;
      const btnY = contentY + 10;
      // Red
      ctx.beginPath();
      ctx.arc(contentX + 10, btnY, btnRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5f56';
      ctx.fill();
      // Yellow
      ctx.beginPath();
      ctx.arc(contentX + 34, btnY, btnRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffbd2e';
      ctx.fill();
      // Green
      ctx.beginPath();
      ctx.arc(contentX + 58, btnY, btnRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#27c93f';
      ctx.fill();
    }

    // Filename center pill
    ctx.font = `500 ${18 * fontSizeScale.value}px monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(codeState.value.fileName, cardX + cardW / 2, contentY + 12);
    ctx.textAlign = 'left';

    contentY += 50;

    // Code lines
    ctx.font = `400 ${20 * fontSizeScale.value}px monospace`;
    ctx.textBaseline = 'top';

    const lines = codeState.value.codeSnippet.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineNum = (i + 1).toString().padStart(2, ' ');
      // Line number
      if (codeState.value.showLineNumbers) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(lineNum, contentX, contentY);
      }

      // Code text
      ctx.fillStyle = theme.textColor;
      ctx.fillText(lines[i], contentX + (codeState.value.showLineNumbers ? 40 : 0), contentY);
      contentY += 28 * fontSizeScale.value;
    }

  } else if (selectedTemplate.value === 'milestone') {
    // Milestone Mode
    // Badge
    ctx.font = `700 ${20 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(milestoneState.value.badgeText, contentX, contentY);

    contentY += 36;
    // Title
    ctx.font = `700 ${36 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.textColor;
    ctx.fillText(milestoneState.value.title, contentX, contentY);

    contentY += 60;
    // Massive Metric Numeral
    ctx.font = `900 ${72 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(milestoneState.value.metricValue, contentX, contentY);

    // Growth badge
    const metricW = ctx.measureText(milestoneState.value.metricValue).width;
    ctx.font = `700 ${22 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = '#10b981';
    ctx.fillText(milestoneState.value.growthPercent, contentX + metricW + 24, contentY + 28);

    contentY += 80;
    // Metric label
    ctx.font = `500 ${22 * fontSizeScale.value}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(milestoneState.value.metricLabel, contentX, contentY);

    contentY += 60;
    // Sub-metrics cards
    const subColW = (contentW - 32) / 3;
    for (let i = 0; i < milestoneState.value.subMetrics.length; i++) {
      const sub = milestoneState.value.subMetrics[i];
      const subX = contentX + i * (subColW + 16);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(subX, contentY, subColW, 90, 12);
      ctx.fill();

      ctx.font = `700 ${26 * fontSizeScale.value}px sans-serif`;
      ctx.fillStyle = theme.textColor;
      ctx.fillText(sub.value, subX + 16, contentY + 20);

      ctx.font = `400 ${16 * fontSizeScale.value}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(sub.label, subX + 16, contentY + 56);
    }

    contentY += 130;
    // Founder Quote
    if (milestoneState.value.founderQuote) {
      ctx.font = `italic 400 ${22 * fontSizeScale.value}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(`“${milestoneState.value.founderQuote}”`, contentX, contentY);
      contentY += 36;
      ctx.font = `600 ${18 * fontSizeScale.value}px sans-serif`;
      ctx.fillStyle = theme.accentColor;
      ctx.fillText(`— ${milestoneState.value.authorName}`, contentX, contentY);
    }
  }

  ctx.restore(); // restore clipping

  // 5. Anti-Collision Brand Pill Watermark (Value-Exchange)
  if (watermarkEnabled.value) {
    const pillText = '✦ Designed with yunsin.top/cards';
    ctx.font = '600 20px sans-serif';
    const metrics = ctx.measureText(pillText);
    const pillW = metrics.width + 40;
    const pillH = 46;

    let pillX = targetW - pillW - 48;
    let pillY = 48;

    if (brandPillPosition.value === 'bottom-center') {
      pillX = (targetW - pillW) / 2;
      pillY = targetH - pillH - 48;
    }

    ctx.save();
    // Frosted pill background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, pillX + 20, pillY + pillH / 2);
    ctx.restore();
  }

  return canvas;
}

// --- Download Handlers ---
const isExporting = ref<boolean>(false);

async function downloadPng() {
  isExporting.value = true;
  try {
    const canvas = await renderCardToCanvas(2);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-card-${selectedTemplate.value}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(isEn.value ? '✅ HD PNG downloaded!' : '✅ 高清 PNG 已下载！');
    }, 'image/png');
  } catch (e) {
    console.error(e);
    showToast(isEn.value ? '❌ Export failed' : '❌ 导出失败，请重试');
  } finally {
    isExporting.value = false;
  }
}

async function downloadWebp() {
  isExporting.value = true;
  try {
    const canvas = await renderCardToCanvas(2);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-card-${selectedTemplate.value}-${Date.now()}.webp`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(isEn.value ? '✅ Compressed WebP downloaded!' : '✅ 极高压缩比 WebP 已下载！');
    }, 'image/webp', 0.92);
  } catch (e) {
    console.error(e);
    showToast(isEn.value ? '❌ Export failed' : '❌ 导出失败，请重试');
  } finally {
    isExporting.value = false;
  }
}

async function copyToClipboard() {
  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast(isEn.value ? 'Clipboard API not supported in browser' : '当前浏览器不支持剪贴板写入 API');
    return;
  }
  isExporting.value = true;
  try {
    const canvas = await renderCardToCanvas(2);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast(isEn.value ? '📋 Image copied to clipboard!' : '📋 图像已复制到剪贴板，可直接在社交软件粘贴！');
      } catch (err) {
        console.error(err);
        showToast(isEn.value ? 'Copy failed, please download PNG instead' : '复制失败，请直接点击下载 PNG');
      }
    }, 'image/png');
  } catch (e) {
    console.error(e);
  } finally {
    isExporting.value = false;
  }
}

function downloadSvg() {
  if (!watermarkEnabled.value) {
    showToast(isEn.value ? '💡 4K SVG Vector export requires Brand Pill enabled!' : '💡 4K 矢量 SVG 导出需开启出处胶囊解锁！');
    return;
  }
  const currentRatio = RATIO_OPTIONS.find((r) => r.key === selectedRatio.value) || RATIO_OPTIONS[0];
  const w = currentRatio.width;
  const h = currentRatio.height;
  const theme = currentTheme.value;

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bgGrad)"/>
  <rect x="${cardPadding.value * 2}" y="${cardPadding.value * 2}" width="${w - cardPadding.value * 4}" height="${h - cardPadding.value * 4}" rx="${borderRadius.value * 2}" fill="${theme.surfaceBg}" stroke="${theme.border}" stroke-width="2"/>
  <text x="${w / 2}" y="${h / 2}" fill="${theme.textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="bold" text-anchor="middle">
    ${selectedTemplate.value === 'quote' ? quoteState.value.headline : milestoneState.value.title}
  </text>
  <text x="${w - 60}" y="70" fill="#ffffff" font-family="system-ui, sans-serif" font-size="20" font-weight="600" text-anchor="end">
    ✦ Designed with yunsin.top/cards
  </text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `social-card-${selectedTemplate.value}-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(isEn.value ? '✅ 4K Vector SVG downloaded!' : '✅ 4K 矢量 SVG 已下载！');
}

// --- Tier 2 Monetization Template Pack Drawer ---
const showTemplateModal = ref<boolean>(false);
const activeSamplePreset = ref<number>(0);

const PREMIUM_PRESETS = [
  {
    title: '极客周刊精选卡 (Tech Digest Weekly)',
    ratio: '16:9',
    description: '适用于 Hacker News、周刊盘点、技术趋势速递',
  },
  {
    title: '金融洞察金句卡 (Fintech Insight Quotes)',
    ratio: '3:4',
    description: '大字体反差排版，专注投资哲学与独立思考',
  },
  {
    title: '独立开发者高光时刻 (Solopreneur Spotlight)',
    ratio: '1:1',
    description: 'MRR 数据展示、Product Hunt 榜单庆祝大图',
  },
  {
    title: '跨境电商出海指南 (Cross-border Playbook)',
    ratio: '3:4',
    description: '多要点对比、合规注意事项与避坑指南',
  },
  {
    title: '极简黑白哲理格言 (Monochrome Philosophy)',
    ratio: '1:1',
    description: '高反差黑白美学，沉浸式阅读与观点传播',
  },
  {
    title: '赛博极客终端速记 (Cyberpunk CLI Cheat-Sheet)',
    ratio: '16:9',
    description: 'macOS 终端三色风格，快捷键与核心代码片段',
  },
];
</script>

<template>
  <div class="social-card-tool-root">
    <!-- Top Action / Info Banner -->
    <div class="tool-intro-banner">
      <div class="intro-left">
        <h1 class="tool-title">
          <span>🎨</span>
          {{ isEn ? 'Social Card Studio' : '自媒体极简社交卡片工坊' }}
        </h1>
        <p class="tool-subtitle">
          {{
            isEn
              ? 'Zero-upload, 100% in-browser visual card engine. Create stunning cards for Xiaohongshu, Twitter/X, and WeChat.'
              : '100% 浏览器本地离线渲染，零图片上传。一键出图小红书 3:4、推特 16:9、即刻方形与微信横幅。'
          }}
        </p>
      </div>

      <div class="intro-actions">
        <!-- Tier 2 Template Pack Trigger Button -->
        <button
          type="button"
          class="template-pack-btn"
          @click="showTemplateModal = true"
        >
          <span class="icon">✨</span>
          <span>{{ isEn ? 'Get 100+ Pro Templates ($4.99)' : '获取 100+ 自媒体爆款模板包 (¥19.9)' }}</span>
        </button>

        <!-- Canva Pro Affiliate -->
        <a
          :href="AFFILIATE_LINKS.canvaPro || 'https://partner.canva.com/c/placeholder'"
          target="_blank"
          rel="noopener noreferrer"
          class="canva-partner-btn"
          title="Canva Pro 30-Day Free Trial"
        >
          <span>🖌️</span>
          <span>{{ isEn ? 'Canva Pro Free Trial' : 'Canva Pro 30天免费试用' }}</span>
        </a>
      </div>
    </div>

    <!-- Workspace Layout: Two Columns (Controls on Left, Live Preview on Right) -->
    <div class="workspace-grid">
      <!-- Left Configuration Panel -->
      <div class="controls-panel">
        <!-- Section 1: Aspect Ratio Selection -->
        <div class="control-section">
          <label class="section-title">
            <span>📐</span> {{ isEn ? '1. Aspect Ratio & Target Platform' : '1. 画布画幅与目标平台' }}
          </label>
          <div class="ratio-grid">
            <button
              v-for="r in RATIO_OPTIONS"
              :key="r.key"
              type="button"
              class="ratio-card"
              :class="{ active: selectedRatio === r.key }"
              @click="selectedRatio = r.key"
            >
              <div class="ratio-badge">{{ isEn ? r.labelEn : r.label }}</div>
              <div class="ratio-meta">{{ r.width }} × {{ r.height }}</div>
              <div class="ratio-desc">{{ isEn ? r.descriptionEn : r.description }}</div>
            </button>
          </div>
        </div>

        <!-- Section 2: Template Mode Selection -->
        <div class="control-section">
          <label class="section-title">
            <span>📑</span> {{ isEn ? '2. Template Mode' : '2. 卡片模版模式' }}
          </label>
          <div class="template-selector-tabs">
            <button
              type="button"
              class="tab-btn"
              :class="{ active: selectedTemplate === 'quote' }"
              @click="selectedTemplate = 'quote'"
            >
              💬 {{ isEn ? 'Quote' : '金句论点' }}
            </button>
            <button
              type="button"
              class="tab-btn"
              :class="{ active: selectedTemplate === 'tweet' }"
              @click="selectedTemplate = 'tweet'"
            >
              🐦 {{ isEn ? 'Tweet / Chat' : '拟真推文' }}
            </button>
            <button
              type="button"
              class="tab-btn"
              :class="{ active: selectedTemplate === 'geek-code' }"
              @click="selectedTemplate = 'geek-code'"
            >
              💻 {{ isEn ? 'Code Shot' : '极客代码' }}
            </button>
            <button
              type="button"
              class="tab-btn"
              :class="{ active: selectedTemplate === 'milestone' }"
              @click="selectedTemplate = 'milestone'"
            >
              🚀 {{ isEn ? 'Milestone' : '里程碑大字报' }}
            </button>
          </div>

          <!-- Dynamic Form Inputs per Template Mode -->
          <div class="template-form-body">
            <!-- Mode 1: Quote Form -->
            <div v-if="selectedTemplate === 'quote'" class="form-group">
              <div class="field-row">
                <label>{{ isEn ? 'Category Tag' : '分类微标签' }}</label>
                <input v-model="quoteState.tag" type="text" placeholder="如：极客精神 · 独立思考" />
              </div>
              <div class="field-row">
                <label>{{ isEn ? 'Hero Headline (Bold)' : '核心加粗观点 / 金句主标题' }}</label>
                <textarea v-model="quoteState.headline" rows="2"></textarea>
              </div>
              <div class="field-row">
                <label>{{ isEn ? 'Body Paragraph (Optional)' : '补充阐述文字' }}</label>
                <textarea v-model="quoteState.bodyText" rows="3"></textarea>
              </div>
              <div class="field-grid-2">
                <div>
                  <label>{{ isEn ? 'Author Name' : '作者姓名' }}</label>
                  <input v-model="quoteState.authorName" type="text" />
                </div>
                <div>
                  <label>{{ isEn ? 'Author Title' : '作者头衔 / 身份标签' }}</label>
                  <input v-model="quoteState.authorTitle" type="text" />
                </div>
              </div>
            </div>

            <!-- Mode 2: Tweet Form -->
            <div v-if="selectedTemplate === 'tweet'" class="form-group">
              <div class="field-grid-2">
                <div>
                  <label>{{ isEn ? 'Display Name' : '显示名称' }}</label>
                  <input v-model="tweetState.authorName" type="text" />
                </div>
                <div>
                  <label>{{ isEn ? 'Handle' : '推特账号 (@Handle)' }}</label>
                  <input v-model="tweetState.authorHandle" type="text" />
                </div>
              </div>
              <div class="field-row">
                <label>{{ isEn ? 'Tweet Content' : '推文正文 (支持 #话题 自动高亮)' }}</label>
                <textarea v-model="tweetState.content" rows="4"></textarea>
              </div>
              <div class="field-grid-3">
                <div>
                  <label>{{ isEn ? 'Replies' : '回复数' }}</label>
                  <input v-model="tweetState.replies" type="text" />
                </div>
                <div>
                  <label>{{ isEn ? 'Retweets' : '转发数' }}</label>
                  <input v-model="tweetState.retweets" type="text" />
                </div>
                <div>
                  <label>{{ isEn ? 'Likes' : '点赞数' }}</label>
                  <input v-model="tweetState.likes" type="text" />
                </div>
              </div>
            </div>

            <!-- Mode 3: Geek Code Form -->
            <div v-if="selectedTemplate === 'geek-code'" class="form-group">
              <div class="field-grid-2">
                <div>
                  <label>{{ isEn ? 'File Name' : '文件名 (居中药丸)' }}</label>
                  <input v-model="codeState.fileName" type="text" />
                </div>
                <div>
                  <label>{{ isEn ? 'Language' : '代码语言' }}</label>
                  <select v-model="codeState.language">
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="rust">Rust</option>
                    <option value="python">Python</option>
                    <option value="go">Go</option>
                    <option value="html">HTML</option>
                    <option value="json">JSON</option>
                    <option value="sql">SQL</option>
                    <option value="bash">Bash</option>
                  </select>
                </div>
              </div>
              <div class="field-row">
                <label>{{ isEn ? 'Code Snippet' : '代码片段' }}</label>
                <textarea
                  v-model="codeState.codeSnippet"
                  rows="6"
                  class="font-mono text-xs"
                  placeholder="Paste code here..."
                ></textarea>
              </div>
              <div class="toggle-row">
                <label class="checkbox-label">
                  <input v-model="codeState.showLineNumbers" type="checkbox" />
                  <span>{{ isEn ? 'Show Line Numbers' : '显示行号' }}</span>
                </label>
                <label class="checkbox-label">
                  <input v-model="codeState.showMacButtons" type="checkbox" />
                  <span>{{ isEn ? 'macOS Window Buttons' : 'macOS 窗口红黄绿按钮' }}</span>
                </label>
              </div>
            </div>

            <!-- Mode 4: Milestone Form -->
            <div v-if="selectedTemplate === 'milestone'" class="form-group">
              <div class="field-row">
                <label>{{ isEn ? 'Top Badge' : '顶部徽章文案' }}</label>
                <input v-model="milestoneState.badgeText" type="text" />
              </div>
              <div class="field-row">
                <label>{{ isEn ? 'Milestone Title' : '里程碑大标题' }}</label>
                <input v-model="milestoneState.title" type="text" />
              </div>
              <div class="field-grid-2">
                <div>
                  <label>{{ isEn ? 'Hero Metric Value' : '核心大数字 (如 $12,850)' }}</label>
                  <input v-model="milestoneState.metricValue" type="text" />
                </div>
                <div>
                  <label>{{ isEn ? 'Growth Pill' : '增长率标签 (如 +138% MoM ↗)' }}</label>
                  <input v-model="milestoneState.growthPercent" type="text" />
                </div>
              </div>
              <div class="field-row">
                <label>{{ isEn ? 'Metric Description' : '指标说明文案' }}</label>
                <input v-model="milestoneState.metricLabel" type="text" />
              </div>
              <div class="field-row">
                <label>{{ isEn ? 'Founder Reflection / Quote' : '创始人感悟 / 引言' }}</label>
                <input v-model="milestoneState.founderQuote" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Themes & Styling -->
        <div class="control-section">
          <div class="section-title-between">
            <label class="section-title">
              <span>🎨</span> {{ isEn ? '3. Color Themes (20+)' : '3. 视觉主题调色盘 (20+ 款)' }}
            </label>
            <span class="pro-unlock-tag">
              {{ watermarkEnabled ? (isEn ? '🔓 8 Pro Themes Unlocked' : '🔓 8 款 Pro 主题已解锁') : (isEn ? '🔒 Pro Locked' : '🔒 Pro 锁定') }}
            </span>
          </div>

          <div class="theme-palette-grid">
            <button
              v-for="t in THEMES"
              :key="t.id"
              type="button"
              class="theme-thumb-btn"
              :class="{
                active: selectedThemeId === t.id,
                'pro-theme': t.isPro,
              }"
              :style="{ background: t.background }"
              @click="onSelectTheme(t)"
            >
              <span class="theme-name">{{ isEn ? t.nameEn : t.name }}</span>
              <span v-if="t.isPro" class="pro-pill">PRO</span>
            </button>
          </div>

          <!-- Fine-tuning Sliders -->
          <div class="sliders-grid">
            <div class="slider-item">
              <div class="slider-header">
                <span>{{ isEn ? 'Font Scale' : '文字字号缩放' }}</span>
                <span>{{ (fontSizeScale * 100).toFixed(0) }}%</span>
              </div>
              <input v-model.number="fontSizeScale" type="range" min="0.8" max="1.3" step="0.05" />
            </div>

            <div class="slider-item">
              <div class="slider-header">
                <span>{{ isEn ? 'Card Padding' : '卡片内边距' }}</span>
                <span>{{ cardPadding }}px</span>
              </div>
              <input v-model.number="cardPadding" type="range" min="16" max="64" step="4" />
            </div>

            <div class="slider-item">
              <div class="slider-header">
                <span>{{ isEn ? 'Border Radius' : '圆角大小' }}</span>
                <span>{{ borderRadius }}px</span>
              </div>
              <input v-model.number="borderRadius" type="range" min="0" max="36" step="2" />
            </div>
          </div>

          <div class="toggle-row">
            <label class="checkbox-label">
              <input v-model="showNoise" type="checkbox" />
              <span>{{ isEn ? 'Subtle Noise / Grain Texture' : '微噪点复古磨砂质感' }}</span>
            </label>
          </div>
        </div>

        <!-- Section 4: Brand Pill Anti-Collision & Value-Exchange -->
        <div class="control-section brand-exchange-box">
          <div class="brand-exchange-header">
            <div class="flex items-center gap-2">
              <span class="text-amber-400">✦</span>
              <span class="font-bold text-sm">
                {{ isEn ? 'Brand Pill Anti-Collision & Value-Exchange' : '品牌出处胶囊 (防平台水印遮挡)' }}
              </span>
            </div>
            <label class="switch-toggle">
              <input v-model="watermarkEnabled" type="checkbox" />
              <span class="slider round"></span>
            </label>
          </div>

          <p class="brand-exchange-desc">
            {{
              isEn
                ? 'Keep brand pill enabled to unlock all 8 exclusive Pro Themes and 4K Vector SVG export. Completely avoids Xiaohongshu bottom-right platform watermark.'
                : '保留优雅的出处胶囊，即可免费解锁全部 8 款独家 Pro 主题与 4K 矢量 SVG 导出。内缩 36px 定位，彻底免疫小红书右下角官方水印覆盖。'
            }}
          </p>

          <div v-if="watermarkEnabled" class="brand-position-select">
            <label>{{ isEn ? 'Position Inset' : '胶囊出现位置' }}:</label>
            <div class="flex gap-2">
              <button
                type="button"
                class="pos-btn"
                :class="{ active: brandPillPosition === 'top-right' }"
                @click="brandPillPosition = 'top-right'"
              >
                {{ isEn ? 'Top-Right Inset 36px' : '右上角内缩 36px (推荐)' }}
              </button>
              <button
                type="button"
                class="pos-btn"
                :class="{ active: brandPillPosition === 'bottom-center' }"
                @click="brandPillPosition = 'bottom-center'"
              >
                {{ isEn ? 'Bottom-Center Inset 36px' : '底部居中内缩 36px' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Section 5: SiliconFlow API Coupon Banner -->
        <div class="siliconflow-card">
          <div class="sf-icon">⚡</div>
          <div class="sf-text">
            <div class="sf-title">{{ isEn ? 'Need LLM Prompts for Social Cards?' : '需要大模型一键生成小红书爆款文案？' }}</div>
            <div class="sf-desc">{{ isEn ? 'Get free DeepSeek-V3 & FLUX API credits on SiliconFlow' : '注册硅基流动领取免费 DeepSeek-V3 与 FLUX 图像生成算力额度' }}</div>
          </div>
          <a
            :href="AFFILIATE_LINKS.siliconflow || 'https://cloud.siliconflow.cn/i/mxiALm95'"
            target="_blank"
            rel="noopener noreferrer"
            class="sf-btn"
          >
            {{ isEn ? 'Get Credits →' : '免费领取 →' }}
          </a>
        </div>
      </div>

      <!-- Right Column: Live Interactive Card Canvas & Action Bar -->
      <div class="preview-panel">
        <div class="preview-sticky-wrap">
          <!-- Live Preview Canvas Box -->
          <div class="preview-viewport-container">
            <div
              ref="previewContainerRef"
              class="card-preview-wrapper"
              :style="{
                aspectRatio: RATIO_OPTIONS.find((r) => r.key === selectedRatio)?.ratioCss || '3 / 4',
                background: currentTheme.background,
              }"
            >
              <!-- Noise Overlay -->
              <div v-if="showNoise" class="noise-overlay"></div>

              <!-- Brand Pill (Anti-Collision) -->
              <div
                v-if="watermarkEnabled"
                class="brand-pill"
                :class="brandPillPosition"
              >
                ✦ Designed with yunsin.top/cards
              </div>

              <!-- Inner Glass Card Surface -->
              <div
                class="card-inner-surface"
                :style="{
                  padding: `${cardPadding}px`,
                  borderRadius: `${borderRadius}px`,
                  background: currentTheme.surfaceBg,
                  borderColor: currentTheme.border,
                }"
              >
                <!-- Mode 1: Quote Preview -->
                <div v-if="selectedTemplate === 'quote'" class="quote-preview-content">
                  <div v-if="quoteState.tag" class="quote-tag-pill" :style="{ color: currentTheme.accentColor }">
                    {{ quoteState.tag }}
                  </div>
                  <div
                    class="quote-headline"
                    :style="{
                      color: currentTheme.textColor,
                      fontSize: `${1.75 * fontSizeScale}rem`,
                    }"
                  >
                    {{ quoteState.headline }}
                  </div>
                  <div
                    v-if="quoteState.bodyText"
                    class="quote-body"
                    :style="{ fontSize: `${1.05 * fontSizeScale}rem` }"
                  >
                    {{ quoteState.bodyText }}
                  </div>

                  <div class="quote-footer">
                    <div
                      class="author-avatar"
                      :style="{ background: currentTheme.accentColor }"
                    >
                      {{ quoteState.authorName.slice(0, 1) || 'Y' }}
                    </div>
                    <div class="author-info">
                      <div class="author-name" :style="{ color: currentTheme.textColor }">
                        {{ quoteState.authorName }}
                      </div>
                      <div class="author-title">{{ quoteState.authorTitle }}</div>
                    </div>
                  </div>
                </div>

                <!-- Mode 2: Tweet Preview -->
                <div v-if="selectedTemplate === 'tweet'" class="tweet-preview-content">
                  <div class="tweet-header">
                    <div
                      class="author-avatar"
                      :style="{ background: currentTheme.accentColor }"
                    >
                      {{ tweetState.authorName.slice(0, 1) || 'T' }}
                    </div>
                    <div class="tweet-user-meta">
                      <div class="name-row">
                        <span class="user-name" :style="{ color: currentTheme.textColor }">{{ tweetState.authorName }}</span>
                        <span v-if="tweetState.verified" class="verified-badge">✓</span>
                      </div>
                      <div class="user-handle">{{ tweetState.authorHandle }}</div>
                    </div>
                  </div>

                  <div
                    class="tweet-body-text"
                    :style="{
                      color: currentTheme.textColor,
                      fontSize: `${1.15 * fontSizeScale}rem`,
                    }"
                  >
                    {{ tweetState.content }}
                  </div>

                  <div class="tweet-timestamp">{{ tweetState.timestamp }}</div>

                  <div class="tweet-stats-row" :style="{ color: currentTheme.textColor }">
                    <span>💬 {{ tweetState.replies }}</span>
                    <span>🔁 {{ tweetState.retweets }}</span>
                    <span>❤️ {{ tweetState.likes }}</span>
                  </div>
                </div>

                <!-- Mode 3: Geek Code Preview -->
                <div v-if="selectedTemplate === 'geek-code'" class="code-preview-content">
                  <div class="mac-header-bar">
                    <div v-if="codeState.showMacButtons" class="mac-dots">
                      <span class="dot dot-red"></span>
                      <span class="dot dot-yellow"></span>
                      <span class="dot dot-green"></span>
                    </div>
                    <div class="mac-filename">{{ codeState.fileName }}</div>
                  </div>

                  <div class="code-body-scroll font-mono" :style="{ fontSize: `${0.85 * fontSizeScale}rem` }">
                    <div v-for="(lineTokens, idx) in tokenizedLines" :key="idx" class="code-line">
                      <span v-if="codeState.showLineNumbers" class="line-no">{{ idx + 1 }}</span>
                      <span class="line-code">
                        <span
                          v-for="(tok, tIdx) in lineTokens"
                          :key="tIdx"
                          :class="`tok-${tok.type}`"
                        >{{ tok.text }}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Mode 4: Milestone Preview -->
                <div v-if="selectedTemplate === 'milestone'" class="milestone-preview-content">
                  <div class="milestone-badge" :style="{ color: currentTheme.accentColor }">
                    {{ milestoneState.badgeText }}
                  </div>
                  <div class="milestone-title" :style="{ color: currentTheme.textColor }">
                    {{ milestoneState.title }}
                  </div>

                  <div class="milestone-hero-row">
                    <div
                      class="hero-metric"
                      :style="{
                        color: currentTheme.accentColor,
                        fontSize: `${3.2 * fontSizeScale}rem`,
                      }"
                    >
                      {{ milestoneState.metricValue }}
                    </div>
                    <div class="growth-pill">{{ milestoneState.growthPercent }}</div>
                  </div>

                  <div class="metric-label-text">{{ milestoneState.metricLabel }}</div>

                  <div class="sub-metrics-grid">
                    <div
                      v-for="(sub, sIdx) in milestoneState.subMetrics"
                      :key="sIdx"
                      class="sub-card"
                    >
                      <div class="sub-val" :style="{ color: currentTheme.textColor }">{{ sub.value }}</div>
                      <div class="sub-lbl">{{ sub.label }}</div>
                    </div>
                  </div>

                  <div v-if="milestoneState.founderQuote" class="founder-quote-box">
                    <div class="quote-text">“{{ milestoneState.founderQuote }}”</div>
                    <div class="quote-author" :style="{ color: currentTheme.accentColor }">
                      — {{ milestoneState.authorName }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons: PNG, WebP, SVG, Copy -->
          <div class="action-export-bar">
            <button
              type="button"
              class="export-btn primary-btn"
              :disabled="isExporting"
              @click="downloadPng"
            >
              <span>📥</span>
              <span>{{ isEn ? 'Download HD PNG' : '下载高清 PNG (2x)' }}</span>
            </button>

            <button
              type="button"
              class="export-btn secondary-btn"
              :disabled="isExporting"
              @click="copyToClipboard"
            >
              <span>📋</span>
              <span>{{ isEn ? 'Copy Image' : '复制到剪贴板' }}</span>
            </button>

            <button
              type="button"
              class="export-btn ghost-btn"
              :disabled="isExporting"
              @click="downloadWebp"
            >
              <span>⚡</span>
              <span>{{ isEn ? 'WebP (Lightweight)' : '下载 WebP (极轻)' }}</span>
            </button>

            <button
              type="button"
              class="export-btn svg-btn"
              :disabled="!watermarkEnabled"
              :title="watermarkEnabled ? 'Export 4K Vector' : 'Enable brand pill to unlock 4K SVG'"
              @click="downloadSvg"
            >
              <span>💎</span>
              <span>{{ isEn ? '4K SVG Vector' : '4K 矢量 SVG' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tier 2 Template Pack Drawer / Modal -->
    <div v-if="showTemplateModal" class="template-modal-overlay" @click.self="showTemplateModal = false">
      <div class="template-modal-card">
        <div class="modal-header">
          <div class="flex items-center gap-2">
            <span class="text-xl">✨</span>
            <h3 class="modal-title">
              {{ isEn ? '100+ Pro Social Card Presets & JSON Pack' : '100+ 自媒体爆款排版预设与主题 JSON 配置文件包' }}
            </h3>
          </div>
          <button type="button" class="close-modal-btn" @click="showTemplateModal = false">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-desc">
            {{
              isEn
                ? 'Designed for creators, solopreneurs, and tech writers. Import directly into this studio with one click to get 100+ hand-crafted layout configurations.'
                : '专为独立创作者、出海独立黑客与技术写作者打磨。支持一键导入本工坊直接复用，内含 6 大行业核心视觉资产与自媒体爆款排版参数。'
            }}
          </p>

          <!-- 6 Sample Presets Interactive Previews -->
          <div class="sample-presets-grid">
            <button
              v-for="(p, pIdx) in PREMIUM_PRESETS"
              :key="pIdx"
              type="button"
              class="preset-sample-card"
              :class="{ active: activeSamplePreset === pIdx }"
              @click="activeSamplePreset = pIdx"
            >
              <div class="sample-ratio-tag">{{ p.ratio }}</div>
              <div class="sample-title">{{ p.title }}</div>
              <div class="sample-desc">{{ p.description }}</div>
            </button>
          </div>

          <div class="checkout-actions-row">
            <!-- Mianbaoduo Dual Checkout (CNY) -->
            <a
              href="https://mianbaoduo.com/o/bread/placeholder-cards"
              target="_blank"
              rel="noopener noreferrer"
              class="checkout-btn mianbaoduo-btn"
            >
              <span>🥖</span>
              <span>微信 / 支付宝 极速购买 (¥19.9)</span>
            </a>

            <!-- Gumroad Dual Checkout (USD) -->
            <a
              href="https://gumroad.com/l/placeholder-cards"
              target="_blank"
              rel="noopener noreferrer"
              class="checkout-btn gumroad-btn"
            >
              <span>💳</span>
              <span>Credit Card / Apple Pay ($4.99)</span>
            </a>
          </div>

          <div class="legal-note">
            {{
              isEn
                ? 'Instant digital download • Commercial use permitted • Lifetime updates • 100% money-back satisfaction'
                : '即时数字资产下载 · 包含完整商业授权 · 永久免费更新 · 提供 100% 格式导入保障'
            }}
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toastVisible" class="toast-notification">
      {{ toastMsg }}
    </div>
  </div>
</template>

<style scoped>
.social-card-tool-root {
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3.5rem;
  color: var(--text-primary);
}

/* Intro Banner */
.tool-intro-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 1.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  margin-bottom: 2rem;
}

.tool-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
}

.tool-subtitle {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin-top: 0.4rem;
  margin-bottom: 0;
}

.intro-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.template-pack-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.template-pack-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.canva-partner-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  background: rgba(56, 189, 248, 0.12);
  color: #0284c7;
  border: 1px solid rgba(56, 189, 248, 0.35);
  font-size: 0.88rem;
  font-weight: 600;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.15s ease;
}

.canva-partner-btn:hover {
  background: rgba(56, 189, 248, 0.2);
}

/* Workspace Grid */
.workspace-grid {
  display: grid;
  grid-template-columns: 460px 1fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

/* Left Controls */
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-section {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.25rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.98rem;
  font-weight: 700;
  margin-bottom: 0.9rem;
  color: var(--text-primary);
}

.section-title-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}

.pro-unlock-tag {
  font-size: 0.78rem;
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
}

/* Ratio Grid */
.ratio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.ratio-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.65rem 0.8rem;
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ratio-card:hover {
  border-color: var(--accent);
}

.ratio-card.active {
  border-color: var(--accent);
  background: rgba(59, 130, 246, 0.08);
}

.ratio-badge {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.ratio-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: monospace;
  margin-top: 2px;
}

.ratio-desc {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.25;
}

/* Template Tabs */
.template-selector-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.tab-btn {
  padding: 0.5rem 0.2rem;
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
}

/* Form inputs */
.template-form-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-row label,
.field-grid-2 label,
.field-grid-3 label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.field-row input,
.field-row textarea,
.field-grid-2 input,
.field-grid-3 input,
.field-grid-2 select {
  width: 100%;
  padding: 0.55rem 0.75rem;
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.field-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.field-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--text-primary);
  cursor: pointer;
}

/* Theme Palette Grid */
.theme-palette-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.theme-thumb-btn {
  position: relative;
  height: 52px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 4px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.theme-thumb-btn:hover {
  transform: scale(1.03);
}

.theme-thumb-btn.active {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
}

.theme-name {
  font-size: 0.65rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pro-pill {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.55rem;
  font-weight: 800;
  padding: 1px 4px;
  background: #f59e0b;
  color: #000;
  border-radius: 4px;
}

/* Sliders */
.sliders-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.5rem;
}

.slider-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.slider-item input[type='range'] {
  width: 100%;
}

/* Brand Exchange Box */
.brand-exchange-box {
  background: rgba(245, 158, 11, 0.04);
  border-color: rgba(245, 158, 11, 0.25);
}

.brand-exchange-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-exchange-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0.6rem 0 0.8rem;
}

.brand-position-select {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.pos-btn {
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
}

.pos-btn.active {
  border-color: var(--accent);
  color: var(--text-primary);
  font-weight: 600;
}

/* Switch Toggle */
.switch-toggle {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
}

.switch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider.round {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #4b5563;
  transition: 0.2s;
  border-radius: 24px;
}

.slider.round:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider.round {
  background-color: #10b981;
}

input:checked + .slider.round:before {
  transform: translateX(18px);
}

/* SiliconFlow Card */
.siliconflow-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: rgba(14, 165, 233, 0.08);
  border: 1px dashed rgba(14, 165, 233, 0.3);
  border-radius: 12px;
}

.sf-icon {
  font-size: 1.5rem;
}

.sf-text {
  flex: 1;
}

.sf-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.sf-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.sf-btn {
  padding: 0.4rem 0.75rem;
  background: #0284c7;
  color: #fff;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

/* Right Column: Preview */
.preview-sticky-wrap {
  position: sticky;
  top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.preview-viewport-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0b0f19;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  min-height: 540px;
  overflow: hidden;
}

.card-preview-wrapper {
  position: relative;
  width: 100%;
  max-width: 580px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 0);
  background-size: 8px 8px;
  pointer-events: none;
  opacity: 0.4;
}

/* Brand Pill */
.brand-pill {
  position: absolute;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  pointer-events: none;
  z-index: 20;
}

.brand-pill.top-right {
  top: 18px;
  right: 18px;
}

.brand-pill.bottom-center {
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
}

.card-inner-surface {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid;
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

/* Quote Layout */
.quote-preview-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.quote-tag-pill {
  display: inline-block;
  align-self: flex-start;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.quote-headline {
  font-weight: 800;
  line-height: 1.35;
  margin-bottom: 0.8rem;
}

.quote-body {
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.6;
}

.quote-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.author-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #ffffff;
  font-size: 1.1rem;
}

.author-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.author-title {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Tweet Layout */
.tweet-preview-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tweet-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.user-name {
  font-weight: 800;
  font-size: 0.95rem;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #38bdf8;
  color: #000;
  font-size: 10px;
  font-weight: 900;
}

.user-handle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.tweet-body-text {
  line-height: 1.55;
  white-space: pre-line;
}

.tweet-timestamp {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.tweet-stats-row {
  display: flex;
  gap: 1.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Code Layout */
.code-preview-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mac-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 0.75rem;
}

.mac-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.dot-red { background: #ff5f56; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #27c93f; }

.mac-filename {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.7);
}

.code-body-scroll {
  overflow-x: auto;
  line-height: 1.6;
}

.code-line {
  display: flex;
  gap: 0.8rem;
}

.line-no {
  color: rgba(255, 255, 255, 0.3);
  user-select: none;
}

.line-code {
  white-space: pre;
}

.tok-keyword { color: #f472b6; font-weight: 600; }
.tok-string { color: #a7f3d0; }
.tok-number { color: #facc15; }
.tok-comment { color: #94a3b8; font-style: italic; }
.tok-type { color: #38bdf8; }
.tok-punct { color: rgba(255, 255, 255, 0.6); }

/* Milestone Layout */
.milestone-preview-content {
  display: flex;
  flex-direction: column;
}

.milestone-badge {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}

.milestone-title {
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.3;
}

.milestone-hero-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-top: 1rem;
}

.hero-metric {
  font-weight: 900;
  line-height: 1;
}

.growth-pill {
  font-size: 0.95rem;
  font-weight: 800;
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
}

.metric-label-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.35rem;
}

.sub-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
  margin-top: 1.25rem;
}

.sub-card {
  background: rgba(255, 255, 255, 0.07);
  padding: 0.65rem;
  border-radius: 10px;
}

.sub-val {
  font-size: 1.1rem;
  font-weight: 800;
}

.sub-lbl {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.founder-quote-box {
  margin-top: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.quote-text {
  font-style: italic;
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.85);
}

.quote-author {
  font-size: 0.78rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

/* Action Export Bar */
.action-export-bar {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 0.65rem;
}

@media (max-width: 640px) {
  .action-export-bar {
    grid-template-columns: 1fr 1fr;
  }
}

.export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem 0.8rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.primary-btn {
  background: var(--accent);
  color: #ffffff;
}

.primary-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.secondary-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.secondary-btn:hover {
  border-color: var(--accent);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
}

.ghost-btn:hover {
  color: var(--text-primary);
}

.svg-btn {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #c084fc;
}

.svg-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Template Pack Modal */
.template-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.template-modal-card {
  width: 100%;
  max-width: 680px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 1.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.sample-presets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-bottom: 1.5rem;
}

.preset-sample-card {
  padding: 0.75rem;
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
}

.preset-sample-card.active {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.sample-ratio-tag {
  font-size: 0.7rem;
  font-weight: 700;
  color: #f59e0b;
}

.sample-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 2px;
}

.sample-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.checkout-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

@media (max-width: 640px) {
  .checkout-actions-row {
    grid-template-columns: 1fr;
  }
}

.checkout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  transition: transform 0.15s ease;
}

.mianbaoduo-btn {
  background: #10b981;
  color: #ffffff;
}

.gumroad-btn {
  background: #ff5277;
  color: #ffffff;
}

.legal-note {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
}

/* Toast */
.toast-notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 0.75rem 1.25rem;
  background: rgba(15, 23, 42, 0.95);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
