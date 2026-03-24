import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { COLORS } from '../../utils/constants';
import { truncateDID } from '../../utils/animations';

interface AgentAvatarProps {
  name: string;
  did: string;
  type?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
  className?: string;
}

const SIZES = {
  sm: { circle: 44, icon: 16, nameSize: '13px', didSize: '11px' },
  md: { circle: 64, icon: 22, nameSize: '15px', didSize: '12px' },
  lg: { circle: 88, icon: 30, nameSize: '17px', didSize: '12px' },
} as const;

export default function AgentAvatar({
  name,
  did,
  color = COLORS.accent,
  size = 'md',
  isActive = false,
  className = '',
}: AgentAvatarProps) {
  const s = SIZES[size];

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div
        className="rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          width: s.circle,
          height: s.circle,
          border: `1px solid ${isActive ? color : COLORS.rule}`,
          boxShadow: isActive
            ? `0 2px 12px ${color}18`
            : 'none',
          backgroundColor: COLORS.card,
        }}
      >
        <Bot
          size={s.icon}
          style={{ color: isActive ? color : COLORS.inkFaint }}
          strokeWidth={1.5}
        />
      </div>

      <div className="text-center">
        <p
          className="font-medium leading-tight"
          style={{
            fontSize: s.nameSize,
            letterSpacing: '-0.01em',
            color: COLORS.ink,
          }}
        >
          {name}
        </p>
        <p
          className="font-mono mt-0.5"
          style={{
            fontSize: s.didSize,
            letterSpacing: '0.02em',
            color: COLORS.bronze,
          }}
        >
          {truncateDID(did)}
        </p>
      </div>
    </motion.div>
  );
}
