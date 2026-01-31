# Copilot Instructions

> 目的：帮助 AI 在本项目中更准确地编写/修改代码与内容。

## 项目概览
- 技术栈：Astro + TypeScript + UnoCSS + Less。
- 内容来源：`src/content/`（Markdown/MDX，基于 Astro Content Collections）。
- 组件目录：`src/components/`（`.astro` 组件）。
- 页面目录：`src/pages/`（`.astro` 页面与路由）。
- 布局目录：`src/layouts/`（`.astro` 布局）。
- 公共静态资源：`public/`。

## 运行与依赖
- 包管理：`pnpm`。
- 常用命令（不要在回复中输出命令块，除非用户明确要求）：
  - `pnpm install`
  - `pnpm dev`
  - `pnpm build`

## 代码风格与约定
- 语言：中文注释优先，变量/函数名用英文。
- 保持现有代码风格，不做无关的格式化。
- 组件与页面使用 `.astro`；仅在需要交互时使用框架或客户端脚本。
- 样式：优先使用现有 `less`、`uno.config.ts` 与全局样式体系。

## 内容与目录约定
- 博客内容位于 `src/content/blog/`，分类目录需保持：
  - `front-tools/`、`knowledge/`、`vue/`、`vue3/`、`blockchain/`、`cocos-creator/`、`hybrid/` 等。
- 文章文件扩展名：`.md` 或 `.mdx`。
- 新增文章时：
  - 保持 frontmatter 字段与当前集合定义一致（参考 `src/content/config.ts`）。
  - 复用现有目录结构，不随意新建顶层目录。

## 修改指引（优先级）
1. **小改动优先**：只改必要文件，不改无关文件。
2. **先查再改**：需要理解现有结构时，先查看相关文件（如布局、组件、content 配置）。
3. **避免破坏路由**：不要随意更改 `src/pages/` 的文件名/路径。
4. **保持兼容**：新增组件时优先放在 `src/components/`，并复用现有组件能力。

## 常见任务提示
- **新增文章**：在 `src/content/blog/<category>/` 添加 `.md/.mdx`，并遵循现有 frontmatter。
- **新增页面**：在 `src/pages/` 添加 `.astro`，必要时使用 `src/layouts/BlogPost.astro`。
- **改样式**：优先改 `src/styles/` 下的 `less` 文件，或使用 UnoCSS 既有配置。
- **改组件**：修改 `src/components/` 内对应组件；注意与页面引用保持一致。

## 注意事项
- 不要自动生成大量无关内容。
- 不要删除现有文章或页面。
- 需要改动多个文件时，先总结计划再执行。
- 如果不确定，请先提出简短澄清问题。
