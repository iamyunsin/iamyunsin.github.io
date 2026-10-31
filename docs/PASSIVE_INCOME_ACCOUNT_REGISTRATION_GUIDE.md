# 网站被动收入引流变现账号注册与配置全景指南 (PASSIVE INCOME ONBOARDING & REGISTRATION GUIDE)

> **文档定位**: 全站 20 大商业变现合作平台注册全景手册、准入 KYC 资质清单与代码替换落地指引  
> **适用版本**: Astro 5.3 + Vue 3.5 纯客户端架构 ($0/月服务器成本)  
> **配置中心**: `src/consts.ts` (`AFFILIATE_LINKS`、`DIGITAL_PRODUCTS`、`ADS_CONFIG`)  
> **目标站点**: [yunsin.top](https://yunsin.top) (`iamyunsin.github.io`)  
> **更新生效日期**: 2026-10-31  

---

## 目录 (Table of Contents)

- [一、 执行摘要与变现飞轮全景 (Executive Overview)](#一-执行摘要与变现飞轮全景-executive-overview)
  - [1.1 纯客户端架构 ($0/月服务器成本) 的商业护城河](#11-纯客户端架构-0月服务器成本-的商业护城河)
  - [1.2 四层递进式变现飞轮全景架构](#12-四层递进式变现飞轮全景架构)
- [二、 20 大变现平台结构化注册清单 (Master Registration Directory)](#二-20-大变现平台结构化注册清单-master-registration-directory)
  - [板块 1: 跨境金融与收结汇通道 (Cross-Border Payments & Fintech)](#板块-1-跨境金融与收结汇通道-cross-border-payments--fintech)
    - [1. Wise Business (多币种商业账户)](#1-wise-business-多币种商业账户)
    - [2. Payoneer 派安盈 (全球跨境收付款)](#2-payoneer-派安盈-全球跨境收付款)
    - [3. 连连国际 LianLian Global (跨境合规结汇)](#3-连连国际-lianlian-global-跨境合规结汇)
    - [4. 空中云汇 Airwallex (全球企业金融基础设施)](#4-空中云汇-airwallex-全球企业金融基础设施)
    - [5. Stripe / Stripe Atlas (全球收单与特拉华离岸设立)](#5-stripe--stripe-atlas-全球收单与特拉华离岸设立)
  - [板块 2: 虚拟数字资产与模板直销 (Digital Products & Direct Sales)](#板块-2-虚拟数字资产与模板直销-digital-products--direct-sales)
    - [6. 面包多 Mianbaoduo (中文极简微信/支付宝直销)](#6-面包多-mianbaoduo-中文极简微信支付宝直销)
    - [7. 爱发电 Afdian (创作者赞助与数字直销)](#7-爱发电-afdian-创作者赞助与数字直销)
    - [8. Gumroad (全球数字商品销售与 MoR 税务托管)](#8-gumroad-全球数字商品销售与-mor-税务托管)
    - [9. Lemon Squeezy (出海软件与 SaaS 商家网关)](#9-lemon-squeezy-出海软件与-saas-商家网关)
  - [板块 3: 云服务与开发者基础设施 (Cloud & Infrastructure)](#板块-3-云服务与开发者基础设施-cloud--infrastructure)
    - [10. 阿里云 Aliyun (专属「折扣补贴推广」25% 优惠 / 7.5 折)](#10-阿里云-aliyun-专属折扣补贴推广-25-优惠--75-折)
    - [11. 腾讯云 Tencent Cloud (轻量应用服务器 / 云大使)](#11-腾讯云-tencent-cloud-轻量应用服务器--云大使)
    - [12. Vultr (全球多机房高性能 VPS 联盟)](#12-vultr-全球多机房高性能-vps-联盟)
  - [板块 4: 创作者生态与 AI 算力推广 (Creators Ecosystem & AI Compute)](#板块-4-创作者生态与-ai-算力推广-creators-ecosystem--ai-compute)
    - [13. Canva Pro (自媒体视觉设计联盟)](#13-canva-pro-自媒体视觉设计联盟)
    - [14. 硅基流动 SiliconFlow (开箱即用高性价比大模型算力)](#14-硅基流动-siliconflow-开箱即用高性价比大模型算力)
    - [15. OpenRouter (全球大模型统一聚合路由)](#15-openrouter-全球大模型统一聚合路由)
    - [16. Beehiiv (现代 Newsletter 邮件订阅增长平台)](#16-beehiiv-现代-newsletter-邮件订阅增长平台)
  - [板块 5: 硬件安全与极客广告赞助 (Hardware Security & Geek Ads)](#板块-5-硬件安全与极客广告赞助-hardware-security--geek-ads)
    - [17. OneKey 硬件冷钱包 (Web3 资产安全防护)](#17-onekey-硬件冷钱包-web3-资产安全防护)
    - [18. 万维广告 WWAds (中文开发者与极客原生广告网络)](#18-万维广告-wwads-中文开发者与极客原生广告网络)
    - [19. EthicalAds (英文开发者隐私友好型广告网络)](#19-ethicalads-英文开发者隐私友好型广告网络)
    - [20. Buy Me a Coffee (全球创作者极简打赏咖啡)](#20-buy-me-a-coffee-全球创作者极简打赏咖啡)
- [三、 分阶段实操注册路线图 (Phased Action Roadmap)](#三-分阶段实操注册路线图-phased-action-roadmap)
  - [3.1 第一天零门槛立即可启动渠道 (Day 1 - 0 门槛开通，立刻激活现金流)](#31-第一天零门槛立即可启动渠道-day-1---0-门槛开通立刻激活现金流)
  - [3.2 第一周需准备资料开通渠道 (Week 1 - 完善 KYC 与出海结汇底座)](#32-第一周需准备资料开通渠道-week-1---完善-kyc-与出海结汇底座)
  - [3.3 流量成熟后申请渠道 (Month 1+ - 流量蓄积与高客单进阶)](#33-流量成熟后申请渠道-month-1---流量蓄积与高客单进阶)
- [四、 代码替换落地与一键生效指引 (Code Replacement Reference)](#四-代码替换落地与一键生效指引-code-replacement-reference)
  - [4.1 `src/consts.ts` 集中配置架构](#41-srcconststs-集中配置架构)
  - [4.2 CPS 联盟链接配置表 (`AFFILIATE_LINKS`)](#42-cps-联盟链接配置表-affiliate_links)
  - [4.3 虚拟数字资产链接配置表 (`DIGITAL_PRODUCTS`)](#43-虚拟数字资产链接配置表-digital_products)
  - [4.4 广告网络位与打赏配置表 (`ADS_CONFIG`)](#44-广告网络位与打赏配置表-ads_config)
  - [4.5 本地验证与安全降级防死链说明](#45-本地验证与安全降级防死链说明)
- [五、 合规、税务与反封控安全守则 (Compliance & Security)](#五-合规税务与反封控安全守则-compliance--security)
  - [5.1 国内申报纳税与合规入账指南](#51-国内申报纳税与合规入账指南)
  - [5.2 跨境结汇与外汇合规操作守则](#52-跨境结汇与外汇合规操作守则)
  - [5.3 FTC 广告透明度披露与免责声明标准](#53-ftc-广告透明度披露与免责声明标准)
  - [5.4 联盟推广反作弊与防封控四大军规](#54-联盟推广反作弊与防封控四大军规)

---

## 一、 执行摘要与变现飞轮全景 (Executive Overview)

### 1.1 纯客户端架构 ($0/月服务器成本) 的商业护城河

本项目基于 **Astro 5.3 + Vue 3.5 + UnoCSS + Rust WebAssembly** 技术栈构建，全站工具及页面采用 100% 静态编译，托管于 GitHub Pages / Cloudflare Pages。其具备两大不可替代的商业优势：

1. **绝对零边际成本 ($0/mo Hosting Cost)**: 所有数据解析、算法模拟、图像量化与类型生成均在访问者的浏览器本地内存与 WebAssembly 引擎中运行，无需租用云端后端服务器或持久化数据库，即使面临百万级突发 UV 流量，服务器账单支出依然恒定为 **$0.00**。
2. **不可撼动的用户隐私信任**: 针对发票账单、财务估值、代码 Schema、API Key 等极端敏感的企业级数据，网站实行“零网络上传”保密原则，彻底消除了企业内网与安全合规审查风险，天然形成极高的用户黏性与社群自发推荐效应。

### 1.2 四层递进式变现飞轮全景架构

告别单一、低效且易被拦截的传统横幅广告模式，本项目建立起**四层递进式立体变现飞轮**，精准匹配用户在不同意图阶段的转化心理：

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           四层递进式立体变现飞轮全景                                      │
├──────────────────────────┬───────────────────────────┬──────────────────────────────────┤
│ 变现层级 (Tier)           │ 业务形态与承载产品          │ 核心价值与流量心智               │
├──────────────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Tier 1: 高客单 CPS 联盟   │ 跨境金融开户、云服务基础设施、│ 用户处于交易/部署临门一脚，转化意愿│
│ (High-Ticket Affiliate)  │ 硬件冷钱包、自媒体生产力工具│ 极高；单笔返佣 $15~$100+。       │
├──────────────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Tier 2: 虚拟数字资产直销 │ 精选模板包、涉外法务防拖欠合同、│ 满足即拿即用的冲动型需求；定价   │
│ (Direct Digital Assets)  │ 汇损穿透底表、SaaS 并购尽调底稿│ ¥19.9~¥29 ($4.99~$5.99)，纯利润。 │
├──────────────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Tier 3: 原生抗拦截广告   │ 万维广告 (WWAds)、EthicalAds  │ 针对技术极客定制，不追踪 Cookie； │
│ (Native Developer Ads)   │ 原生 `.partner-panel` 容器  │ 彻底免疫 AdBlock 拦截，沉淀底线收益│
├──────────────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Tier 4: 极客打赏与私域   │ 爱发电、Buy Me a Coffee、     │ 承接社群口碑溢价，沉淀长期高价值 │
│ (Tips & Private Traffic) │ Newsletter (Beehiiv)、技术咨询│ 客户线索，实现高客单定制项目转化。│
└──────────────────────────┴───────────────────────────┴──────────────────────────────────┘
```

---

## 二、 20 大变现平台结构化注册清单 (Master Registration Directory)

---

### 板块 1: 跨境金融与收结汇通道 (Cross-Border Payments & Fintech)

#### 1. Wise Business (多币种商业账户)
- **平台名称与战略定位**: 全球出海自由职业者、微型跨国企业与跨境电商标配。提供无汇损中间市场汇率（路孚特中行基准）、极低电汇费率与 40+ 币种本地虚拟银行账号。
- **官方注册与伙伴申请入口**:
  - 官方开户入口: [https://wise.com/zh-cn/business/](https://wise.com/zh-cn/business/)
  - 推广伙伴计划 (Impact 托管): [https://wise.com/partners/](https://wise.com/partners/)
- **建议注册账号类型**: 企业商业账户 (Business Account) + 联盟会员账号 (Impact Media Partner)
- **准入资质门槛与所需 KYC 资料**:
  - 中国香港、英国、美国或中国大陆合规公司营业执照（个体工商户亦可）；
  - 法人身份证 / 护照扫描件、人脸识别验证；
  - 真实业务网站或产品链接（直接提交本站 `https://yunsin.top`）；
  - 首次开户激活费（一次性设置费约 £16~£45）。
- **关联引流工具与前台转化触点**:
  - `Tool 2: freelance-invoice-generator`（发票生成器收款渠道推荐）；
  - `Tool 3: payment-fee-calculator`（跨境支付精算器综合费率最优推荐卡片）。
- **预期佣金比例/单价与结算周期**:
  - 成功推荐 1 名合格商业开户并完成 £200 等值首笔转账，奖励 **$75.00**（或 £50）；
  - 由 Impact 平台每月按周期自动电汇结算至银行卡或 PayPal。
- **代码替换落地指引**:
  - 审核通过后，将专属推广链接替换到 `src/consts.ts` 的 `AFFILIATE_LINKS.wiseBusiness`。

---

#### 2. Payoneer 派安盈 (全球跨境收付款)
- **平台名称与战略定位**: 全球最老牌的跨境收款解决方案之一，全面打通 Amazon、Upwork、Fiverr、Google AdSense 及 B2B 贸易结汇。
- **官方注册与伙伴申请入口**:
  - 官方注册入口: [https://www.payoneer.com.cn/](https://www.payoneer.com.cn/)
  - 官方推广联盟注册: [https://www.payoneer.com/affiliates/](https://www.payoneer.com/affiliates/)
- **建议注册账号类型**: 个人 / 企业收款账户 + 官方推广员账号
- **准入资质门槛与所需 KYC 资料**:
  - 个人：二代身份证正反面、手持证件照、国内对私银行借记卡（用于后续人民币提现）；
  - 企业：公司营业执照、法定代表人证件、对公账户信息。
- **关联引流工具与前台转化触点**:
  - `Tool 3: payment-fee-calculator`（跨境收款通道对比与提现结汇测算）。
- **预期佣金比例/单价与结算周期**:
  - 被推荐用户累计入账满 $1,000 美元时，双方各获赠 **$25.00 ~ $50.00** 奖励现金；
  - 佣金每月自动计入派安盈账户余额，可随时提现至国内银行卡。
- **代码替换落地指引**:
  - 获取后台 Refer a Friend 邀请链接，替换至 `src/consts.ts` 的 `AFFILIATE_LINKS.payoneer`。

---

#### 3. 连连国际 LianLian Global (跨境合规结汇)
- **平台名称与战略定位**: 专注中国出海卖家与服务贸易的本土合规龙头，0.5%~0.7% 封顶超低费率，不占用个人 5 万美元结汇便利化额度。
- **官方注册与伙伴申请入口**:
  - 官方注册入口: [https://global.lianlianpay.com/](https://global.lianlianpay.com/)
  - 商务与渠道伙伴申请: 访问官网底部“渠道合作”或直接联系官方在线客服申请渠道服务商邀请码。
- **建议注册账号类型**: 跨境商户账户 / 渠道服务商伙伴账号
- **准入资质门槛与所需 KYC 资料**:
  - 国内企业营业执照或个体工商户执照；
  - 法定代表人身份证正反面、活体人脸核验；
  - 店铺链接、独立站域名或涉外服务贸易合同凭证。
- **关联引流工具与前台转化触点**:
  - `Tool 3: payment-fee-calculator`（阳光化人民币合规结汇方案高亮推荐）。
- **预期佣金比例/单价与结算周期**:
  - 每引入 1 户有效流水商户，享 **¥200 ~ ¥800** 阶梯拉新补贴 + 万分之二至五持续流水返佣；
  - 按月自动结算至连连国际账户，支持秒级提现至国内对公/对私银行卡。
- **代码替换落地指引**:
  - 获取专属邀请注册 URL 后，配置至 `src/consts.ts` 的 `AFFILIATE_LINKS.lianlianGlobal`。

---

#### 4. 空中云汇 Airwallex (全球企业金融基础设施)
- **平台名称与战略定位**: 估值超 55 亿美元的全球金融独角兽，支持全球本地收单、虚拟 Visa/Mastercard 发卡与全球本地高速清算网络。
- **官方注册与伙伴申请入口**:
  - 官方注册入口: [https://www.airwallex.com.cn/](https://www.airwallex.com.cn/)
  - 官方合作伙伴计划: [https://www.airwallex.com/partners](https://www.airwallex.com/partners)
- **建议注册账号类型**: 开发者 / 合作伙伴账户 (Partner Account)
- **准入资质门槛与所需 KYC 资料**:
  - 中国大陆、香港或海外主体公司营业执照；
  - 企业所有权结构图 (UBO) 及持股 25% 以上股东身份证明；
  - 业务域名所有权证明与 ICP 备案/合规证明。
- **关联引流工具与前台转化触点**:
  - `Tool 3: payment-fee-calculator`（低费率大额跨境转账与 API 自动化结算位）。
- **预期佣金比例/单价与结算周期**:
  - 提供大额开户现金激励与终身流水梯度分润；按季度出账单结算。
- **代码替换落地指引**:
  - 替换 `src/consts.ts` 中的 `AFFILIATE_LINKS.airwallex`。

---

#### 5. Stripe / Stripe Atlas (全球收单与特拉华离岸设立)
- **平台名称与战略定位**: 全球在线支付技术事实标准；Stripe Atlas 提供一键在美国特拉华州设立合规 C-Corp / LLC 公司并开设 Mercury/SVB 商业银行账户。
- **官方注册与伙伴申请入口**:
  - Stripe 官网: [https://stripe.com/](https://stripe.com/)
  - Stripe Atlas 入口: [https://stripe.com/atlas](https://stripe.com/atlas)
- **建议注册账号类型**: 境外商户账户 / Atlas 伙伴推荐码 (Partner Referral)
- **准入资质门槛与所需 KYC 资料**:
  - 护照 (Passport) 扫描件、境外实体住址证明；
  - Stripe Atlas 设立服务费（一次性 $500，使用伙伴邀请码可立减 $100）；
  - 英文业务站点及合规隐私协议。
- **关联引流工具与前台转化触点**:
  - `Tool 2: freelance-invoice-generator`（涉外商业发票在线收单）；
  - `Tool 4: saas-metrics-calculator`（SaaS 估值沙盘中 Micro-SaaS 出海架构推荐）。
- **预期佣金比例/单价与结算周期**:
  - 为被推荐创业者提供 $100 设立费减免，推荐方获得 Atlas 现金津贴或 Stripe 平台费抵扣券。
- **代码替换落地指引**:
  - 替换 `src/consts.ts` 中的 `AFFILIATE_LINKS.stripeAtlas`。

---

### 板块 2: 虚拟数字资产与模板直销 (Digital Products & Direct Sales)

#### 6. 面包多 Mianbaoduo (中文极简微信/支付宝直销)
- **平台名称与战略定位**: 国内体验最好、转化率最高的轻量级创作者数字资产发售平台。支持微信内一键原生扫码完成支付，支持网盘、文本、附件全自动发货。
- **官方注册与入驻链接**: [https://mbd.pub/](https://mbd.pub/)
- **建议注册账号类型**: 创作者个人 / 认证创作者
- **准入资质门槛与所需 KYC 资料**:
  - 微信扫码一键注册登录；
  - 绑定手机号与身份证实名认证；
  - 绑定个人提现微信钱包或支付宝账户。
- **关联引流工具与前台转化触点**:
  - 全站 5 大杀手级工具配套的 Tier 2 数字资产在中文环境 (`/tools/*`) 下的直销结账抽屉（卡片预设包、双语外包合同包、跨境汇损 Excel 底表、SaaS 并购尽调底稿、多语言 Schema 设计指引）。
- **预期佣金比例/单价与结算周期**:
  - 创作者享有 **95% ~ 97%** 的高净收入（平台仅抽取 3%~5% 基础服务费）；
  - 账户满 ¥10 随时可申请提现，资金通常次日直接到账个人微信零钱。
- **代码替换落地指引**:
  - 在面包多后台分别创建 5 个商品，将生成的购买短链接直接填入 `src/consts.ts` 中 `DIGITAL_PRODUCTS` 各对应对象的 `checkoutUrlZh` 字段：
    - `socialCardPresets.checkoutUrlZh`: 替换卡片预设购买链接；
    - `freelanceContractsPack.checkoutUrlZh`: 替换外包合同包购买链接；
    - `crossBorderFxModel.checkoutUrlZh`: 替换跨境汇损 Excel 购买链接；
    - `saasBpDueDiligence.checkoutUrlZh`: 替换 SaaS 尽调底稿购买链接；
    - `polyglotAstPlaybook.checkoutUrlZh`: 替换多语言实战指引购买链接。
  - 同时更新 `AFFILIATE_LINKS.mianbaoduoStore` 为个人创作者主页。

---

#### 7. 爱发电 Afdian (创作者赞助与数字直销)
- **平台名称与战略定位**: 中文开发者与极客文化认同度最高的按月赞助与方案订阅平台。
- **官方入驻链接**: [https://afdian.com/](https://afdian.com/)
- **建议注册账号类型**: 开发者 / 创作者个人主页
- **准入资质门槛与所需 KYC 资料**:
  - 手机号验证注册；
  - 身份证实名认证与国内银行卡/支付宝实名绑定。
- **关联引流工具与前台转化触点**:
  - 全站工具底部 Tier 4 极客打赏、技术博客文末自愿赞赏、V2EX 纯净模式赞助。
- **预期佣金比例/单价与结算周期**:
  - 平台收取 6% 运营成本费，创作者净得 **94%**；
  - 每月 1 日与 15 日定期提现至绑定的支付宝账户。
- **代码替换落地指引**:
  - 将个人爱发电专属主页链接填入 `src/consts.ts` 的 `AFFILIATE_LINKS.afdian`。

---

#### 8. Gumroad (全球数字商品销售与 MoR 税务托管)
- **平台名称与战略定位**: 全球独立创作者出海售卖数字资产的老牌标杆。自带 Merchant of Record (MoR) 身份，自动代扣代缴全球各国数字增值税 (VAT/Sales Tax)。
- **官方入驻链接**: [https://gumroad.com/](https://gumroad.com/)
- **建议注册账号类型**: Creator Account (个人创作者账户)
- **准入资质门槛与所需 KYC 资料**:
  - 邮箱快速注册；
  - 护照 / 身份证照片、居住地址；
  - 收款账户绑定：国内用户推荐直接绑定 **Wise Business 提供的美国 USD ACH 虚拟银行路由信息**（零成本直收美元，避开 PayPal 高额提现费）。
- **关联引流工具与前台转化触点**:
  - 全站 5 大杀手级工具在英文环境 (`/en/tools/*`) 下的 Tier 2 数字产品美元结账。
- **预期佣金比例/单价与结算周期**:
  - 平台收取 10% 平价服务费 + 支付处理费；
  - 每周五系统自动将结算款转入绑定的 Wise 美元账户。
- **代码替换落地指引**:
  - 在 Gumroad 后台分别创建 5 款美元虚拟商品，将商品短链接配置至 `src/consts.ts` 中 `DIGITAL_PRODUCTS` 各对应对象的 `checkoutUrlEn` 字段，并将个人店铺首页配置至 `AFFILIATE_LINKS.gumroadStore`。

---

#### 9. Lemon Squeezy (出海软件与 SaaS 商家网关)
- **平台名称与战略定位**: 专为开发者、软件插件与数字资产定制的现代化交易平台（现已加入 Stripe 集团），支持全球多币种收单、订阅计费与自动化授权码分发。
- **官方入驻与联盟申请**:
  - 官方入驻入口: [https://www.lemonsqueezy.com/](https://www.lemonsqueezy.com/)
  - 官方联盟推广计划: [https://www.lemonsqueezy.com/affiliates](https://www.lemonsqueezy.com/affiliates)
- **建议注册账号类型**: 商家账户 (Merchant Account) + 联盟推广伙伴
- **准入资质门槛与所需 KYC 资料**:
  - 提交展示数字产品或技术工具的官方网站（直接提交 `https://yunsin.top/en/tools/`）；
  - 护照扫描件、地址证明（如水电账单或信用卡账单）；
  - 绑定 Wise 美元账户或支持国际电汇的银行账户。
- **关联引流工具与前台转化触点**:
  - `Tool 4: saas-metrics-calculator`（英文工具页中 SaaS 计费与支付网关推荐）。
- **预期佣金比例/单价与结算周期**:
  - 商家销售费率仅 5% + $0.50；联盟推荐新商家终身享受其流水返点；每两周结算一次。
- **代码替换落地指引**:
  - 替换 `src/consts.ts` 中的 `AFFILIATE_LINKS.lemonSqueezy`。

---

### 板块 3: 云服务与开发者基础设施 (Cloud & Infrastructure)

#### 10. 阿里云 Aliyun (专属「折扣补贴推广」25% 优惠 / 7.5 折)
- **平台名称与战略定位**: 亚太地区第一大云计算基础设施厂商。特别针对本项目，博主已开通极高转化率的**专属「折扣补贴推广」专属让利活动**。
- **官方注册与伙伴申请入口**:
  - 阿里云云大使官方入驻: [https://dashi.aliyun.com/](https://dashi.aliyun.com/)
  - **博主专属折扣补贴活动链接**: `https://www.aliyun.com/minisite/goods?userCode=o0amjn4j`
  - **专属推广码 / 关联码**: `o0amjn4j`
- **建议注册账号类型**: 个人实名认证开发者账户 (阿里云云大使)
- **准入资质门槛与所需 KYC 资料**:
  - 支付宝一键扫脸实名认证，绑定大陆银行储蓄卡；
  - 线上勾选签署云大使推广协议（当前已开通生效）。
- **关联引流工具与前台转化触点**:
  - 全站通用云服务器推荐位、百炼 AI 大模型算力专区、AIGC 开发者中心；
  - `Tool 4: saas-metrics-calculator`（SaaS 部署云端轻量算力）；
  - `Tool 5: polyglot-converter`（多语言后端部署服务器）。
- **预期佣金比例/单价与结算周期**:
  - **核心让利与转化杀手锏**: 博主主动补贴 **20%** 佣金给新用户 + 阿里云平台额外补贴 **5%** = **新用户最终享受 25% 折扣补贴优惠（即在官网低价基础上再打 7.5 折）**；
  - 云大使首购返佣最高可达 25%~31%，次月 25 日直接提现至绑定的支付宝账户。
- **代码替换落地指引**:
  - 本站已配置完成，对应 `src/consts.ts` 中的 `AFFILIATE_LINKS.aliyun` 与 `AFFILIATE_LINKS.aliyunDiscount`，推广码为 `o0amjn4j`。

---

#### 11. 腾讯云 Tencent Cloud (轻量应用服务器 / 云大使)
- **平台名称与战略定位**: 国内个人开发者、高校学生与中小微企业部署轻量应用 (Lighthouse) 普及率最高的云平台。
- **官方注册与伙伴申请入口**:
  - 腾讯云推广者平台 (云大使): [https://cloud.tencent.com/act/partner/cps](https://cloud.tencent.com/act/partner/cps)
- **建议注册账号类型**: 个人实名认证开发者账户
- **准入资质门槛与所需 KYC 资料**:
  - 微信扫码一键实名认证、绑定国内银行储蓄卡（已完成配置）。
- **关联引流工具与前台转化触点**:
  - 全站通用 VPS 推荐、轻量服务器特惠专区、AI 知识引擎专区。
- **预期佣金比例/单价与结算周期**:
  - 轻量云主机与云算力消费享 **15% ~ 30%** 现金提现分成；
  - 次月 15 日后可随时申请提现至银行卡。
- **代码替换落地指引**:
  - 本站已配置完成，对应 `src/consts.ts` 中的 `AFFILIATE_LINKS.tencentCloud`、`AFFILIATE_LINKS.tencentCloudLighthouse` 与 `AFFILIATE_LINKS.tencentCloudAi`。

---

#### 12. Vultr (全球多机房高性能 VPS 联盟)
- **平台名称与战略定位**: 全球知名按小时计费的高性能云主机商，涵盖全球 32+ 核心节点，免备案、极速开通、出海业务首选。
- **官方注册与联盟申请入口**:
  - 官方联盟推广申请: [https://www.vultr.com/affiliate/](https://www.vultr.com/affiliate/)
  - 账户内推荐中心: 登录 [https://my.vultr.com/](https://my.vultr.com/) 后进入 Account -> Referrals 页面。
- **建议注册账号类型**: 开发者个人账户
- **准入资质门槛与所需 KYC 资料**:
  - 双币信用卡 (Visa / Mastercard) 或 PayPal 充值 $5~$10 激活认证；
  - 即可自动生成带 `?ref=xxxxxx` 的独立推广链接。
- **关联引流工具与前台转化触点**:
  - `Tool 4: saas-metrics-calculator`（Micro-SaaS 独立出海节点推荐）；
  - 全站英文镜像页 (`/en/tools/*`) VPS 专属推荐位。
- **预期佣金比例/单价与结算周期**:
  - 推荐有效新客户充值，最高可获得 **$10.00 ~ $100.00** 奖励金或持续 25% 消费分成；
  - 满 $100 每月通过 PayPal 自动结算。
- **代码替换落地指引**:
  - 将生成的真实 Referral 链接填入 `src/consts.ts` 的 `AFFILIATE_LINKS.vultr`。

---

### 板块 4: 创作者生态与 AI 算力推广 (Creators Ecosystem & AI Compute)

#### 13. Canva Pro (自媒体视觉设计联盟)
- **平台名称与战略定位**: 全球用户规模最大的在线设计与多媒体制作平台，自媒体卡片、封面排版与宣发海报的国民级工具。
- **官方注册与伙伴申请入口**:
  - 官方创作者联盟入口: [https://www.canva.com/affiliates/](https://www.canva.com/affiliates/) (由 Impact.com 托管)
- **建议注册账号类型**: 媒体创作者 / 内容联盟伙伴 (Media Partner)
- **准入资质门槛与所需 KYC 资料**:
  - 提交自媒体专栏或工具站点（直接提交本站卡片工坊 `https://yunsin.top/tools/social-card-generator/`）；
  - 填报预估月访问量与宣传渠道，审核周期通常为 2~3 个工作日。
- **关联引流工具与前台转化触点**:
  - `Tool 1: social-card-generator`（自媒体爆款卡片排版工坊右上角升级设计套件推荐）。
- **预期佣金比例/单价与结算周期**:
  - 每引导 1 名用户成功订阅 Canva Pro，奖励 **$15.00 ~ $36.00**；
  - 由 Impact 平台按月电汇结算至银行卡或 PayPal。
- **代码替换落地指引**:
  - 替换 `src/consts.ts` 中的 `AFFILIATE_LINKS.canvaPro`。

---

#### 14. 硅基流动 SiliconFlow (开箱即用高性价比大模型算力)
- **平台名称与战略定位**: 国内领先的一站式开源大模型推理云服务平台，完整支持 DeepSeek-V3/R1、Qwen2.5、FLUX 等前沿模型，API 极速稳定且单价极具竞争力。
- **官方注册与邀请入口**:
  - 官方网站: [https://cloud.siliconflow.cn/](https://cloud.siliconflow.cn/)
  - **博主专属邀请链接**: `https://cloud.siliconflow.cn/i/mxiALm95` (邀请码 `mxiALm95`)
- **建议注册账号类型**: 开发者个人账户
- **准入资质门槛与所需 KYC 资料**:
  - 手机号验证码注册，微信扫码一键实名认证，零门槛秒级激活（已开通生效）。
- **关联引流工具与前台转化触点**:
  - 全站通用 AI 算力底座；
  - `Tool 1: social-card-generator`（AI 金句一键润色底层算力）；
  - `Tool 5: polyglot-converter`（代码生成与 Mock 数据底层算力）；
  - 既有工具 `llm-cost-calculator`（Token 成本精算）。
- **预期佣金比例/单价与结算周期**:
  - 邀请新人注册即赠送 ¥16 算力额度，被推荐人产生后续充值消费永久享受官方分润返点。
- **代码替换落地指引**:
  - 本站已配置完成，对应 `src/consts.ts` 中的 `AFFILIATE_LINKS.siliconflow` 与 `AFFILIATE_LINKS.openrouter`。

---

#### 15. OpenRouter (全球大模型统一聚合路由)
- **平台名称与战略定位**: 全球大模型 API 聚合调度的顶级平台，单一接口统一调用 Claude 3.7 Sonnet、GPT-4o、o1/o3-mini 及各类开源顶流大模型，出海开发者必备。
- **官方注册与推荐入口**:
  - 官方网站: [https://openrouter.ai/](https://openrouter.ai/)
  - 推荐返佣设置: 登录后在 Account -> Settings -> Referrals 获取带有 `?ref=xxxx` 的邀请链接。
- **建议注册账号类型**: 开发者账户 (Developer Account)
- **准入资质门槛与所需 KYC 资料**:
  - GitHub / Google 账号一键授权登录；
  - 绑定虚拟信用卡或以加密货币充值 $5 激活。
- **关联引流工具与前台转化触点**:
  - 全球大模型 API 成本精算器 (`llm-cost-calculator`)；
  - `Tool 5: polyglot-converter`（多语言转换代码增强）。
- **预期佣金比例/单价与结算周期**:
  - 享当下游开发者调用产生 Token 消费的分成返还或可提现点数。
- **代码替换落地指引**:
  - 替换 `src/consts.ts` 中的 `AFFILIATE_LINKS.openrouter`。

---

#### 16. Beehiiv (现代 Newsletter 邮件订阅增长平台)
- **平台名称与战略定位**: 专为独立内容创作者与极客打造的下一代 Newsletter 平台，内建增长引擎、读者裂变系统与全球顶级赞助商广告网络。
- **官方注册与伙伴申请入口**:
  - 官方网站: [https://www.beehiiv.com/](https://www.beehiiv.com/)
  - 官方合作伙伴计划: [https://www.beehiiv.com/partners](https://www.beehiiv.com/partners) (PartnerStack 托管)
- **建议注册账号类型**: 创作者空间 (Creator) + 联盟会员账号 (PartnerStack)
- **准入资质门槛与所需 KYC 资料**:
  - 邮箱快速注册，填报 Newsletter 规划主题；
  - 绑定用于接收美金结算款的 PayPal 账户。
- **关联引流工具与前台转化触点**:
  - 全站出海极客周刊订阅漏斗、私域流量沉淀触点；
  - `Tool 8: utm-builder`（多渠道引流效果追踪）。
- **预期佣金比例/单价与结算周期**:
  - 新付费订阅创作者首年 **30% 终身循环月度佣金 (Recurring Monthly Payouts)**；
  - 经 PartnerStack 平台每月自动发放到 PayPal。
- **代码替换落地指引**:
  - 替换 `src/consts.ts` 中的 `AFFILIATE_LINKS.beehiiv`。

---

### 板块 5: 硬件安全与极客广告赞助 (Hardware Security & Geek Ads)

#### 17. OneKey 硬件冷钱包 (Web3 资产安全防护)
- **平台名称与战略定位**: 全球顶尖的开源 Web3 硬件冷钱包，支持多链资产管理与离线私钥存储，极客与链上独立开发者的标配安全工具。
- **官方推广联盟注册入口**:
  - 官方加盟申请入口: [https://onekey.so/affiliates](https://onekey.so/affiliates)
  - **现役专属推广链接**: `https://onekey.so/r/T1HD5Q` (推广码 `T1HD5Q`)
- **建议注册账号类型**: 联盟推广伙伴 (Affiliate Partner)
- **准入资质门槛与所需 KYC 资料**:
  - 邮箱快速开通，只需填写接收佣金的 Web3 链上地址（USDT / USDC，支持 Polygon/Arbitrum/以太坊网络），**无需传统银行繁琐审核，零外汇汇损，秒级到账**。
- **关联引流工具与前台转化触点**:
  - `Tool 2: freelance-invoice-generator`（发票中勾选加密货币收款选项时，浮现冷钱包私钥离线防护提示）；
  - 全站既有 Web3 节点延迟测速与 Calldata 解码器 (`web3-rpc-tester`)。
- **预期佣金比例/单价与结算周期**:
  - 硬件冷钱包每销售 1 台获得 **$15.00 ~ $30.00**（或产品售价的 15%~25%）；
  - 每月直接由智能合约或官方自动向链上钱包分发 USDT/USDC。
- **代码替换落地指引**:
  - 本站已配置完成，对应 `src/consts.ts` 中的 `AFFILIATE_LINKS.ledger`。

---

#### 18. 万维广告 WWAds (中文开发者与极客原生广告网络)
- **平台名称与战略定位**: 国内公认口碑最好、专为技术社区和开发者工具定制的原生广告网络。严格不追踪个人 Cookie、不弹窗、不侵入核心 UI，深受开发者信赖。
- **官方媒体主申请链接**: [https://wwads.cn/](https://wwads.cn/)
- **建议注册账号类型**: 网站媒体主 (Publisher)
- **准入资质门槛与所需 KYC 资料**:
  - 网站必须属于技术、设计、极客、开源等垂直领域（本站完全契合）；
  - 日均独立访问量 (UV) 建议达到 500 ~ 1,000 以上；
  - 提交站点域名及备案证明（GitHub Pages / 纯技术出海站点支持免备案人工绿色通道审核）。
- **关联引流工具与前台转化触点**:
  - 中文全工具页面 (`lang="zh"`) 底部脱敏原生 `.partner-panel` 容器。
- **预期佣金比例/单价与结算周期**:
  - 预期 eCPM 为 **¥5.00 ~ ¥15.00**，支持微信支付或对公/对私银行卡按月自动结算。
- **代码替换落地指引**:
  - 获取广告位 ID (WWAds Unit ID) 后，配置在环境变量 `PUBLIC_WWADS_ID` 或在 `src/consts.ts` 的 `ADS_CONFIG.wwadsId` 中配置。

---

#### 19. EthicalAds (英文开发者隐私友好型广告网络)
- **平台名称与战略定位**: 由知名开源文档托管平台 Read the Docs 团队倾力打造的开发者专属广告网络。完全不依赖 Cookie 追踪，仅通过当前页面内容主题匹配赞助商，彻底杜绝隐私泄露。
- **官方媒体主申请链接**: [https://www.ethicalads.io/publishers/](https://www.ethicalads.io/publishers/)
- **建议注册账号类型**: 开发者网站 Publisher
- **准入资质门槛与所需 KYC 资料**:
  - 纯英文技术站点或双语站点英文版（直接提交 `https://yunsin.top/en/tools/`）；
  - 承诺遵守 Acceptable Ads 协议；
  - 月度总浏览量 (PV) 建议达到 5,000 ~ 10,000 以上。
- **关联引流工具与前台转化触点**:
  - 英文全工具页面 (`lang="en"`) 底部脱敏原生 `.partner-panel` 容器。
- **预期佣金比例/单价与结算周期**:
  - 预期 eCPM 约 **$2.25 ~ $3.50**，开发者净得高达 **70%** 的广告主分成款；
  - 每月固定通过 PayPal 或国际电汇发放收益。
- **代码替换落地指引**:
  - 获取 Publisher ID 后，配置在环境变量 `PUBLIC_ETHICAL_ADS_ID` 或在 `src/consts.ts` 的 `ADS_CONFIG.ethicalAdsPublisher` 中配置。

---

#### 20. Buy Me a Coffee (全球创作者极简打赏咖啡)
- **平台名称与战略定位**: 全球最流行、心理抗拒感最低的微额赞赏工具，欧美独立黑客与开源作者的最爱。
- **官方注册与入驻链接**: [https://www.buymeacoffee.com/](https://www.buymeacoffee.com/)
- **建议注册账号类型**: 创作者空间 (Creator)
- **准入资质门槛与所需 KYC 资料**:
  - 邮箱一键快速创建专属个性化主页（如 `buymeacoffee.com/yunsin`）；
  - 绑定 Stripe 或标准 PayPal 账户用于接收打赏款项。
- **关联引流工具与前台转化触点**:
  - 英文工具页底部常驻极简打赏按钮；
  - Hacker News / V2EX 纯净模式 (`?clean=1`) 底部赞赏按钮。
- **预期佣金比例/单价与结算周期**:
  - 平台仅收取 5% 极低服务费，支持用户以 $3 / $5 / $10 自定义赠送咖啡杯数；
  - 打赏款即时或按周自动划转至关联的 Stripe / PayPal 账户。
- **代码替换落地指引**:
  - 将创建完成的打赏主页链接配置至 `src/consts.ts` 的 `AFFILIATE_LINKS.buyMeACoffee`。

---

## 三、 分阶段实操注册路线图 (Phased Action Roadmap)

为避免一次性申报 20 个平台造成认知过载与资料准备混乱，特将平台按照“开通门槛、资料需求与见效速度”划分为**三大清晰落地阶段**：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        分阶段实操推进路线图 (Action Roadmap)                            │
├──────────────────────────┬────────────────────────────┬────────────────────────────────┤
│ 实施阶段                  │ 重点覆盖渠道平台           │ 准入准备与核心行动             │
├──────────────────────────┼────────────────────────────┼────────────────────────────────┤
│ 第一阶段: Day 1 零门槛启动 │ • 面包多 (Mianbaoduo)      │ • 仅需微信/手机号与支付宝，    │
│ (当天上线，激活现金流)    │ • 爱发电 (Afdian)          │   1 小时内全量完成开通；       │
│                          │ • 阿里云专属折扣补贴活动   │ • 上架 5 款数字产品，拿到购买  │
│                          │ • 硅基流动 (SiliconFlow)   │   短链填入 consts.ts；         │
│                          │ • Canva Pro                │ • 立即获得 7.5 折服务器推广力。 │
│                          │ • Buy Me a Coffee          │                                │
├──────────────────────────┼────────────────────────────┼────────────────────────────────┤
│ 第二阶段: Week 1 深度基建 │ • Wise Business 商业账户   │ • 准备身份证、公司营业执照     │
│ (完善 KYC，打通出海结汇)  │ • Payoneer 派安盈          │   与护照扫描件；               │
│                          │ • 连连国际 LianLian        │ • 激活美元/英镑虚拟银行账户，  │
│                          │ • Gumroad 美元卖家账户     │   绑定 Gumroad/PayPal 美元直出；│
│                          │ • Vultr VPS 联盟           │ • 充值 $5 双币卡激活 VPS 推广。│
│                          │ • Beehiiv Newsletter       │                                │
├──────────────────────────┼────────────────────────────┼────────────────────────────────┤
│ 第三阶段: Month 1+ 进阶  │ • 万维广告 (WWAds) 原生广告│ • 观察工具矩阵日常流量爬坡；   │
│ (流量成熟，规模化管道收益)│ • EthicalAds 英文原生广告  │ • 日均 UV 达标 500 后提交媒体主│
│                          │ • Shopify Partner 深度联盟 │   申请，点亮被动原生广告管道； │
│                          │ • Stripe Atlas 离岸企业开设│ • 探索境外离岸公司与原生收单。 │
└──────────────────────────┴────────────────────────────┴────────────────────────────────┘
```

### 3.1 第一天零门槛立即可启动渠道 (Day 1 - 0 门槛开通，立刻激活现金流)
1. **面包多 (Mianbaoduo)**: 微信扫码一键登录，实名认证后，直接创建 5 个商品条目，定价设为 ¥19.9 与 ¥29.0，将生成的 5 个购买链接填入 `src/consts.ts` 的 `DIGITAL_PRODUCTS`，网站 Tier 2 微信支付直销闭环瞬间建立！
2. **爱发电 (Afdian)**: 手机号注册个人创作者主页，设置一个“请喝杯美式咖啡 (¥5/杯)”的随喜方案，链接填入 `src/consts.ts`，激活赞赏。
3. **阿里云 (Aliyun) 专属 25% 折扣补贴活动**: 充分利用已有推广码 `o0amjn4j`，使用专属链接 `https://www.aliyun.com/minisite/goods?userCode=o0amjn4j` 在工具页中突出“折上再享 7.5 折”的超高吸引力利益点。
4. **硅基流动 (SiliconFlow)**: 手机验证码一键激活，获取邀请码 `mxiALm95`，挂载至 AI 算力与代码工场工具中。
5. **Canva Pro**: 登录 Impact.com 提交网站链接 `https://yunsin.top/tools/social-card-generator/`，申请 Canva 创作者媒体联盟。
6. **Buy Me a Coffee**: 邮箱秒级注册个性化网址，挂载至全站英文版工具页。

### 3.2 第一周需准备资料开通渠道 (Week 1 - 完善 KYC 与出海结汇底座)
1. **Wise Business**: 准备好营业执照、法人身份证及公司住址证明，完成开户审核并支付激活费，开立美元、英镑、欧元虚拟收款账号。
2. **Gumroad**: 注册创作者账户，上架 5 款数字产品的英文版（定价 $4.99 与 $5.99），将生成的 Gumroad 结账短链填入 `DIGITAL_PRODUCTS.*.checkoutUrlEn`，收款方式直接填写 Wise 提供的美国本地 ACH 银行路由信息。
3. **Payoneer 派安盈**: 提交身份证与对私银行卡完成注册，获取专属邀请链接填入 `src/consts.ts`。
4. **连连国际 (LianLian Global)**: 提交商户入驻申请，开辟 0.5% 低费率合规人民币结汇通道。
5. **Vultr**: 绑定双币信用卡完成 $5 充值验证，获取带 `?ref=xxxxxx` 的推广链接。
6. **Beehiiv**: 注册创作者账户并在 PartnerStack 激活推广伙伴资格，绑定 PayPal 接收循环分润。

### 3.3 流量成熟后申请渠道 (Month 1+ - 流量蓄积与高客单进阶)
1. **万维广告 (WWAds)**: 当全站工具矩阵（尤其是社交卡片、发票生成器与类型工场）经过搜索引擎索引及社群引流，中文日均访问量稳定在 **500 ~ 1,000 UV** 以上时，向万维广告官方提交媒体主申请，审核通过后获取广告位 ID 挂载至 `AdSlot.astro`，开启全天候免维护被动广告收益。
2. **EthicalAds**: 当英文工具镜像页月均浏览量达到 **5,000 ~ 10,000 PV** 时提交申请，接入海外高客单极客广告，以 PayPal 结算美元。
3. **Shopify Partner**: 跨境电商相关工具沉淀了一批稳定独立站卖家受众后，申请 Shopify 开发者推广伙伴，捕获数百美元单笔开店大单。
4. **Stripe Atlas**: 当有真实的境外离岸公司设立需求、出海 SaaS 需接入原生信用卡收单时，正式启动 Atlas 公司注册并使用推荐码。

---

## 四、 代码替换落地与一键生效指引 (Code Replacement Reference)

全站变现体系在工程上实行**单点配置、全站自动响应生效**机制。所有推广链接、商品购买地址与广告参数全部收敛在 `src/consts.ts` 一个文件中。

### 4.1 `src/consts.ts` 集中配置架构

```
src/consts.ts
├── AFFILIATE_LINKS    ──> 集中维护 20 大平台 CPS 推广返佣链接字典
├── DIGITAL_PRODUCTS   ──> 集中维护 5 大 Tier 2 虚拟数字产品双轨直销短链
└── ADS_CONFIG         ──> 集中维护万维广告、EthicalAds 媒体主 ID
```

修改该文件后，全站所有工具页（包括中文页 `/tools/*` 与英文镜像页 `/en/tools/*`）、工具列表卡片、情境化侧边栏与页脚将**毫秒级全自动同步更新，绝无死链遗漏**！

### 4.2 CPS 联盟链接配置表 (`AFFILIATE_LINKS`)

当在各大官方平台通过审核并拿到专属推广链接后，直接用你的真实链接替换下表对应的键值：

| 平台名称 | `src/consts.ts` 中的键名 | 当前状态 / 默认占位示例 | 替换生效范例 |
| :--- | :--- | :--- | :--- |
| **Wise Business** | `AFFILIATE_LINKS.wiseBusiness` | `https://wise.com/invite/ihpc/yunsin-placeholder` | `'https://wise.com/invite/u/yourRealImpactId'` |
| **Payoneer 派安盈** | `AFFILIATE_LINKS.payoneer` | `https://share.payoneer.com/nav/yunsin-placeholder` | `'https://share.payoneer.com/nav/yourRealReferralCode'` |
| **连连国际** | `AFFILIATE_LINKS.lianlianGlobal` | *(待添加至字典)* | `'https://global.lianlianpay.com/register?invite_code=yourLianLianCode'` |
| **空中云汇** | `AFFILIATE_LINKS.airwallex` | *(待添加至字典)* | `'https://www.airwallex.com/register?channel=yourAirwallexCode'` |
| **Stripe Atlas** | `AFFILIATE_LINKS.stripeAtlas` | *(待添加至字典)* | `'https://stripe.com/atlas?ref=yourAtlasCode'` |
| **面包多主页** | `AFFILIATE_LINKS.mianbaoduo` | `https://mbd.pub/o/bread/mbd-yunsin-placeholder` | `'https://mbd.pub/o/author/yourRealUserId'` |
| **爱发电** | `AFFILIATE_LINKS.afdian` | *(待添加至字典)* | `'https://afdian.com/a/yourRealAfdianId'` |
| **Gumroad 店铺** | `AFFILIATE_LINKS.gumroad` | `https://gumroad.com/l/yunsin-placeholder` | `'https://yourStore.gumroad.com'` |
| **Lemon Squeezy** | `AFFILIATE_LINKS.lemonSqueezy` | `https://lemonsqueezy.com/yunsin-placeholder` | `'https://lemonsqueezy.com/?aff=yourRealAffId'` |
| **阿里云** (专属折扣) | `AFFILIATE_LINKS.aliyun` | `https://www.aliyun.com/minisite/goods?userCode=o0amjn4j` | **已激活生效** (专属 25% 折扣推广码 `o0amjn4j`) |
| **阿里云云大使** | `AFFILIATE_LINKS.aliyunDiscount` | `https://www.aliyun.com/minisite/goods?userCode=o0amjn4j` | **已激活生效** |
| **腾讯云轻量服务器** | `AFFILIATE_LINKS.tencentCloudLighthouse` | `https://cloud.tencent.com/act/cps/redirect?...` | **已激活生效** |
| **Vultr VPS** | `AFFILIATE_LINKS.vultr` | `https://www.aliyun.com/minisite/goods?userCode=o0amjn4j` | `'https://www.vultr.com/?ref=9600000'` |
| **Canva Pro** | `AFFILIATE_LINKS.canvaPro` | `https://partner.canva.com/c/yunsin-placeholder` | `'https://partner.canva.com/c/yourRealImpactId'` |
| **硅基流动** | `AFFILIATE_LINKS.siliconflow` | `https://cloud.siliconflow.cn/i/mxiALm95` | **已激活生效** (邀请码 `mxiALm95`) |
| **OpenRouter** | `AFFILIATE_LINKS.openrouter` | `https://cloud.siliconflow.cn/i/mxiALm95` | `'https://openrouter.ai/?ref=yourRefId'` |
| **Beehiiv** | `AFFILIATE_LINKS.beehiiv` | `https://www.beehiiv.com/?via=yunsin-placeholder` | `'https://www.beehiiv.com/?via=yourRealSlug'` |
| **OneKey 硬件钱包** | `AFFILIATE_LINKS.ledger` | `https://onekey.so/r/T1HD5Q` | **已激活生效** (推广码 `T1HD5Q`) |
| **Shopify Partner** | `AFFILIATE_LINKS.shopifyPartner` | `https://www.shopify.com/partners?ref=yunsin-placeholder` | `'https://www.shopify.com/partners?ref=yourShopifyPartner'` |
| **Buy Me a Coffee** | `AFFILIATE_LINKS.buyMeACoffee` | *(待添加至字典)* | `'https://buymeacoffee.com/yourRealUsername'` |

### 4.3 虚拟数字资产链接配置表 (`DIGITAL_PRODUCTS`)

在 `src/consts.ts` 的 `DIGITAL_PRODUCTS` 字典中，每个商品均包含 `checkoutUrlZh`（中文购买链接）与 `checkoutUrlEn`（英文购买链接）：

```typescript
export const DIGITAL_PRODUCTS: Record<string, DigitalProduct> = {
  // 1. 自媒体爆款卡片排版预设包 (用于 Tool 1)
  socialCardPresets: {
    id: 'social-card-presets',
    name: '100+ 款自媒体爆款卡片排版预设与主题 JSON 配置文件',
    priceCny: 19.9,
    priceUsd: 4.99,
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-social-cards', // <-- 替换为你的面包多真实商品链接
    checkoutUrlEn: 'https://gumroad.com/l/social-card-presets', // <-- 替换为你的 Gumroad 真实商品链接
  },

  // 2. 自由职业双语防拖欠合同与律师函模板 (用于 Tool 2)
  freelanceContractsPack: {
    id: 'freelance-contracts-pack',
    name: '自由职业者双语外包服务合同范本与防拖欠催款话术包',
    priceCny: 29.0,
    priceUsd: 5.99,
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-freelance-contract', // <-- 替换为你的真实链接
    checkoutUrlEn: 'https://gumroad.com/l/freelance-contracts-pack', // <-- 替换为你的真实链接
  },

  // 3. 全球跨境收款汇损动态穿透 Excel 核算模型 (用于 Tool 3)
  crossBorderFxModel: {
    id: 'cross-border-fx-model',
    name: '2026 全球跨境收款与电汇隐性汇损动态对比 Excel 动态核算模型',
    priceCny: 29.0,
    priceUsd: 5.99,
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-cross-border-fx', // <-- 替换为你的真实链接
    checkoutUrlEn: 'https://gumroad.com/l/cross-border-fx-model', // <-- 替换为你的真实链接
  },

  // 4. Micro-SaaS 并购尽调与估值财务底稿 (用于 Tool 4)
  saasBpDueDiligence: {
    id: 'saas-bp-due-diligence',
    name: 'Micro-SaaS 商业计划书与项目并购尽调财务底稿 (Notion + Excel)',
    priceCny: 29.0,
    priceUsd: 5.99,
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-saas-diligence', // <-- 替换为你的真实链接
    checkoutUrlEn: 'https://gumroad.com/l/saas-bp-due-diligence', // <-- 替换为你的真实链接
  },

  // 5. 全栈多语言类型生成与架构实战指引 (用于 Tool 5)
  polyglotAstPlaybook: {
    id: 'polyglot-ast-playbook',
    name: '全栈多语言类型生成与生产级 API Schema 设计实战指引',
    priceCny: 19.9,
    priceUsd: 4.99,
    checkoutUrlZh: 'https://mbd.pub/o/bread/mbd-polyglot-playbook', // <-- 替换为你的真实链接
    checkoutUrlEn: 'https://gumroad.com/l/polyglot-ast-playbook', // <-- 替换为你的真实链接
  },
};
```

### 4.4 广告网络位与打赏配置表 (`ADS_CONFIG`)

广告网络可通过环境变量或在 `src/consts.ts` 的 `ADS_CONFIG` 中直接覆盖：

```typescript
export const ADS_CONFIG = {
  adsenseClient: import.meta.env.PUBLIC_ADSENSE_CLIENT || '',
  adsenseSlotHorizontal: import.meta.env.PUBLIC_ADSENSE_SLOT_H || '',
  wwadsId: import.meta.env.PUBLIC_WWADS_ID || '', // <-- 填入万维广告单元 ID (如 wwads-xxxx)
  ethicalAdsPublisher: import.meta.env.PUBLIC_ETHICAL_ADS_ID || '', // <-- 填入 EthicalAds Publisher ID
  aadsUnitId: import.meta.env.PUBLIC_AADS_UNIT_ID || '',
};
```

### 4.5 本地验证与安全降级防死链说明

1. **防死链优雅降级机制**: 前端已在各个触点内建了防死链保护，即使用户在上线初期使用的是带有 `placeholder` 的链接，当访客点击时也不会报错，而是优雅降级跳转至平台首页，保证良好的用户体验。
2. **本地编译验证命令**: 每次修改 `src/consts.ts` 后，在终端执行以下命令确认 TypeScript 类型和 Astro 静态构建完全通过：
   ```bash
   pnpm run build
   ```
   如果构建输出 `[build] complete in x.xxs` 且无报错，即可直接提交并推送到 GitHub 仓库触发自动部署。

---

## 五、 合规、税务与反封控安全守则 (Compliance & Security)

被动收入体系若要长期健康稳定运转，必须严格筑牢**法务合规、税务申报、外汇合规与平台反作弊防线**。

### 5.1 国内申报纳税与合规入账指南

1. **增值电信与网络销售性质**:
   - 个人通过“面包多”或“爱发电”销售个人创作的独立数字产品（文档、预设、表格、代码），属于**技术成果转让或知识产权许可使用**。
   - 面包多、爱发电平台在结算提现时已按国家规定履行代扣代缴个税或提供年度收益水单。
2. **个人综合所得年度汇算清缴**:
   - 每年 3 月 1 日至 6 月 30 日，请在“个人所得税”官方 App 进行上一年度综合所得年度汇算清缴。
   - 将云大使返佣（如阿里云、腾讯云发放的劳务报酬）与数字资产直销收入合并申报，多退少补，保障财税百分之百阳光合规。
3. **个体工商户与企业开票通道**:
   - 当月度被动收入规模突破 ¥30,000 以上时，建议注册“个人独资企业”或“个体工商户”，申请小规模纳税人增值税免征或简易征收政策，合规开具 1%~3% 的增值税普通发票，降低综合税负。

### 5.2 跨境结汇与外汇合规操作守则

1. **国家外汇管理局个人结汇限额规避指南**:
   - 我国对个人结汇实行每人每年等值 **50,000 美元**的便利化额度管理。
   - **切忌**：切勿使用个人大陆借记卡频繁接收境外未知第三方公司的大额高频电汇（SWIFT），极易触发中国人民银行与商业银行的**反洗钱 (AML) 重点监控**，导致银行卡被风控“只进不出”或要求现场柜台提供繁复的劳务合同证明。
2. **推荐的阳光结汇正规通道**:
   - **通道一（连连国际 / Payoneer 跨境结汇）**: 连连国际具有正规跨境外汇牌照，提现结汇至国内银行账户时走合规跨境申报通道，**不占用个人 5 万美元结汇额度**，秒级人民币直接入账。
   - **通道二（Wise 美元储蓄与分流）**: 资金沉淀在 Wise 多币种商业账户中，可用于抵扣境外云服务（Vultr、AWS、OpenAI）费用，或按需小额转账回国。
   - **通道三（Web3 链上合规结算）**: OneKey 等加密返佣直接以 USDT/USDC 发送至个人硬件冷钱包，完全脱离传统繁琐电汇网络，链上资产掌握在自己手中。

### 5.3 FTC 广告透明度披露与免责声明标准

依据美国联邦贸易委员会 (FTC) 16 CFR § 255.5《关于广告中使用背书与证言的指导意见》及网信办《互联网广告管理办法》要求：

1. **返佣关系强制披露**:
   - 本站所有包含 Affiliate 推广链接的卡片与推荐位，均已在界面醒目位置标明：
     > *“声明：本文部分链接为赞助或推广推荐链接（Affiliate Links）。当您通过这些链接购买或注册时，作者可能会从服务商处获得一定比例的返佣，这绝不会增加您的购买成本，反而可能为您争取到专属折扣（如阿里云 7.5 折补贴）。感谢您对本开源站点的支持！”*
   - 本站封装的 `AffiliateCard.astro` 组件已原生集成该双语合规声明，完全满足 FTC 审计标准。
2. **金融精算与商业估值免责声明**:
   - 在 `payment-fee-calculator` (跨境支付汇损精算器) 与 `saas-metrics-calculator` (SaaS 估值沙盘) 界面底部，均已严格注入免责条款：
     > *“免责声明：本工具展示的手续费率、即时汇率、单元经济学测算与并购估值模型，系基于公开文档与浏览器端离线数学模拟，仅作为业务预算与财务推演参考，绝不构成任何实质性的金融清算承诺、投资意见或商业并购保证。”*

### 5.4 联盟推广反作弊与防封控四大军规

各商业联盟平台配备了极为严格的风控反作弊与 IP 聚类分析模型，推广过程中**必须严格恪守以下四大军规**，否则可能面临封号并没收全部佣金的严惩：

1. **严禁自买自刷 (No Self-Referral)**:
   - 绝对禁止使用自己的推广链接在同一设备、同一浏览器 Cookie 或同一 Wi-Fi/IP 局域网下为自己购买商品或充值。各大云服务商（尤其是阿里云、腾讯云、Vultr）具有极其精密的用户指纹识别算法，自买行为会被系统判定为恶意套利，直接扣除佣金并冻结云大使资格。
2. **严禁购买品牌保护词竞价 (No Brand / Trademark Bidding)**:
   - 禁止在 Google Ads、百度推广、必应广告等商业搜索引擎中购买合作平台的官方商标词（如购买 "Wise", "Canva", "Payoneer", "Stripe", "OneKey" 关键词），强行将流量重定向到自己的推广链接。一经官方合规团队侦测，将永久封禁联盟账号。
3. **严禁垃圾邮件与恶意泛滥群发 (No Spamming)**:
   - 禁止在未经订阅用户许可的情况下进行邮件大规模轰炸，禁止在 Telegram / 微信群使用自动化脚本无意义刷屏灌水。推荐流量必须来源于本站优质工具的自然使用、技术博客的真实评测与社群内有价值的技术讨论。
4. **确保推广承诺真实有效**:
   - 严禁编造不存在的夸大福利。例如宣传阿里云时，必须客观准确地表述“博主补贴 20% 佣金 + 平台补贴 5% = 新用户享 25% 折扣补贴优惠（7.5 折）”，不得承诺“免费领永久服务器”等虚假违规宣传。

---

*本指南由项目核心团队编制，全站代码与配置标准已与本规范完全对齐。完成平台注册后，仅需更新 `src/consts.ts` 即可驱动全站被动收入飞轮全速运转！*
