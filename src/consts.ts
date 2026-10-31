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
  // 场景化高客单与出海创作者推荐渠道
  wiseBusiness: 'https://wise.com/invite/ihpc/yunsin-placeholder',
  payoneer: 'https://share.payoneer.com/nav/yunsin-placeholder',
  shopifyPartner: 'https://www.shopify.com/partners?ref=yunsin-placeholder',
  canvaPro: 'https://partner.canva.com/c/yunsin-placeholder',
  mianbaoduo: 'https://mbd.pub/o/bread/mbd-yunsin-placeholder',
  gumroad: 'https://gumroad.com/l/yunsin-placeholder',
  lemonSqueezy: 'https://lemonsqueezy.com/yunsin-placeholder',
  beehiiv: 'https://www.beehiiv.com/?via=yunsin-placeholder',
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
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-social-cards',
    checkoutUrlEn: 'https://gumroad.com/l/social-card-presets',
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
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-freelance-contract',
    checkoutUrlEn: 'https://gumroad.com/l/freelance-contracts-pack',
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
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-cross-border-fx',
    checkoutUrlEn: 'https://gumroad.com/l/cross-border-fx-model',
    badge: '📊 精算底表',
    badgeEn: '📊 Financial Model',
  },
  saasBpDueDiligence: {
    id: 'saas-bp-due-diligence',
    name: 'Micro-SaaS 商业计划书与项目并购尽调财务底稿 (Notion + Excel)',
    nameEn: 'Micro-SaaS Pitch Deck & M&A Due Diligence Financial Model',
    priceCny: 29.0,
    priceUsd: 5.99,
    description: '专为出海独立开发者打造，包含 ARR 估值乘数拆解、净流失 Cohort 留存分析表与 Acquire.com 项目转让尽调审查清单。',
    descriptionEn: 'Complete financial due diligence toolkit for SaaS founders: Cohort retention matrices, ARR valuation multiples, and M&A checklists.',
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-saas-diligence',
    checkoutUrlEn: 'https://gumroad.com/l/saas-bp-due-diligence',
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
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-polyglot-playbook',
    checkoutUrlEn: 'https://gumroad.com/l/polyglot-ast-playbook',
    badge: '⚡ 极客架构',
    badgeEn: '⚡ Architecture',
  },
};

export interface RelatedPostLink {
  title: string;
  titleEn: string;
  url: string;
}

export interface ToolItem {
  id: string;
  slug: string;
  section: 'utility' | 'lab';
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
  relatedPosts?: RelatedPostLink[];
}

// 极客工具箱与底层原理交互实验室注册表（中英双语）
export const TOOLS: ToolItem[] = [
  {
    id: 'llm-cost-calculator',
    slug: 'llm-cost-calculator',
    section: 'utility',
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
    section: 'utility',
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
    section: 'utility',
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
    relatedPosts: [
      {
        title: 'IC 链上开发与 Canister 运维常识汇总',
        titleEn: 'Internet Computer (IC) On-Chain Canister Operations Guide',
        url: '/blog/blockchain/ic/ic-operation-and-maintenance-knowledge',
      },
    ],
  },
  {
    id: 'social-card-generator',
    slug: 'social-card-generator',
    section: 'utility',
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
  },
  {
    id: 'freelance-invoice-generator',
    slug: 'freelance-invoice-generator',
    section: 'utility',
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
  },
  {
    id: 'payment-fee-calculator',
    slug: 'payment-fee-calculator',
    section: 'utility',
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
  },
  {
    id: 'saas-metrics-calculator',
    slug: 'saas-metrics-calculator',
    section: 'utility',
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
  },
  {
    id: 'polyglot-converter',
    slug: 'polyglot-converter',
    section: 'utility',
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
  },
  {
    id: 'vue3-compiler-visualizer',
    slug: 'vue3-compiler-visualizer',
    section: 'lab',
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
