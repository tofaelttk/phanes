import GithubSlugger from 'github-slugger';

export type TocHeading = {
  id: string;
  text: string;
  depth: 2 | 3 | 4 | 5 | 6;
};

/** Single heading id — matches `rehype-slug` / GitHub-style slugs for one string. */
export function slugify(text: string): string {
  return new GithubSlugger().slug(text);
}

/**
 * Extract every ATX heading (h2–h6) in document order, skipping fenced code blocks.
 * Slug sequence matches `rehype-slug` on the same markdown body (same github-slugger rules).
 */
export function extractToc(markdown: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const lines = markdown.split('\n');
  const out: TocHeading[] = [];
  let inFence = false;

  for (const line of lines) {
    const fence = /^(\s*)(`{3,}|~{3,})([^`~]*?)\s*$/.exec(line);
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{2,6})\s+(.+)$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 2 | 3 | 4 | 5 | 6;
    const text = m[2].replace(/\s+#+\s*$/, '').trim();
    if (!text) continue;
    const id = slugger.slug(text);
    out.push({ id, text, depth: level });
  }

  return out;
}
