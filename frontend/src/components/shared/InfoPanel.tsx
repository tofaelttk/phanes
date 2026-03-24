import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { COLORS } from '../../utils/constants';

interface InfoPanelItem {
  label: string;
  value: string;
  color?: string;
}

interface InfoPanelProps {
  title: string;
  items: InfoPanelItem[];
  icon: LucideIcon;
  className?: string;
  accentColor?: string;
}

export default function InfoPanel({
  title,
  items,
  icon: Icon,
  className = '',
  accentColor = COLORS.bronze,
}: InfoPanelProps) {
  return (
    <motion.div
      className={`card-elevated p-6 ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} style={{ color: COLORS.inkFaint }} strokeWidth={1.5} />
        <h3 className="heading-card">{title}</h3>
      </div>

      <div
        className="my-4 h-px"
        style={{ backgroundColor: COLORS.ruleLight }}
      />

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className="flex justify-between items-baseline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
          >
            <span className="body-small">{item.label}</span>
            <span
              className="mono-hash"
              style={{ color: item.color || accentColor }}
            >
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
