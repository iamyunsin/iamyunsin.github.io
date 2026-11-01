export const SITE = {
  title: '原心的个人主页',
  titleEn: "Yunsin's Tech & Indie Tools",
  description: '原心的个人博客与全能在线工具箱，提供100%浏览器本地运行的视频转GIF、视频抽帧、房贷车贷计算器、二维码条形码生成识别及极客原理实验室',
  descriptionEn: '100% client-side online tools, multimedia converters, financial calculators, QR/barcode studio, and interactive engineering labs powered by Astro, Vue 3, and Rust WebAssembly.',
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
  wechatReward: '/site-images/wechat-reward.png',
};

/**
 * 免费无感统计配置（零服务器维护成本）
 * - cloudflareToken: 在 Cloudflare Dashboard -> Web Analytics 免费获取
 * - clarityProjectId: 在 https://clarity.microsoft.com 免费创建项目获取（支持点击热力图与录屏）
 */
export const ANALYTICS = {
  cloudflareToken: import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN || '813b1177101b4dd9a1fe1be47f5c2154',
  clarityProjectId: import.meta.env.PUBLIC_CLARITY_PROJECT_ID || 'z69eg55m99',
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
 */
export const AFFILIATE_LINKS = {
  tencentCloud: 'https://cloud.tencent.com/act/cps/redirect?redirect=2446&cps_key=36215a0a94cd9bd656589c958fdee45b&from=console',
  tencentCloudLighthouse: 'https://cloud.tencent.com/act/cps/redirect?redirect=5333&cps_key=36215a0a94cd9bd656589c958fdee45b&from=console',
  tencentCloudAi: 'https://cloud.tencent.com/act/cps/redirect?redirect=6880&cps_key=36215a0a94cd9bd656589c958fdee45b&from=console',
  aliyun: 'https://www.aliyun.com/minisite/goods?userCode=o0amjn4j',
  aliyunDiscount: 'https://www.aliyun.com/minisite/goods?userCode=o0amjn4j',
  aliyunBailian: 'https://www.aliyun.com/benefit?userCode=o0amjn4j',
  aliyunAigc: 'https://dashi.aliyun.com/activity/aigc?userCode=o0amjn4j',
  siliconflow: 'https://cloud.siliconflow.cn/i/mxiALm95',
  vultr: 'https://www.aliyun.com/minisite/goods?userCode=o0amjn4j',
  openrouter: 'https://cloud.siliconflow.cn/i/mxiALm95',
  cloudflareR2: 'https://www.cloudflare.com/products/r2/',
  cloudflareWorkers: 'https://www.cloudflare.com/products/workers/',
  cloudflareAi: 'https://www.cloudflare.com/products/ai-gateway/',
  ledger: 'https://onekey.so/r/T1HD5Q',
  alchemy: 'https://www.alchemy.com/',
  quicknode: 'https://quicknode.com/signup?via=alan-turing',
  wiseBusiness: 'https://wise.com/zh-cn/business/',
  payoneer: 'https://www.payoneer.com.cn/',
  lianlianGlobal: 'https://global.lianlianpay.com/',
  airwallex: 'https://www.airwallex.com.cn/',
  stripeAtlas: 'https://stripe.com/atlas',
  shopifyPartner: 'https://www.shopify.com/partners',
  canvaPro: 'https://www.canva.com/pro/',
  mianbaoduo: 'https://mbd.pub/',
  afdian: 'https://afdian.com/',
  gumroad: 'https://gumroad.com/',
  lemonSqueezy: 'https://www.lemonsqueezy.com/',
  beehiiv: 'https://www.beehiiv.com/',
  buyMeACoffee: 'https://www.buymeacoffee.com/',
};

export interface DigitalProduct {
  id: string;
  name: string;
  nameEn: string;
  priceCny: number;
  priceUsd: number;
  description: string;
  descriptionEn: string;
  checkoutUrlZh: string;
  checkoutUrlEn: string;
  badge?: string;
  badgeEn?: string;
}

export const DIGITAL_PRODUCTS: Record<string, DigitalProduct> = {
  socialCardPresets: {
    id: 'social-card-presets',
    name: '100+ 款自媒体爆款卡片排版预设与主题 JSON 配置文件',
    nameEn: '100+ Viral Social Card Presets & Theme JSON Bundle',
    priceCny: 19.9,
    priceUsd: 4.99,
    description: '内含小红书高粉金句、Twitter 爆款推文、macOS 磨砂代码窗与里程碑大字报等 100+ 套精调矢量排版方案，即导即用。',
    descriptionEn: 'Curated 100+ viral layout presets for Xiaohongshu, Twitter/X, macOS frosted code windows, and milestone posters.',
    checkoutUrlZh: '',
    checkoutUrlEn: '',
    badge: '🔥 热销爆品',
    badgeEn: '🔥 Best Seller',
  },
  freelanceContractsPack: {
    id: 'freelance-contracts-pack',
    name: '自由职业者双语外包服务合同范本与防拖欠催款话术包',
    nameEn: 'Freelance Bilingual Contract Templates & Debt Recovery Pack',
    priceCny: 29.0,
    priceUsd: 5.99,
    description: '涵盖知识产权归属、分期里程碑验收付款、汇率浮动补偿条款及中英文催款邮件话术库，由涉外律师校订。',
    descriptionEn: 'Standard bilingual contract templates, milestone payment schedules, intellectual property clauses, and payment reminder scripts.',
    checkoutUrlZh: '',
    checkoutUrlEn: '',
    badge: '🛡️ 法务自保',
    badgeEn: '🛡️ Legal Shield',
  },
  crossBorderFxModel: {
    id: 'cross-border-fx-model',
    name: '2026 全球跨境收款与电汇隐性汇损动态对比 Excel 动态核算模型',
    nameEn: 'Global Cross-Border Payment FX & Fee Dynamic Excel Model',
    priceCny: 29.0,
    priceUsd: 5.99,
    description: '穿透 PayPal、Stripe、Wise、Payoneer 阶梯汇损与中转行费用，内置 12 大跨境收款通道全景穿透公式与反向倒推宏。',
    descriptionEn: 'In-depth financial Excel model analyzing hidden FX markups, tiered commissions, and reverse gross-up billing across 12 channels.',
    checkoutUrlZh: '',
    checkoutUrlEn: '',
    badge: '📊 精算底表',
    badgeEn: '📊 Financial Model',
  },
  saasBpDueDiligence: {
    id: 'saas-bp-dueDiligence',
    name: 'Micro-SaaS 商业计划书与项目并购尽调财务底稿 (Notion + Excel)',
    nameEn: 'Micro-SaaS Pitch Deck & M&A Due Diligence Financial Model',
    priceCny: 29.0,
    priceUsd: 5.99,
    description: '专为出海独立开发者打造，包含 ARR 估值乘数拆解、净流失 Cohort 留存分析表与 Acquire.com 项目转让尽调审查清单。',
    descriptionEn: 'Complete financial due diligence toolkit for SaaS founders: Cohort retention matrices, ARR valuation multiples, and M&A checklists.',
    checkoutUrlZh: '',
    checkoutUrlEn: '',
    badge: '🚀 极客并购',
    badgeEn: '🚀 M&A Toolkit',
  },
  polyglotAstPlaybook: {
    id: 'polyglot-ast-playbook',
    name: '全栈多语言类型生成与生产级 API Schema 设计实战指引',
    nameEn: 'Full-Stack Type Generation & Production Schema Design Playbook',
    priceCny: 19.9,
    priceUsd: 4.99,
    description: '深度剖析 JSON/SQL 到 TypeScript/Go/Rust/Zod 的类型映射陷阱、空安全边界、严苛反序列化与性能基准工程实践。',
    descriptionEn: 'Practical engineering guide on type conversion pitfalls, null safety, zero-copy deserialization, and schema validation.',
    checkoutUrlZh: '',
    checkoutUrlEn: '',
    badge: '⚡ 极客架构',
    badgeEn: '⚡ Architecture',
  },
};

export interface RelatedPostLink {
  title: string;
  titleEn: string;
  url: string;
}

export type ToolGroupId =
  | 'media'
  | 'calculator'
  | 'daily-qr'
  | 'creator-biz'
  | 'dev-ai-web3'
  | 'principle-lab';

export interface ToolCategoryMeta {
  id: ToolGroupId;
  icon: string;
  shortTitle: string;
  shortTitleEn: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
}

export const TOOL_CATEGORIES: ToolCategoryMeta[] = [
  {
    id: 'media',
    icon: '🎬',
    shortTitle: '多媒体与图文',
    shortTitleEn: 'Media & Image',
    title: '🎬 多媒体与图文处理工坊 (Multimedia & Image Studio)',
    titleEn: '🎬 Multimedia, Video, GIF & Image Processing Studio',
    description: '100% 浏览器本地硬件加速，涵盖视频转 GIF、高清逐帧截图、音视频格式转换、GIF 拆帧编辑、证件照换底控 KB 与防盗用水印',
    descriptionEn: 'Zero-upload local video-to-GIF converter, frame extractor, video/audio transcoder, GIF editor, ID photo sizer, and privacy watermark tools',
  },
  {
    id: 'calculator',
    icon: '🧮',
    shortTitle: '金融与计算器',
    shortTitleEn: 'Finance & Calculators',
    title: '🧮 金融与生活精算器 (Finance, Loan & Life Calculators)',
    titleEn: '🧮 Financial, Mortgage, Auto Loan & Life Calculators',
    description: '直击算账痛点：提前还房贷划算度决策、购车落地价与车贷套路揭秘、分期真实年化利率 (IRR) 照妖镜、年终奖避税盲区、满减凑单与 FIRE 退休模拟',
    descriptionEn: 'High-precision calculators for mortgage prepayment, auto loan true APR & EV TCO, IRR cashflows, salary/bonus tax cliffs, bill splitting, and FIRE retirement',
  },
  {
    id: 'daily-qr',
    icon: '📱',
    shortTitle: '二维码与日常办公',
    shortTitleEn: 'QR, Barcode & Office',
    title: '📱 二维码/条码与日常办公神器 (QR, Barcode & Daily Office)',
    titleEn: '📱 QR Code, Bulk Barcode, Local PDF & Daily Utilities',
    description: '永久免费免登录：美化二维码/WiFi码/挪车码生成与解码、电商条形码批量 A4 排版打印、纯本地 PDF 拆分转长图、手写签名抠图与屏幕键鼠验机',
    descriptionEn: 'Custom QR studio & scanner, bulk EAN/Code128 barcode A4 sheet printer, 100% local PDF toolkit, transparent signature extractor, and hardware screen tester',
  },
  {
    id: 'creator-biz',
    icon: '💼',
    shortTitle: '创作者与跨境商业',
    shortTitleEn: 'Creator & Business',
    title: '💼 自媒体创作者与跨境独立商业 (Creator & Indie Business)',
    titleEn: '💼 Creator Studio, Invoicing & Cross-Border Business',
    description: '小红书/Twitter 爆款社交分享卡片排版、自由职业者双语报价单/商业发票 PDF、全球跨境收款隐性汇损精算与 Micro-SaaS 估值沙盘',
    descriptionEn: 'Social share card generator, private freelance quote/invoice PDF maker, global cross-border FX fee calculator, and Micro-SaaS valuation sandbox',
  },
  {
    id: 'dev-ai-web3',
    icon: '⚡',
    shortTitle: '开发者、AI 与 Web3',
    shortTitleEn: 'Dev, AI & Web3',
    title: '⚡ 开发者、AI 算力与 Web3 安全 (Developer, AI & Web3)',
    titleEn: '⚡ Developer Utilities, LLM Pricing & Web3 Security',
    description: '全球大模型 Token 分词与成本对比、JSON/SQL/cURL 全栈多语言类型转换、移动端 DeepLink 唤醒真机联调与多链 RPC 测速解码',
    descriptionEn: 'LLM API token visualizer & cost calculator, polyglot schema converter, mobile Universal Links/App Links compiler, and Web3 RPC calldata decoder',
  },
  {
    id: 'principle-lab',
    icon: '🧪',
    shortTitle: '底层原理实验室',
    shortTitleEn: 'Principle Labs',
    title: '🧪 底层原理交互实验室 (Interactive Principle Labs)',
    titleEn: '🧪 Interactive Engineering & Source-Code Visualizers',
    description: '与站内硬核技术博文深度联动，动手单步推演 Vue 3 编译器 AST、最长递增子序列 (LIS) 快速 Diff、JS 事件循环与 HTTP/3 QUIC 协议',
    descriptionEn: 'Step-by-step interactive state machines for Vue 3 template compilation, Fast Diff (LIS), JavaScript Event Loop, and HTTP/3 QUIC protocols',
  },
];

export interface ToolItem {
  id: string;
  slug: string;
  section: 'utility' | 'lab';
  group: ToolGroupId;
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
  keywords?: string[];
  relatedPosts?: RelatedPostLink[];
}

// 全站 6 大分类 · 32 款在线工具与底层实验室注册表（中英双语）
export const TOOLS: ToolItem[] = [
  // ==========================================
  // ① 🎬 多媒体与图文处理 (media) — 8 款
  // ==========================================
  {
    id: 'video-to-gif',
    slug: 'video-to-gif',
    section: 'utility',
    group: 'media',
    category: 'media-doc',
    status: 'live',
    badge: '🔥 爆款 · 视频转GIF',
    badgeEn: '🔥 Viral · Video to GIF',
    title: '视频转 GIF 动图在线制作工作台（支持帧率调节、色彩量化压缩与无水印导出）',
    titleEn: 'Local Video to GIF Converter (FPS Control, Palette Compression & No Watermark)',
    description: '100% 浏览器本地运行，零上传免等待。支持 MP4/WebM/MOV 任意时间段裁剪、5~30 FPS 帧率与分辨率自定义、色彩量化抖动压缩、画面加字幕及单帧剔除。',
    descriptionEn: 'Convert MP4, WebM, and MOV to crisp animated GIFs 100% locally in your browser. Customize FPS (5-30), resolution, color quantization compression, captions, and frame trimming with zero watermarks.',
    pathZh: '/tools/video-to-gif/',
    pathEn: '/en/tools/video-to-gif/',
    wasmPowered: true,
    keywords: ['视频转gif', 'mp4转gif', '动图制作', 'gif压缩', '帧率设置', 'video to gif', 'mp4 to gif'],
  },
  {
    id: 'video-frame-extractor',
    slug: 'video-frame-extractor',
    section: 'utility',
    group: 'media',
    category: 'media-doc',
    status: 'live',
    badge: '📸 逐帧截图 · 台词拼图',
    badgeEn: '📸 Frame Grabber & Sheet',
    title: '视频高清逐帧截图、批量抽帧提取与九宫格故事板/台词长图拼接器',
    titleEn: 'HD Video Frame Extractor, Batch Frame Grabber & Storyboard Contact Sheet Maker',
    description: '支持毫秒级逐帧微调抓拍原画级 PNG/WebP 截图、按固定时间间隔自动批量抽帧、一键生成 3×3 / 4×4 视频预览网格故事板以及影视经典台词底部长图拼接。',
    descriptionEn: 'Step through videos frame-by-frame to capture full-resolution PNG/WebP snapshots, batch extract frames at intervals, or generate 3x3 storyboard contact sheets and movie subtitle strips.',
    pathZh: '/tools/video-frame-extractor/',
    pathEn: '/en/tools/video-frame-extractor/',
    wasmPowered: true,
    keywords: ['视频抽帧', '视频逐帧截图', '视频截取某一帧', '台词长图拼接', 'video frame extractor', 'screenshot video'],
  },
  {
    id: 'video-transcoder',
    slug: 'video-transcoder',
    section: 'utility',
    group: 'media',
    category: 'media-doc',
    status: 'live',
    badge: '🎞️ 格式转换 · 音频提取',
    badgeEn: '🎞️ Video Transcode & Audio',
    title: '本地视频格式转换、码率瘦身压缩与无损音频 (WAV) 一键提取工作台',
    titleEn: 'Client-Side Video Format Converter, Bitrate Compressor & Lossless Audio Extractor',
    description: '基于浏览器硬件编解码与 WebAudio，无需上传服务器即可完成 MP4/WebM/MOV 格式互转、自定义码率体积压缩、画面旋转镜像裁切，以及一键从视频剥离高清音频文件。',
    descriptionEn: 'Transcode and compress videos (MP4/WebM/MOV), rotate/crop aspect ratios, mute tracks, or extract lossless 16-bit WAV audio tracks directly in your browser.',
    pathZh: '/tools/video-transcoder/',
    pathEn: '/en/tools/video-transcoder/',
    wasmPowered: true,
    keywords: ['视频格式转换', '视频提取音频', 'mp4转mp3', '视频压缩大小', 'video converter', 'extract audio from video'],
  },
  {
    id: 'image-converter',
    slug: 'image-converter',
    section: 'utility',
    group: 'media',
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
    keywords: ['图片格式转换', 'webp转png', 'avif转jpg', '图片压缩', '清除exif', 'image converter'],
  },
  {
    id: 'gif-studio',
    slug: 'gif-studio',
    section: 'utility',
    group: 'media',
    category: 'media-doc',
    status: 'live',
    badge: '🎭 表情包 · 拆帧倒放',
    badgeEn: '🎭 GIF Splitter & Reverser',
    title: 'GIF 动图拆帧提取、一键倒放、变速抽帧瘦身与表情包字幕合成工坊',
    titleEn: 'Animated GIF Frame Splitter, Reverser, Speed Changer & Meme Caption Studio',
    description: '上传任意 GIF 即可二进制解析拆出全部独立高清帧图片；支持一键倒放动图、修改帧率倍速、抽帧压缩文件体积、多图合成 GIF 以及叠加顶部/底部描边表情包字幕。',
    descriptionEn: 'Split animated GIFs into individual PNG frames, reverse playback, adjust frame delays, drop frames to shrink size, or overlay meme text captions locally.',
    pathZh: '/tools/gif-studio/',
    pathEn: '/en/tools/gif-studio/',
    wasmPowered: true,
    keywords: ['gif拆帧', 'gif倒放', 'gif加文字', 'gif压缩', '多图合成gif', 'gif splitter', 'reverse gif'],
  },
  {
    id: 'id-photo-maker',
    slug: 'id-photo-maker',
    section: 'utility',
    group: 'media',
    category: 'media-doc',
    status: 'live',
    badge: '🪪 证件照 · 精准控KB',
    badgeEn: '🪪 ID Photo & KB Sizer',
    title: '隐私级证件照/考试报名照换底色、精准控制 KB 大小与六寸冲印排版器',
    titleEn: 'Private ID & Passport Photo Background Changer, Exact KB Sizer & Print Layout',
    description: '内置一寸/二寸/公考/教资/四六级/各国签证标准尺寸，智能色彩容差换红白蓝渐变底色，二分法精准压缩至报名系统要求的 20KB~50KB 区间，一键生成六寸相纸 8 连排冲印图。',
    descriptionEn: 'Crop to standard ID/passport/exam dimensions, replace background colors (white/blue/red), compress to exact KB limits (e.g. 20-50KB), and generate 4x6-inch print sheets offline.',
    pathZh: '/tools/id-photo-maker/',
    pathEn: '/en/tools/id-photo-maker/',
    wasmPowered: true,
    keywords: ['证件照换底色', '照片压缩到20kb', '一寸照片生成', '六寸排版冲印', '报名照片修改大小', 'id photo maker'],
  },
  {
    id: 'privacy-watermark',
    slug: 'privacy-watermark',
    section: 'utility',
    group: 'media',
    category: 'media-doc',
    status: 'live',
    badge: '🛡️ 证件防盗 · 纯本地',
    badgeEn: '🛡️ Anti-Theft Watermark',
    title: '身份证/营业执照/房产证防盗用隐私平铺水印相机与正反面 A4 拼版工具',
    titleEn: 'Private ID Card & Document Anti-Theft Tiled Watermark & A4 Combiner',
    description: '租房、入职、办卡必用：文件 100% 不联网，一键添加“仅供办理XX业务使用 他用无效”全屏斜向平铺水印、防 AI 去水印高频干扰纹、敏感号段打码及正反面 A4 同页打印排版。',
    descriptionEn: 'Protect sensitive ID cards, passports, and business licenses before sharing. Add tiled anti-AI watermarks, redact numbers, and combine front/back sides onto an A4 sheet 100% offline.',
    pathZh: '/tools/privacy-watermark/',
    pathEn: '/en/tools/privacy-watermark/',
    wasmPowered: false,
    keywords: ['身份证加水印', '防盗用水印', '营业执照加水印', '图片平铺水印', '证件正反面合成a4', 'id watermark'],
  },
  {
    id: 'audio-trimmer',
    slug: 'audio-trimmer',
    section: 'utility',
    group: 'media',
    category: 'media-doc',
    status: 'live',
    badge: '🎵 音频剪辑 · 铃声截取',
    badgeEn: '🎵 Audio Waveform Trimmer',
    title: '纯本地可视化音频波形剪辑、淡入淡出、变速变调与手机铃声截取器',
    titleEn: 'Visual Audio Waveform Trimmer, Fade In/Out, Speed Changer & Ringtone Maker',
    description: '基于 Web Audio API 毫秒级绘制高清声波图，支持可视区间拖拽截取高潮片段、首尾平滑淡入淡出 (Fade In/Out)、0.5x~2.0x 倍速调节、音量增益放大与无损 WAV 导出。',
    descriptionEn: 'Visualize audio waveforms in your browser to trim clips, apply smooth fade-in/fade-out envelopes, adjust playback speed, normalize volume, and export lossless WAV ringtones.',
    pathZh: '/tools/audio-trimmer/',
    pathEn: '/en/tools/audio-trimmer/',
    wasmPowered: false,
    keywords: ['音频剪辑在线', '音乐裁剪铃声', '音频淡入淡出', '音频变速', 'audio trimmer', 'ringtone cutter'],
  },

  // ==========================================
  // ② 🧮 金融与生活计算器 (calculator) — 6 款
  // ==========================================
  {
    id: 'mortgage-prepayment-calculator',
    slug: 'mortgage-prepayment-calculator',
    section: 'utility',
    group: 'calculator',
    category: 'ai-cost',
    status: 'live',
    badge: '🏠 提前还贷 · 省息决策',
    badgeEn: '🏠 Mortgage & Prepayment',
    title: '房贷（商贷/公积金/组合贷）与提前还贷划算度决策计算器（缩短年限 vs 减少月供）',
    titleEn: 'Mortgage Amortization & Early Prepayment Decision Calculator (Term vs Payment)',
    description: '支持等额本息与等额本金逐期明细；内置“提前还贷决策引擎”：直观对比【缩短年限 vs 减少月供】省息差额、测算已还利息占比，判断当前时点提前还贷是否跑赢理财收益。',
    descriptionEn: 'Calculate monthly mortgage schedules and simulate early lump-sum prepayments. Compare shortening loan term vs reducing monthly payment and find your investment break-even rate.',
    pathZh: '/tools/mortgage-prepayment-calculator/',
    pathEn: '/en/tools/mortgage-prepayment-calculator/',
    wasmPowered: false,
    keywords: ['房贷计算器', '提前还房贷计算器', '缩短年限还是减少月供', '组合贷计算器', '等额本息等额本金对比', 'mortgage prepayment calculator'],
  },
  {
    id: 'auto-loan-tco-calculator',
    slug: 'auto-loan-tco-calculator',
    section: 'utility',
    group: 'calculator',
    category: 'ai-cost',
    status: 'live',
    badge: '🚗 买车避坑 · 油电对比',
    badgeEn: '🚗 Auto Loan APR & EV TCO',
    title: '购车全款落地价、4S店车贷费率转真实年化 (IRR) 与油车 vs 电车 5 年回本计算器',
    titleEn: 'Car Out-the-Door Price, Dealer Flat-Fee True APR & EV vs Gas 5-Year TCO Calculator',
    description: '一键算清裸车+购置税+交强险+商业险全款落地总价；将 4S 店“月费率/等本等息”套路秒转真实年化利率 IRR；同级燃油车与新能源车 5 年油电差价、保值率与回本公里数推演。',
    descriptionEn: 'Calculate true out-the-door car prices, expose hidden dealer flat-rate loan APRs via IRR, and compare 5-year Total Cost of Ownership (TCO) between EV and gas vehicles.',
    pathZh: '/tools/auto-loan-tco-calculator/',
    pathEn: '/en/tools/auto-loan-tco-calculator/',
    wasmPowered: false,
    keywords: ['车贷计算器', '购车落地价计算器', '等本等息转真实年化', '油车电车几年回本', '购置税计算器', 'auto loan calculator'],
  },
  {
    id: 'irr-loan-calculator',
    slug: 'irr-loan-calculator',
    section: 'utility',
    group: 'calculator',
    category: 'ai-cost',
    status: 'live',
    badge: '🔍 利率照妖镜 · 真实IRR',
    badgeEn: '🔍 True APR & IRR Detector',
    title: '信用卡分期 / 网贷 / 融资租赁真实年化利率 (IRR) 照妖镜与砍头息穿透计算器',
    titleEn: 'True Loan APR & Internal Rate of Return (IRR) Cashflow Detector',
    description: '别被“每期手续费仅 0.5%”忽悠！支持等本等息、先息后本、气球贷与前置砍头息服务费，基于牛顿-拉夫逊法毫秒级穿透真实单利与复利年化 IRR，给出防坑风险评级。',
    descriptionEn: 'Unmask deceptive "low monthly flat fee" installment loans and credit card plans. Compute exact effective APR and IRR across upfront origination fees and uneven cashflows.',
    pathZh: '/tools/irr-loan-calculator/',
    pathEn: '/en/tools/irr-loan-calculator/',
    wasmPowered: false,
    keywords: ['真实年化利率计算器', '信用卡分期实际利率', 'irr计算器在线', '等本等息年化率', '网贷利率计算', 'true apr irr calculator'],
  },
  {
    id: 'salary-bonus-tax-calculator',
    slug: 'salary-bonus-tax-calculator',
    section: 'utility',
    group: 'calculator',
    category: 'ai-cost',
    status: 'live',
    badge: '💰 个税筹划 · 年终奖盲区',
    badgeEn: '💰 Salary & Bonus Tax Cliff',
    title: '薪资五险一金税后到手 & 年终奖个税“多发1元多交数千税”临界盲区筹划计算器',
    titleEn: 'Salary Take-Home Pay, Marginal Tax & Bonus Cliff Optimizer',
    description: '精准拆解五险一金、专项附加扣除与逐月累计预扣个税；对比“年终奖单独计税 vs 并入综合所得”，自动检测 6 大年终奖跳档盲区并给出到手金额最大化的拆分发放方案。',
    descriptionEn: 'Calculate net take-home salary, social insurance deductions, and marginal tax brackets. Automatically detect bonus tax cliffs and find the optimal split between salary and bonus.',
    pathZh: '/tools/salary-bonus-tax-calculator/',
    pathEn: '/en/tools/salary-bonus-tax-calculator/',
    wasmPowered: false,
    keywords: ['个税计算器', '年终奖个税计算器', '年终奖临界点', '五险一金计算器', '税后工资计算器', 'bonus tax calculator'],
  },
  {
    id: 'discount-bill-splitter',
    slug: 'discount-bill-splitter',
    section: 'utility',
    group: 'calculator',
    category: 'ai-cost',
    status: 'live',
    badge: '🛒 凑单退货 · 外卖拼单AA',
    badgeEn: '🛒 Discount & Bill Splitter',
    title: '电商大促凑单满减退货实付分摊 & 多人点外卖/聚餐红包运费公平 AA 计算器',
    titleEn: 'E-Commerce Stacked Discount Proration & Fair Group Takeout AA Bill Splitter',
    description: '双模式神器：① 618/双11跨店满减+品类券+红包叠加后，算清每件商品真实折后价与退掉凑单品后的实际扣款；② 多人拼单外卖按原价比例公平分摊满减优惠与配送费，一键复制群账单。',
    descriptionEn: 'Prorate stacked e-commerce coupons across cart items to know exact refund amounts, or split group takeout bills fairly by weighting discounts, tax, and delivery fees proportionally.',
    pathZh: '/tools/discount-bill-splitter/',
    pathEn: '/en/tools/discount-bill-splitter/',
    wasmPowered: false,
    keywords: ['凑单满减计算器', '满减分摊计算器', '外卖拼单aa计算器', '双11凑单退货怎么算', 'fair bill splitter'],
  },
  {
    id: 'compound-fire-calculator',
    slug: 'compound-fire-calculator',
    section: 'utility',
    group: 'calculator',
    category: 'ai-cost',
    status: 'live',
    badge: '📈 复利定投 · FIRE退休',
    badgeEn: '📈 Compound & FIRE Simulator',
    title: '复利定投收益、通胀购买力折现与 FIRE（4%法则提前退休/养老金）财务自由模拟器',
    titleEn: 'Compound Interest, Inflation Purchasing Power & FIRE Early Retirement Simulator',
    description: '可视化推演初始本金 + 月度定投在 1~40 年内的复利增长曲线，扣除真实通胀率折算当前购买力，并基于 Trinity Study 4% 安全提款率倒推你的 Lean/Fat FIRE 退休目标资产与达标年龄。',
    descriptionEn: 'Simulate long-term compound growth with monthly contributions, adjust for inflation purchasing power, and calculate your Lean/Standard/Fat FIRE retirement number using the 4% rule.',
    pathZh: '/tools/compound-fire-calculator/',
    pathEn: '/en/tools/compound-fire-calculator/',
    wasmPowered: false,
    keywords: ['复利计算器', '定投收益计算器', 'fire提前退休计算器', '4%法则养老金', '通胀购买力计算', 'fire retirement calculator'],
  },

  // ==========================================
  // ③ 📱 二维码/条码与日常办公 (daily-qr) — 6 款
  // ==========================================
  {
    id: 'qrcode-studio',
    slug: 'qrcode-studio',
    section: 'utility',
    group: 'daily-qr',
    category: 'media-doc',
    status: 'live',
    badge: '🏁 永久活码 · 扫码识别',
    badgeEn: '🏁 Custom QR & Scanner',
    title: '全能艺术二维码生成工坊（WiFi连接码/挪车码/名片码）与本地批量扫码解码器',
    titleEn: 'Artistic QR Code Studio (WiFi, vCard, Parking Sign) & Offline Batch QR Scanner',
    description: '100% 纯静态真码（永不失效、无跳转广告）：支持圆点/液态码眼、渐变配色与 Logo 嵌入；内置免输密码连 WiFi 码、vCard 名片码、挪车码打印卡；支持粘贴截图或传图离线批量识别二维码。',
    descriptionEn: 'Generate permanent, zero-redirect QR codes with custom logos, gradients, and rounded modules for URLs, WiFi auto-connect, vCards, and parking signs, plus offline image/webcam QR decoding.',
    pathZh: '/tools/qrcode-studio/',
    pathEn: '/en/tools/qrcode-studio/',
    wasmPowered: false,
    keywords: ['二维码生成器', 'wifi二维码生成', '挪车二维码制作', '二维码在线识别解码', '带logo二维码', 'qr code generator scanner'],
  },
  {
    id: 'barcode-batch-printer',
    slug: 'barcode-batch-printer',
    section: 'utility',
    group: 'daily-qr',
    category: 'media-doc',
    status: 'live',
    badge: '🏷️ 电商仓储 · A4批量排印',
    badgeEn: '🏷️ Bulk Barcode & A4 Label',
    title: '电商/仓储条形码 (EAN-13 / Code128 / UPC-A) 批量生成、校验位计算与 A4 不干胶排版打印',
    titleEn: 'Bulk Barcode Generator (EAN-13, Code128, UPC), Check-Digit Calculator & A4 Label Printer',
    description: '跨境/淘宝卖家与资产管理利器：一次性粘贴上百行商品编码，自动计算并补全 EAN-13/UPC 校验位，批量生成高清矢量 SVG/PNG 条码，支持自定义 A4 标签纸行列边距直接连接打印机及图片条码识别。',
    descriptionEn: 'Batch generate vector EAN-13, Code128, Code39, and UPC-A barcodes from spreadsheet lists. Auto-calculate check digits, print directly onto customizable A4 label grids, or decode barcode images.',
    pathZh: '/tools/barcode-batch-printer/',
    pathEn: '/en/tools/barcode-batch-printer/',
    wasmPowered: false,
    keywords: ['条形码生成器', '条形码批量生成打印', 'ean13校验位计算', 'code128条形码', 'a4不干胶条码排版', 'bulk barcode generator'],
  },
  {
    id: 'pdf-toolkit',
    slug: 'pdf-toolkit',
    section: 'utility',
    group: 'daily-qr',
    category: 'media-doc',
    status: 'live',
    badge: '📄 零上传PDF · 转长图/合成',
    badgeEn: '📄 Local PDF & Image Suite',
    title: '100% 本地零上传 PDF 页面提取、PDF 转高清长图与多图排版合成 A4 PDF 工作台',
    titleEn: '100% Local PDF Page Extractor, PDF-to-Long-Image & Multi-Image to A4 PDF Workbench',
    description: '私密合同与财务单据绝不上传云端：支持将多张手机照片/扫描件按 A4 边距一键合并为标准 PDF；支持打开本地 PDF 逐页渲染高清 PNG、抽选指定页或无缝拼接为一图流高清长图。',
    descriptionEn: 'Process confidential PDFs 100% locally in your browser. Combine multiple images/scans into standard A4 PDFs, render PDF pages to HD PNGs, or stitch pages into a vertical long image.',
    pathZh: '/tools/pdf-toolkit/',
    pathEn: '/en/tools/pdf-toolkit/',
    wasmPowered: false,
    keywords: ['pdf转长图', '图片转pdf在线免费', 'pdf转图片不上传', 'pdf提取页面', '合同图片合成pdf', 'pdf to image local'],
  },
  {
    id: 'signature-scanner-cleaner',
    slug: 'signature-scanner-cleaner',
    section: 'utility',
    group: 'daily-qr',
    category: 'media-doc',
    status: 'live',
    badge: '✍️ 透明签名 · 扫描件漂白',
    badgeEn: '✍️ Signature & Scan Cleaner',
    title: '手写签名照一键抠出透明背景电子签名 (PNG/SVG) & 手机拍文档去黑底阴影漂白器',
    titleEn: 'Handwritten Transparent Signature Extractor & Mobile Document Scan Shadow Cleaner',
    description: '用手机拍下白纸上的手写签名或红色印章，本地自适应色阶与阈值算法 1 秒抠出背景 100% 透明的电子签名（支持黑/蓝/红笔迹增艳与粗细微调）；同时可将发灰带阴影的手机拍件一键漂白为打印级白底文档。',
    descriptionEn: 'Turn smartphone photos of handwritten signatures or stamps into crisp transparent PNGs, or remove gray lighting shadows from photographed documents for clean black-and-white printing.',
    pathZh: '/tools/signature-scanner-cleaner/',
    pathEn: '/en/tools/signature-scanner-cleaner/',
    wasmPowered: true,
    keywords: ['手写签名转电子版透明', '签名抠图透明背景', '扫描件去黑底变白', '印章抠图透明', 'transparent signature maker'],
  },
  {
    id: 'hardware-screen-tester',
    slug: 'hardware-screen-tester',
    section: 'utility',
    group: 'daily-qr',
    category: 'dev-network',
    status: 'live',
    badge: '🖥️ 屏幕坏点 · 键鼠双击验机',
    badgeEn: '🖥️ Screen, Hz & Mouse Tester',
    title: '显示器屏幕坏点/漏光/高刷帧率 (Hz) & 鼠标微动双击故障/键盘全键无冲在线验机台',
    titleEn: 'Monitor Dead Pixel, Refresh Rate (Hz), Mouse Double-Click & Keyboard Ghosting Tester',
    description: '新买电脑、显示器、手机与外设必测：一键全屏切换纯色/渐变/网格检出亮点暗点与边缘漏光；实时测算屏幕真实刷新率 (60~360Hz)；毫秒级捕捉鼠标微动老化误双击连击与键盘全键响应。',
    descriptionEn: 'All-in-one hardware diagnostic suite: fullscreen dead/stuck pixel & backlight bleed test, real-time display Hz refresh rate benchmark, mouse switch double-click detector, and keyboard NKRO test.',
    pathZh: '/tools/hardware-screen-tester/',
    pathEn: '/en/tools/hardware-screen-tester/',
    wasmPowered: false,
    keywords: ['屏幕坏点检测', '鼠标双击测试', '显示器刷新率测试', '键盘按键检测', '新机验机工具', 'dead pixel mouse double click test'],
  },
  {
    id: 'kinship-age-calculator',
    slug: 'kinship-age-calculator',
    section: 'utility',
    group: 'daily-qr',
    category: 'media-doc',
    status: 'live',
    badge: '🏮 亲戚称呼 · 人生900格',
    badgeEn: '🏮 Kinship & Life Calendar',
    title: '中国三姑六婆亲戚称呼计算器 & 精确周岁虚岁/节气星座/人生 900 个月格子可视化',
    titleEn: 'Chinese Kinship Relationship Resolver, Exact Chronological Age & Life-in-Months Grid',
    description: '过年走亲戚社恐救星：像按计算器一样点选“父/母/夫/妻/兄/弟/姐/妹/子/女”秒算复杂亲属称呼与双方互称；内置精确到秒的周岁/虚岁/生肖星座换算与刷屏全网的“人生 900 个月格子图”生成。',
    descriptionEn: 'Resolve complex family tree relationships instantly, calculate exact chronological vs traditional East Asian age down to the day, and visualize your life progress on a 900-month grid.',
    pathZh: '/tools/kinship-age-calculator/',
    pathEn: '/en/tools/kinship-age-calculator/',
    wasmPowered: false,
    keywords: ['亲戚称呼计算器', '三姑六婆计算器', '周岁虚岁计算器', '人生900个月格子', '年龄计算器精确到天', 'chinese kinship age calculator'],
  },

  // ==========================================
  // ④ 💼 创作者与跨境商业 (creator-biz) — 4 款
  // ==========================================
  {
    id: 'social-card-generator',
    slug: 'social-card-generator',
    section: 'utility',
    group: 'creator-biz',
    category: 'media-doc',
    status: 'live',
    badge: '🎨 自媒体 · 爆款排版',
    badgeEn: '🎨 Social Media · Card Maker',
    title: '自媒体爆款社交分享卡片与金句排版生成工坊',
    titleEn: 'Social Share Card Generator & Indie Geek Snapshot Studio',
    description: '100% 浏览器本地 Canvas 渲染小红书 (3:4)、Twitter/X (16:9)、金句海报、极客代码快照与里程碑大字报，零服务器上传，20+ 精调主题极速导出。',
    descriptionEn: '100% client-side Canvas generator for Xiaohongshu, Twitter/X cards, quote posters, and macOS-style code snapshots with 20+ gradient themes.',
    pathZh: '/tools/social-card-generator/',
    pathEn: '/en/tools/social-card-generator/',
    wasmPowered: false,
    keywords: ['小红书卡片制作', '金句海报生成', '代码截图美化', '社交分享图', 'social card generator'],
  },
  {
    id: 'freelance-invoice-generator',
    slug: 'freelance-invoice-generator',
    section: 'utility',
    group: 'creator-biz',
    category: 'media-doc',
    status: 'live',
    badge: '💼 自由职业 · 商务单据',
    badgeEn: '💼 Freelance · Invoicing',
    title: '自由职业者极速隐私报价单、服务确认函与商业发票生成器',
    titleEn: 'Private Freelance Invoice, Quote & Commercial Receipt Generator',
    description: '100% 离线本地保存，报价单 (Quote) → SOW → 发票 (Invoice) → 收据 (Receipt) 四阶段单据流转，支持多币种、阶梯款项、收款码与矢量 A4 PDF 打印。',
    descriptionEn: '100% private client-side invoice generator covering Quotes, SOWs, Invoices, and Receipts with multi-currency, milestone payments, and vector A4 PDF printing.',
    pathZh: '/tools/freelance-invoice-generator/',
    pathEn: '/en/tools/freelance-invoice-generator/',
    wasmPowered: false,
    keywords: ['报价单生成器', 'invoice生成器', '自由职业发票', '形式发票模板', 'freelance invoice generator'],
  },
  {
    id: 'payment-fee-calculator',
    slug: 'payment-fee-calculator',
    section: 'utility',
    group: 'creator-biz',
    category: 'dev-network',
    status: 'live',
    badge: '💳 跨境支付 · 汇损穿透',
    badgeEn: '💳 Cross-Border · FX Calculator',
    title: '全球跨境支付渠道真实手续费、隐性汇损与到账净额精算器',
    titleEn: 'Global Cross-Border Payment Fee & Hidden FX Markup Calculator',
    description: '横向穿透 PayPal、Stripe、Wise、Payoneer、连连国际等 7 大渠道阶梯扣点与货币转换溢价；支持反向倒推 (Gross-up) 账单金额与客户说明函。',
    descriptionEn: 'Benchmark real processing fees and hidden FX spreads across PayPal, Stripe, Wise, Payoneer, and Lianlian with reverse gross-up invoice pricing.',
    pathZh: '/tools/payment-fee-calculator/',
    pathEn: '/en/tools/payment-fee-calculator/',
    wasmPowered: false,
    keywords: ['paypal手续费计算器', 'stripe手续费', 'wise汇损', '跨境收款对比', 'paypal fee calculator'],
  },
  {
    id: 'saas-metrics-calculator',
    slug: 'saas-metrics-calculator',
    section: 'utility',
    group: 'creator-biz',
    category: 'dev-network',
    status: 'live',
    badge: '📊 独立开发 · SaaS 沙盘',
    badgeEn: '📊 Micro-SaaS · Metrics & Valuation',
    title: '独立开发与 Micro-SaaS 核心单元经济学、现金流推演与并购估值沙盘',
    titleEn: 'Indie Micro-SaaS Unit Economics, Cash Flow & Valuation Sandbox',
    description: '毫秒级计算 MRR、ARR、ARPU、Net Churn、LTV、CAC 与健康度评级；提供 12 个月现金流敏感度曲线与基于 Acquire.com 公开倍数的公允估值推演。',
    descriptionEn: 'Interactive dashboard calculating MRR, Churn, LTV, CAC, and unit economics with 12-month cash flow sensitivity curves and Acquire.com multiple valuations.',
    pathZh: '/tools/saas-metrics-calculator/',
    pathEn: '/en/tools/saas-metrics-calculator/',
    wasmPowered: false,
    keywords: ['saas估值计算', 'mrr arr ltv cac', '独立开发收入测算', 'saas metrics calculator'],
  },

  // ==========================================
  // ⑤ ⚡ 开发者、AI 与 Web3 (dev-ai-web3) — 4 款
  // ==========================================
  {
    id: 'llm-cost-calculator',
    slug: 'llm-cost-calculator',
    section: 'utility',
    group: 'dev-ai-web3',
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
    keywords: ['token计算器', '大模型api价格对比', 'deepseek价格计算', 'llm token calculator'],
  },
  {
    id: 'polyglot-converter',
    slug: 'polyglot-converter',
    section: 'utility',
    group: 'dev-ai-web3',
    category: 'dev-network',
    status: 'live',
    badge: '🔄 全栈多语言 · 离线转换',
    badgeEn: '🔄 Polyglot · Type Converter',
    title: '全栈多语言类型与数据结构转换工场 (JSON / YAML / SQL DDL / cURL)',
    titleEn: 'Polyglot Multi-Language Schema & Type Converter (JSON, SQL, cURL)',
    description: '100% 浏览器本地解析，绝不上传私密数据。一键将 JSON/YAML/SQL/cURL 转换为 TypeScript (Interface + Zod v3)、Go struct、Rust serde、Python Pydantic v2 与 Prisma。',
    descriptionEn: '100% private offline converter translating JSON, YAML, SQL DDL, and cURL into TypeScript, Zod v3, Go structs, Rust Serde, Python Pydantic v2, and Prisma schemas.',
    pathZh: '/tools/polyglot-converter/',
    pathEn: '/en/tools/polyglot-converter/',
    wasmPowered: false,
    keywords: ['json转ts', 'json转go struct', 'sql转prisma', 'curl转代码', 'json to typescript'],
  },
  {
    id: 'deeplink-tester',
    slug: 'deeplink-tester',
    section: 'utility',
    group: 'dev-ai-web3',
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
    keywords: ['deeplink测试', 'universal links配置', 'url scheme唤醒app', 'aasa validator'],
    relatedPosts: [
      {
        title: '如何在网页中打开App（伪协议、Universal Links 与微下载深度解析）',
        titleEn: 'How to Open Native Apps from Web Pages (URL Scheme & Universal Links)',
        url: '/blog/front-tools/open-the-app-from-any-where',
      },
    ],
  },
  {
    id: 'web3-rpc-tester',
    slug: 'web3-rpc-tester',
    section: 'utility',
    group: 'dev-ai-web3',
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
    keywords: ['rpc节点测速', 'calldata解码', 'solana rpc延迟', 'web3 calldata decoder'],
    relatedPosts: [
      {
        title: 'IC 链上开发与 Canister 运维常识汇总',
        titleEn: 'Internet Computer (IC) On-Chain Canister Operations Guide',
        url: '/blog/blockchain/ic/ic-operation-and-maintenance-knowledge',
      },
    ],
  },

  // ==========================================
  // ⑥ 🧪 底层原理交互实验室 (principle-lab) — 4 款
  // ==========================================
  {
    id: 'vue3-compiler-visualizer',
    slug: 'vue3-compiler-visualizer',
    section: 'lab',
    group: 'principle-lab',
    category: 'dev-network',
    status: 'live',
    badge: '🧪 原理实验室 · Vue3 编译',
    badgeEn: '🧪 Interactive Lab · Vue 3 AST',
    title: 'Vue 3 编译三步曲 (Token → AST → PatchFlags & Block Tree) 交互式可视化器',
    titleEn: 'Vue 3 Template Compiler, AST, PatchFlags & Hoisting Interactive Visualizer',
    description: '实时输入或切换 Vue SFC 模板，基于 Rust Wasm 拆解词法 Token 流、Template AST、静态提升 (_hoisted) 与 PatchFlags 靶向更新位运算。',
    descriptionEn: 'Inspect how Vue 3 compiles templates into Lexical Tokens, Template AST, Block Trees, Static Hoisting, and bitwise PatchFlags in real time.',
    pathZh: '/tools/vue3-compiler-visualizer/',
    pathEn: '/en/tools/vue3-compiler-visualizer/',
    wasmPowered: true,
    keywords: ['vue3编译原理', 'patchflags可视化', 'vue ast解析', 'vue3 template compiler'],
    relatedPosts: [
      {
        title: 'Vue3架构分析（一）——从Vue单文件组件到浏览器中的DOM',
        titleEn: 'Vue 3 Architecture (Part 1): From .vue SFC to Browser DOM',
        url: '/blog/vue3/architecture-analysis-1',
      },
      {
        title: 'Vue3架构分析（二）—— 编译器的设计与实现',
        titleEn: 'Vue 3 Architecture (Part 2): Compiler Design & Implementation',
        url: '/blog/vue3/architecture-analysis-2',
      },
    ],
  },
  {
    id: 'js-eventloop-visualizer',
    slug: 'js-eventloop-visualizer',
    section: 'lab',
    group: 'principle-lab',
    category: 'dev-network',
    status: 'live',
    badge: '🧪 原理实验室 · 事件循环',
    badgeEn: '🧪 Interactive Lab · Event Loop',
    title: 'JavaScript 事件循环 (Event Loop) 全队列单步推演沙盒（光杆站长模型）',
    titleEn: 'JS Event Loop Step-by-Step Visualizer (Call Stack, Microtask, rAF, Macrotask & Idle)',
    description: '还原《一文讲透事件循环》“光杆站长”心智模型，逐帧单步推演调用栈、Promise 微任务、requestAnimationFrame、setTimeout 宏任务与 requestIdleCallback 执行时序。',
    descriptionEn: 'Step-by-step interactive state machine visualizing Call Stack, Microtasks, requestAnimationFrame, Macrotasks, and requestIdleCallback execution order.',
    pathZh: '/tools/js-eventloop-visualizer/',
    pathEn: '/en/tools/js-eventloop-visualizer/',
    wasmPowered: true,
    keywords: ['js事件循环可视化', 'event loop模拟器', '宏任务微任务执行顺序', 'javascript event loop visualizer'],
    relatedPosts: [
      {
        title: '一文讲透事件循环（光杆站长心智模型与全队列源码探测）',
        titleEn: 'Mastering the JavaScript Event Loop (Mental Model & Queue Deep Dive)',
        url: '/blog/knowledge/js-eventloop',
      },
    ],
  },
  {
    id: 'vue3-runtime-visualizer',
    slug: 'vue3-runtime-visualizer',
    section: 'lab',
    group: 'principle-lab',
    category: 'dev-network',
    status: 'live',
    badge: '🧪 原理实验室 · 快速 Diff',
    badgeEn: '🧪 Interactive Lab · Vue 3 Diff',
    title: 'Vue 3 响应式依赖收集 (Track/Trigger) 与快速 Diff (最长递增子序列 LIS) 步进推演器',
    titleEn: 'Vue 3 Reactive Track/Trigger & Fast Diff (Longest Increasing Subsequence) Stepper',
    description: '可视化推演 Vue 3 渲染器双端预处理与最长递增子序列（getSequence / LIS）最小 DOM 移动算法，以及 ReactiveEffect 依赖触发链路。',
    descriptionEn: 'Step through Vue 3 patchKeyedChildren 5-stage Fast Diff algorithm, Longest Increasing Subsequence (LIS) anchor computation, and ReactiveEffect dependency tracking.',
    pathZh: '/tools/vue3-runtime-visualizer/',
    pathEn: '/en/tools/vue3-runtime-visualizer/',
    wasmPowered: true,
    keywords: ['vue3快速diff算法', '最长递增子序列lis', 'vue3响应式原理', 'vue3 fast diff visualizer'],
    relatedPosts: [
      {
        title: 'Vue3架构分析（三）—— 运行时之渲染器和Vue App的设计与新建',
        titleEn: 'Vue 3 Architecture (Part 3): Runtime Renderer & App Creation',
        url: '/blog/vue3/architecture-analysis-3',
      },
      {
        title: 'Vue3架构分析（四）—— 运行时之组件实例的创建和初始化',
        titleEn: 'Vue 3 Architecture (Part 4): Component Instance Setup & Initialization',
        url: '/blog/vue3/architecture-analysis-4',
      },
    ],
  },
  {
    id: 'http3-quic-visualizer',
    slug: 'http3-quic-visualizer',
    section: 'lab',
    group: 'principle-lab',
    category: 'dev-network',
    status: 'live',
    badge: '🧪 原理实验室 · HTTP/3',
    badgeEn: '🧪 Interactive Lab · QUIC vs H2',
    title: 'HTTP/2 (TCP) vs HTTP/3 (QUIC) 0-RTT 握手与丢包队头阻塞 (HoL) 对比模拟器',
    titleEn: 'HTTP/2 vs HTTP/3 (QUIC) 0-RTT Handshake & Head-of-Line Blocking Simulator',
    description: '自由调节网络 RTT 延迟与丢包率滑块，直观对比 TCP+TLS 握手与 QUIC 0-RTT，演示单包丢失时 HTTP/2 全流卡死 vs HTTP/3 独立流无阻塞并发传输。',
    descriptionEn: 'Simulate network RTT latency and packet loss to compare TCP+TLS 1.3 vs QUIC 0-RTT handshakes and visualize HTTP/2 TCP Head-of-Line blocking vs HTTP/3 independent streams.',
    pathZh: '/tools/http3-quic-visualizer/',
    pathEn: '/en/tools/http3-quic-visualizer/',
    wasmPowered: true,
    keywords: ['http3 quic模拟器', '队头阻塞可视化', '0-rtt握手原理', 'http2 vs http3 simulator'],
    relatedPosts: [
      {
        title: '让网站支持HTTP/3（QUIC 原理与 Nginx 开启全记录）',
        titleEn: 'Enabling HTTP/3 & QUIC on Your Website (Principles & Nginx Guide)',
        url: '/blog/knowledge/enable-http3',
      },
    ],
  },
];

export const UTILITY_TOOLS = TOOLS.filter((t) => t.section === 'utility');
export const LAB_TOOLS = TOOLS.filter((t) => t.section === 'lab');

export function getToolsByGroup(group: ToolGroupId): ToolItem[] {
  return TOOLS.filter((t) => t.group === group);
}

export function getCategoryMeta(group: ToolGroupId): ToolCategoryMeta | undefined {
  return TOOL_CATEGORIES.find((c) => c.id === group);
}

/**
 * 根据博客文章路径或标题自动匹配配套的交互式实验室/工具（支持双向导流卡片）
 */
export function findCompanionToolForPost(pathname: string, title?: string): ToolItem | undefined {
  const cleanPath = pathname.replace(/\/+$/, '');
  for (const tool of TOOLS) {
    if (tool.relatedPosts?.some((p) => cleanPath.endsWith(p.url) || (title && p.title.includes(title)))) {
      return tool;
    }
  }
  return undefined;
}
