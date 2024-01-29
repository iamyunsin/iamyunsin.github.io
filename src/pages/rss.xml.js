import rss from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';
import { getCollection } from 'astro:content';
import MarkdownIt from 'markdown-it';
const parser = new MarkdownIt();
import { SITE_TITLE, SITE_DESCRIPTION } from '@/consts';

export async function GET(context) {
	const posts = (await Promise.all([getCollection('blog'), getCollection('life')])).flat().filter(({ data }) => data.draft !== true);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
      content: sanitizeHtml(parser.render(post.body)),
			link: `/${post.collection}/${post.slug}/`,
		})),
	});
}
