import { useState } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../utils/constants';

interface WelcomeScreenProps {
  onStart: () => void;
}

const SPRING_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const stats = [
  { label: '19 Modules' },
  { label: '106 Tests' },
  { label: '4 Languages' },
];

function entry(delay: number) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: SPRING_EASE },
  };
}

function DecorativeArc() {
  return (
    <motion.svg
      width="200"
      height="24"
      viewBox="0 0 200 24"
      fill="none"
      className="mx-auto"
      initial={{ opacity: 0, pathLength: 0 }}
      animate={{ opacity: 1, pathLength: 1 }}
      transition={{ duration: 1.2, delay: 1.8, ease: SPRING_EASE }}
    >
      <motion.path
        d="M 10 18 Q 60 2, 100 12 Q 140 22, 190 6"
        stroke={COLORS.inkGhost}
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, delay: 1.8, ease: SPRING_EASE }}
      />
    </motion.svg>
  );
}

function StartButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-none outline-none"
      style={{ fontSize: '16px', fontWeight: 500, color: COLORS.accent }}
      {...entry(4.0)}
    >
      <span className="relative">
        Begin Simulation
        <motion.span
          className="absolute left-0 bottom-0 h-px block"
          style={{ backgroundColor: COLORS.accent }}
          initial={{ width: 0 }}
          animate={{ width: hovered ? '100%' : 0 }}
          transition={{ duration: 0.3, ease: SPRING_EASE }}
        />
      </span>
      <motion.span
        className="inline-block"
        animate={{ x: hovered ? 4 : 0 }}
        transition={{ duration: 0.3, ease: SPRING_EASE }}
      >
        →
      </motion.span>
    </motion.button>
  );
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden scene-bg">
      {/* Ambient warm gradient pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.3, 0.6, 0.3] }}
        transition={{ duration: 8, delay: 0.3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 50% 45%, ${COLORS.creamLight} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 40% 40% at 30% 60%, ${COLORS.accent}08 0%, transparent 60%)`,
          }}
        />
      </motion.div>

      <div className="relative z-10 text-center max-w-2xl mx-auto px-8">
        {/* Section label */}
        <motion.span
          className="section-label block"
          {...entry(0.6)}
        >
          AEOS PROTOCOL
        </motion.span>

        {/* Main heading */}
        <motion.h1
          className="heading-display mt-6"
          {...entry(1.0)}
        >
          The Economic Operating System
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-1"
          style={{
            fontSize: '44px',
            fontWeight: 400,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: COLORS.inkLight,
          }}
          {...entry(1.4)}
        >
          for AI Agents
        </motion.p>

        {/* Decorative arc */}
        <motion.div className="mt-8" {...entry(1.8)}>
          <DecorativeArc />
        </motion.div>

        {/* Horizontal rule */}
        <motion.div className="flex justify-center mt-8" {...entry(2.0)}>
          <motion.div
            style={{
              width: 40,
              height: 1,
              backgroundColor: COLORS.accent,
            }}
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="body-text mt-8 mx-auto"
          style={{ maxWidth: 440 }}
          {...entry(2.4)}
        >
          Identity. Contracts. Risk. Settlement. Consensus.
        </motion.p>

        {/* Sub-tagline */}
        <motion.p
          className="body-small mt-3 mx-auto"
          style={{ maxWidth: 420, color: COLORS.inkMuted }}
          {...entry(2.8)}
        >
          Everything an autonomous AI agent needs to exist as an economic entity.
        </motion.p>

        {/* Stats pills */}
        <motion.div
          className="flex items-center justify-center gap-2 mt-10"
          {...entry(3.4)}
        >
          {stats.map((stat, i) => (
            <span key={stat.label} className="flex items-center gap-2">
              <span
                className="section-label card-elevated px-3 py-1.5 rounded-md"
                style={{ display: 'inline-block' }}
              >
                {stat.label}
              </span>
              {i < stats.length - 1 && (
                <span style={{ color: COLORS.inkGhost, fontSize: 18 }}>·</span>
              )}
            </span>
          ))}
        </motion.div>

        {/* Start button */}
        <div className="mt-12">
          <StartButton onClick={onStart} />
        </div>

        {/* Duration note */}
        <motion.p
          className="mt-5"
          style={{ fontSize: '12px', color: COLORS.inkFaint }}
          {...entry(4.4)}
        >
          18 interactive scenes · approximately 5 minutes
        </motion.p>
      </div>
    </div>
  );
}
