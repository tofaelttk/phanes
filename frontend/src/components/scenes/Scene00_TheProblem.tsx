import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Fingerprint,
  FileSignature,
  Scale,
  Shield,
  Building2,
  Users,
  GitBranch,
  Lock,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import { COLORS } from '../../utils/constants';

interface SceneProps {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const STEP_TIMINGS = [4000, 5000, 5000, 4000];

const EASE_OUT: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type LIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface ComparisonRow {
  label: string;
  humanLabel: string;
  humanIcon: LIcon;
  aiLabel: string;
  aeosLabel: string;
  aeosIcon: LIcon;
  aeosColor: string;
}

const ROWS: ComparisonRow[] = [
  {
    label: 'Identity',
    humanLabel: 'Passport & SSN',
    humanIcon: Fingerprint,
    aiLabel: 'Nothing',
    aeosLabel: 'DID Identity',
    aeosIcon: Fingerprint,
    aeosColor: COLORS.sage,
  },
  {
    label: 'Contracts',
    humanLabel: 'Legal System',
    humanIcon: FileSignature,
    aiLabel: 'Nothing',
    aeosLabel: 'Smart Contracts',
    aeosIcon: FileSignature,
    aeosColor: COLORS.accent,
  },
  {
    label: 'Disputes',
    humanLabel: 'Courts & Lawyers',
    humanIcon: Scale,
    aiLabel: 'Nothing',
    aeosLabel: 'Auto-Arbitration',
    aeosIcon: Scale,
    aeosColor: COLORS.terra,
  },
  {
    label: 'Risk',
    humanLabel: 'Insurance & Credit',
    humanIcon: Shield,
    aiLabel: 'Nothing',
    aeosLabel: 'Risk Engine',
    aeosIcon: Shield,
    aeosColor: COLORS.gold,
  },
  {
    label: 'Accountability',
    humanLabel: 'Laws & Regulation',
    humanIcon: Building2,
    aiLabel: 'Nothing',
    aeosLabel: 'Delegation Chains',
    aeosIcon: GitBranch,
    aeosColor: COLORS.bronze,
  },
  {
    label: 'Delegation',
    humanLabel: 'Power of Attorney',
    humanIcon: Users,
    aiLabel: 'Nothing',
    aeosLabel: 'Authority Bounds',
    aeosIcon: Lock,
    aeosColor: COLORS.rose,
  },
];

const COMPANIES = [
  { name: 'Stripe', w: 52 },
  { name: 'Visa', w: 40 },
  { name: 'Mastercard', w: 80 },
  { name: 'Google', w: 56 },
  { name: 'Coinbase', w: 66 },
];

const MISSING_GAPS = [
  'Identity', 'Contracts', 'Disputes', 'Risk', 'Delegation',
  'Escrow', 'Tokens', 'Consensus', 'Settlement', 'ML Detection',
];

const STAT_ITEMS = [
  { value: 19, suffix: '', label: 'Modules' },
  { value: 106, suffix: '', label: 'Tests' },
  { value: 4, suffix: '', label: 'Languages' },
  { value: 9000, suffix: '+', label: 'Lines' },
];

function AnimatedCounter({
  target,
  duration = 2,
  suffix = '',
}: {
  target: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function PaymentBarVisualization({ visible }: { visible: boolean }) {
  let badgeX = 0;
  const badges = COMPANIES.map((c) => {
    const x = badgeX;
    badgeX += c.w + 12;
    return { ...c, x };
  });

  return (
    <div className="mt-10 w-full">
      <svg
        viewBox="0 0 680 170"
        className="w-full"
        style={{ maxWidth: 680 }}
      >
        <defs>
          <linearGradient id="s0-bronze" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.accent} />
            <stop offset="100%" stopColor={COLORS.gold} />
          </linearGradient>
          <linearGradient id="s0-shimmer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="s0-barShadow">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="6"
              floodColor="rgba(184,149,106,0.18)"
            />
          </filter>
          <clipPath id="s0-barClip">
            <rect x={0} y={48} width={36} height={56} rx={10} />
          </clipPath>
        </defs>

        {/* Company badges */}
        {badges.map((c, i) => (
          <motion.g
            key={c.name}
            initial={{ opacity: 0, y: 8 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 + i * 0.12, duration: 0.4, ease: EASE_OUT }}
          >
            <rect
              x={c.x}
              y={0}
              width={c.w}
              height={26}
              rx={13}
              fill={COLORS.card}
              stroke={COLORS.rule}
              strokeWidth={1}
            />
            <text
              x={c.x + c.w / 2}
              y={17}
              textAnchor="middle"
              fill={COLORS.inkMuted}
              fontSize={11}
              fontWeight={500}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {c.name}
            </text>
            {/* Thin connecting line from badge to bar */}
            <motion.line
              x1={c.x + c.w / 2}
              y1={26}
              x2={c.x + c.w / 2}
              y2={48}
              stroke={COLORS.ruleLight}
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={visible ? { opacity: 0.6 } : {}}
              transition={{ delay: 0.7 + i * 0.12 }}
            />
          </motion.g>
        ))}

        {/* Full bar background track */}
        <motion.rect
          x={0}
          y={48}
          width={680}
          height={56}
          rx={12}
          fill={COLORS.creamDark}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={visible ? { opacity: 1, scaleX: 1 } : {}}
          style={{ originX: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />

        {/* 5% filled bar with gradient */}
        <motion.rect
          x={0}
          y={48}
          height={56}
          rx={12}
          fill="url(#s0-bronze)"
          filter="url(#s0-barShadow)"
          initial={{ width: 0 }}
          animate={visible ? { width: 36 } : {}}
          transition={{ duration: 1.5, ease: EASE_OUT, delay: 0.5 }}
        />

        {/* Shimmer sweep on the 5% bar */}
        <motion.rect
          x={0}
          y={48}
          width={36}
          height={56}
          rx={12}
          fill="url(#s0-shimmer)"
          clipPath="url(#s0-barClip)"
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: [0, 1, 0] } : {}}
          transition={{ delay: 2, duration: 1.2 }}
        />

        {/* Dollar sign inside 5% bar */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : {}}
          transition={{ delay: 1.3 }}
        >
          <DollarSign
            x={10}
            y={64}
            width={16}
            height={16}
            color="white"
            strokeWidth={2.5}
          />
        </motion.g>

        {/* 95% dashed outline */}
        <motion.rect
          x={40}
          y={48}
          width={636}
          height={56}
          fill="none"
          stroke={COLORS.rule}
          strokeWidth={1.5}
          strokeDasharray="8 5"
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : {}}
          transition={{ delay: 1.8, duration: 0.5 }}
        />

        {/* Scattered question marks in the 95% area */}
        {[
          { x: 120, y: 80, s: 16, o: 0.35 },
          { x: 210, y: 72, s: 12, o: 0.2 },
          { x: 290, y: 84, s: 14, o: 0.28 },
          { x: 380, y: 70, s: 16, o: 0.3 },
          { x: 460, y: 82, s: 12, o: 0.22 },
          { x: 530, y: 74, s: 15, o: 0.25 },
          { x: 610, y: 80, s: 13, o: 0.2 },
        ].map((q, i) => (
          <motion.text
            key={i}
            x={q.x}
            y={q.y}
            fill={COLORS.inkGhost}
            fontSize={q.s}
            fontWeight={500}
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: q.o } : {}}
            transition={{ delay: 2.2 + i * 0.08, duration: 0.4 }}
          >
            ?
          </motion.text>
        ))}

        {/* "Everything else = 95%" centered label */}
        <motion.text
          x={370}
          y={82}
          textAnchor="middle"
          fill={COLORS.inkFaint}
          fontSize={14}
          fontWeight={500}
          fontFamily="Inter, system-ui, sans-serif"
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 0.7 } : {}}
          transition={{ delay: 2.4, duration: 0.6 }}
        >
          Everything else = 95%
        </motion.text>

        {/* Percentage labels below bar */}
        <motion.g
          initial={{ opacity: 0, y: 6 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 2, duration: 0.5, ease: EASE_OUT }}
        >
          <rect
            x={0}
            y={116}
            width={96}
            height={26}
            rx={6}
            fill={`${COLORS.accent}14`}
          />
          <text
            x={48}
            y={133}
            textAnchor="middle"
            fill={COLORS.accent}
            fontSize={12}
            fontWeight={600}
            fontFamily="Inter, system-ui, sans-serif"
          >
            Payments = 5%
          </text>
        </motion.g>

        {/* Decorative accent line at the 5% boundary */}
        <motion.line
          x1={36}
          y1={44}
          x2={36}
          y2={108}
          stroke={COLORS.accent}
          strokeWidth={1}
          strokeDasharray="3 3"
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 0.4 } : {}}
          transition={{ delay: 1.6 }}
        />
      </svg>
    </div>
  );
}

function GapGrid({ visible }: { visible: boolean }) {
  return (
    <div className="mt-8 grid grid-cols-5 gap-2.5">
      {MISSING_GAPS.map((gap, i) => (
        <motion.div
          key={gap}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg"
          style={{
            border: `1.5px dashed ${COLORS.rule}`,
            backgroundColor: `${COLORS.creamDark}60`,
          }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={visible ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 2.6 + i * 0.08, duration: 0.35, ease: EASE_OUT }}
        >
          <HelpCircle size={12} color={COLORS.rose} strokeWidth={2} />
          <span
            className="text-xs font-medium"
            style={{ color: COLORS.inkFaint }}
          >
            {gap}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function HumanCard({
  icon: Icon,
  label,
  delay,
}: {
  icon: LIcon;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.rule}`,
        boxShadow: `0 2px 8px rgba(184,149,106,0.08), 0 0 0 1px rgba(184,149,106,0.03)`,
      }}
      initial={{ opacity: 0, x: -28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: EASE_OUT }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${COLORS.accent}14` }}
      >
        <Icon size={16} color={COLORS.accent} />
      </div>
      <span className="text-sm font-medium" style={{ color: COLORS.ink }}>
        {label}
      </span>
      <div className="ml-auto shrink-0">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${COLORS.sage}18` }}
        >
          <Check size={12} color={COLORS.sage} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

function AIEmptyCard({ delay }: { delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{
        backgroundColor: 'transparent',
        border: `1.5px dashed ${COLORS.ruleDark}`,
      }}
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: EASE_OUT }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${COLORS.rose}12` }}
      >
        <X size={16} color={COLORS.rose} strokeWidth={2} />
      </div>
      <span className="text-sm italic" style={{ color: COLORS.inkFaint }}>
        Nothing
      </span>
    </motion.div>
  );
}

function AEOSSolutionCard({
  icon: Icon,
  label,
  accentColor,
  delay,
}: {
  icon: LIcon;
  label: string;
  accentColor: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{
        backgroundColor: COLORS.card,
        border: `1.5px solid ${accentColor}`,
        boxShadow: `0 2px 12px ${accentColor}15, 0 0 0 3px ${accentColor}08`,
      }}
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{
        delay,
        duration: 0.45,
        ease: EASE_OUT,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accentColor}18` }}
      >
        <Icon size={16} color={accentColor} />
      </div>
      <span className="text-sm font-medium" style={{ color: COLORS.ink }}>
        {label}
      </span>
      <div className="ml-auto shrink-0">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <Check size={12} color={accentColor} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

function ComparisonGrid({ showAeos }: { showAeos: boolean }) {
  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Section heading */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="section-label">SCENE 00</span>
        <h2 className="heading-section mt-2">
          What Humans Have.{' '}
          <span style={{ color: showAeos ? COLORS.sage : COLORS.rose }}>
            {showAeos ? 'What AEOS Provides.' : 'What AI Agents Don\u2019t.'}
          </span>
        </h2>
      </motion.div>

      {/* Column headers */}
      <div className="grid grid-cols-[100px_1fr_1fr] gap-4 mb-4">
        <div />
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ease: EASE_OUT }}
        >
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ backgroundColor: `${COLORS.accent}12` }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.accent }}
            />
            <span
              className="text-xs font-semibold tracking-wide uppercase"
              style={{ color: COLORS.accent }}
            >
              Humans
            </span>
          </div>
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, ease: EASE_OUT }}
        >
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              backgroundColor: showAeos
                ? `${COLORS.sage}12`
                : `${COLORS.rose}12`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: showAeos ? COLORS.sage : COLORS.rose,
              }}
            />
            <span
              className="text-xs font-semibold tracking-wide uppercase"
              style={{ color: showAeos ? COLORS.sage : COLORS.rose }}
            >
              {showAeos ? 'AEOS Protocol' : 'AI Agents'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {ROWS.map((row, i) => (
          <div
            key={row.label}
            className="grid grid-cols-[100px_1fr_1fr] gap-4 items-center"
          >
            {/* Row label */}
            <motion.div
              className="text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.3, ease: EASE_OUT }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: COLORS.inkMuted }}
              >
                {row.label}
              </span>
            </motion.div>

            {/* Human side card */}
            <HumanCard
              icon={row.humanIcon}
              label={row.humanLabel}
              delay={0.25 + i * 0.3}
            />

            {/* AI side — empty or AEOS */}
            <AnimatePresence mode="wait">
              {showAeos ? (
                <AEOSSolutionCard
                  key={`aeos-${row.label}`}
                  icon={row.aeosIcon}
                  label={row.aeosLabel}
                  accentColor={row.aeosColor}
                  delay={i * 0.18}
                />
              ) : (
                <AIEmptyCard
                  key={`empty-${row.label}`}
                  delay={0.35 + i * 0.3}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* "AEOS fills every gap" reveal */}
      <AnimatePresence>
        {showAeos && (
          <motion.div
            className="mt-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.4, duration: 0.6, ease: EASE_OUT }}
          >
            <h2 className="heading-section">
              AEOS fills{' '}
              <span style={{ color: COLORS.sage }}>every</span> gap.
            </h2>
            <p className="body-small mt-2" style={{ color: COLORS.inkMuted }}>
              Identity, contracts, disputes, risk, delegation, authority —
              all cryptographic, all verifiable.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProblemSlide() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      {/* Scene label */}
      <motion.span
        className="section-label block"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ease: EASE_OUT }}
      >
        THE PROBLEM
      </motion.span>

      {/* Heading */}
      <motion.h1
        className="heading-display mt-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: EASE_OUT }}
      >
        Everyone is building{' '}
        <span style={{ color: COLORS.accent }}>payment rails.</span>
      </motion.h1>

      {/* Body */}
      <motion.p
        className="body-text mt-4 max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: EASE_OUT }}
      >
        Stripe, Visa, Mastercard, Google, Coinbase — racing to let AI agents
        send money. But payments are{' '}
        <strong style={{ color: COLORS.accent }}>5%</strong> of what an
        economic actor needs.
      </motion.p>

      {/* Payment bar SVG */}
      <PaymentBarVisualization visible />

      {/* Missing capabilities grid */}
      <GapGrid visible />

      {/* Bottom tagline */}
      <motion.p
        className="body-small mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2 }}
      >
        Where are the other 19 capabilities an economic actor needs?
      </motion.p>
    </motion.div>
  );
}

function StatsSlide() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '65vh' }}
    >
      {/* Main heading */}
      <motion.h1
        className="heading-display text-center relative"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: EASE_OUT }}
      >
        We built all of it.
      </motion.h1>

      {/* Stat counters row */}
      <motion.div
        className="flex items-center gap-2 mt-14"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT }}
      >
        {STAT_ITEMS.map((stat, i) => (
          <div key={stat.label} className="flex items-center">
            <div className="text-center px-5">
              <div
                className="text-4xl font-semibold tracking-tight"
                style={{ color: COLORS.accent }}
              >
                <AnimatedCounter
                  target={stat.value}
                  suffix={stat.suffix}
                  duration={2.2}
                />
              </div>
              <div
                className="text-xs font-medium mt-1.5 tracking-wide uppercase"
                style={{ color: COLORS.inkFaint }}
              >
                {stat.label}
              </div>
            </div>

            {/* Separator dot */}
            {i < STAT_ITEMS.length - 1 && (
              <div
                className="w-1 h-1 rounded-full shrink-0"
                style={{ backgroundColor: COLORS.inkGhost }}
              />
            )}
          </div>
        ))}
      </motion.div>

      {/* Divider */}
      <motion.div
        className="w-16 h-px mt-10"
        style={{ backgroundColor: COLORS.rule }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      />

      {/* Closing text */}
      <motion.p
        className="body-text mt-8 text-center max-w-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5, ease: EASE_OUT }}
      >
        This simulation shows exactly how — from creating an agent's first
        cryptographic key to settling a{' '}
        <strong style={{ color: COLORS.accent }}>$25,000</strong> contract.
      </motion.p>

    </motion.div>
  );
}

export default function Scene00_TheProblem({
  step,
  onStepComplete,
}: SceneProps) {
  useEffect(() => {
    if (step >= STEP_TIMINGS.length) return;
    const timer = setTimeout(onStepComplete, STEP_TIMINGS[step]);
    return () => clearTimeout(timer);
  }, [step, onStepComplete]);

  return (
    <div className="scene-bg min-h-screen overflow-y-auto relative px-8 py-12 md:px-16 md:py-16">
      <div className="max-w-5xl mx-auto relative">
        <AnimatePresence mode="wait">
          {step === 0 && <ProblemSlide key="problem" />}

          {(step === 1 || step === 2) && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              <ComparisonGrid showAeos={step >= 2} />
            </motion.div>
          )}

          {step >= 3 && <StatsSlide key="stats" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
