import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const LANGS: string[] = [
  'python',
  'typescript',
  'tsx',
  'javascript',
  'bash',
  'shell',
  'json',
  'rust',
  'toml',
  'yaml',
  'markdown',
  'http',
  'sql',
  'xml',
  'html',
  'css',
  'diff',
  'plaintext',
];

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['solarized-light', 'dark-plus'],
      langs: LANGS,
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: string,
  colorMode: 'light' | 'dark' = 'light'
): Promise<string> {
  const h = await getHighlighter();
  const normalized = lang === 'text' || lang === '' ? 'plaintext' : lang;
  const l = h.getLoadedLanguages().includes(normalized) ? normalized : 'plaintext';
  const theme = colorMode === 'dark' ? 'dark-plus' : 'solarized-light';
  return h.codeToHtml(code.trimEnd(), {
    lang: l,
    theme,
  });
}
