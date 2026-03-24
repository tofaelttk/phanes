import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Layers,
  Fingerprint,
  GitBranch,
  FileSignature,
  PenTool,
  Shield,
  Cpu,
  CheckCircle,
  Unlock,
  Network,
  Scale,
  Activity,
  Share2,
  Wallet,
  Key,
  Orbit,
  type LucideIcon,
} from 'lucide-react';

interface SceneProps {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const C = {
  cream: '#F5F0E8',
  creamLight: '#FAF7F1',
  creamDark: '#EDE7DD',
  card: '#FFFFFF',
  ink: '#1A1714',
  inkLight: '#3D3831',
  inkMuted: '#6B6560',
  inkFaint: '#9C968F',
  inkGhost: '#C4BEB6',
  rule: '#E8E2D9',
  ruleLight: '#F0EBE3',
  accent: '#B8956A',
  bronze: '#A0784E',
  gold: '#C4A872',
  sage: '#7D8B6A',
  rose: '#B05A5A',
  terra: '#B87A5E',
};

const STEP_DURATIONS = [4000, 6000, 6000, 5000, 6000];

interface ModuleCard {
  num: string;
  title: string;
  icon: LucideIcon;
}

const MODULES: ModuleCard[] = [
  { num: '00', title: 'Problem', icon: AlertTriangle },
  { num: '01', title: 'Solution', icon: Layers },
  { num: '02', title: 'Genesis', icon: Fingerprint },
  { num: '03', title: 'Delegation', icon: GitBranch },
  { num: '04', title: 'Contract', icon: FileSignature },
  { num: '05', title: 'Multi-Sig', icon: PenTool },
  { num: '06', title: 'Risk', icon: Shield },
  { num: '07', title: 'Execute', icon: Cpu },
  { num: '08', title: 'Verify', icon: CheckCircle },
  { num: '09', title: 'Escrow', icon: Unlock },
  { num: '10', title: 'Consensus', icon: Network },
  { num: '11', title: 'Dispute', icon: Scale },
  { num: '12', title: 'Anomaly', icon: Activity },
  { num: '13', title: 'Graph', icon: Share2 },
  { num: '14', title: 'Settlement', icon: Wallet },
  { num: '15', title: 'Threshold', icon: Key },
];

interface ArchLayer {
  label: string;
  modules: string;
  color: string;
  colorLight: string;
}

const ARCH_LAYERS: ArchLayer[] = [
  {
    label: 'Infrastructure',
    modules: 'Ledger · Merkle · BFT Consensus · State Channels',
    color: C.bronze,
    colorLight: `${C.bronze}12`,
  },
  {
    label: 'Cryptography',
    modules: 'Threshold Signing · Bulletproofs · ZK Proofs · Time-Lock',
    color: C.terra,
    colorLight: `${C.terra}12`,
  },
  {
    label: 'Identity & Trust',
    modules: 'DID Registry · Delegation · Graph Intelligence · Reputation',
    color: C.accent,
    colorLight: `${C.accent}12`,
  },
  {
    label: 'Economic Layer',
    modules: 'Contracts · Escrow · Settlement · Token Economics',
    color: C.gold,
    colorLight: `${C.gold}12`,
  },
  {
    label: 'Risk & Safety',
    modules: 'Risk Assessment · Anomaly Detection · Circuit Breakers',
    color: C.rose,
    colorLight: `${C.rose}10`,
  },
  {
    label: 'Governance',
    modules: 'Dispute Resolution · Arbitration · Policy Engine',
    color: C.sage,
    colorLight: `${C.sage}10`,
  },
];

interface StatItem {
  value: number;
  label: string;
  suffix?: string;
}

const STATS: StatItem[] = [
  { value: 19, label: 'Modules' },
  { value: 106, label: 'Tests' },
  { value: 4, label: 'Languages' },
  { value: 9000, label: 'Lines', suffix: '+' },
];

const FINALE_WORDS = [
  'Identity.',
  'Contracts.',
  'Disputes.',
  'Risk.',
  'Settlement.',
  'Consensus.',
];

function ModuleGrid({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      className="grid grid-cols-4 gap-3 max-w-3xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {MODULES.map((mod, i) => {
        const Icon = mod.icon;
        return (
          <motion.div
            key={mod.num}
            className="card-elevated p-3 flex flex-col items-center gap-2 relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: i * 0.1,
              type: 'spring',
              stiffness: 200,
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-[14px]"
              style={{ border: `1px solid ${C.gold}` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.2] }}
              transition={{ duration: 1.2, delay: i * 0.1 + 0.3 }}
            />

            <span
              className="mono-hash"
              style={{ fontSize: 10, color: C.inkGhost }}
            >
              {mod.num}
            </span>
            <Icon
              size={18}
              style={{ color: C.accent }}
              strokeWidth={1.3}
            />
            <span
              className="body-small text-center"
              style={{ fontSize: 11, fontWeight: 500, color: C.ink }}
            >
              {mod.title}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function ArchitectureDiagram({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const barH = 50;
  const gap = 6;
  const svgW = 640;
  const totalH = ARCH_LAYERS.length * (barH + gap);
  const paddingX = 20;
  const barW = svgW - paddingX * 2;

  return (
    <motion.div
      className="flex justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <svg
        viewBox={`0 0 ${svgW} ${totalH + 40}`}
        className="w-full"
        style={{ maxWidth: 640, maxHeight: totalH + 40 }}
      >
        <defs>
          {ARCH_LAYERS.map((layer, i) => (
            <linearGradient
              key={`layer-grad-${i}`}
              id={`layer-grad-${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={layer.color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={layer.color} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>

        {[...ARCH_LAYERS].reverse().map((layer, revI) => {
          const i = ARCH_LAYERS.length - 1 - revI;
          const y = i * (barH + gap) + 20;

          return (
            <motion.g
              key={`arch-${i}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: revI * 0.3,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <rect
                x={paddingX}
                y={y}
                width={barW}
                height={barH}
                rx={10}
                fill={`url(#layer-grad-${i})`}
                stroke={layer.color}
                strokeWidth={1}
                strokeOpacity={0.3}
              />

              <rect
                x={paddingX}
                y={y}
                width={4}
                height={barH}
                rx={2}
                fill={layer.color}
                opacity={0.6}
              />

              <text
                x={paddingX + 16}
                y={y + 20}
                fill={C.ink}
                fontSize={13}
                fontWeight={600}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {layer.label}
              </text>

              <text
                x={paddingX + 16}
                y={y + 37}
                fill={C.inkFaint}
                fontSize={10}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {layer.modules}
              </text>
            </motion.g>
          );
        })}

        {ARCH_LAYERS.slice(0, -1).map((_, i) => {
          const y1 = i * (barH + gap) + 20 + barH;
          const y2 = (i + 1) * (barH + gap) + 20;
          const midX = svgW / 2;

          return (
            <motion.g
              key={`conn-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 2 + i * 0.1 }}
            >
              <line
                x1={midX - 30}
                y1={y1}
                x2={midX - 30}
                y2={y2}
                stroke={C.rule}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <line
                x1={midX + 30}
                y1={y1}
                x2={midX + 30}
                y2={y2}
                stroke={C.rule}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            </motion.g>
          );
        })}

        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          {ARCH_LAYERS.slice(0, -1).map((_, i) => {
            const y1 = i * (barH + gap) + 20 + barH;
            const y2 = (i + 1) * (barH + gap) + 20;
            const midY = (y1 + y2) / 2;

            return (
              <motion.circle
                key={`pulse-${i}`}
                cx={svgW / 2}
                cy={midY}
                r={2}
                fill={C.gold}
                animate={{
                  opacity: [0, 0.8, 0],
                  r: [1, 3, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: 1,
                  delay: 2.5 + i * 0.15,
                }}
              />
            );
          })}
        </motion.g>
      </svg>
    </motion.div>
  );
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

function StatCounter({
  stat,
  index,
  active,
}: {
  stat: StatItem;
  index: number;
  active: boolean;
}) {
  const count = useCountUp(stat.value, 2000, active);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.15 }}
    >
      <motion.span
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: C.bronze,
          lineHeight: 1,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {count.toLocaleString()}
        {stat.suffix || ''}
      </motion.span>
      <span
        className="body-small mt-2"
        style={{ fontSize: 12, color: C.inkFaint }}
      >
        {stat.label}
      </span>
    </motion.div>
  );
}

function StatsDisplay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      className="flex justify-center items-center gap-16 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {STATS.map((stat, i) => (
        <StatCounter key={stat.label} stat={stat} index={i} active={true} />
      ))}
    </motion.div>
  );
}

function FinaleSequence({ visible }: { visible: boolean }) {
  const [revealedWords, setRevealedWords] = useState(0);
  const [showTagline, setShowTagline] = useState(false);
  const [showSubtag, setShowSubtag] = useState(false);

  useEffect(() => {
    if (!visible) {
      setRevealedWords(0);
      setShowTagline(false);
      setShowSubtag(false);
      return;
    }

    const wordTimers: ReturnType<typeof setTimeout>[] = [];
    FINALE_WORDS.forEach((_, i) => {
      wordTimers.push(
        setTimeout(() => setRevealedWords(i + 1), 800 * (i + 1)),
      );
    });

    const tagTimer = setTimeout(
      () => setShowTagline(true),
      800 * FINALE_WORDS.length + 600,
    );
    const subTimer = setTimeout(
      () => setShowSubtag(true),
      800 * FINALE_WORDS.length + 1200,
    );

    return () => {
      wordTimers.forEach(clearTimeout);
      clearTimeout(tagTimer);
      clearTimeout(subTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {FINALE_WORDS.map((word, i) => (
          <motion.span
            key={word}
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: C.ink,
              letterSpacing: '-0.02em',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={
              i < revealedWords
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 16 }
            }
            transition={{ duration: 0.5 }}
          >
            {word}
          </motion.span>
        ))}
      </div>

      <AnimatePresence>
        {showTagline && (
          <motion.p
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: C.inkMuted,
              textAlign: 'center',
              maxWidth: 600,
              lineHeight: 1.6,
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            The Economic Operating System for AI Agents.
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubtag && (
          <motion.div
            className="mt-4 relative"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: C.inkFaint,
                textAlign: 'center',
                maxWidth: 500,
              }}
            >
              Built for a world where AI agents are economic entities.
            </p>
            <motion.div
              className="absolute -inset-x-8 -inset-y-4 rounded-2xl -z-10"
              style={{
                background: `radial-gradient(ellipse at center, ${C.gold}08 0%, transparent 70%)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ArchLayerConnectorSVG({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.svg
      viewBox="0 0 600 60"
      className="w-full mb-4"
      style={{ maxWidth: 640, maxHeight: 60 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <defs>
        <linearGradient id="arch-connector" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.accent} stopOpacity={0} />
          <stop offset="50%" stopColor={C.accent} stopOpacity={0.3} />
          <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect
        x={0}
        y={28}
        width={600}
        height={2}
        fill="url(#arch-connector)"
        rx={1}
      />
      {[100, 200, 300, 400, 500].map((x, i) => (
        <motion.circle
          key={`dot-${i}`}
          cx={x}
          cy={29}
          r={3}
          fill={C.accent}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
        />
      ))}
    </motion.svg>
  );
}

export default function Scene16_FullLifecycle({
  step,
  onStepComplete,
}: SceneProps) {
  useEffect(() => {
    if (step >= STEP_DURATIONS.length) return;
    const timer = setTimeout(onStepComplete, STEP_DURATIONS[step]);
    return () => clearTimeout(timer);
  }, [step, onStepComplete]);

  return (
    <div
      className="scene-bg min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${C.creamLight} 0%, ${C.cream} 40%, ${C.creamDark} 100%)`,
      }}
    >
      <div className="pt-14 pb-6 px-12 max-w-6xl mx-auto w-full">
        <motion.span
          className="section-label block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          SCENE 16
        </motion.span>

        <motion.h1
          className="heading-display mt-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ fontSize: 42 }}
        >
          The Complete Stack
        </motion.h1>

        <motion.p
          className="body-text mt-2 max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Every system an AI agent needs, built as one unified protocol.
        </motion.p>

        <motion.div
          className="mt-5 w-full h-[2px] rounded-full overflow-hidden"
          style={{ backgroundColor: C.creamDark }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: C.accent }}
            animate={{
              width: `${(step / (STEP_DURATIONS.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>
      </div>

      <div className="flex-1 px-12 max-w-6xl mx-auto w-full pb-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              className="flex items-center justify-center h-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center max-w-lg">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <Orbit
                    size={56}
                    style={{ color: C.accent }}
                    strokeWidth={1}
                    className="mx-auto mb-6"
                  />
                </motion.div>
                <motion.p
                  className="body-text"
                  style={{ color: C.inkMuted, lineHeight: 1.8 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  From cryptographic identity to settlement, from risk assessment
                  to dispute resolution — AEOS provides the complete economic
                  infrastructure for autonomous agents.
                </motion.p>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              className="flex flex-col items-center justify-center h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.p
                className="body-small mb-6 text-center"
                style={{ color: C.inkFaint }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                16 Modules — One Protocol
              </motion.p>
              <ModuleGrid visible={true} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              className="flex flex-col items-center justify-center h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.p
                className="body-small mb-4 text-center"
                style={{ color: C.inkFaint }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Architecture — Six Layers
              </motion.p>
              <ArchLayerConnectorSVG visible={true} />
              <ArchitectureDiagram visible={true} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              className="flex flex-col items-center justify-center h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.p
                className="body-small mb-6 text-center"
                style={{ color: C.inkFaint }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                By the Numbers
              </motion.p>
              <StatsDisplay visible={true} />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              className="flex flex-col items-center justify-center h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FinaleSequence visible={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
