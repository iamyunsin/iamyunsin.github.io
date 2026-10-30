export const SITE = {
  title: '原心的个人主页',
  titleEn: "Yunsin's Tech & Indie Tools",
  description: '原心的个人博客与极客工具箱，专注Web、Web3、Rust Wasm、小程序和App等领域技术分享与高效工具',
  descriptionEn: 'Pure client-side developer utilities, AI calculators, and technical articles powered by Astro, Vue 3, and Rust WebAssembly.',
  logo: '/site-images/avatar.jpeg',
  domain: 'https://yunsin.top',
};

export const AUTHOR = {
  name: '原心',
  avatar: '/site-images/avatar.jpeg',
  motto: '贵有恒，何必三更起五更眠',
  description: '前端开发工程师，专注Web、web3、小程序和App等技术领域',
  juejin: 'https://juejin.cn/user/3227821870955495',
  github: 'https://github.com/iamyunsin/',
  email: 'mailto:yunsin@vip.qq.com',
  wechat: '/site-images/wechat-qr.png',
};

/**
 * 免费无感统计配置（零服务器维护成本）
 * - cloudflareToken: 在 Cloudflare Dashboard -> Web Analytics 免费获取
 * - clarityProjectId: 在 https://clarity.microsoft.com 免费创建项目获取（支持点击热力图与录屏）
 */
export const ANALYTICS = {
  cloudflareToken: import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN || '',
  clarityProjectId: import.meta.env.PUBLIC_CLARITY_PROJECT_ID || '',
};

/**
 * 自动化广告位配置（支持按语言自动分发）
 * - adsenseClient: Google AdSense Publisher ID (如 ca-pub-xxxxxxxxxxxxxxxx)
 * - wwadsId: 万维广告单元 ID（面向中文开发者流量）
 * - ethicalAdsPublisher: EthicalAds Publisher ID（面向英文开发者流量）
 * - aadsUnitId: A-Ads 加密广告位 ID（面向 Web3 工具页，免审收 USDT）
 */
export const ADS_CONFIG = {
  adsenseClient: import.meta.env.PUBLIC_ADSENSE_CLIENT || '',
  adsenseSlotHorizontal: import.meta.env.PUBLIC_ADSENSE_SLOT_H || '',
  wwadsId: import.meta.env.PUBLIC_WWADS_ID || '',
  ethicalAdsPublisher: import.meta.env.PUBLIC_ETHICAL_ADS_ID || '',
  aadsUnitId: import.meta.env.PUBLIC_AADS_UNIT_ID || '',
};

export interface ToolItem {
  id: string;
  slug: string;
  category: 'ai-cost' | 'media-doc' | 'dev-network' | 'web3';
  status: 'live' | 'coming-soon';
  badge: string;
  badgeEn: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  pathZh: string;
  pathEn: string;
  wasmPowered: boolean;
}

// 极客工具箱注册表（中英双语）
export const TOOLS: ToolItem[] = [
  {
    id: 'llm-cost-calculator',
    slug: 'llm-cost-calculator',
    category: 'ai-cost',
    status: 'live',
    badge: '🔥 热门 · Rust Wasm',
    badgeEn: '🔥 Hot · Rust Wasm',
    title: '全球大模型 (LLM API) Token 分词可视化与成本对比计算器',
    titleEn: 'LLM API Token Visualizer & Real-Time Pricing Calculator',
    description: '100% 浏览器本地分词切片与缓存命中成本精算，实时对比 GPT-4o、Claude 3.7、Gemini 2.5、DeepSeek-V3/R1 与千问 Qwen 月度 API 账单。',
    descriptionEn: '100% local Rust Wasm BPE/CJK token slicing and prompt-caching cost calculator across OpenAI, Claude, Gemini, DeepSeek, and Qwen.',
    pathZh: '/tools/llm-cost-calculator/',
    pathEn: '/en/tools/llm-cost-calculator/',
    wasmPowered: true,
  },
  {
    id: 'image-converter',
    slug: 'image-converter',
    category: 'media-doc',
    status: 'coming-soon',
    badge: '即将上线 · 隐私级',
    badgeEn: 'Soon · 100% Local',
    title: '100% 本地隐私级 HEIC / AVIF / WebP 批量互转与压缩工作台',
    titleEn: 'Private Bulk HEIC / AVIF / WebP Converter & EXIF Remover',
    description: '基于 Rust Wasm 与多线程 Web Worker，文件绝不上传服务器，支持百张图片秒级转换与一键抹除 GPS 隐私信息。',
    descriptionEn: 'Batch convert and compress HEIC, AVIF, WebP, and PNG locally in your browser with zero server uploads and one-click EXIF stripping.',
    pathZh: '/tools/',
    pathEn: '/en/tools/',
    wasmPowered: true,
  },
  {
    id: 'deeplink-tester',
    slug: 'deeplink-tester',
    category: 'dev-network',
    status: 'coming-soon',
    badge: '即将上线 · 博客联动',
    badgeEn: 'Soon · Dev Tool',
    title: 'App 唤醒 (DeepLink / Universal Links / App Links) 配置生成与扫码调试器',
    titleEn: 'Universal Links (AASA) & Android AssetLinks Generator & QR Tester',
    description: '一站式生成并校验 iOS apple-app-site-association 与 Android assetlinks.json，实时生成真机扫码唤醒测试页。',
    descriptionEn: 'Validate apple-app-site-association and assetlinks.json schemas and generate instant QR codes for mobile deep-link testing.',
    pathZh: '/tools/',
    pathEn: '/en/tools/',
    wasmPowered: true,
  },
  {
    id: 'web3-rpc-tester',
    slug: 'web3-rpc-tester',
    category: 'web3',
    status: 'coming-soon',
    badge: '即将上线 · Web3',
    badgeEn: 'Soon · Web3',
    title: '多链 RPC 节点真实延迟测速 & 交易 Calldata / ABI 离线解码器',
    titleEn: 'Multi-Chain RPC Latency Benchmark & Offline Calldata Decoder',
    description: '无需连接钱包，纯本地测试 Ethereum / Solana / Base / Arbitrum 节点延迟并离线解析未知十六进制交易 Calldata。',
    descriptionEn: 'Benchmark EVM & Solana RPC endpoints from your browser and decode raw transaction calldata offline without connecting a wallet.',
    pathZh: '/tools/',
    pathEn: '/en/tools/',
    wasmPowered: true,
  },
];

// 小实验模块
export const EXPERIMENTS = [
  {
    name: 'Vue',
    list: [{
      title: 'Vue3编译过程可视化工具',
      path: '/experiments/vue/vue3-compilation-visualization',
    }]
  },
];
