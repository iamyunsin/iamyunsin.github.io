# 全站搜索引擎冲前排实操手册与站外冷启动引流弹药包

> **适用域名**: `https://yunsin.top`（蜀ICP备2022007430号-2）  
> **目标大盘**: Google（中英文）+ Bing（含 ChatGPT/Copilot 搜索源）+ 百度搜索 + 主流 AI 搜索（DeepSeek / Kimi / 豆包 / Perplexity）  
> **站内现状**: 已完成全套技术 SEO 基建、101 个静态着陆页（含 20 个自动锁参的精编 pSEO 场景专页）、`llms.txt` AI 喂料与 GitHub Actions 自动推送脚本。

---

## 一、 云端必做两步（共耗时约 15 分钟，一次性搞定永久生效）

站内代码推送到 GitHub `main` 分支部署完成后，只需在浏览器后台完成以下两件云端配置，即可彻底打通「境内外极速抓取 + 三大搜索引擎主动收录」。

### 第 1 步：腾讯云 DNSPod「境内外双栈智能分流」（✅ 已在控制台配置并拨测生效）

已在腾讯云 DNSPod 免费版配额上限内完成全部 **7 条境内外双栈分流解析**，实网拨测确认生效：

| 主机记录 | 记录类型 | 线路类型 | 记录值 | TTL | 生效核验与架构作用 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `@` | `CNAME` | **默认** | `yunsin-top-1251451201.cos-website.ap-chengdu.myqcloud.com.` | 600 | 国内访客、**百度蜘蛛**与腾讯云备案核查直连成都 COS（<30ms 合规极速） |
| `www` | `CNAME` | **默认** | `yunsin-top-1251451201.cos-website.ap-chengdu.myqcloud.com.` | 600 | 保障国内 `https://www.yunsin.top` 443 证书正常与腾讯云 ICP 备案接入核查合规，由全站 `<link rel="canonical">` 归集权重（切勿改成不支持 HTTPS 的 DNSPod 显性URL） |
| `www` | `CNAME` | **境外** | `iamyunsin.github.io.` | 600 | 海外访问 `https://www.yunsin.top/*` 时，GitHub Pages 原生返回 `301 Moved Permanently` 跳回主域名对应路径 |
| `@` | `A` | **境外** | `185.199.108.153` | 600 | 海外访客与 **Googlebot / Bingbot (IPv4)** 走 GitHub Pages 全球 Fastly CDN 节点 1 |
| `@` | `A` | **境外** | `185.199.109.153` | 600 | GitHub Pages 全球 IPv4 任播节点 2（跑满免费版单线路 2 条负载均衡上限） |
| `@` | `AAAA` | **境外** | `2606:50c0:8000::153` | 600 | 海外 **Googlebot (IPv6)** 走 GitHub Pages 全球 IPv6 任播节点 1 |
| `@` | `AAAA` | **境外** | `2606:50c0:8001::153` | 600 | GitHub Pages 全球 IPv6 任播节点 2（跑满免费版 IPv6 双节点高可用） |

> **核验状态**：GitHub 仓库 `Settings -> Pages` 已绑定 `yunsin.top` 并勾选 **Enforce HTTPS**；通过 Google DoH 模拟美国 Googlebot 网段（`66.249.66.0/24`）与中国电信网段（`110.185.0.0/24`）双端拨测，境内外已 100% 精准命中各自边缘节点。

---

### 第 2 步：三大站长平台 10 分钟开通与自动推送绑定

#### 1. Google Search Console（最重要的全球与中文极客流量源）
1. 打开 [Google Search Console](https://search.google.com/search-console/welcome)。
2. 选择左侧 **「网域 (Domain)」** 类型，输入 `yunsin.top`（不带 https）。
3. 复制 Google 给你的那行 `google-site-verification=xxxxxx` 文本，去 **DNSPod** 添加一条主机记录为 `@`、类型为 `TXT` 的解析记录，回 GSC 点验证，**30 秒即刻通过**（连带 `www` 和全子路径全部自动覆盖，无需改代码）。
4. 进入左侧 **「站点地图 (Sitemaps)」**，填入 `sitemap-index.xml` 点击提交！
5. **加速技巧**：在顶部搜索框粘贴以下 5 个核心入口，依次点击 **「请求编入索引 (Request Indexing)」** 强行唤醒高优爬虫：
   - `https://yunsin.top/`
   - `https://yunsin.top/tools/`
   - `https://yunsin.top/en/tools/`
   - `https://yunsin.top/tools/exam-photo-20kb/`
   - `https://yunsin.top/tools/video-to-gif/`

#### 2. Bing Webmaster Tools（1 键免验证导入 + 激活 ChatGPT 搜索源）
1. 打开 [Bing Webmaster Tools](https://www.bing.com/webmasters)。
2. 直接点击左侧 **「从 Google Search Console 导入 (Import from GSC)」** —— 授权后 **0 秒免验证直接同步你的域名与 Sitemap**！
3. 本次代码已内置 **IndexNow 密钥文件**（`https://yunsin.top/8f4b2e91c6d347a5b0e2f19483c7a6d1.txt`）与 GitHub Actions 自动推送，以后每次你 `git push`，全站 101 个 URL 会秒级直达 Bing 与 ChatGPT Search 索引库！

#### 3. 百度搜索资源平台（吃透国内民生计算器与证件照流量）
1. 打开 [百度搜索资源平台](https://ziyuan.baidu.com/site/index) -> 添加网站 `https://yunsin.top`。
2. 站点属性勾选：**工具、IT技术、互联网**。
3. 验证方式选 **「HTML 标签验证」**（只复制 `content="xxxx"` 引号里的那串验证码 `xxxx`）：
   - 进入你 GitHub 仓库 `Settings -> Secrets and variables -> Actions -> New repository secret`：
   - 新建 Secret 名称：`PUBLIC_BAIDU_SITE_VERIFICATION`，值填入刚才复制的验证码（也可直接填在 `src/consts.ts` 的 `SEO_CONFIG.baiduSiteVerification` 中）。
4. 验证通过后，点开左侧 **「普通收录 -> API 提交」**，复制接口调用地址末尾 `token=` 后面的那串 16 位密钥：
   - 在 GitHub 仓库 Secrets 中新建：`BAIDU_PUSH_TOKEN`，填入这串密钥。
   - 从此每次 `git push`，`deploy-mysite.yml` 都会自动调用 `pnpm run seo:push` 把中文工具页和博客自动推给百度！
5. 顺手在百度后台 **「站点属性 -> 备案号」** 填入你的 `蜀ICP备2022007430号-2`，可显著缩短百度新站考核期。

---

## 二、 为什么做完站内还不够？`.top` 新域名 14 天破沙盒外链作战计划

**说真话不画饼**：新注册或刚铺内容的 `.top` 域名初始外链权重（DR）是 `0`。哪怕站内 SEO 做到 100 分，如果没有任何高权重外部网站指向你，Google 很容易把新页面挂在「已发现 - 尚未编入索引」队列里观察几周。

只要你在接下来 **7 天内，每天花 15 分钟发出下面 4~5 条高质量内容外链**，就能把爬虫抓取频率和域名信任度直接拉起来：

### 弹药 1：阮一峰《科技爱好者周刊》GitHub Issue 自荐（性价比天花板！）
- **投稿入口**: 打开 `https://github.com/ruanyf/weekly/issues` -> `New issue`
- **为什么必投**: GitHub Issue 本身就是 `DR 96` 的顶级爬虫入口，一旦被阮老师选入周五周刊的「工具」栏，单日能带来数千至上万精准开发者真实点击与大量自发转载外链！
- **直接复制文案**：
  - **标题**: `自荐纯本地零上传在线工具箱：基于 Astro + Rust Wasm 的 32 款免登录实用工具（视频转GIF/证件照控20KB/提前还贷/源码可视化）`
  - **正文**:
    ```markdown
    阮老师好，自荐一个刚开源上线的纯前端隐私工具站与原理实验室：**[原心工具箱 (yunsin.top)](https://yunsin.top/tools/)**（开源仓库：[iamyunsin.github.io](https://github.com/iamyunsin/iamyunsin.github.io)）。

    平时自己在转 GIF、压报名证件照 KB 数、合并保密合同 PDF 时，发现网上的工具大多需要上传服务器、限制 5MB 大小或强制打水印，于是用 **Astro 5 + Vue 3 + 微型 Rust WebAssembly** 搓了一套 **100% 在浏览器内存中运行（断网也能用）** 的免费工具集：

    - **多媒体与证件处理**：[视频转 GIF 无水印工作台](https://yunsin.top/tools/video-to-gif/)（自研 RGB555 调色板量化 + 12-bit LZW 编码，免下载 30MB ffmpeg.wasm）、[报名证件照二分法精准控 15~25KB](https://yunsin.top/tools/exam-photo-20kb/)、[WebP/AVIF 批量转换与 EXIF GPS 擦除](https://yunsin.top/tools/image-converter/)。
    - **金融算账照妖镜**：[提前还房贷（缩短年限 vs 减少月供）对比引擎](https://yunsin.top/tools/mortgage-shorten-vs-reduce/)、[信用卡分期/网贷月费率转真实 IRR 年化计算器](https://yunsin.top/tools/credit-card-installment-apr/)。
    - **前端底层交互实验室**：配套博客文章做了可单步点击推演的 [Vue 3 编译器 AST & PatchFlags 可视化](https://yunsin.top/tools/vue3-compiler-visualizer/) 与 [最长递增子序列 (LIS) 快速 Diff 动画沙盒](https://yunsin.top/tools/vue3-runtime-visualizer/)。

    全站无后端、零上传、免注册无水印，希望能帮到有需要的朋友！
    ```

---

### 弹药 2：V2EX `[分享创造]` 节点首发帖（自带纯净模式参数 `?ref=v2ex`）
- **发布节点**: `https://www.v2ex.com/go/create`
- **直接复制文案**：
  - **标题**: `搓了一套 100% 浏览器本地运行的隐私工具箱（Rust Wasm + Astro），视频转 GIF / 报名照控 20KB / PDF 转长图 / IRR 照妖镜，零上传无水印`
  - **正文**:
    ```text
    每次帮家人压公务员/教资报名照（要求严格卡在 15KB~30KB 之间），或者把内部录屏转成 GIF 贴进 PR、把几页扫描合同拼成 PDF 时，搜出来的在线网站不是要扫码关注公众号付 9.9 元，就是要把私密原件上传到对方服务器排队。

    索性趁周末在自己的技术博客上用 Astro 5 + Vue 3 + 几个二十几 KB 的 Rust Wasm 模块，搭了一套纯客户端本地运行的工具箱，服务器成本 $0，断网也能跑：

    工具箱总入口：https://yunsin.top/tools/?ref=v2ex

    挑几个自己用得最爽的单品：
    1. 视频转 GIF & 微信斗图表情包压缩（原生 TS 实现 RGB555 量化 + LZW 编码，不用拖 30MB 的 ffmpeg.wasm，支持逐帧剔除废帧和加描边字幕）：https://yunsin.top/tools/video-to-gif/?ref=v2ex
    2. 证件照换底色 + 二分法精准卡 20KB + 1 元六寸相纸 8 连排排版：https://yunsin.top/tools/exam-photo-20kb/?ref=v2ex
    3. 信用卡账单分期 / 4S 店车贷等本等息转真实 IRR 年化利率照妖镜：https://yunsin.top/tools/credit-card-installment-apr/?ref=v2ex
    4. 前端同好专属：把之前写的 Vue 3 编译和 Fast Diff 源码长文做成了可单步推演的状态机沙盒：https://yunsin.top/tools/vue3-compiler-visualizer/?ref=v2ex

    欢迎各位 V 友体验挑刺，有日常觉得恶心找不到干净替代品的小工具也可以留言，我继续往里加！
    ```

---

### 弹药 3：掘金 / 知乎 / CSDN「硬核技术复盘引流帖」（吃长期百度/搜狗/Google 搜索权重）
- **核心秘诀**: 在掘金和知乎**千万不要只发干巴巴的工具罗列**，发一篇《**不依赖 30MB FFmpeg.wasm！我是如何用 28KB Rust Wasm + 原生 Canvas 在纯前端实现 GIF89a 编码与证件照精准控 KB 的**》，在文章开头放体验地址，正文中嵌 2 段真实的二分法控 KB 与 RGB555 量化源码解析，极易被掘金编辑加精推荐上首页！
- **顺手动作**: 去你掘金主页（`https://juejin.cn/user/3227821870955495`）和 GitHub 个人主页设置里，把 **个人网站 (Website)** 字段明确填上 `https://yunsin.top` —— 这是最快被爬虫抓取的 2 条天然权重个人资料外链。

---

### 弹药 4：小红书「高收藏痛点工具卡」连发 4 篇（最快当天带来真实搜索与直接访问）
直接用你站内的 **[小红书社交卡片生成器](https://yunsin.top/tools/social-card-generator/)** 做 3:4 封面图，分 4 天发 4 个垂直人群痛点（不要一锅炖，算法喜欢垂直标签）：
1. **考公/教资/大学生党**：《救命！报名系统卡死“照片必须 15~20KB 白底”？免小程序 10 秒离线搞定，还能排 6 寸照花 1 块钱洗 8 张！》 -> 评论区置顶指引搜索或输入 `yunsin.top/tools/exam-photo-20kb`
2. **房主算账党**：《2026 手头有 20 万提前还房贷，选缩短年限到底比减月供少给银行多少万？算完惊出一身冷汗》 -> 放对比截图
3. **开店/民宿/新房装修党**：《别再买每年收费还有广告弹窗的假活码 WiFi 贴了！教你免费自制苹果相机秒连的永久 WiFi 台卡 + 挪车牌》
4. **打工人/自媒体党**：《网页存下来的图全是 WebP 和 AVIF 打不开？分享我压箱底的零上传批量转 PNG/JPG 神器》

---

### 弹药 5：英文出海高权重免费外链清单（主攻 `/en/tools/` 提权 DR 0 ➔ DR 25+）
英文站冲 Google 排名最看重 **Domain Rating (外链域名权重)**，以下平台全部免费提交且自带高权重外链：
1. **Hacker News (`Show HN`)**：美国东部时间周二~周四早上 8:30–10:00 提交 `https://news.ycombinator.com/submit`
   - **Title**: `Show HN: 32 client-side-only utilities in Astro & micro Rust Wasm (0 uploads, $0/mo)`
   - **URL**: `https://yunsin.top/en/tools/?source=hn`
2. **Reddit 精准子版块**（每次隔两天发一个最契合的子版块）：
   - `r/SideProject` / `r/webdev`（发全站架构与 JSON-to-Zod / Vue3 Visualizer / Video-to-GIF）
   - `r/personalfinance` / `r/financialindependence`（分享无追踪无邮箱索取的本地 FIRE & True APR Calculator）
3. **免费开发者与独立工具导航站（必投 10 个，攒首批 Dofollow 外链）**：
   - [AlternativeTo](https://alternativeto.net/)（把你的 `video-to-gif` 添加为 EZGIF 的免费无广告隐私替代品；把 `qrcode-studio` 添加为 QR Code Generator 的永久静态替代品！AlternativeTo 在 Google 权重极高！）
   - [Uneed.best](https://www.uneed.best/)（独立开发者工具榜）
   - [DevHunt.org](https://devhunt.org/)（开源与开发者工具专属 Product Hunt，提交 `polyglot-converter` / `llm-cost-calculator`）
   - [TinyLaunch](https://www.tinylaunch.com/) / [Microlaunch](https://microlaunch.net/)
   - [Product Hunt](https://www.producthunt.com/)（以 *"Yunsin Local Tools — 32+ Zero-Upload Browser Utilities Powered by Rust Wasm"* 免费发布，永久留存一条 `DR 91` 外链）
   - GitHub **Awesome Lists** 提 PR（100% 免费高相关性技术外链）：向 `awesome-wasm`、`awesome-astro`、`awesome-privacy` 或中文 `awesome-indie` 提一个精简规范的 PR 收录你的项目。

---

## 三、 预期见效时间表与日常巡检指标（实事求是预期管理）

| 时间窗口 | 关键里程碑动作 | 正常搜索引擎反馈节奏 |
| :--- | :--- | :--- |
| **第 1~3 天** | `git push` 上线本次代码 + 配好 DNSPod 分流 + 提交 GSC/Bing/百度 Sitemap | **Bing 最快**（通过 IndexNow 通常 24~72 小时开始抓入首批页面）；GSC 显示「站点地图成功读取（已发现 101 个网页）」 |
| **第 4~14 天** | 发出阮一峰周刊 Issue + V2EX + 掘金技术文 + 3~5 个海外导航站外链 | Google 开始将首页、博客与精编长尾专页（如 `exam-photo-20kb`、`webp-to-png`、`mp4-to-gif-wechat`）从「已发现」转为**「已编入索引」**；首批长尾词出现曝光（Impressions） |
| **第 3~6 周** | 每周在 GSC 查看「有曝光但排名在 8~20 名」的查询词，微调对应页面的 FAQ | 细分痛点词（如「报名照片压到20kb」「月费率0.6真实年化」「纯静态挪车二维码」）陆续进入 Bing / Google 前 5 名；百度度过新站考核期开始放量放出内页 |
| **第 2~3 个月** | 围绕 GSC 跑出来的黑马工具，在 `src/data/seoPresets.ts` 中继续扩充第 2 批精编场景 | 形成稳定的被动搜索复利曲线，达到万维广告 WWAds / EthicalAds 流量准入线 |
