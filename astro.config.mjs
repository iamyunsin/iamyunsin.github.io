import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro';
import mdx from '@astrojs/mdx';
import icon from "astro-icon";
// toc索引
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeToc from 'rehype-toc';
// emoji图标
import { rehypeAccessibleEmojis } from 'rehype-accessible-emojis';
// sitemap生成
import sitemap from '@astrojs/sitemap';
// 数学公式支持
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// 搜索插件
import pagefind from "astro-pagefind";

import vue from "@astrojs/vue";
import { remarkReadingTime } from './remark-reading-time.mjs';
import { rehypeShiki } from '@astrojs/markdown-remark'
import rehypeMermaid from 'rehype-mermaid';
import remarkMermaid from 'remark-mermaidjs'

import expressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
  site: 'https://iamyunsin.github.io',
  devToolbar: {
    enabled: false
  },
  integrations: [expressiveCode(), UnoCSS({
    injectReset: true
  }), mdx(), sitemap(), icon(), pagefind(), vue()],
  markdown: {
    remarkPlugins: [remarkReadingTime, remarkMath, remarkMermaid],
    rehypePlugins: [
      rehypeSlug, 
      rehypeShiki,
      [rehypeAutolinkHeadings, {
        behavior: 'append'
      }], 
      [rehypeToc, {
        headings: ['h1', 'h2', 'h3']
      }], 
      rehypeAccessibleEmojis, 
      rehypeKatex
    ],
    gfm: true
  }
});