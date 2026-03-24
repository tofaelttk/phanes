import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint,
  FileSignature,
  Lock,
  CheckCircle,
  Scale,
  Check,
  Minus,
  ChevronDown,
  Database,
  Brain,
  Key,
  Server,
  Globe,
  BarChart3,
} from 'lucide-react';
import { COLORS } from '../../utils/constants';

interface SceneProps {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const STEP_TIMINGS = [4000, 5000, 5000, 4000];

const EASE_OUT: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

interface ArchLayer {
  name: string;
  modules: string[];
  color: string;
  textColor: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
}

const ARCHITECTURE_LAYERS: ArchLayer[] = [
  {
    name: 'Integration',
    modules: ['MCP Server', 'REST API', 'TypeScript SDK'],
    color: '#D4BC8C',
    textColor: '#5A4830',
    icon: Globe,
  },
  {
    name: 'Economic',
    modules: ['Identity', 'Contracts', 'Disputes', 'Risk', 'Tokens'],
    color: '#C4A872',
    textColor: '#4A3820',
    icon: BarChart3,
  },
  {
    name: 'Intelligence',
    modules: ['ML Engine', 'Graph Intel', 'State Channels'],
    color: '#B87A5E',
    textColor: '#FFFFFF',
    icon: Brain,
  },
  {
    name: 'Cryptographic',
    modules: ['Threshold Crypto', 'Bulletproofs', 'Ed25519'],
    color: '#B8956A',
    textColor: '#FFFFFF',
    icon: Key,
  },
  {
    name: 'Consensus & Settlement',
    modules: ['PBFT', 'Stripe', 'USDC'],
    color: '#A0784E',
    textColor: '#FFFFFF',
    icon: Server,
  },
  {
    name: 'Persistence',
    modules: ['SQLite WAL', 'Ledger', 'Merkle Proofs'],
    color: '#7A5C3A',
    textColor: '#F5F0E8',
    icon: Database,
  },
];

type LIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface FlowStep {
  label: string;
  sublabel: string;
  icon: LIcon;
}

const FLOW_STEPS: FlowStep[] = [
  { label: 'Create Identity', sublabel: 'DID + Ed25519', icon: Fingerprint },
  { label: 'Enter Contract', sublabel: 'Terms + Escrow', icon: FileSignature },
  { label: 'Escrow Funds', sublabel: 'Lock collateral', icon: Lock },
  { label: 'Verify & Deliver', sublabel: 'Proof of work', icon: CheckCircle },
  { label: 'Settle or Dispute', sublabel: 'Final resolution', icon: Scale },
];

interface CompFeature {
  name: string;
  stripe: boolean;
  skyfire: boolean;
  google: boolean;
  aeos: boolean;
}

const COMPARISON_FEATURES: CompFeature[] = [
  { name: 'Identity (DID)', stripe: false, skyfire: false, google: false, aeos: true },
  { name: 'Smart Contracts', stripe: false, skyfire: false, google: false, aeos: true },
  { name: 'Escrow', stripe: false, skyfire: false, google: false, aeos: true },
  { name: 'Dispute Resolution', stripe: false, skyfire: false, google: false, aeos: true },
  { name: 'Risk Assessment', stripe: false, skyfire: false, google: false, aeos: true },
  { name: 'ML Anomaly Detection', stripe: false, skyfire: false, google: false, aeos: true },
  { name: 'ZK Proofs', stripe: false, skyfire: false, google: false, aeos: true },
  { name: 'BFT Consensus', stripe: false, skyfire: false, google: false, aeos: true },
];

const COMPETITOR_HEADERS = ['Stripe MPP', 'Skyfire', 'Google A2A', 'AEOS'];

function ArchitectureDiagram({ visible }: { visible: boolean }) {
  const barH = 52;
  const gap = 6;
  const totalLayers = ARCHITECTURE_LAYERS.length;
  const totalH = totalLayers * (barH + gap) - gap + 40;

  return (
    <div className="mt-8 w-full">
      <svg
        viewBox={`0 0 660 ${totalH}`}
        className="w-full"
        style={{ maxWidth: 660 }}
      >
        <defs>
          <filter id="s1-layerShadow">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="3"
              floodColor="rgba(26,23,20,0.08)"
            />
          </filter>
        </defs>

        {ARCHITECTURE_LAYERS.map((layer, i) => {
          const reverseI = totalLayers - 1 - i;
          const y = i * (barH + gap) + 20;
          const Icon = layer.icon;

          return (
            <motion.g
              key={layer.name}
              initial={{ opacity: 0, y: 30 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.3 + reverseI * 0.18,
                duration: 0.55,
                ease: EASE_OUT,
              }}
            >
              {/* Layer bar */}
              <rect
                x={0}
                y={y}
                width={660}
                height={barH}
                rx={10}
                fill={layer.color}
                filter="url(#s1-layerShadow)"
              />

              {/* Layer number badge */}
              <circle
                cx={26}
                cy={y + barH / 2}
                r={12}
                fill="rgba(255,255,255,0.2)"
              />
              <text
                x={26}
                y={y + barH / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={layer.textColor}
                fontSize={11}
                fontWeight={700}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {totalLayers - i}
              </text>

              {/* Layer icon */}
              <foreignObject
                x={46}
                y={y + barH / 2 - 9}
                width={18}
                height={18}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} color={layer.textColor} strokeWidth={2} />
                </div>
              </foreignObject>

              {/* Layer name */}
              <text
                x={72}
                y={y + barH / 2 + 1}
                dominantBaseline="middle"
                fill={layer.textColor}
                fontSize={14}
                fontWeight={600}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {layer.name}
              </text>

              {/* Module tags */}
              {layer.modules.map((mod, mi) => {
                const tagX = 260 + mi * 120;
                const tagW = mod.length * 7 + 18;
                return (
                  <g key={mod}>
                    <rect
                      x={tagX - tagW / 2}
                      y={y + barH / 2 - 11}
                      width={tagW}
                      height={22}
                      rx={6}
                      fill="rgba(255,255,255,0.15)"
                    />
                    <text
                      x={tagX}
                      y={y + barH / 2 + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={layer.textColor}
                      fontSize={11}
                      fontWeight={500}
                      fontFamily="Inter, system-ui, sans-serif"
                      opacity={0.9}
                    >
                      {mod}
                    </text>
                  </g>
                );
              })}

            </motion.g>
          );
        })}

      </svg>
    </div>
  );
}

function FlowDiagram({ visible }: { visible: boolean }) {
  const svgW = 700;
  const circleR = 30;
  const circleY = 75;
  const numSteps = FLOW_STEPS.length;
  const startX = 60;
  const endX = svgW - 60;
  const spacing = (endX - startX) / (numSteps - 1);
  const positions = FLOW_STEPS.map((_, i) => startX + i * spacing);

  return (
    <div className="mt-8 w-full">
      <svg
        viewBox={`0 0 ${svgW} 190`}
        className="w-full"
        style={{ maxWidth: svgW }}
      >
        <defs>
          <marker
            id="s1-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COLORS.rule} />
          </marker>
          <filter id="s1-circleShadow">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="4"
              floodColor="rgba(184,149,106,0.12)"
            />
          </filter>
          <radialGradient id="s1-glow">
            <stop offset="0%" stopColor={COLORS.gold} stopOpacity="0.15" />
            <stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connecting paths with arrows */}
        {positions.slice(0, -1).map((x, i) => {
          const x1 = x + circleR + 4;
          const x2 = positions[i + 1] - circleR - 4;
          return (
            <motion.path
              key={`conn-${i}`}
              d={`M${x1},${circleY} L${x2},${circleY}`}
              fill="none"
              stroke={COLORS.rule}
              strokeWidth={2}
              strokeDasharray="6 4"
              markerEnd="url(#s1-arrow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={visible ? { pathLength: 1, opacity: 1 } : {}}
              transition={{
                delay: 0.8 + i * 0.2,
                duration: 0.6,
                ease: EASE_OUT,
              }}
            />
          );
        })}

        {/* Flowing particles along each connection */}
        {positions.slice(0, -1).flatMap((x, ci) => {
          const x1 = x + circleR + 6;
          const x2 = positions[ci + 1] - circleR - 6;
          return [0, 1, 2].map((pi) => (
            <motion.circle
              key={`particle-${ci}-${pi}`}
              cy={circleY}
              r={2.5}
              fill={COLORS.accent}
              initial={{ cx: x1, opacity: 0 }}
              animate={
                visible
                  ? {
                      cx: [x1, x2],
                      opacity: [0, 0.8, 0.8, 0],
                    }
                  : {}
              }
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: 1.8 + ci * 0.3 + pi * 0.7,
                ease: 'linear',
              }}
            />
          ));
        })}

        {/* Step circles */}
        {FLOW_STEPS.map((s, i) => {
          const cx = positions[i];
          const Icon = s.icon;
          return (
            <motion.g
              key={s.label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={visible ? { opacity: 1, scale: 1 } : {}}
              transition={{
                delay: 0.3 + i * 0.22,
                duration: 0.5,
                ease: EASE_OUT,
              }}
            >
              {/* Background glow */}
              <circle
                cx={cx}
                cy={circleY}
                r={circleR + 8}
                fill="url(#s1-glow)"
              />

              {/* Main circle */}
              <circle
                cx={cx}
                cy={circleY}
                r={circleR}
                fill={COLORS.card}
                stroke={COLORS.rule}
                strokeWidth={1.5}
                filter="url(#s1-circleShadow)"
              />

              {/* Icon via foreignObject */}
              <foreignObject
                x={cx - 11}
                y={circleY - 11}
                width={22}
                height={22}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <Icon size={20} color={COLORS.accent} strokeWidth={1.8} />
                </div>
              </foreignObject>

              {/* Number badge */}
              <circle
                cx={cx + circleR * 0.62}
                cy={circleY - circleR * 0.62}
                r={10}
                fill={COLORS.accent}
              />
              <text
                x={cx + circleR * 0.62}
                y={circleY - circleR * 0.62 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={10}
                fontWeight={700}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {i + 1}
              </text>

              {/* Label below */}
              <text
                x={cx}
                y={circleY + circleR + 20}
                textAnchor="middle"
                fill={COLORS.ink}
                fontSize={12}
                fontWeight={600}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {s.label}
              </text>
              <text
                x={cx}
                y={circleY + circleR + 35}
                textAnchor="middle"
                fill={COLORS.inkFaint}
                fontSize={10}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {s.sublabel}
              </text>
            </motion.g>
          );
        })}

        {/* Sequential golden fill-up overlay */}
        {FLOW_STEPS.map((_, i) => (
          <motion.circle
            key={`fill-${i}`}
            cx={positions[i]}
            cy={circleY}
            r={circleR - 1}
            fill={`${COLORS.gold}20`}
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: 1 } : {}}
            transition={{ delay: 2.5 + i * 0.4, duration: 0.5 }}
          />
        ))}
      </svg>
    </div>
  );
}

function ComparisonTable({ visible }: { visible: boolean }) {
  return (
    <motion.div
      className="mt-8 rounded-xl overflow-hidden"
      style={{ border: `1px solid ${COLORS.rule}` }}
      initial={{ opacity: 0, y: 16 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      {/* Header row */}
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: '1.8fr repeat(4, 1fr)',
          backgroundColor: COLORS.creamDark,
        }}
      >
        <div
          className="px-5 py-3 text-xs font-semibold tracking-wide uppercase"
          style={{ color: COLORS.inkMuted }}
        >
          Feature
        </div>
        {COMPETITOR_HEADERS.map((h, i) => {
          const isAeos = i === 3;
          return (
            <div
              key={h}
              className="px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase"
              style={{
                color: isAeos ? COLORS.accent : COLORS.inkFaint,
                borderLeft: isAeos
                  ? `3px solid ${COLORS.gold}`
                  : `1px solid ${COLORS.ruleLight}`,
                backgroundColor: isAeos ? `${COLORS.gold}08` : undefined,
              }}
            >
              {h}
            </div>
          );
        })}
      </div>

      {/* Feature rows */}
      {COMPARISON_FEATURES.map((feat, i) => (
        <motion.div
          key={feat.name}
          className="grid gap-0"
          style={{
            gridTemplateColumns: '1.8fr repeat(4, 1fr)',
            backgroundColor: i % 2 === 0 ? COLORS.card : COLORS.warmWhite,
            borderTop: `1px solid ${COLORS.ruleLight}`,
          }}
          initial={{ opacity: 0, x: -16 }}
          animate={visible ? { opacity: 1, x: 0 } : {}}
          transition={{
            delay: 0.3 + i * 0.1,
            duration: 0.4,
            ease: EASE_OUT,
          }}
        >
          {/* Feature name */}
          <div className="px-5 py-3 flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: COLORS.ink }}
            >
              {feat.name}
            </span>
          </div>

          {/* Stripe */}
          <div
            className="px-4 py-3 flex justify-center items-center"
            style={{ borderLeft: `1px solid ${COLORS.ruleLight}` }}
          >
            {feat.stripe ? (
              <Check size={16} color={COLORS.sage} strokeWidth={2.5} />
            ) : (
              <Minus size={16} color={`${COLORS.rose}90`} strokeWidth={2} />
            )}
          </div>

          {/* Skyfire */}
          <div
            className="px-4 py-3 flex justify-center items-center"
            style={{ borderLeft: `1px solid ${COLORS.ruleLight}` }}
          >
            {feat.skyfire ? (
              <Check size={16} color={COLORS.sage} strokeWidth={2.5} />
            ) : (
              <Minus size={16} color={`${COLORS.rose}90`} strokeWidth={2} />
            )}
          </div>

          {/* Google A2A */}
          <div
            className="px-4 py-3 flex justify-center items-center"
            style={{ borderLeft: `1px solid ${COLORS.ruleLight}` }}
          >
            {feat.google ? (
              <Check size={16} color={COLORS.sage} strokeWidth={2.5} />
            ) : (
              <Minus size={16} color={`${COLORS.rose}90`} strokeWidth={2} />
            )}
          </div>

          {/* AEOS — always checked, highlighted */}
          <div
            className="px-4 py-3 flex justify-center items-center"
            style={{
              borderLeft: `3px solid ${COLORS.gold}`,
              backgroundColor: `${COLORS.gold}06`,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={visible ? { scale: 1 } : {}}
              transition={{
                delay: 0.5 + i * 0.1,
                type: 'spring',
                stiffness: 400,
                damping: 15,
              }}
            >
              <Check size={16} color={COLORS.sage} strokeWidth={2.5} />
            </motion.div>
          </div>
        </motion.div>
      ))}

    </motion.div>
  );
}

function ArchitectureSlide() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        className="section-label block"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ease: EASE_OUT }}
      >
        THE PROTOCOL
      </motion.span>

      <motion.h1
        className="heading-display mt-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: EASE_OUT }}
      >
        <span style={{ color: COLORS.accent }}>19 Modules.</span> One Protocol.
      </motion.h1>

      <motion.p
        className="body-text mt-3 max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, ease: EASE_OUT }}
      >
        Six architectural layers — from raw persistence to developer
        integration. Everything an AI economic agent needs to participate
        in trustless commerce.
      </motion.p>

      <ArchitectureDiagram visible />

      {/* Bottom legend */}
      <motion.div
        className="flex items-center gap-6 mt-6 justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        {[
          { label: 'Foundation', color: '#7A5C3A' },
          { label: 'Core', color: '#B8956A' },
          { label: 'Application', color: '#D4BC8C' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs" style={{ color: COLORS.inkFaint }}>
              {item.label}
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function FlowSlide() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        className="section-label block"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ease: EASE_OUT }}
      >
        LIFECYCLE
      </motion.span>

      <motion.h1
        className="heading-section mt-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT }}
      >
        How It Works
      </motion.h1>

      <motion.p
        className="body-text mt-2 max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ease: EASE_OUT }}
      >
        Five steps from identity creation to final settlement. Every
        transition is cryptographically verified and immutably recorded.
      </motion.p>

      <FlowDiagram visible />

    </motion.div>
  );
}

function ComparisonSlide() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        className="section-label block"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ease: EASE_OUT }}
      >
        COMPETITIVE LANDSCAPE
      </motion.span>

      <motion.h1
        className="heading-section mt-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT }}
      >
        The Complete Stack
      </motion.h1>

      <motion.p
        className="body-text mt-2 max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ease: EASE_OUT }}
      >
        Competitors solve one piece. AEOS provides the entire infrastructure
        an AI economic agent needs to operate autonomously.
      </motion.p>

      <ComparisonTable visible />

      {/* Bottom annotation */}
      <motion.div
        className="mt-6 flex items-center gap-6 justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="flex items-center gap-2">
          <Check size={14} color={COLORS.sage} strokeWidth={2.5} />
          <span className="text-xs" style={{ color: COLORS.inkFaint }}>
            Full support
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Minus size={14} color={`${COLORS.rose}90`} strokeWidth={2} />
          <span className="text-xs" style={{ color: COLORS.inkFaint }}>
            Not available
          </span>
        </div>
      </motion.div>

    </motion.div>
  );
}

function TransitionSlide() {
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
        transition={{ delay: 0.2, duration: 0.6, ease: EASE_OUT }}
      >
        Let's begin.
      </motion.h1>

      {/* Divider */}
      <motion.div
        className="w-12 h-px mt-6"
        style={{ backgroundColor: COLORS.accent }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      />

      {/* Description */}
      <motion.p
        className="body-text mt-6 text-center max-w-md relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: EASE_OUT }}
      >
        Starting with the most fundamental operation — creating an AI
        agent's{' '}
        <strong style={{ color: COLORS.accent }}>
          cryptographic identity
        </strong>{' '}
        from nothing.
      </motion.p>

      {/* Pulsing down arrow */}
      <motion.div
        className="mt-10 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <ChevronDown size={24} color={COLORS.accent} strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function Scene01_TheSolution({
  step,
  onStepComplete,
}: SceneProps) {
  useEffect(() => {
    if (step >= STEP_TIMINGS.length) return;
    const timer = setTimeout(onStepComplete, STEP_TIMINGS[step]);
    return () => clearTimeout(timer);
  }, [step, onStepComplete]);

  return (
    <div className="scene-bg min-h-screen overflow-y-auto relative">
      <div className="max-w-5xl mx-auto py-16 px-8 relative">
        <AnimatePresence mode="wait">
          {step === 0 && <ArchitectureSlide key="arch" />}
          {step === 1 && <FlowSlide key="flow" />}
          {step === 2 && <ComparisonSlide key="compare" />}
          {step >= 3 && <TransitionSlide key="transition" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
