import { NAV_SECTIONS } from '@/config/navigation';

export type DocBreadcrumb = {
  section: string;
  page: string;
  sectionId: string;
};

export function getDocBreadcrumb(slug: string): DocBreadcrumb | null {
  for (const sec of NAV_SECTIONS) {
    const item = sec.items.find((i) => i.slug === slug);
    if (item) {
      return { section: sec.label, page: item.title, sectionId: sec.id };
    }
  }
  return null;
}
