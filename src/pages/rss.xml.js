import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
// import MarkdownIt from 'markdown-it';
// const parser = new MarkdownIt();
import { SITE } from '@/consts.ts';

export async function GET(context) {
	const posts = (await Promise.all([getCollection('blog'), getCollection('life')])).flat().filter(({ data }) => data.draft !== true);
	return rss({
		title: SITE.title,
		description: SITE.description,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
      // content: sanitizeHtml(parser.render(post.body)),
			link: `/${post.collection}/${post.slug}/`,
		})),
	});
}
