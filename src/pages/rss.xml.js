import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '@/consts';

export async function GET(context) {
	const posts = (await Promise.all([getCollection('blog'), getCollection('life')])).flat().filter(({ data }) => data.draft !== true);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/${post.collection}/${post.slug}/`,
		})),
	});
}
