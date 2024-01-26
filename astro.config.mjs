import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro';
import mdx from '@astrojs/mdx';
import remarkMermaid from 'astro-diagram/remark-mermaid';

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
      remarkMermaid
    ],
  },
});
