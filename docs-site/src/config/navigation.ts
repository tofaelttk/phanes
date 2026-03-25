/**
 * Sidebar — mirrors docs-portal structure.
 */

export type NavItem = {
  title: string;
  slug: string;
  description?: string;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'start',
    label: 'Start',
    items: [
      { title: 'Documentation map', slug: 'README', description: 'Conventions & index' },
      { title: 'Overview', slug: 'overview', description: 'Scope & design principles' },
    ],
  },
  {
    id: 'architecture',
    label: 'Architecture',
    items: [
      { title: 'Layered stack', slug: 'architecture/layered-stack' },
      { title: 'Data flows & invariants', slug: 'architecture/data-flows-and-invariants' },
    ],
  },
  {
    id: 'protocol',
    label: 'Protocol',
    items: [
      { title: 'Module matrix', slug: 'protocol/module-matrix' },
      { title: 'Identity', slug: 'protocol/identity' },
      { title: 'Contracts & escrow', slug: 'protocol/contracts-escrow' },
      { title: 'Disputes', slug: 'protocol/disputes' },
      { title: 'Risk, ML & graph', slug: 'protocol/risk-ml-graph' },
      { title: 'Tokenization & channels', slug: 'protocol/tokenization-state-channels' },
      { title: 'Consensus & ledger', slug: 'protocol/consensus-ledger' },
      { title: 'Settlement', slug: 'protocol/settlement' },
      { title: 'Persistence', slug: 'protocol/persistence' },
    ],
  },
  {
    id: 'proofs',
    label: 'Proofs & keys',
    items: [{ title: 'Primitives & range proofs', slug: 'cryptography/primitives-proofs-threshold' }],
  },
  {
    id: 'integration',
    label: 'Integration',
    items: [
      { title: 'REST API', slug: 'integration/rest-api' },
      { title: 'MCP server', slug: 'integration/mcp-server' },
      { title: 'TypeScript SDK', slug: 'integration/typescript-sdk' },
    ],
  },
  {
    id: 'formal',
    label: 'Formal verification',
    items: [{ title: 'TLA+ specifications', slug: 'formal-verification/tla-plus-specs' }],
  },
  {
    id: 'ops',
    label: 'Operations',
    items: [{ title: 'Deployment', slug: 'operations/deployment-docker-fly' }],
  },
  {
    id: 'reference',
    label: 'Reference',
    items: [
      { title: 'Glossary', slug: 'reference/glossary' },
      { title: 'Repository source map', slug: 'reference/repository-source-map' },
    ],
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    items: [
      { title: 'Compliance & controls', slug: 'industrial/compliance-controls-roadmap' },
      { title: 'SLOs & incident response', slug: 'industrial/slos-incident-response-roadmap' },
      { title: 'Supply chain & provenance', slug: 'industrial/supply-chain-provenance-roadmap' },
    ],
  },
];

export function findNavItemBySlug(slug: string): NavItem | undefined {
  for (const sec of NAV_SECTIONS) {
    const hit = sec.items.find((i) => i.slug === slug);
    if (hit) return hit;
  }
  return undefined;
}

export function flattenNav(): NavItem[] {
  return NAV_SECTIONS.flatMap((s) => s.items);
}

export function getSectionBySlug(slug: string): NavSection | undefined {
  for (const sec of NAV_SECTIONS) {
    if (sec.items.some((i) => i.slug === slug)) return sec;
  }
  return undefined;
}
