/**
 * Loads markdown from sibling ../docs-portal at build time (Vite glob).
 */

/**
 * Path is relative to THIS file: src/lib → ../../../docs-portal = repo docs-portal/
 * (../../docs-portal wrongly pointed at docs-site/docs-portal and loaded nothing.)
 */
const rawModules = import.meta.glob<string>('../../../docs-portal/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function normalizeSlug(filePath: string): string {
  const marker = '/docs-portal/';
  const i = filePath.indexOf(marker);
  const rel = i >= 0 ? filePath.slice(i + marker.length) : filePath.replace(/^.*docs-portal\//, '');
  return rel.replace(/\.md$/i, '');
}

const bySlug: Record<string, string> = {};
for (const [path, content] of Object.entries(rawModules)) {
  bySlug[normalizeSlug(path)] = content;
}

export function getDocContent(slug: string): string | null {
  return bySlug[slug] ?? null;
}

export function getDocSlugs(): string[] {
  return Object.keys(bySlug).sort();
}

export function extractTitle(md: string): string {
  const line = md.split('\n').find((l) => l.startsWith('# '));
  if (line) return line.replace(/^#\s+/, '').trim();
  return 'Untitled';
}

export function stripFirstHeading(md: string): string {
  const lines = md.split('\n');
  if (lines[0]?.startsWith('# ')) return lines.slice(1).join('\n').replace(/^\n+/, '');
  return md;
}
