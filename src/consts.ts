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

/**
 * 全站 CPS 推广返佣链接集中配置中心（只需在此处替换为带你自己推广后缀的链接，全站中英文工具页自动生效）
 * - tencentCloud: 腾讯云推广者（云大使）专属链接，申请地址：https://cloud.tencent.com/act/partner/cps
 * - aliyunBailian: 阿里云云大使专属链接（带 ?userCode=xxxx），申请地址：https://dashi.aliyun.com/
 * - vultr: Vultr 推荐链接（带 ?ref=xxxxxx），登录 https://my.vultr.com/ 后在 Account -> Referrals 获取
 * - openrouter: 硅基流动（https://cloud.siliconflow.cn/）或 OpenRouter 聚合网关邀请链接
 * - cloudflareR2 / cloudflareWorkers / cloudflareAi: Cloudflare 落地页或推荐链接
 * - ledger: OneKey（https://onekey.so/）或 Ledger（https://affiliate.ledger.com/）硬件钱包推广链接
 * - alchemy: Alchemy 节点推荐链接，获取地址：https://www.alchemy.com/
 * - quicknode: QuickNode 推荐链接，登录 https://dashboard.quicknode.com/ 后台获取 Referral Link
 */
export const AFFILIATE_LINKS = {
  tencentCloud: 'https://cloud.tencent.com/act/cps/redirect?redirect=2446',
  aliyunBailian: 'https://www.aliyun.com/product/bailian',
  vultr: 'https://www.vultr.com/',
  openrouter: 'https://openrouter.ai/',
  cloudflareR2: 'https://www.cloudflare.com/products/r2/',
  cloudflareWorkers: 'https://www.cloudflare.com/products/workers/',
  cloudflareAi: 'https://www.cloudflare.com/products/ai-gateway/',
  ledger: 'https://onekey.so/',
  alchemy: 'https://www.alchemy.com/',
  quicknode: 'https://www.quicknode.com/',
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
    status: 'live',
    badge: '🔒 100% 本地 · 隐私级',
    badgeEn: '🔒 100% Local · Private',
    title: '100% 本地隐私级 WebP / AVIF / PNG / JPEG 批量转换压缩与 EXIF 擦除工作台',
    titleEn: 'Private Bulk WebP / AVIF / JPEG Converter, Compressor & EXIF Remover',
    description: '基于 23 KB Rust Wasm 引擎，文件绝不上传服务器，支持无限量图片拖拽转换、色彩量化极限压缩与一键清除 GPS 拍摄位置隐私。',
    descriptionEn: 'Batch convert and compress images locally in your browser via Rust Wasm with zero server uploads and automatic GPS/EXIF metadata stripping.',
    pathZh: '/tools/image-converter/',
    pathEn: '/en/tools/image-converter/',
    wasmPowered: true,
  },
  {
    id: 'deeplink-tester',
    slug: 'deeplink-tester',
    category: 'dev-network',
    status: 'live',
    badge: '📱 移动开发 · 博客联动',
    badgeEn: '📱 Mobile Dev · Rust Wasm',
    title: 'App 唤醒 (DeepLink / Universal Links / App Links) 配置生成与扫码调试器',
    titleEn: 'Universal Links (AASA) & Android AssetLinks Compiler & QR Tester',
    description: '一站式编译并校验 iOS apple-app-site-association、Android assetlinks.json 与微信防拦截 H5 唤醒脚本，实时生成真机扫码测试矩阵。',
    descriptionEn: 'Compile and validate apple-app-site-association, assetlinks.json, and smart H5 fallback scripts with instant QR code mobile testing.',
    pathZh: '/tools/deeplink-tester/',
    pathEn: '/en/tools/deeplink-tester/',
    wasmPowered: true,
  },
  {
    id: 'web3-rpc-tester',
    slug: 'web3-rpc-tester',
    category: 'web3',
    status: 'live',
    badge: '🛡️ 免连钱包 · 离线安全',
    badgeEn: '🛡️ No Wallet · Offline Safe',
    title: '多链 RPC 节点真实延迟测速 & 交易 Calldata / ABI 离线安全解码器',
    titleEn: 'Multi-Chain RPC Latency Benchmark & Offline Calldata Security Decoder',
    description: '无需连接钱包，纯浏览器直测 Ethereum / Solana / Base / Arbitrum 节点真实延迟，并通过 Rust Wasm 离线解码未知 Calldata 与高危无限授权预警。',
    descriptionEn: 'Benchmark EVM & Solana RPC latency directly from your browser and decode raw transaction calldata offline with unlimited-approval risk alerts.',
    pathZh: '/tools/web3-rpc-tester/',
    pathEn: '/en/tools/web3-rpc-tester/',
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
