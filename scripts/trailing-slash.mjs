// GitHub Pages serves every page at /page/ and 301-redirects /page to it. This build step makes the whole site say the same thing:
// internal links, canonical, og:url and schema URLs all get the trailing slash, so Google sees one address per page (no "Page with redirect").
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://the615agent.com';
// path: starts with /, no dot in the last segment (files like .pdf/.xml/.jpg stay as they are), no trailing slash; keeps ?query and #hash
const fix = (p) => p.replace(/^(\/[A-Za-z0-9_\-\/]*[A-Za-z0-9_\-])(?=$|[?#])/, '$1/');

export function addTrailingSlashes(html) {
  return html
    .replace(/(\bhref=")(\/(?!\/)[^"]*)"/g, (m, a, p) => `${a}${fix(p)}"`)
    .replace(new RegExp(`(["'(])${ORIGIN.replace(/[.]/g, '\\.')}(\\/[A-Za-z0-9_\\-\\/]*[A-Za-z0-9_\\-])(?=["')?#])`, 'g'), (m, q, p) => `${q}${ORIGIN}${p}/`);
}

export default function trailingSlash() {
  return {
    name: 'trailing-slash',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const walk = (d) => { for (const f of readdirSync(d)) { const full = join(d, f); if (statSync(full).isDirectory()) walk(full); else if (f.endsWith('.html')) { const src = readFileSync(full, 'utf8'); const out = addTrailingSlashes(src); if (out !== src) writeFileSync(full, out); } } };
        walk(fileURLToPath(dir));
      },
    },
  };
}
