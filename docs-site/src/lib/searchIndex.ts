import Fuse from 'fuse.js';
import { flattenNav } from '@/config/navigation';
import { extractTitle, getDocContent, stripFirstHeading } from '@/lib/content';

export type SearchDoc = {
  slug: string;
  title: string;
  section: string;
  body: string;
};

function sectionForSlug(slug: string): string {
  const part = slug.split('/')[0];
  const map: Record<string, string> = {
    architecture: 'Architecture',
    protocol: 'Protocol',
    cryptography: 'Proofs & keys',
    integration: 'Integration',
    'formal-verification': 'Formal verification',
    operations: 'Operations',
    reference: 'Reference',
    industrial: 'Roadmap',
    README: 'Start',
    overview: 'Start',
  };
  return map[part] ?? 'Docs';
}

export function buildSearchCorpus(): SearchDoc[] {
  const nav = flattenNav();
  const docs: SearchDoc[] = [];

  for (const item of nav) {
    const raw = getDocContent(item.slug);
    if (!raw) continue;
    const title = extractTitle(raw);
    const body = stripFirstHeading(raw).slice(0, 120_000);
    docs.push({
      slug: item.slug,
      title,
      section: sectionForSlug(item.slug),
      body,
    });
  }

  return docs;
}

export function createFuseIndex(docs: SearchDoc[]) {
  return new Fuse(docs, {
    keys: [
      { name: 'title', weight: 0.45 },
      { name: 'body', weight: 0.35 },
      { name: 'section', weight: 0.1 },
      { name: 'slug', weight: 0.1 },
    ],
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}
