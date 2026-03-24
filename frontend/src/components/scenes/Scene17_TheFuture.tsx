import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Code2,
  Globe2,
  Share2,
} from 'lucide-react';

const C = {
  cream: '#F5F0E8',
  creamLight: '#FAF7F1',
  card: '#FFFFFF',
  ink: '#1A1714',
  inkLight: '#3D3831',
  muted: '#6B6560',
  faint: '#9C968F',
  rule: '#E8E2D9',
  bronze: '#B8956A',
  sage: '#7D8B6A',
  gold: '#C4A872',
} as const;

const STEP_MS = 5000;

interface Scene17Props {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const introContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.06,
    },
  },
};

const introItem = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.58,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

const roadmap = [
  {
    icon: Code2,
    title: 'Phase 1: Open Source SDK',
    desc: 'pip install phanes · npm install @phanes/sdk',
  },
  {
    icon: Globe2,
    title: 'Phase 2: Distributed Deployment',
    desc: 'Multi-region BFT, hosted API',
  },
  {
    icon: Share2,
    title: 'Phase 3: Network Effects',
    desc: 'Reputation carries weight, insurance pools deepen',
  },
] as const;

function AmbientWash() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute -left-1/4 -top-1/4 h-[70%] w-[70%] rounded-full opacity-[0.07]"
        style={{
          background: `radial-gradient(circle at center, ${C.bronze} 0%, transparent 68%)`,
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] rounded-full opacity-[0.05]"
        style={{
          background: `radial-gradient(circle at center, ${C.sage} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-[0.35]"
        style={{
          background: `radial-gradient(ellipse at center, ${C.creamLight} 0%, ${C.cream} 55%, ${C.cream} 100%)`,
        }}
      />
    </div>
  );
}

function FloatingOrbs() {
  const orbs = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 7) % 100}%`,
        size: 3 + (i % 4),
        delay: (i * 0.35) % 5,
        duration: 10 + (i % 5),
      })),
    [],
  );

  const fine = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: `f-${i}`,
        idx: i,
        left: `${(i * 23 + 3) % 100}%`,
        size: 2 + (i % 3),
        delay: (i * 0.5) % 6,
        duration: 14 + (i % 6),
      })),
    [],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {orbs.map((o) => (
        <motion.div
          key={o.id}
          className="absolute rounded-full"
          style={{
            left: o.left,
            bottom: '-4%',
            width: o.size,
            height: o.size,
            backgroundColor: C.gold,
            opacity: 0.12,
            filter: 'blur(0.5px)',
          }}
          animate={{
            y: [0, -520],
            opacity: [0.06, 0.14, 0.06],
            x: [0, (o.id % 2 === 0 ? 1 : -1) * 12],
          }}
          transition={{
            duration: o.duration,
            delay: o.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
      {fine.map((o) => (
        <motion.div
          key={o.id}
          className="absolute rounded-full"
          style={{
            left: o.left,
            bottom: '-2%',
            width: o.size,
            height: o.size,
            backgroundColor: C.bronze,
            opacity: 0.08,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -480],
            opacity: [0.04, 0.1, 0.04],
            x: [0, (o.idx % 2 === 0 ? 1 : -1) * 8],
          }}
          transition={{
            duration: o.duration,
            delay: o.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

export default function Scene17_TheFuture({
  step,
  currentStep,
  onStepComplete,
}: Scene17Props) {
  const displayStep = Math.min(Math.min(step, currentStep), 2);

  useEffect(() => {
    const s = Math.min(step, currentStep);
    if (s > 2) return;
    const id = window.setTimeout(() => {
      onStepComplete();
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [step, currentStep, onStepComplete]);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-16"
      style={{ backgroundColor: C.cream, color: C.ink }}
    >
      <AmbientWash />
      <AnimatePresence mode="wait">
        {displayStep === 0 && (
          <motion.section
            key="intro"
            className="relative z-10 mx-auto max-w-xl text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
          >
            <motion.div
              variants={introContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.p
                className="mb-4 font-medium uppercase tracking-[0.22em]"
                style={{ fontSize: 11, color: C.faint }}
                variants={introItem}
              >
                THE FUTURE
              </motion.p>
              <motion.h2
                className="leading-tight"
                style={{ fontSize: 28, fontWeight: 600, color: C.ink }}
                variants={introItem}
              >
                The agent economy is being built right now.
              </motion.h2>
              <motion.p
                className="mx-auto mt-5 max-w-lg leading-relaxed"
                style={{ fontSize: 16, color: C.inkLight }}
                variants={introItem}
              >
                The companies building payment rails are solving 5% of the
                problem. AEOS solves the other 95%.
              </motion.p>
            </motion.div>
          </motion.section>
        )}

        {displayStep === 1 && (
          <motion.section
            key="roadmap"
            className="relative z-10 mx-auto w-full max-w-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
          >
            <motion.p
              className="mb-6 text-center font-medium uppercase tracking-[0.2em]"
              style={{ fontSize: 11, color: C.faint }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              Roadmap
            </motion.p>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
              {roadmap.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    className="flex flex-col rounded-xl border p-5 shadow-sm"
                    style={{
                      backgroundColor: C.card,
                      borderColor: C.rule,
                    }}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.12 + i * 0.14,
                      duration: 0.5,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    <div
                      className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${C.bronze}18`,
                        color: C.bronze,
                      }}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </div>
                    <h3
                      className="text-[15px] font-semibold leading-snug"
                      style={{ color: C.ink }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="mt-2 text-[13px] leading-relaxed"
                      style={{ color: C.muted }}
                    >
                      {item.desc}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </motion.section>
        )}

        {displayStep === 2 && (
          <motion.section
            key="outro"
            className="relative z-10 mx-auto flex max-w-lg flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <FloatingOrbs />

            <motion.span
              className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: `${C.bronze}14`,
                borderColor: `${C.bronze}55`,
                color: C.bronze,
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
            >
              AEOS Protocol v1.0
            </motion.span>

            <motion.a
              href="https://phanes.app"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 text-lg font-semibold underline-offset-4 transition-opacity hover:opacity-80"
              style={{ color: C.ink }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
            >
              phanes.app
            </motion.a>

            <motion.p
              className="mt-3 text-sm"
              style={{ color: C.sage }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.4 }}
            >
              Apache 2.0 License
            </motion.p>

            <motion.p
              className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[15px] font-medium"
              style={{ color: C.inkLight }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.45 }}
            >
              <span>Start building</span>
              <ArrowRight
                size={18}
                strokeWidth={2}
                style={{ color: C.bronze }}
              />
              <span style={{ color: C.muted }}>pip install phanes</span>
            </motion.p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
