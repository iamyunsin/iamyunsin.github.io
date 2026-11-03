import type { FaqItem } from '@/layouts/ToolLayout.astro';
import type { ToolGroupId } from '@/consts';

/**
 * Schema.org WebApplication 精准分类映射（替代原先全部写死 DeveloperApplication）
 */
export function getSchemaApplicationCategory(group?: ToolGroupId): string {
  switch (group) {
    case 'media':
      return 'MultimediaApplication';
    case 'calculator':
      return 'FinanceApplication';
    case 'daily-qr':
      return 'UtilitiesApplication';
    case 'creator-biz':
      return 'BusinessApplication';
    case 'dev-ai-web3':
    case 'principle-lab':
    default:
      return 'DeveloperApplication';
  }
}

export interface ToolSeoOverride {
  seoTitleZh: string;
  seoTitleEn: string;
  seoDescZh?: string;
  seoDescEn?: string;
  extraKeywordsZh?: string[];
  extraKeywordsEn?: string[];
}

/**
 * 存量 32 款中英双语工具（共 64 页）搜索意图词重构映射表：
 * 将偏工程自嗨的描述性标题升级为「用户真实高频搜索长尾词 + 差异化痛点（免费无水印/不上传/2026最新） + 品牌后缀」
 */
export const TOOL_SEO_OVERRIDES: Record<string, ToolSeoOverride> = {
  'video-to-gif': {
    seoTitleZh: '视频转GIF在线免费无水印 — MP4/MOV转GIF动图制作与体积压缩 | 原心工具箱',
    seoTitleEn: 'Free Video to GIF Converter Online (No Watermark, 100% Local MP4 to GIF) | Yunsin Tools',
    seoDescZh: '免费在线把 MP4、MOV、WebM 视频转成高清 GIF 动图，100% 浏览器本地处理不上传隐私、无水印、无文件大小限制，支持帧率分辨率调节、加字幕与微信表情包体积压缩。',
    seoDescEn: 'Convert MP4, MOV, and WebM videos to crisp animated GIFs 100% locally in your browser. Zero server uploads, no watermarks, custom FPS, palette compression, and frame trimming.',
    extraKeywordsZh: ['视频转gif在线免费无水印', 'mp4转gif不模糊', '微信表情包gif压缩', 'mov转gif在线'],
    extraKeywordsEn: ['free video to gif no watermark', 'mp4 to gif offline browser', 'compress video to gif under 2mb'],
  },
  'video-frame-extractor': {
    seoTitleZh: '视频逐帧截图在线工具 — 高清视频抽帧提取与影视台词长图拼接 | 原心工具箱',
    seoTitleEn: 'Online Video Frame Extractor — HD Frame-by-Frame Screenshot & Contact Sheet | Yunsin Tools',
    extraKeywordsZh: ['视频截取高清图片在线', '视频批量抽帧不上传', '电影台词截图拼接长图'],
    extraKeywordsEn: ['extract frames from video online free', 'video to png sequence browser', 'video contact sheet generator'],
  },
  'video-transcoder': {
    seoTitleZh: '视频格式转换与提取音频在线免费 — MP4/MOV压缩瘦身转WAV不上传 | 原心工具箱',
    seoTitleEn: 'Free Local Video Converter, Compressor & Audio Extractor (MP4/MOV/WebM) | Yunsin Tools',
    extraKeywordsZh: ['视频在线压缩大小免费', '视频提取音频无损', 'mov转mp4在线不上传'],
    extraKeywordsEn: ['extract audio from mp4 locally', 'compress video in browser no upload'],
  },
  'image-converter': {
    seoTitleZh: '图片格式批量转换与压缩在线免费 — WebP/AVIF/PNG/JPG互转去EXIF | 原心工具箱',
    seoTitleEn: 'Bulk WebP / AVIF / PNG / JPG Image Converter & EXIF Remover (100% Local) | Yunsin Tools',
    extraKeywordsZh: ['webp转png在线批量', 'avif转jpg免费', '照片清除gps定位信息', '图片无损压缩不上传'],
    extraKeywordsEn: ['bulk webp to png offline', 'remove exif gps from photo online', 'avif to jpg batch converter'],
  },
  'gif-studio': {
    seoTitleZh: 'GIF动图拆帧、一键倒放与加字幕在线制作工具（免费无水印） | 原心工具箱',
    seoTitleEn: 'Free Online GIF Splitter, Reverser, Speed Changer & Meme Caption Maker | Yunsin Tools',
    extraKeywordsZh: ['gif拆成一帧一帧图片', 'gif动图倒放生成器', '表情包加文字在线制作'],
    extraKeywordsEn: ['split gif into frames png', 'reverse animated gif online no watermark'],
  },
  'id-photo-maker': {
    seoTitleZh: '证件照换底色在线免费 — 一寸二寸报名照片精准压缩到20KB与六寸排版 | 原心工具箱',
    seoTitleEn: 'Free Online ID & Passport Photo Maker — Change Background & Exact 20KB Sizer | Yunsin Tools',
    extraKeywordsZh: ['证件照换白底蓝底红底免费', '公务员报名照片压缩20kb', '一寸照片生成六寸排版冲印'],
    extraKeywordsEn: ['id photo background white free', 'compress passport photo to 20kb 50kb', '4x6 id photo print sheet'],
  },
  'privacy-watermark': {
    seoTitleZh: '身份证加水印在线工具（纯本地不上传）— 营业执照防盗用平铺水印与正反面A4拼版 | 原心工具箱',
    seoTitleEn: 'Offline ID Card & Document Anti-Theft Watermark Tool (Zero Upload, A4 Merge) | Yunsin Tools',
    extraKeywordsZh: ['身份证加仅供办理水印不上传', '身份证正反面合并到一张a4纸', '照片防盗用斜纹水印'],
    extraKeywordsEn: ['watermark id card safely offline', 'combine id front and back on a4'],
  },
  'audio-trimmer': {
    seoTitleZh: '在线音频剪辑器免费版 — MP3音乐波形裁剪、淡入淡出与手机铃声截取 | 原心工具箱',
    seoTitleEn: 'Free Online Audio Waveform Trimmer, Fade In/Out & Ringtone Cutter | Yunsin Tools',
    extraKeywordsZh: ['在线截取音乐高潮片段', '音频剪辑不上传服务器', 'mp3淡入淡出制作'],
    extraKeywordsEn: ['cut audio waveform in browser', 'mp3 ringtone cutter fade in out'],
  },
  'mortgage-prepayment-calculator': {
    seoTitleZh: '2026提前还房贷计算器在线 — 缩短年限vs减少月供省息对比（支持商贷/公积金组合贷） | 原心工具箱',
    seoTitleEn: '2026 Early Mortgage Payoff Calculator — Shorten Term vs Reduce Payment | Yunsin Tools',
    extraKeywordsZh: ['2026房贷提前还款计算器', '提前还房贷选缩短年限还是减少月供', '等额本息等额本金逐月明细表'],
    extraKeywordsEn: ['mortgage prepayment shorten term vs lower payment', 'extra mortgage payment calculator amortization'],
  },
  'auto-loan-tco-calculator': {
    seoTitleZh: '2026买车全款落地价与车贷真实年化利率(IRR)计算器 — 油车vs电车5年回本对比 | 原心工具箱',
    seoTitleEn: 'Car Out-the-Door Price, Flat-Fee Auto Loan True APR & EV vs Gas TCO Calculator | Yunsin Tools',
    extraKeywordsZh: ['4s店车贷月费率转真实年化', '买车落地价明细计算器', '新能源电车和油车几年回本'],
    extraKeywordsEn: ['flat rate car loan to apr calculator', 'ev vs gas 5 year cost calculator'],
  },
  'irr-loan-calculator': {
    seoTitleZh: '真实年化利率(IRR)计算器在线 — 信用卡分期/网贷等本等息与砍头息穿透照妖镜 | 原心工具箱',
    seoTitleEn: 'True Loan APR & IRR Calculator — Expose Flat Monthly Fee & Upfront Fee Loans | Yunsin Tools',
    extraKeywordsZh: ['信用卡分期手续费折算年化利率', '等本等息实际年利率计算器', '砍头息真实利率irr在线计算'],
    extraKeywordsEn: ['monthly flat rate to effective apr calculator', 'loan irr calculator with origination fee'],
  },
  'salary-bonus-tax-calculator': {
    seoTitleZh: '2026个人所得税与年终奖临界点计算器 — 五险一金税后工资到手及跳档盲区避税 | 原心工具箱',
    seoTitleEn: 'Salary Take-Home Pay & Annual Bonus Tax Cliff Optimizer Calculator | Yunsin Tools',
    extraKeywordsZh: ['2026税后工资计算器五险一金', '年终奖单独计税还是合并计税划算', '年终奖多发一元多交税临界点'],
    extraKeywordsEn: ['bonus tax cliff calculator', 'net salary after social insurance calculator'],
  },
  'discount-bill-splitter': {
    seoTitleZh: '外卖拼单AA满减分摊计算器 & 618/双11凑单退货实付金额计算器 | 原心工具箱',
    seoTitleEn: 'Fair Group Takeout Bill Splitter & Stacked E-Commerce Discount Proration Calculator | Yunsin Tools',
    extraKeywordsZh: ['几个人点外卖满减怎么平摊', '双11跨店满减凑单退货算账', '按原价比例分摊优惠计算器'],
    extraKeywordsEn: ['split delivery bill proportionally discount', 'prorate stacked coupon discount calculator'],
  },
  'compound-fire-calculator': {
    seoTitleZh: '复利定投收益计算器在线 & FIRE提前退休（4%法则养老金购买力）模拟器 | 原心工具箱',
    seoTitleEn: 'Compound Interest, Inflation Purchasing Power & 4% Rule FIRE Retirement Calculator | Yunsin Tools',
    extraKeywordsZh: ['每月定投复利计算器在线', 'fire财务自由需要多少钱计算', '考虑通货膨胀后的实际购买力计算'],
    extraKeywordsEn: ['lean fat fire calculator inflation adjusted', 'monthly sip compound interest simulator'],
  },
  'qrcode-studio': {
    seoTitleZh: '二维码生成器在线免费（永久活码无广告）— WiFi码/挪车码/带Logo美化与批量扫码识别 | 原心工具箱',
    seoTitleEn: 'Free Custom QR Code Generator & Offline Scanner (WiFi, vCard, Logo, Zero Redirects) | Yunsin Tools',
    extraKeywordsZh: ['永久免费静态二维码生成', '电脑屏幕图片识别二维码在线', '彩色渐变圆点二维码制作'],
    extraKeywordsEn: ['permanent static qr code generator with logo', 'decode qr code from image offline'],
  },
  'barcode-batch-printer': {
    seoTitleZh: '条形码批量生成器在线免费 — EAN-13/Code128校验位计算与A4不干胶标签排版打印 | 原心工具箱',
    seoTitleEn: 'Free Bulk Barcode Generator (EAN-13, Code128, UPC) & Printable A4 Label Sheet | Yunsin Tools',
    extraKeywordsZh: ['excel批量生成条形码打印a4', 'ean13第13位校验码自动计算', '商品条码矢量svg免费生成'],
    extraKeywordsEn: ['batch barcode generator printable a4 pdf', 'ean 13 check digit calculator bulk'],
  },
  'pdf-toolkit': {
    seoTitleZh: 'PDF转高清长图与多张图片合并转PDF在线免费（100%纯本地不上传防泄密） | 原心工具箱',
    seoTitleEn: '100% Local PDF to Long Image & Multi-Image to A4 PDF Merger (Zero Server Upload) | Yunsin Tools',
    extraKeywordsZh: ['手机照片合同合成一个pdf不上传', 'pdf无缝拼接成一张长图免费', '保密文件离线转pdf'],
    extraKeywordsEn: ['convert jpg scans to a4 pdf offline', 'stitch pdf pages into one vertical image'],
  },
  'signature-scanner-cleaner': {
    seoTitleZh: '手写签名抠图转透明背景电子签名(PNG) & 手机拍合同文档去黑底阴影漂白在线工具 | 原心工具箱',
    seoTitleEn: 'Transparent Handwritten Signature Extractor & Document Photo Shadow Cleaner | Yunsin Tools',
    extraKeywordsZh: ['白纸手写签名生成透明png免费', '公章红色印章抠图透明背景', '手机拍文件发灰变白底打印'],
    extraKeywordsEn: ['extract signature from photo transparent png', 'whiten gray document scan background online'],
  },
  'hardware-screen-tester': {
    seoTitleZh: '显示器屏幕坏点漏光检测、真实刷新率(Hz)测速与鼠标双击连击/键盘全键在线验机工具 | 原心工具箱',
    seoTitleEn: 'Online Monitor Dead Pixel, Refresh Rate (Hz), Mouse Double-Click & Keyboard Tester | Yunsin Tools',
    extraKeywordsZh: ['在线测屏幕亮点暗点坏点全屏', '鼠标微动双击故障在线测试', '显示器144hz 240hz刷新率测试'],
    extraKeywordsEn: ['fullscreen dead pixel backlight bleed test', 'mouse switch double click test ms'],
  },
  'kinship-age-calculator': {
    seoTitleZh: '中国亲戚称呼计算器在线（三姑六婆关系互查）& 精确周岁虚岁/人生900个月格子图 | 原心工具箱',
    seoTitleEn: 'Chinese Kinship Title Calculator, Chronological Age & 900-Month Life Calendar | Yunsin Tools',
    extraKeywordsZh: ['爸爸的表姐的儿子叫什么计算器', '周岁虚岁精确到天计算器', '人生九百格在线生成'],
    extraKeywordsEn: ['chinese family relationship title calculator', 'life in 900 months grid visualizer'],
  },
  'social-card-generator': {
    seoTitleZh: '小红书图文卡片与金句海报在线排版生成器 — 极客代码美化截图无水印导出 | 原心工具箱',
    seoTitleEn: 'Social Share Card, Quote Poster & macOS Code Snapshot Generator (No Watermark) | Yunsin Tools',
    extraKeywordsZh: ['小红书文字封面图在线生成', '模仿macos窗口代码高亮截图', '推文金句卡片排版工具'],
    extraKeywordsEn: ['macos code screenshot beautifier offline', 'social media quote card maker canvas'],
  },
  'freelance-invoice-generator': {
    seoTitleZh: '自由职业商业发票(Invoice)与报价单(Quote)在线生成器 — 中英双语A4 PDF纯本地导出 | 原心工具箱',
    seoTitleEn: 'Free Private Freelance Invoice, Quote & Receipt PDF Generator (No Signup, Offline) | Yunsin Tools',
    extraKeywordsZh: ['外贸跨境形式发票commercial invoice模板生成', '独立开发者外包报价单pdf制作'],
    extraKeywordsEn: ['free commercial invoice generator pdf no login', 'freelance sow quote receipt maker'],
  },
  'payment-fee-calculator': {
    seoTitleZh: '跨境收款手续费与隐性汇损对比计算器 — PayPal / Stripe / Wise / 派安盈到账净额反推 | 原心工具箱',
    seoTitleEn: 'PayPal, Stripe, Wise & Payoneer Fee + Hidden FX Markup Reverse Calculator | Yunsin Tools',
    extraKeywordsZh: ['paypal提现手续费反向倒推计算器', 'stripe和wise跨境收款真实费率对比'],
    extraKeywordsEn: ['paypal reverse fee calculator international fx', 'stripe vs wise cross border fee comparison'],
  },
  'saas-metrics-calculator': {
    seoTitleZh: '独立开发Micro-SaaS估值计算器与单元经济模型沙盘（MRR / ARR / LTV / Churn） | 原心工具箱',
    seoTitleEn: 'Indie Micro-SaaS Valuation, LTV/CAC Unit Economics & MRR Cashflow Calculator | Yunsin Tools',
    extraKeywordsZh: ['saas项目收购估值倍数计算', '独立开发者月经常性收入mrr测算'],
    extraKeywordsEn: ['micro saas valuation multiple calculator', 'ltv cac net revenue retention sandbox'],
  },
  'llm-cost-calculator': {
    seoTitleZh: '2026大模型API价格对比与Token分词计算器 — DeepSeek / GPT-4o / Claude / 千问成本精算 | 原心工具箱',
    seoTitleEn: '2026 LLM API Pricing & Token Cost Calculator (DeepSeek, OpenAI, Claude, Gemini) | Yunsin Tools',
    extraKeywordsZh: ['deepseek r1 v3 api调用费用计算器', '中文长文本token数量在线统计', 'prompt缓存命中省钱测算'],
    extraKeywordsEn: ['llm token counter and api cost comparison', 'deepseek vs claude vs gpt4o pricing calculator'],
  },
  'polyglot-converter': {
    seoTitleZh: 'JSON / SQL / YAML / cURL 转 TypeScript、Zod、Go Struct、Rust、Pydantic 在线工具 | 原心工具箱',
    seoTitleEn: 'Offline JSON / SQL / cURL to TypeScript, Zod, Go Struct, Rust & Pydantic Converter | Yunsin Tools',
    extraKeywordsZh: ['json在线转typescript interface不上传', 'mysql建表语句转prisma schema', 'curl命令转fetch python代码'],
    extraKeywordsEn: ['json to zod schema generator offline', 'sql create table to go struct rust serde'],
  },
  'deeplink-tester': {
    seoTitleZh: 'iOS Universal Links (AASA) 与 Android App Links 配置生成校验及真机扫码唤醒调试器 | 原心工具箱',
    seoTitleEn: 'Universal Links (AASA), Android AssetLinks Validator & Mobile DeepLink QR Tester | Yunsin Tools',
    extraKeywordsZh: ['apple-app-site-association在线生成校验', 'h5唤起app微信防屏蔽测试二维码'],
    extraKeywordsEn: ['apple app site association aasa generator', 'android assetlinks json validator qr'],
  },
  'web3-rpc-tester': {
    seoTitleZh: 'Web3多链RPC节点延迟测速 & 以太坊/EVM交易Calldata离线ABI安全解码器（免连钱包） | 原心工具箱',
    seoTitleEn: 'Multi-Chain EVM & Solana RPC Latency Tester + Offline Calldata Security Decoder | Yunsin Tools',
    extraKeywordsZh: ['以太坊solana公共rpc节点测速', '0x十六进制calldata离线反解析', '无限授权approve风险检测'],
    extraKeywordsEn: ['ethereum solana rpc latency benchmark browser', 'decode evm hex calldata offline without wallet'],
  },
  'vue3-compiler-visualizer': {
    seoTitleZh: 'Vue 3 模板编译原理交互式可视化实验室 — AST语法树、静态提升与PatchFlags位运算推演 | 原心实验室',
    seoTitleEn: 'Vue 3 Template Compiler Interactive Visualizer — AST, Static Hoisting & PatchFlags | Yunsin Lab',
  },
  'js-eventloop-visualizer': {
    seoTitleZh: 'JavaScript 事件循环 (Event Loop) 单步动画模拟器 — 宏任务/微任务/rAF执行顺序推演 | 原心实验室',
    seoTitleEn: 'JavaScript Event Loop Step-by-Step Interactive Visualizer (Microtasks, rAF, Macrotasks) | Yunsin Lab',
  },
  'vue3-runtime-visualizer': {
    seoTitleZh: 'Vue 3 快速 Diff 算法（最长递增子序列 LIS）与响应式 Track/Trigger 步进可视化器 | 原心实验室',
    seoTitleEn: 'Vue 3 Fast Diff (Longest Increasing Subsequence) & Reactivity Step-by-Step Visualizer | Yunsin Lab',
  },
  'http3-quic-visualizer': {
    seoTitleZh: 'HTTP/2 vs HTTP/3 (QUIC) 协议交互模拟器 — 0-RTT握手与TCP丢包队头阻塞可视化对比 | 原心实验室',
    seoTitleEn: 'HTTP/2 vs HTTP/3 (QUIC) Interactive Simulator — 0-RTT & Head-of-Line Blocking | Yunsin Lab',
  },
};

/**
 * 精编高转化程序化 SEO (pSEO) 场景专页定义：
 * 每一个场景专页都对应真实的细分长尾搜索词，并在打开时直接向底层 Vue 工具注入初始预设状态！
 */
export interface SeoPresetScenario {
  slug: string;
  parentToolSlug: string;
  componentKey:
    | 'id-photo'
    | 'image-converter'
    | 'video-to-gif'
    | 'qrcode-studio'
    | 'pdf-toolkit'
    | 'mortgage'
    | 'irr-loan'
    | 'polyglot';
  componentProps: Record<string, any>;
  badgeZh: string;
  badgeEn: string;
  shortLabelZh: string;
  shortLabelEn: string;
  titleZh: string;
  titleEn: string;
  seoTitleZh: string;
  seoTitleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  keywordsZh: string[];
  keywordsEn: string[];
  guideHtmlZh: string;
  guideHtmlEn: string;
  faqsZh: FaqItem[];
  faqsEn: FaqItem[];
}

export const SEO_PRESET_SCENARIOS: SeoPresetScenario[] = [
  // 1. 公考/教资/四六级报名照片精准压缩到 20KB
  {
    slug: 'exam-photo-20kb',
    parentToolSlug: 'id-photo-maker',
    componentKey: 'id-photo',
    componentProps: {
      initialPresetId: 'exam',
      initialBgId: 'blue',
      initialMaxKb: 25,
      initialMinKb: 15,
    },
    badgeZh: '🎯 报名专版 · 自动锁 15~25KB',
    badgeEn: '🎯 Exam Preset · Locked 15–25KB',
    shortLabelZh: '公考/教资报名照压至20KB',
    shortLabelEn: 'Compress ID Photo to 20KB',
    titleZh: '公务员 / 教资 / 四六级报名照片在线压缩到 20KB 制作器（295×413 蓝白底免上传）',
    titleEn: 'Compress ID & Exam Photo to Exact 20KB Online (295×413px, Zero Server Upload)',
    seoTitleZh: '照片压缩到20KB在线制作免费 — 公务员/教资/四六级一寸报名照换底色精准控KB | 原心工具箱',
    seoTitleEn: 'Compress ID Photo to 20KB–30KB Online Free — Exact KB Sizer & White/Blue Background | Yunsin Tools',
    descriptionZh: '专为国考省考、教师资格证、英语四六级(CET)、会计职称报名打造：打开即自动锁定 295×413 像素与 15KB~25KB 严苛体积区间，支持本地一键换蓝底/白底/红底，绝不上传人脸隐私。',
    descriptionEn: 'Pre-configured for strict government, university exam, and visa portals requiring exact 15KB–25KB JPEG limits. Crop, replace background color, and hit exact KB size 100% offline.',
    keywordsZh: ['照片压缩到20kb在线', '公务员报名照片尺寸20kb', '教资报名照片换白底小于20k', '四六级报名照片压缩30kb', '一寸照片精确控制kb大小'],
    keywordsEn: ['compress photo to 20kb online free', 'resize signature and photo 20kb exam', 'exact kb image compressor passport'],
    guideHtmlZh: `
      <h2>如何 10 秒搞定“大于 15KB 且小于 20KB/30KB”的严苛报名审核照片？</h2>
      <p>在人事考试网、中小学教师资格考试网或全国大学英语四六级报名系统中，普通画图软件改完尺寸后，照片往往要么高达 <code>90KB</code> 被拒，要么过度压缩变成 <code>8KB</code> 模糊马赛克且低于下限。本专页已为您<strong>自动预置【295×413 标准报名一寸尺寸】与【15KB ~ 25KB 双端卡尺】</strong>：</p>
      <ul>
        <li><strong>二分法自动逼近目标 KB：</strong> 上传生活照或原证件照后，引擎自动执行 8 轮 JPEG 量化二分查找；若纯白底图像字节过小，会自动追加标准无损填充字节，确保文件大小精准落在 <code>18KB ~ 24KB</code> 黄金通过区间。</li>
        <li><strong>一键切换白底 / 政务蓝 / 中国红：</strong> 教资要求白底、公考常用蓝底或白底，点击右侧色卡即可毫秒级平滑替换背景，保留自然发丝过渡且清除全部相机 EXIF 信息。</li>
      </ul>
    `,
    guideHtmlEn: `
      <h2>How to Hit Strict 15KB–25KB Portal Limits Without Blurry Artifacts</h2>
      <p>Many civil service, university entrance, and visa application systems enforce both a <strong>maximum file size (e.g. 20KB or 30KB)</strong> and a <strong>minimum threshold (e.g. 15KB)</strong>. This preset pre-locks exact pixel dimensions and binary-search JPEG quantization:</p>
      <ul>
        <li><strong>8-Step Binary Search + Lossless Padding:</strong> Automatically finds the highest visual quality under 25KB, while injecting compliant lossless padding if a clean white background compresses below 15KB.</li>
        <li><strong>100% Biometric Privacy:</strong> Your portrait never leaves your browser memory—no cloud uploads, watermarks, or paywalls.</li>
      </ul>
    `,
    faqsZh: [
      {
        question: '教资、国考、四六级分别对照片底色和 KB 大小有什么具体规定？',
        answer: '1. 中小学教师资格证（NTCE）：明确要求本人近 6 个月内【纯白底】免冠正面证件照，文件大小小于 200KB（建议控制在 20KB~40KB 上传最快）；2. 国考/省考录用系统：通常要求蓝底或白底，295×413 像素，JPG 格式且严控在 15KB~30KB 之间；3. 英语四六级（CET）：多省市网报系统限制 JPG 格式且不大于 20KB 或 30KB。使用本页默认参数可通吃以上审核。',
      },
      {
        question: '为什么用微信发原图压缩后还是通不过人事考试网照片处理工具？',
        answer: '微信聊天压缩会随意改变照片的像素宽高比（例如变成非标准的 294×412），或残留非标准色彩空间标记。本工具严格输出标准 sRGB 基线（Baseline）JPEG 流并抹除多余元数据，可直接通过官方“照片审核处理工具”校验。',
      },
    ],
    faqsEn: [
      {
        question: 'Why do online exam portals reject my resized JPEG even when the KB size looks right?',
        answer: 'Many legacy government portals reject Progressive JPEGs, CMYK color profiles, or non-exact pixel aspect ratios. Our local canvas encoder strictly outputs Baseline sRGB JPEGs with zero EXIF bloat at exact pixel dimensions.',
      },
      {
        question: 'What if my photo shrinks to 9KB and fails the minimum 15KB requirement?',
        answer: 'Set the Minimum KB slider to 15KB. Our binary sizer automatically pads the JPEG container losslessly so the file lands cleanly between 16KB and 24KB without altering a single pixel.',
      },
    ],
  },

  // 2. WebP 转 PNG 在线批量无损转换
  {
    slug: 'webp-to-png',
    parentToolSlug: 'image-converter',
    componentKey: 'image-converter',
    componentProps: {
      initialTargetMime: 'image/png',
      initialQuality: 100,
    },
    badgeZh: '🖼️ 格式急救 · 已预设输出 PNG',
    badgeEn: '🖼️ Format Fix · Preset to PNG',
    shortLabelZh: 'WebP批量转透明PNG',
    shortLabelEn: 'WebP to Transparent PNG',
    titleZh: 'WebP 转 PNG 在线批量转换器（保留透明背景、免费不限张数、零上传）',
    titleEn: 'Bulk WebP to Transparent PNG Converter Offline (100% Local, Unlimited)',
    seoTitleZh: 'WebP转PNG在线批量转换免费 — 完整保留透明通道/不上传服务器秒导出 | 原心工具箱',
    seoTitleEn: 'Free Bulk WebP to PNG Converter Online — Preserve Transparency, Zero Upload | Yunsin Tools',
    descriptionZh: '从网页保存的图片是 .webp 格式导致 PS、PR、PPT 或老软件打不开？本页已默认锁定【无损 PNG 输出】，支持一次性拖入几十张 WebP 图片本地秒转透明 PNG 并一键打包下载 ZIP。',
    descriptionEn: 'Downloaded .webp images from websites that Photoshop, Premiere, or legacy apps cannot open? Pre-configured to lossless PNG output—drag and drop dozens of WebP files locally and download as a ZIP.',
    keywordsZh: ['webp转png在线免费', 'webp批量转png保留透明', '网页保存的webp怎么转png', 'webp格式转换器不上传'],
    keywordsEn: ['webp to png converter bulk free', 'convert webp to transparent png offline', 'batch webp to png zip no upload'],
    guideHtmlZh: `
      <h2>为什么网页右键保存的图片变成了 WebP？如何批量无损转回透明 PNG？</h2>
      <p>如今淘宝、知乎、微信公众号及各大海外网站为了节省 CDN 带宽，普遍将图片自动转换为 Google 的 <code>.webp</code> 格式。然而许多旧版设计软件、视频剪辑时间线（如旧版 PR/AE）、政企办公系统及微信电脑端排版器并不兼容 WebP，直接改文件后缀名还会导致文件损坏报错。</p>
      <ul>
        <li><strong>已默认锁定无损 PNG 通道：</strong> 直接将文件夹里的所有 <code>.webp</code> 拖入上方虚线框，工具会在本地内存中完整解码 Alpha 透明通道并重新封装为标准 32-bit <code>PNG</code>，绝不把透明图标变成黑底或白底。</li>
        <li><strong>内置纯前端 ZIP 打包：</strong> 无需一张张右键另存为，几十张图片秒转完成后点击“一键打包下载 ZIP”即可整包带走。</li>
      </ul>
    `,
    guideHtmlEn: `
      <h2>Why Simply Renaming .webp to .png Corrupts Files — And How to Convert Properly</h2>
      <p>Modern CDNs serve images as <code>.webp</code> to cut bandwidth, but legacy editors, slides, and upload forms still require genuine PNG headers (<code>89 50 4E 47</code>). Renaming the file extension does not transcode the VP8L bitstream.</p>
      <ul>
        <li><strong>Full Alpha Transparency Preserved:</strong> Pre-locked to lossless <code>image/png</code> output so UI icons, stickers, and logos retain crisp transparent edges.</li>
        <li><strong>Zero-Upload Bulk ZIP Export:</strong> Convert 50+ WebP assets simultaneously in browser RAM and download a single clean PKZip archive.</li>
      </ul>
    `,
    faqsZh: [
      {
        question: '直接把 .webp 后缀重命名改成 .png 为什么上传还是报错？',
        answer: '修改文件名后缀并不会改变文件内部的二进制编码结构（WebP 头部魔数为 RIFF....WEBP，而 PNG 为 89 50 4E 47）。严格校验二进制文件头的后台或设计软件会直接识别出格式伪造并报错，必须像本工具一样经过像素解码与 PNG 重新编码。',
      },
      {
        question: '原本带透明背景的 WebP 图标转成 PNG 后还会保持透明吗？',
        answer: '100% 保持透明！本页面已自动为您选中无损 RGBA PNG 输出模式，每个像素的 Alpha 透明度值都会原样保留。如果您需要更小体积且不需要透明背景，也可在上方切换为 JPEG 输出。',
      },
    ],
    faqsEn: [
      {
        question: 'Does converting WebP to PNG preserve transparent backgrounds?',
        answer: 'Yes. Because this preset defaults to lossless 32-bit RGBA PNG encoding, every pixel’s alpha channel is preserved with zero background matte.',
      },
      {
        question: 'Is there a 5-file or 10MB limit like CloudConvert or TinyPNG?',
        answer: 'No limits at all. Everything runs on your own CPU/GPU inside browser memory via Rust WebAssembly, so we pay $0 in server bandwidth and never throttle batch sizes.',
      },
    ],
  },

  // 3. AVIF 转 JPG 在线批量转换
  {
    slug: 'avif-to-jpg',
    parentToolSlug: 'image-converter',
    componentKey: 'image-converter',
    componentProps: {
      initialTargetMime: 'image/jpeg',
      initialQuality: 92,
    },
    badgeZh: '📸 兼容救星 · 已预设输出高清 JPG',
    badgeEn: '📸 Compatibility · Preset to 92% JPG',
    shortLabelZh: 'AVIF批量转通用JPG',
    shortLabelEn: 'AVIF to High-Res JPG',
    titleZh: 'AVIF 转 JPG 在线批量转换工具（解决电脑看图软件打不开 AVIF · 100%本地转换）',
    titleEn: 'Bulk AVIF to JPG Converter Online (92% High Quality, 100% Offline Browser Tool)',
    seoTitleZh: 'AVIF转JPG在线批量转换免费 — 解决AVIF格式图片打不开/纯本地极速导出 | 原心工具箱',
    seoTitleEn: 'Free Bulk AVIF to JPG Converter Online — Instant Local Browser Decoding, No Upload | Yunsin Tools',
    descriptionZh: '下载了 .avif 格式高清照片却发现 Windows 看图器、Word 或后台系统无法上传？本页已默认锁定【92% 高画质标准 JPG 输出】，拖入即可不限数量批量转成全平台通用的 JPG 图片。',
    descriptionEn: 'Cannot open or upload .avif photos in Windows Photo Viewer, Office, or CMS backends? Pre-locked to 92% high-fidelity JPEG output with unlimited local batch conversion.',
    keywordsZh: ['avif转jpg在线免费', 'avif格式怎么转换成jpg', 'avif图片打不开怎么办', '批量avif转jpeg不上传'],
    keywordsEn: ['avif to jpg converter bulk free', 'convert avif to jpeg offline', 'open avif file convert to jpg'],
    guideHtmlZh: `
      <h2>AVIF 格式图片打不开、传不上去怎么办？一键本地转回高画质 JPG</h2>
      <p><code>AVIF</code>（AV1 Image File Format）是目前压缩率最高的新一代图像格式，小红书、B站、电商详情页及新款手机浏览器已大量采用。但绝大多数企业 OA、电商卖家后台、旧版 Windows 照片查看器至今仍不支持 AVIF。</p>
      <ul>
        <li><strong>已预置 92% 黄金画质 JPG 档位：</strong> 既保证肉眼无损的摄影细节还原，又不会产生虚高的文件体积，且自动剥离原图残留元数据，100% 兼容全球所有软件与网页上传框。</li>
      </ul>
    `,
    guideHtmlEn: `
      <h2>Instant Local AVIF to JPEG Conversion for Universal Compatibility</h2>
      <p>While <code>AVIF</code> offers remarkable compression, legacy CMS uploaders, print shops, and desktop apps often reject it. Drop any number of <code>.avif</code> files above—already preset to <strong>92% quality Baseline JPEG</strong>—and export universally compatible <code>.jpg</code> files instantly without uploading private images.</p>
    `,
    faqsZh: [
      {
        question: 'AVIF 转成 JPG 后画质会变差吗？',
        answer: '本专页已将默认输出质量调优至 92% 高保真档位，色彩细腻度与原始 AVIF 肉眼几乎零差别；若您需要极致控制体积，也可手动将滑块微调至 80%~85%。',
      },
      {
        question: '公司内网保密设计稿是 AVIF 格式，能用这个工具转吗？',
        answer: '完全放心使用！本工具无任何后端上传接口，您可以加载完页面后直接断开电脑网络再拖入图片转换，100% 杜绝内网资料外泄。',
      },
    ],
    faqsEn: [
      {
        question: 'Why does AVIF conversion work so fast here without uploading?',
        answer: 'Your modern browser natively decodes AV1 image frames on hardware, and our Rust Wasm + Canvas pipeline re-encodes directly to clean JPEG bytes in local RAM.',
      },
    ],
  },

  // 4. 微信表情包视频转 GIF 1MB 以内压缩专版
  {
    slug: 'mp4-to-gif-wechat',
    parentToolSlug: 'video-to-gif',
    componentKey: 'video-to-gif',
    componentProps: {
      initialWidth: 240,
      initialFps: 8,
      initialMaxColors: 64,
    },
    badgeZh: '💬 斗图神器 · 预设 240px / 8FPS / <1MB',
    badgeEn: '💬 Chat Preset · 240px / 8FPS / <1MB',
    shortLabelZh: '微信表情包GIF压缩(<1MB)',
    shortLabelEn: 'WeChat/Discord Meme GIF (<1MB)',
    titleZh: '微信表情包视频转 GIF 在线制作压缩器（自动锁 240px 控 1MB 内 · 加字幕无水印）',
    titleEn: 'WeChat, Discord & Slack Video to GIF Meme Maker (Under 1MB Preset, No Watermark)',
    seoTitleZh: '微信表情包GIF压缩在线制作 — MP4视频转GIF控制在1MB以内加文字无水印 | 原心工具箱',
    seoTitleEn: 'Compress Video to GIF Under 1MB Online — Discord, Slack & WeChat Sticker Maker | Yunsin Tools',
    descriptionZh: '发微信动态表情提示“文件过大无法添加为表情”？本专页已自动锁定微信斗图黄金参数（240px 宽度 + 8 FPS + 64色调色板压缩），轻松把手机录屏/搞笑视频压到 500KB~1MB 内，支持加黑白描边神评字幕且零水印！',
    descriptionEn: 'Pre-tuned to 240px width, 8 FPS, and 64-color LZW quantization so your MP4/MOV clips stay cleanly under 1MB for WeChat custom stickers, Discord emojis, and Slack reactions—with built-in meme captions and zero watermarks.',
    keywordsZh: ['微信表情包gif大小限制压缩', '视频转微信表情包在线制作', 'gif压缩到1m以内免费', '动图加字幕制作表情包无水印'],
    keywordsEn: ['compress mp4 to gif under 1mb', 'discord emoji gif maker 256kb 1mb', 'wechat custom gif sticker size converter'],
    guideHtmlZh: `
      <h2>为什么你转出来的 GIF 加不进微信自定义表情？微信斗图官方限制全解析</h2>
      <p>在微信里点击“添加到表情”或直接发送动图时，如果 GIF 体积过大（通常超过 <code>1MB ~ 2MB</code> 或宽高超过像素上限），微信就会直接变成静态缩略图或报错无法添加。很多在线网站不仅压缩率差，还会在表情包右下角强行打上丑陋的网站水印！</p>
      <ul>
        <li><strong>已预调微信最佳黄金甜点参数：</strong> 打开本页即自动设为 <code>240px 宽度 + 8 FPS 帧率 + 64 色自适应调色板</code>，3 秒搞笑视频转出仅约 <strong>350KB ~ 800KB</strong>，在手机聊天窗依然丝滑清晰，秒加微信收藏表情栏。</li>
        <li><strong>自带黑边白字神评字幕 & 废帧剔除：</strong> 输入顶部/底部吐槽台词一键烧录进动图，还能在下方胶片条里勾选删掉开头黑屏废帧，进一步立减 30% 体积。</li>
      </ul>
    `,
    guideHtmlEn: `
      <h2>Why Chat Apps Reject Oversized GIFs — Pre-Tuned Sub-1MB Sticker Compression</h2>
      <p>Chat platforms like WeChat, Discord (emoji slots), and Slack enforce strict byte ceilings on animated stickers. Instead of guessing sliders, this preset pre-configures <strong>240px width, 8 FPS, and 64-color RGB555 LZW quantization</strong>—shrinking 3-second clips by up to 85% with zero watermarks.</p>
    `,
    faqsZh: [
      {
        question: '微信自定义添加动态表情包的最大体积和尺寸限制是多少？',
        answer: '实测微信收藏栏自定义动态表情建议控制在【1MB 以内】（部分版本放宽至 2MB~5MB，但超过 1MB 在弱网群聊极易停止自动播放），推荐分辨率宽度在 240px~320px 之间，总帧数不超过 30~40 帧。本页预设值正好卡在最稳妥的秒发区间。',
      },
      {
        question: '如果我想做公众号文章或 GitHub 高清演示动图，怎么调回高清模式？',
        answer: '只需在上方参数栏将目标宽度切换为 480px 或 640px、帧率改为 15 FPS、颜色数改为 256 色即可，或点击顶部面包屑返回视频转 GIF 全功能主工作台。',
      },
    ],
    faqsEn: [
      {
        question: 'How do I shrink my GIF even further under 256KB for Discord custom animated emojis?',
        answer: 'Trim your clip duration to 1.5–2.0 seconds, switch Palette Colors from 64 down to 32 Colors, and uncheck any static frames at the start or end of the filmstrip.',
      },
    ],
  },

  // 5. WiFi 免输密码连接二维码打印卡生成
  {
    slug: 'wifi-qrcode-generator',
    parentToolSlug: 'qrcode-studio',
    componentKey: 'qrcode-studio',
    componentProps: {
      initialMode: 'generator',
      initialScene: 'wifi',
    },
    badgeZh: '📶 门店/客厅必备 · 已切至 WiFi 码模式',
    badgeEn: '📶 Instant Connect · Preset to WiFi Mode',
    shortLabelZh: 'WiFi扫码免密连网二维码',
    shortLabelEn: 'Printable WiFi QR Code Sign',
    titleZh: 'WiFi 二维码生成器在线制作（手机扫一扫免输密码自动连 WiFi 台卡打印）',
    titleEn: 'Free Printable WiFi QR Code Generator (Scan to Auto-Connect, Never Expires)',
    seoTitleZh: 'WiFi二维码生成器在线免费 — 手机扫一扫免密码连WiFi桌贴打印（纯本地不泄密） | 原心工具箱',
    seoTitleEn: 'Free WiFi QR Code Generator Printable Sign — Offline WPA2/WPA3 Auto-Connect | Yunsin Tools',
    descriptionZh: '家里来客人、咖啡馆餐厅、民宿前台与公司会议室必备：输入路由器 WiFi 名称与密码，100% 浏览器本地生成符合国际标准协议的【永久免费免密连网二维码台卡】，苹果 iPhone 相机与安卓微信扫一扫秒连，密码绝不上传云端！',
    descriptionEn: 'Create a permanent, printable WiFi QR code card for guests, Airbnb rentals, cafes, and conference rooms. iPhone Camera and Android scan to join WPA/WPA2 networks instantly—100% offline so your WiFi password never touches a server.',
    keywordsZh: ['wifi二维码生成器在线制作', '微信扫一扫连wifi二维码怎么弄', '餐厅wifi扫码连网桌贴免费', '纯静态永久wifi码不收费'],
    keywordsEn: ['free wifi qr code generator printable', 'scan qr code to connect wifi iphone android', 'offline wifi qr maker safe'],
    guideHtmlZh: `
      <h2>千万别用收费小程序做“假活码”！教你在本地生成永久免费、零广告的真 WiFi 二维码</h2>
      <p>很多店主在搜索引擎找“WiFi 码生成”时容易踩进第三方营销小程序的坑——顾客扫码后被迫先看 15 秒激励视频广告才能连网，或者试用 7 天后提示“扫码次数已耗尽需充值会员”。</p>
      <ul>
        <li><strong>原生 <code>WIFI:T:WPA;S:...;P:...;;</code> 国际底层协议：</strong> 本页已为您直接打开<strong>【WiFi 连网码模式】</strong>，直接将账号密码编码进标准矩阵点阵中，不经过任何第三方服务器中转，<strong>哪怕十年后依然 100% 秒扫秒连、无任何弹窗广告</strong>。</li>
        <li><strong>密码零上传绝对安全：</strong> 公司内网或家庭路由器密码完全在您自己的浏览器内运算成图，支持一键打印精美桌牌立卡。</li>
      </ul>
    `,
    guideHtmlEn: `
      <h2>Zero Subscriptions, Zero Ads — Native Standard WiFi QR Codes Generated Offline</h2>
      <p>Unlike SaaS "dynamic QR" traps that expire after a 14-day trial or leak your network credentials to a cloud database, this preset encodes the native <code>WIFI:T:WPA;S:...;P:...;;</code> payload directly into a high-contrast vector matrix inside your browser. iOS 11+ Camera and Android devices join your network in one tap forever.</p>
    `,
    faqsZh: [
      {
        question: '生成的 WiFi 二维码用苹果手机相机和微信都能直接扫上吗？',
        answer: '苹果 iPhone 打开系统原相机对准二维码，顶部会立即弹出黄色“加入无线局域网”按钮，点击即连；绝大多数安卓手机（小米、华为、OPPO、vivo、三星）使用系统相机或控制中心扫一扫同样支持免密直连。',
      },
      {
        question: '以后如果改了路由器 WiFi 密码，原来打印出来的二维码还能用吗？',
        answer: '因为纯静态真码直接将无线名称（SSID）与密码编码在图案内部（这也是它永不收费、永不失效、无需联网中转的原因），如果未来您修改了路由器密码，只需回到本页重新免费生成打印一张即可。',
      },
    ],
    faqsEn: [
      {
        question: 'Is it safe to type my home or office WiFi password into this generator?',
        answer: '100% safe. You can even turn off your internet connection after loading this page and generate/print your WiFi QR code completely offline.',
      },
    ],
  },

  // 6. 临时停车挪车二维码制作打印
  {
    slug: 'parking-qrcode-generator',
    parentToolSlug: 'qrcode-studio',
    componentKey: 'qrcode-studio',
    componentProps: {
      initialMode: 'generator',
      initialScene: 'parking',
    },
    badgeZh: '🚗 车主刚需 · 已切至挪车码打印卡',
    badgeEn: '🚗 Car Sign · Preset to Scan-to-Call',
    shortLabelZh: '临时停车扫码拨号挪车牌',
    shortLabelEn: 'Printable Car Parking QR Sign',
    titleZh: '临时停车挪车二维码在线制作与打印（扫码一键拨号、永久免费无年费无广告）',
    titleEn: 'Free Printable Car Parking QR Code Sign Maker (Scan-to-Call, Never Expires)',
    seoTitleZh: '挪车二维码生成器免费打印 — 临时停车扫码一键拨打电话号码牌自制工具 | 原心工具箱',
    seoTitleEn: 'Printable Car Parking Phone QR Code Sign Generator — Free, Static, Zero Redirects | Yunsin Tools',
    descriptionZh: '不想花钱买每年续费的虚拟号挪车贴？本页已默认锁定【挪车码打印卡模式】，输入车牌号与联系电话即可一键生成前挡风玻璃高清排版挪车卡，支持防晒对比度优化与手机相机扫码一键唤醒拨号盘！',
    descriptionEn: 'Pre-configured to the Printable Dashboard Parking Sign mode. Enter your plate and phone number to generate a crisp `tel:` scan-to-call card you can print at home with zero annual fees.',
    keywordsZh: ['挪车二维码在线生成免费打印', '临时停车牌二维码自己制作', '扫码直接拨打电话二维码生成', '永久免费挪车码无广告'],
    keywordsEn: ['printable parking qr code sign', 'qr code to call phone number generator', 'car dashboard contact qr maker'],
    guideHtmlZh: `
      <h2>1 分钟自制前挡风玻璃挪车二维码卡：告别微商骚扰爬取与会员续费套路</h2>
      <p>把明文 11 位手机号大字摆在车窗前，容易被路边自动OCR扫街摄像头批量采集推销车险；而买网上的“隐私挪车贴”往往第一年 9.9 元、第二年续费 39 元。使用原生 <code>tel:</code> 拨号协议生成的静态挪车码，既能防街拍 OCR 自动扫号，又能让真正需要挪车的邻居用手机系统相机一扫直接呼出拨号键，<strong>终身 0 费用、永不过期</strong>。</p>
    `,
    guideHtmlEn: `
      <h2>Why Use a Static <code>tel:</code> QR Sign on Your Dashboard?</h2>
      <p>Displaying plain-text phone numbers invites automated OCR scraping bots, while commercial "smart parking stickers" charge recurring subscriptions. A native <code>tel:</code> QR sign lets genuine passersby scan with their default phone camera to open the dialer in one tap—completely free forever.</p>
    `,
    faqsZh: [
      {
        question: '为什么建议提示路人用“手机系统自带相机”而不是微信扫挪车码？',
        answer: '因为微信内置浏览器出于封闭生态限制，拦截了国际通用的 `tel:138xxxx` 自动唤起拨号盘协议（微信扫完只会显示纯文本或空白）；而苹果 iOS 原相机与所有国产安卓系统自带相机均原生完美支持 `tel:` 协议，对准一扫屏幕直接弹出绿色拨号按钮，体验极佳！本工具生成的打印卡已贴心自带这一引导文案。',
      },
    ],
    faqsEn: [
      {
        question: 'Does the scan-to-call QR code work on both iPhone and Android?',
        answer: 'Yes! Both iOS Camera and Android native camera apps recognize standard `tel:` URIs and immediately prompt a one-tap Call button.',
      },
    ],
  },

  // 7. PDF 转高清长图 / 多图无缝拼接长图
  {
    slug: 'pdf-to-long-image',
    parentToolSlug: 'pdf-toolkit',
    componentKey: 'pdf-toolkit',
    componentProps: {
      initialMode: 'long-stitch',
    },
    badgeZh: '📜 一图流排版 · 已切至长图拼接模式',
    badgeEn: '📜 One-Strip · Preset to Long Stitch',
    shortLabelZh: 'PDF/多图无缝拼接高清长图',
    shortLabelEn: 'PDF & Images to Vertical Long Strip',
    titleZh: 'PDF / 多张文档图转高清长图在线免费工具（一图流无缝纵向拼接 · 100%本地不上传）',
    titleEn: 'Free Local PDF & Multi-Page Image to Vertical Long Image Stitcher (Zero Upload)',
    seoTitleZh: 'PDF转长图在线免费无水印 — 多页文档无缝拼接一张高清长图（纯本地不上传） | 原心工具箱',
    seoTitleEn: 'Stitch Pages into One Vertical Long Image Offline — 100% Private Browser Tool | Yunsin Tools',
    descriptionZh: '发公众号一图流、长微博、小红书长图或群聊汇报方案时，本页已自动切换至【高清纵向长图拼接引擎】：支持自定义留白边框、页间距、浅灰衬底与 PNG/WebP 导出，保密合同与财报绝不上传云端！',
    descriptionEn: 'Pre-switched to the Vertical Long-Image Stitcher mode. Seamlessly combine multi-page scans, slides, or document pages into one crisp HD PNG/WebP scroll strip 100% locally in your browser.',
    keywordsZh: ['pdf转长图在线免费不上传', '多张图片纵向拼接成一张长图', '公众号一图流长图生成器', '保密文档本地转长图无水印'],
    keywordsEn: ['stitch images vertically into one long image', 'combine document pages into single tall png', 'offline long screenshot stitcher'],
    guideHtmlZh: `
      <h2>汇报方案与公众号“一图流”利器：纯本地无缝长图拼接（无文件上传、无模糊降质）</h2>
      <p>在微信群发送十几页零散图片或大体积 PDF 时，领导和客户往往懒得点开翻页；将其拼接成一张带呼吸感灰底边框的<strong>纵向高清一图流长图</strong>，打开即顺滑通读到底，阅读完播率提升 300%。本专页已默认打开长图拼接工作模式，支持自由调节画布总宽（800px~2400px）、外边距与页间缝隙。</p>
    `,
    guideHtmlEn: `
      <h2>Create Crisp Vertical One-Pager Strips Without Uploading Confidential Docs</h2>
      <p>Instead of sending fragmented attachments, stitch multi-page slides, receipts, or contract pages into a clean, padded vertical strip (PNG, WebP, or JPEG) directly inside your browser’s HTML5 Canvas—zero watermarks and zero cloud storage risk.</p>
    `,
    faqsZh: [
      {
        question: '拼接十几页超长高清图时，怎么防止导出的 PNG 体积过大发不出微信？',
        answer: '如果总页数超过 8 页，建议将画布宽度设为 `1080px` 或 `1200px`，并将导出格式从无损 PNG 切换为 `WebP` 或 `JPEG`：清晰度肉眼几乎无损，但文件体积可直降 70% 以上，微信原图秒发不卡顿。',
      },
    ],
    faqsEn: [
      {
        question: 'What output format gives the sharpest text with the smallest file size?',
        answer: 'Choose WebP or 1200px PNG. WebP keeps razor-sharp typography at roughly one-third the byte size of uncompressed PNG.',
      },
    ],
  },

  // 8. 2026 提前还房贷：缩短年限 vs 减少月供（组合贷专版）
  {
    slug: 'mortgage-shorten-vs-reduce',
    parentToolSlug: 'mortgage-prepayment-calculator',
    componentKey: 'mortgage',
    componentProps: {
      initialLoanType: 'combined',
      initialScheduleMode: 'shorten',
      initialPrepayWan: 20,
    },
    badgeZh: '🏠 省息核心决策 · 已预设组合贷+提前还20万',
    badgeEn: '🏠 Payoff Decision · Shorten Term vs Payment',
    shortLabelZh: '提前还房贷：缩短年限vs减月供',
    shortLabelEn: 'Shorten Term vs Lower Payment',
    titleZh: '2026 提前还房贷计算器：缩短还款年限 vs 减少月供省息对比（支持商贷+公积金组合贷）',
    titleEn: '2026 Mortgage Prepayment Decision Calculator: Shorten Term vs Reduce Monthly Payment',
    seoTitleZh: '提前还房贷缩短年限还是减少月供划算？2026最新省息对比与组合贷计算器 | 原心工具箱',
    seoTitleEn: 'Should You Shorten Loan Term or Reduce Monthly Payment? 2026 Prepayment Calculator | Yunsin Tools',
    descriptionZh: '手头攒了 10万~30万闲钱准备提前还房贷，选【缩短年限】到底比【减少月供】多省多少万利息？本页已预置存量利率与组合贷模型，秒算两种方案省息差额、已还利息占比与理财收益率盈亏平衡点！',
    descriptionEn: 'Compare exact interest savings between shortening your mortgage term vs lowering your monthly payment when making a lump-sum principal prepayment, including opportunity cost vs safe bond yields.',
    keywordsZh: ['提前还房贷缩短年限还是减少月供计算器', '提前还20万房贷能省多少利息', '2026存量房贷提前还款划算吗', '组合贷提前还商贷计算器'],
    keywordsEn: ['recast mortgage reduce payment vs shorten term calculator', 'lump sum mortgage payoff interest saved', 'early mortgage payoff vs investing calculator'],
    guideHtmlZh: `
      <h2>2026 存量房贷利率下调后，提前还贷选“缩短年限”还是“减少月供”？用真实数字说话</h2>
      <p>许多房主在银行 App 预约提前还款时卡在最后一步选项：同样是提前冲抵 20 万本金，为什么选<strong>【月供不变、缩短还款年限】</strong>省下的总利息往往是<strong>【年限不变、减少每月月供】</strong>的 2 倍以上？</p>
      <ul>
        <li><strong>看穿时间复利效应：</strong> 房贷每一期利息只取决于“当月剩余未还本金 × 月利率”。减少月供虽然立刻减轻了每月的扣款额，但剩余本金依然拖在未来 20 多年里慢慢计息；而缩短年限相当于用省下的月供继续每月强制追投本金，直接砍掉最后十年的全部利息账单！</li>
        <li><strong>理财利差黄金红线：</strong> 在上方填入您手头稳健理财/国债收益率（如 2.1%），系统会自动判断当前提前还贷是否跑赢保留现金流。</li>
      </ul>
    `,
    guideHtmlEn: `
      <h2>Shorten Term vs. Recast Lower Monthly Payment: The Exact Amortization Math</h2>
      <p>When making a lump-sum principal payment, keeping your monthly payment unchanged (shortening the term) compounds your principal reduction every single month thereafter—typically saving <strong>2x to 2.5x more total interest</strong> than stretching the remaining balance over the original 30-year timeline.</p>
    `,
    faqsZh: [
      {
        question: '存量房贷利率已经降到 3.1%~3.3% 左右了，2026 年还有必要提前还房贷吗？',
        answer: '核心看【无风险利差】与【家庭备用金安全垫】：目前国内 3~5 年期定期存款与储蓄国债年化利率普遍已降至 1.5%~2.1% 左右，仍显著低于 3.1%+ 的商贷利率，因此只要留足 6~12 个月家庭应急现金后仍有闲置资金，优先提前冲抵商贷依然等于锁定了 3.1%+ 的免税无风险收益；但切记不要提前还 2.6% 的低息公积金部分。',
      },
    ],
    faqsEn: [
      {
        question: 'When does reducing the monthly payment make more sense than shortening the term?',
        answer: 'If your household faces income volatility, upcoming childcare costs, or wants maximum monthly cashflow flexibility—especially if your bank allows unlimited penalty-free extra payments later—lowering the required minimum payment reduces risk while still letting you overpay voluntarily.',
      },
    ],
  },

  // 9. 信用卡账单分期手续费转真实年化利率 (IRR)
  {
    slug: 'credit-card-installment-apr',
    parentToolSlug: 'irr-loan-calculator',
    componentKey: 'irr-loan',
    componentProps: {
      initialPresetId: 'cc-installment',
    },
    badgeZh: '🔍 防坑照妖镜 · 已预载信用卡 0.6%/月分期模型',
    badgeEn: '🔍 Fee Detector · Preset 0.6%/mo Flat Card Plan',
    shortLabelZh: '信用卡分期手续费转真实年化',
    shortLabelEn: 'Credit Card Flat Fee to True APR',
    titleZh: '信用卡账单分期手续费转真实年化利率 (IRR) 计算器（揭秘月费率 0.6% 实际年化超 13%）',
    titleEn: 'Credit Card Monthly Flat-Fee Installment to True Effective APR (IRR) Calculator',
    seoTitleZh: '信用卡分期实际年化利率计算器在线 — 每期手续费0.5%/0.6%真实年化IRR是多少？ | 原心工具箱',
    seoTitleEn: 'Monthly Flat Fee to Effective APR Calculator — True Cost of Credit Card Installments | Yunsin Tools',
    descriptionZh: '银行客服推销说“账单分期每期手续费仅 0.6%，年化才 7.2%，还打折”？千万别轻信！本页已预载标准信用卡分期现金流模型，用金融级 IRR 公式一秒戳穿【本金逐月减少但手续费按全额照收】的 13%+ 真实高息真相。',
    descriptionEn: 'Banks advertise "0.6% monthly installment fee" as if it were 7.2% APR—when the true effective APR exceeds 13%! Compute exact Newton-Raphson IRR across flat-fee installments and upfront fees.',
    keywordsZh: ['信用卡分期实际年利率计算器', '月费率0.6真实年化是多少', '信用卡分期打折划算吗计算器', '等本等息转实际年化利率公式'],
    keywordsEn: ['credit card installment flat fee to apr calculator', '0.6 monthly flat rate effective annual rate', 'add on interest rate to true apr'],
    guideHtmlZh: `
      <h2>为什么“月费率 0.6% × 12 个月 = 7.2%”是个经典的数学障眼法？</h2>
      <p>假设您刷卡 <code>50,000 元</code> 分 12 期归还，每期手续费 <code>0.6%</code>（即每月固定收 300 元手续费）：只有在<strong>第 1 个月</strong>您才真正占用了银行满额的 50,000 元；到了<strong>第 12 个月</strong>，您其实只欠银行最后 <code>4,167 元</code> 本金了，但银行依然按 50,000 元全额收您 300 元利息！全年平均实际占用的本金只有约一半，因此通过<strong>内部收益率（IRR）</strong>穿透计算，真实单利年化高达 <strong>13.03%</strong>（有效复利年化 <strong>13.84%</strong>）！即使银行给您打“手续费 5 折”，真实年化依然在 6.6% 左右，远高于优质消费贷。先在上方输入银行给您的折扣后每期费率测一测再决定！</p>
    `,
    guideHtmlEn: `
      <h2>Why a 0.6% Monthly Flat Fee Actually Costs Over 13% APR</h2>
      <p>In a flat-fee ("add-on interest") installment plan, you repay 1/12th of the principal every month—so your average borrowed balance over the year is roughly half the initial amount—yet the lender charges the monthly fee against 100% of the original balance every single month. Use this pre-loaded IRR detector to see the true effective APR in milliseconds.</p>
    `,
    faqsZh: [
      {
        question: '快速心算“每期等本等息手续费率”对应真实年化利率的近似口诀是什么？',
        answer: '金融界通用的速算公式为：【真实年化利率 ≈ 每期月费率 × 12 × 2n / (n + 1)】（其中 n 为分期期数）。当分 12 期时，系数约为 1.85 倍（即名义年费率乘以 1.85）；当分 24 期时，系数高达 1.92 倍！本工具采用精确牛顿迭代法直接求解每一期现金流 IRR，比口诀更精准到小数点后两位。',
      },
    ],
    faqsEn: [
      {
        question: 'What is the rule-of-thumb multiplier to convert a 12-month flat rate to APR?',
        answer: 'For a 12-month installment loan, multiply `Monthly Flat Rate × 12` by roughly `1.85` (`2n / (n + 1)`). Our calculator solves the exact root of the Net Present Value equation for complete precision.',
      },
    ],
  },

  // 10. JSON 转 TypeScript Interface + Zod v3 Schema 在线生成器
  {
    slug: 'json-to-typescript-zod',
    parentToolSlug: 'polyglot-converter',
    componentKey: 'polyglot',
    componentProps: {
      initialSource: 'json',
      initialTarget: 'typescript-both',
    },
    badgeZh: '⚡ 前端高频 · 已预设 JSON ➔ TS + Zod v3',
    badgeEn: '⚡ Frontend Preset · JSON ➔ TS + Zod v3',
    shortLabelZh: 'JSON转TS接口与Zod校验',
    shortLabelEn: 'JSON to TypeScript + Zod v3',
    titleZh: 'JSON 转 TypeScript Interface 与 Zod v3 Schema 在线生成器（100%本地解析防泄密）',
    titleEn: 'JSON to TypeScript Interface & Zod v3 Schema Generator Online (100% Client-Side)',
    seoTitleZh: 'JSON转TypeScript在线工具 — 一键生成TS Interface类型与Zod Schema校验代码（纯本地） | 原心工具箱',
    seoTitleEn: 'Free JSON to TypeScript Interface & Zod Schema Generator (Offline, Zero Upload) | Yunsin Tools',
    descriptionZh: '前端对接后端接口必备：粘贴任意复杂嵌套 JSON 返回报文，毫秒级同步生成严密的 TypeScript Interface 静态类型与运行时 Zod v3 校验 Schema（自动识别 ISO 日期、UUID、邮箱与可空数组），企业内网 API 报文绝不上传外网！',
    descriptionEn: 'Paste any nested API JSON payload to instantly generate clean TypeScript interfaces alongside runtime Zod v3 validation schemas (with automatic UUID, ISO datetime, email, and nullable array inference)—100% locally in your browser.',
    keywordsZh: ['json转typescript在线生成', 'json转zod schema工具', '根据json自动生成ts类型定义', '内网安全json转ts不上传'],
    keywordsEn: ['json to typescript and zod generator', 'convert json payload to zod schema online', 'private offline json to ts interface'],
    guideHtmlZh: `
      <h2>告别手写 <code>any</code>：一键把后端 JSON 报文变成 TypeScript 类型 + Zod 运行时护城河</h2>
      <p>光有编译期的 <code>interface</code> 并不能阻止后端接口突然返回脏数据导致页面白屏报错。本专页已默认锁定<strong>【TypeScript Interface + Zod v3 双输出模式】</strong>，并绝不将您的公司私有 API 数据发送至任何远程服务器：</p>
      <ul>
        <li><strong>智能语义格式推断：</strong> 自动识别字符串中的 <code>UUID</code>、<code>ISO-8601 时间戳</code> 与邮箱格式并追加对应的 Zod 校验器，嵌套子对象自动拆分为独立命名的子 Schema。</li>
      </ul>
    `,
    guideHtmlEn: `
      <h2>Stop Writing <code>any</code> or Hand-Coding Boilerplate Zod Validators</h2>
      <p>Compile-time TypeScript interfaces vanish at runtime. Pre-locked to <strong>TypeScript + Zod v3 dual output</strong>, this local AST generator inspects nested objects, heterogeneous arrays, UUIDs, and timestamps to emit production-ready types and runtime parsers without leaking proprietary API payloads.</p>
    `,
    faqsZh: [
      {
        question: '粘贴公司未上线的内部接口 JSON 数据安全吗？',
        answer: '绝对安全！所有词法解析与 AST 代码生成 100% 在您本地浏览器的 JavaScript 引擎中同步执行，无任何网络请求，满足金融、政企与大厂严苛的数据防泄漏（DLP）安全规范。',
      },
    ],
    faqsEn: [
      {
        question: 'Does my proprietary API JSON ever leave my browser?',
        answer: 'Never. Parsing and code generation execute 100% client-side with zero network calls—safe for enterprise and NDA-protected API schemas.',
      },
    ],
  },
];

export function getPresetsForParentTool(parentSlug: string): SeoPresetScenario[] {
  return SEO_PRESET_SCENARIOS.filter((s) => s.parentToolSlug === parentSlug);
}

export function getPresetBySlug(slug: string): SeoPresetScenario | undefined {
  return SEO_PRESET_SCENARIOS.find((s) => s.slug === slug);
}
