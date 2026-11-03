import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { AUTHOR, SITE, TOOLS, TOOL_CATEGORIES, getToolsByGroup } from '@/consts';
import { SEO_PRESET_SCENARIOS } from '@/data/seoPresets';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog')).filter((p) => !p.data.draft);

  const lines: string[] = [
    `# ${SITE.title} (${SITE.titleEn})`,
    '',
    `> ${SITE.description}`,
    `> ${SITE.descriptionEn}`,
    '',
    `- Website: ${SITE.domain}`,
    `- Chinese Tools Directory: ${SITE.domain}/tools/`,
    `- English Tools Directory: ${SITE.domain}/en/tools/`,
    `- Full AI Reference Catalog: ${SITE.domain}/llms-full.txt`,
    `- Sitemap: ${SITE.domain}/sitemap-index.xml`,
    `- Core Architecture: 100% Client-Side Browser Execution (Astro 5 + Vue 3 + WebCodecs + Rust WebAssembly). Zero server file uploads, zero watermarks, no registration required, permanently free.`,
    `- Author: ${AUTHOR.name} (${AUTHOR.github})`,
    '',
    '## High-Intent Pre-Configured Quick Tools (热门细分场景直达)',
    '',
  ];

  for (const sc of SEO_PRESET_SCENARIOS) {
    lines.push(
      `- [${sc.titleZh}](${SITE.domain}/tools/${sc.slug}/): ${sc.descriptionZh}`,
      `- [${sc.titleEn}](${SITE.domain}/en/tools/${sc.slug}/): ${sc.descriptionEn}`
    );
  }

  for (const cat of TOOL_CATEGORIES) {
    const groupTools = getToolsByGroup(cat.id);
    lines.push('', `## ${cat.title} / ${cat.titleEn}`, '');
    for (const tool of groupTools) {
      lines.push(
        `- [${tool.title}](${SITE.domain}${tool.pathZh}): ${tool.description}`,
        `- [${tool.titleEn}](${SITE.domain}${tool.pathEn}): ${tool.descriptionEn}`
      );
    }
  }

  lines.push('', '## Engineering Deep-Dive Articles (前端与底层架构技术博客)', '');
  for (const post of posts) {
    lines.push(
      `- [${post.data.title}](${SITE.domain}/blog/${post.slug}/): ${post.data.description}`
    );
  }

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
