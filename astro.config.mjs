import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro';
import mdx from '@astrojs/mdx';
import remarkMermaid from 'astro-diagram/remark-mermaid';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkheadings from 'rehype-autolink-headings'
import rehypeToc from 'rehype-toc';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://iamyunsin.github.io',
	integrations: [
		UnoCSS({
			injectReset: true,
		}),
		mdx(),
		sitemap(),
	],
  markdown: {
    remarkPlugins: [
      remarkMermaid,
    ],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkheadings, { behavior: 'append' }],
      [rehypeToc, { headings: ['h1', 'h2', 'h3'] }],
    ],
  },
});
