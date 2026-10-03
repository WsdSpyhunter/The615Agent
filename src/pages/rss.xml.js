import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../site.config';

export async function GET(context) {
  const posts = (await getCollection('posts', (p) => !p.data.draft)).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return rss({
    title: `${site.name} Blog`,
    description: 'Guides and market updates for buyers, sellers, relocators and investors in Williamson County and Middle Tennessee.',
    site: context.site,
    items: posts.map((p) => ({ title: p.data.title, description: p.data.description, pubDate: p.data.pubDate, link: `/blog/${p.id}/`, categories: [p.data.category] })),
  });
}
