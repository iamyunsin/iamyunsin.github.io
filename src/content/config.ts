import { defineCollection, z } from 'astro:content';

const articleCollection = defineCollection({
	type: 'content',
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
		// Transform string to Date object
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
	}),
});

export const collections = { blog: articleCollection, life: articleCollection };
