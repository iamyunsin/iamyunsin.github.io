import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro';
import unoConfig from './uno.config.ts';
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
  site: 'https://yunsin.top',
  devToolbar: {
    enabled: false
  },
  integrations: [
    expressiveCode(),
    UnoCSS({
      ...unoConfig,
      configFile: false,
      injectReset: true,
    }),
    mdx(),
    sitemap({
      lastmod: new Date(),
      serialize(item) {
        const urlObj = new URL(item.url);
        const path = urlObj.pathname;
        item.lastmod = new Date().toISOString();

        if (path === '/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (path === '/tools/' || path === '/en/tools/') {
          item.priority = 0.95;
          item.changefreq = 'weekly';
        } else if (path.startsWith('/tools/') || path.startsWith('/en/tools/')) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else if (path.startsWith('/blog/')) {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        }

        // 仅对真实存在中英双语镜像的 /tools/* 与 /en/tools/* 注入双向 hreflang 链接，避免死链
        if (path.startsWith('/tools/')) {
          const zhUrl = new URL(path, 'https://yunsin.top').href;
          const enUrl = new URL(`/en${path}`, 'https://yunsin.top').href;
          item.links = [
            { lang: 'zh-CN', url: zhUrl },
            { lang: 'en', url: enUrl },
            { lang: 'x-default', url: enUrl },
          ];
        } else if (path.startsWith('/en/tools/')) {
          const zhPath = path.replace(/^\/en/, '');
          const zhUrl = new URL(zhPath, 'https://yunsin.top').href;
          const enUrl = new URL(path, 'https://yunsin.top').href;
          item.links = [
            { lang: 'zh-CN', url: zhUrl },
            { lang: 'en', url: enUrl },
            { lang: 'x-default', url: enUrl },
          ];
        }

        return item;
      },
    }),
    icon(),
    pagefind(),
    vue(),
  ],
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