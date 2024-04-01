import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro';
import mdx from '@astrojs/mdx';
import icon from "astro-icon";
import remarkMermaid from 'astro-diagram/remark-mermaid';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeToc from 'rehype-toc';
import { rehypeAccessibleEmojis } from 'rehype-accessible-emojis';
import sitemap from '@astrojs/sitemap';
// 数学公式支持
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// 搜索插件
import pagefind from "astro-pagefind";

// https://astro.build/config
export default defineConfig({
	site: 'https://iamyunsin.github.io',
	integrations: [
		UnoCSS({
			injectReset: true,
		}),
		mdx(),
		sitemap(),
    icon(),
    pagefind(),
	],
  markdown: {
    remarkPlugins: [
      remarkMermaid,
      remarkMath,
    ],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append' }],
      [rehypeToc, { headings: ['h1', 'h2', 'h3'] }],
      rehypeAccessibleEmojis,
      rehypeKatex,
    ],
    gfm: true,
  },
});
