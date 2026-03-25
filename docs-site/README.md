# Phanes technical docs site

Production-grade documentation UI for `docs-portal/` markdown: command palette (⌘K), fuzzy search, Shiki highlighting, Mermaid diagrams, animated protocol visualizations, responsive sidebar, and reading progress.

## Develop

```bash
cd docs-site
npm install
npm run dev
```

Open [http://localhost:5190](http://localhost:5190).

## Build

```bash
npm run build
npm run preview
```

Content is loaded at build time from `../../../docs-portal/**/*.md` (relative to `src/lib/content.ts`) so files resolve to the repo’s `docs-portal/` folder — **not** `docs-site/docs-portal`.

## Stack

- Vite 8 · React 19 · TypeScript · Tailwind CSS 4  
- react-markdown + remark-gfm + rehype-slug  
- shiki (syntax) · mermaid (diagrams)  
- fuse.js (search) · cmdk (command palette) · framer-motion  
