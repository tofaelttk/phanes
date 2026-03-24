import { COLORS } from '../../utils/constants';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: `${COLORS.sage}1A`, text: '#5A6B48' },
  warning: { bg: '#D4A84018', text: '#8B7035' },
  danger: { bg: `${COLORS.rose}1A`, text: '#8B3A3A' },
  info: { bg: `${COLORS.accent}1A`, text: COLORS.bronze },
  neutral: { bg: COLORS.creamDark, text: COLORS.inkFaint },
};

export default function StatusBadge({
  status,
  variant = 'neutral',
  size = 'sm',
}: StatusBadgeProps) {
  const style = VARIANT_STYLES[variant];
  const padding = size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        fontSize: '12px',
      }}
    >
      {status}
    </span>
  );
}
