import { Link2 } from 'lucide-react';
import { useCopySectionUrl } from './CopyUrlProvider';

const base =
  'doc-heading-permalink shrink-0 p-0 m-0 rounded-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] no-underline font-normal leading-none';

type Props = {
  id: string;
  iconSize?: number;
  className?: string;
};

export function SectionPermalink({ id, iconSize = 15, className }: Props) {
  const copy = useCopySectionUrl();
  return (
    <a
      href={`#${id}`}
      className={className ? `${base} ${className}` : base}
      onClick={(e) => {
        e.preventDefault();
        copy(id);
      }}
      aria-label="Copy link to this section"
    >
      <Link2 size={iconSize} strokeWidth={2} aria-hidden />
    </a>
  );
}
