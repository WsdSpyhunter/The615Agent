// Every live guide page key for every enabled city: ['franklin__index', 'franklin__housing-market', ...]
import { enabledCities } from '../../src/data/guide-cities.ts';
import { pagesFor } from '../../src/data/guide-pages.ts';
export const listAllPages = () => enabledCities.flatMap((c) => [`${c.slug}__index`, ...pagesFor(c.slug).map((p) => `${c.slug}__${p.slug}`)]);
