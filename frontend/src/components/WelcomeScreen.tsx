import { motion } from 'framer-motion';
import { COLORS } from '../utils/constants';

interface WelcomeScreenProps {
  onStart: () => void;
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

const stats = [
  '19 Modules',
  '106 Tests',
  '4 Languages',
];

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: COLORS.cream }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${COLORS.creamLight} 0%, transparent 70%)`,
        }}
      />

      <motion.div
        className="relative z-10 text-center max-w-3xl mx-auto px-8 py-32"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.span className="section-label block" variants={fadeUp}>
          AEOS PROTOCOL
        </motion.span>

        <motion.h1
          className="heading-display mt-6"
          variants={fadeUp}
        >
          The Economic Operating System
        </motion.h1>

        <motion.p
          className="mt-1"
          style={{
            fontSize: '42px',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            color: COLORS.inkLight,
          }}
          variants={fadeUp}
        >
          for AI Agents
        </motion.p>

        <motion.p
          className="body-text mt-8 mx-auto max-w-xl"
          variants={fadeUp}
        >
          Identity. Contracts. Risk. Settlement. Consensus.
          Everything an autonomous AI agent needs to exist as an economic entity.
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-3 mt-6"
          variants={fadeUp}
        >
          {stats.map((stat, i) => (
            <span key={stat} className="flex items-center gap-3">
              <span
                className="section-label px-3 py-1 rounded-full"
                style={{ backgroundColor: COLORS.creamDark }}
              >
                {stat}
              </span>
              {i < stats.length - 1 && (
                <span style={{ color: COLORS.inkGhost }}>·</span>
              )}
            </span>
          ))}
        </motion.div>

        <motion.div className="mt-12" variants={fadeUp}>
          <button
            onClick={onStart}
            className="font-medium cursor-pointer transition-colors"
            style={{
              fontSize: '16px',
              color: COLORS.accent,
            }}
          >
            <span className="hover:underline underline-offset-4 decoration-1">
              Begin Simulation →
            </span>
          </button>
        </motion.div>

        <motion.p
          className="mt-4"
          style={{ fontSize: '12px', color: COLORS.inkFaint }}
          variants={fadeUp}
        >
          17 interactive scenes · approximately 4 minutes
        </motion.p>
      </motion.div>
    </div>
  );
}
