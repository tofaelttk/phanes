import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Lock,
  Unlock,
  ShieldCheck,
  Hash,
  CheckCircle,
  Users,
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

const STEP_DURATIONS = [4000, 5000, 5000, 5000, 4000];

const PENTAGON_NODES = (() => {
  const cx = 260;
  const cy = 210;
  const r = 140;
  return [1, 2, 3, 4, 5].map((id, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return {
      id,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      label: `Agent ${id}`,
      selected: id === 1 || id === 3 || id === 5,
    };
  });
})();

const PARTIAL_SIGS = [
  { nodeId: 1, sig: '0xa3f7c2...', formula: 'σ₁ = share₁ × H(msg)' },
  { nodeId: 3, sig: '0x7b2e91...', formula: 'σ₃ = share₃ × H(msg)' },
  { nodeId: 5, sig: '0xd91f04...', formula: 'σ₅ = share₅ × H(msg)' },
];

const CENTER = { x: 260, y: 210 };

function OrbGlow({ visible, splitting }: { visible: boolean; splitting: boolean }) {
  if (!visible) return null;

  return (
    <motion.g>
      <motion.circle
        cx={CENTER.x}
        cy={CENTER.y}
        fill="url(#orb-gradient)"
        filter="url(#orb-glow)"
        initial={{ r: 0, opacity: 0 }}
        animate={
          splitting
            ? { r: 8, opacity: 0 }
            : { r: 36, opacity: 1 }
        }
        transition={
          splitting
            ? { duration: 0.8, ease: 'easeIn' }
            : { duration: 1, type: 'spring' }
        }
      />

      {!splitting && (
        <>
          <motion.circle
            cx={CENTER.x}
            cy={CENTER.y}
            fill="none"
            stroke={C.gold}
            strokeWidth={1}
            animate={{
              r: [38, 52, 38],
              opacity: [0.4, 0.15, 0.4],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.circle
            cx={CENTER.x}
            cy={CENTER.y}
            fill="none"
            stroke={C.accent}
            strokeWidth={0.5}
            animate={{
              r: [42, 62, 42],
              opacity: [0.2, 0.08, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}
    </motion.g>
  );
}

function FragmentParticles({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <g>
      {PENTAGON_NODES.map((node, i) => (
        <motion.circle
          key={`frag-${node.id}`}
          r={10}
          fill={`url(#frag-grad-${i})`}
          filter="url(#frag-glow)"
          initial={{ cx: CENTER.x, cy: CENTER.y, opacity: 1 }}
          animate={{ cx: node.x, cy: node.y, opacity: 1 }}
          transition={{
            duration: 1.2,
            delay: 0.1 + i * 0.1,
            type: 'spring',
            stiffness: 80,
          }}
        />
      ))}

      {PENTAGON_NODES.map((node, i) => (
        <motion.line
          key={`line-${node.id}`}
          x1={CENTER.x}
          y1={CENTER.y}
          stroke={C.gold}
          strokeWidth={1}
          strokeDasharray="4 4"
          strokeOpacity={0.3}
          initial={{ x2: CENTER.x, y2: CENTER.y, opacity: 0 }}
          animate={{ x2: node.x, y2: node.y, opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
        />
      ))}
    </g>
  );
}

function PentagonNodes({
  step,
  showSelected,
}: {
  step: number;
  showSelected: boolean;
}) {
  return (
    <g>
      {PENTAGON_NODES.map((node, i) => {
        const nextNode = PENTAGON_NODES[(i + 1) % 5];
        return (
          <motion.line
            key={`pent-edge-${i}`}
            x1={node.x}
            y1={node.y}
            x2={nextNode.x}
            y2={nextNode.y}
            stroke={C.rule}
            strokeWidth={1}
            strokeDasharray="3 3"
            initial={{ opacity: 0 }}
            animate={{ opacity: step >= 1 ? 0.4 : 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
          />
        );
      })}

      {PENTAGON_NODES.map((node, i) => {
        const isSelected = showSelected && node.selected;
        const isParticipating = step >= 2 && node.selected;

        return (
          <motion.g key={`pnode-${node.id}`}>
            {isSelected && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={28}
                fill="none"
                stroke={C.gold}
                strokeWidth={2}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                filter="url(#orb-glow)"
              />
            )}

            <motion.circle
              cx={node.x}
              cy={node.y}
              r={22}
              fill={C.card}
              stroke={isSelected ? C.gold : C.rule}
              strokeWidth={isSelected ? 2 : 1}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: step === 0 ? 0 : 0.5 + i * 0.08,
                type: 'spring',
              }}
            />

            <motion.text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isSelected ? C.ink : C.inkMuted}
              fontSize={11}
              fontWeight={isSelected ? 700 : 500}
              fontFamily="Inter, system-ui, sans-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.08 }}
            >
              {node.id}
            </motion.text>

            <motion.text
              x={node.x}
              y={node.y + 38}
              textAnchor="middle"
              fill={C.inkFaint}
              fontSize={9}
              fontFamily="Inter, system-ui, sans-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.08 }}
            >
              {node.label}
            </motion.text>

            {isParticipating && step === 2 && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.2, type: 'spring' }}
              >
                <rect
                  x={node.x + 18}
                  y={node.y - 30}
                  width={14}
                  height={14}
                  rx={3}
                  fill={`${C.gold}20`}
                  stroke={C.gold}
                  strokeWidth={0.5}
                />
                <text
                  x={node.x + 25}
                  y={node.y - 20}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={C.gold}
                  fontSize={8}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  🔑
                </text>
              </motion.g>
            )}
          </motion.g>
        );
      })}
    </g>
  );
}

function ConvergenceAnimation({ active }: { active: boolean }) {
  if (!active) return null;

  const selectedNodes = PENTAGON_NODES.filter((n) => n.selected);

  return (
    <g>
      {selectedNodes.map((node, i) => (
        <motion.g key={`converge-${node.id}`}>
          <motion.circle
            r={6}
            fill={C.gold}
            initial={{ cx: node.x, cy: node.y, opacity: 0.9 }}
            animate={{
              cx: [node.x, CENTER.x],
              cy: [node.y, CENTER.y],
              opacity: [0.9, 0.9, 0],
              r: [6, 8, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />

          <motion.line
            stroke={C.gold}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            initial={{
              x1: node.x,
              y1: node.y,
              x2: node.x,
              y2: node.y,
              opacity: 0,
            }}
            animate={{
              x2: CENTER.x,
              y2: CENTER.y,
              opacity: [0, 0.6, 0.6, 0],
            }}
            transition={{ duration: 2, delay: i * 0.3 }}
          />
        </motion.g>
      ))}

      <motion.circle
        cx={CENTER.x}
        cy={CENTER.y}
        fill={C.gold}
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: [0, 0, 14, 12], opacity: [0, 0, 1, 1] }}
        transition={{ duration: 2.5, delay: 0.9, ease: 'easeOut' }}
        filter="url(#orb-glow)"
      />

      <motion.circle
        cx={CENTER.x}
        cy={CENTER.y}
        fill="none"
        stroke={C.gold}
        strokeWidth={1}
        initial={{ r: 14, opacity: 0 }}
        animate={{ r: [14, 40, 60], opacity: [0, 0.5, 0] }}
        transition={{
          duration: 1.5,
          delay: 2.5,
          ease: 'easeOut',
        }}
      />

      <motion.text
        x={CENTER.x}
        y={CENTER.y + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill={C.card}
        fontSize={10}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        σ
      </motion.text>
    </g>
  );
}

function SVGDefs() {
  return (
    <defs>
      <radialGradient id="orb-gradient" cx="40%" cy="40%">
        <stop offset="0%" stopColor={C.gold} stopOpacity={1} />
        <stop offset="50%" stopColor={C.accent} stopOpacity={0.9} />
        <stop offset="100%" stopColor={C.bronze} stopOpacity={0.7} />
      </radialGradient>

      {PENTAGON_NODES.map((_, i) => (
        <radialGradient
          key={`frag-grad-${i}`}
          id={`frag-grad-${i}`}
          cx="40%"
          cy="40%"
        >
          <stop offset="0%" stopColor={C.gold} stopOpacity={0.9} />
          <stop offset="100%" stopColor={C.accent} stopOpacity={0.6} />
        </radialGradient>
      ))}

      <filter id="orb-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor={C.gold} floodOpacity={0.4} />
        <feComposite in2="blur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="frag-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feFlood floodColor={C.gold} floodOpacity={0.35} />
        <feComposite in2="blur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="0" dy="1" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.06" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function PolynomialCurve({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const points: [number, number][] = [];
  for (let x = 0; x <= 200; x += 2) {
    const t = x / 200;
    const y = 30 + 15 * Math.sin(t * Math.PI * 1.5) + 8 * t * t;
    points.push([x + 160, y + 310]);
  }
  const pathD =
    'M' + points.map(([x, y]) => `${x},${y}`).join(' L');

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <rect
        x={155}
        y={305}
        width={210}
        height={70}
        rx={8}
        fill={C.card}
        stroke={C.rule}
        strokeWidth={0.5}
        opacity={0.7}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke={C.accent}
        strokeWidth={1.5}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 1.2 }}
      />

      {[0, 1, 2, 3, 4].map((i) => {
        const t = (i + 0.5) / 5;
        const x = t * 200 + 160;
        const y = 30 + 15 * Math.sin(t * Math.PI * 1.5) + 8 * t * t + 310;
        return (
          <motion.circle
            key={`eval-${i}`}
            cx={x}
            cy={y}
            r={3}
            fill={C.gold}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.5 + i * 0.12, type: 'spring' }}
          />
        );
      })}

      <text
        x={260}
        y={368}
        textAnchor="middle"
        fill={C.inkFaint}
        fontSize={9}
        fontFamily="'JetBrains Mono', monospace"
      >
        f(x) = S + a₁x + a₂x²
      </text>
    </motion.g>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
  delay = 0,
  accentColor = C.accent,
}: {
  title: string;
  icon: typeof Key;
  children: React.ReactNode;
  delay?: number;
  accentColor?: string;
}) {
  return (
    <motion.div
      className="card-elevated p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Icon size={16} style={{ color: accentColor }} strokeWidth={1.5} />
        <span
          className="heading-card"
          style={{ fontSize: 14, color: C.inkLight }}
        >
          {title}
        </span>
      </div>
      <div className="h-px mb-3" style={{ backgroundColor: C.ruleLight }} />
      {children}
    </motion.div>
  );
}

function PartialSigCards() {
  return (
    <InfoCard title="Partial Signatures" icon={Key} delay={0.1}>
      <div className="flex flex-col gap-3">
        {PARTIAL_SIGS.map((ps, i) => (
          <motion.div
            key={ps.nodeId}
            className="p-2.5 rounded-lg"
            style={{ backgroundColor: `${C.gold}06` }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.2 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${C.gold}20`,
                  fontSize: 9,
                  fontWeight: 700,
                  color: C.gold,
                }}
              >
                {ps.nodeId}
              </div>
              <span
                className="mono-hash"
                style={{ fontSize: 10, color: C.inkMuted }}
              >
                {ps.formula}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-7">
              <Hash size={10} style={{ color: C.inkGhost }} />
              <span
                className="mono-hash"
                style={{ fontSize: 10, color: C.bronze }}
              >
                {ps.sig}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </InfoCard>
  );
}

function LagrangeCard() {
  const [sigCycling, setSigCycling] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSigCycling(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <InfoCard title="Lagrange Interpolation" icon={Lock} delay={0.1}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <Users size={12} style={{ color: C.inkFaint }} />
          <span className="body-small" style={{ fontSize: 12 }}>
            Interpolating from indices {'{'} 1, 3, 5 {'}'}
          </span>
        </div>

        <div className="h-px" style={{ backgroundColor: C.ruleLight }} />

        <div>
          <span
            className="body-small"
            style={{ fontSize: 11, color: C.inkFaint }}
          >
            Combined Signature:
          </span>
          <motion.div
            className="mono-hash mt-1 p-2 rounded-md"
            style={{
              backgroundColor: C.cream,
              fontSize: 11,
              color: C.bronze,
            }}
          >
            {sigCycling ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                0x computing...
              </motion.span>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                0xe7a3f91b2c4d...8f0a
              </motion.span>
            )}
          </motion.div>
        </div>

        <motion.p
          className="body-small"
          style={{ color: C.inkFaint, fontSize: 11, lineHeight: 1.6 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          The full secret was never reconstructed — only the signature.
        </motion.p>
      </div>
    </InfoCard>
  );
}

function VerificationCard() {
  return (
    <InfoCard title="Verification" icon={ShieldCheck} delay={0.1} accentColor={C.sage}>
      <div className="flex flex-col gap-3">
        <motion.div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ backgroundColor: `${C.sage}08` }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <ShieldCheck size={22} style={{ color: C.sage }} strokeWidth={1.5} />
          <span
            className="heading-card"
            style={{ color: C.sage, fontSize: 14 }}
          >
            Threshold Signature Valid
          </span>
        </motion.div>

        <div className="h-px" style={{ backgroundColor: C.ruleLight }} />

        <motion.p
          className="body-small"
          style={{ color: C.inkMuted, fontSize: 12, lineHeight: 1.7 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Security: Information-theoretic. Even infinite compute cannot recover S
          from fewer than 3 shares.
        </motion.p>

        <div className="h-px" style={{ backgroundColor: C.ruleLight }} />

        <div className="flex flex-col gap-1.5">
          <span
            className="body-small"
            style={{ fontSize: 11, color: C.inkFaint }}
          >
            Use Cases
          </span>
          {['Multi-party escrow', 'High-value authorization', 'Emergency revocation'].map(
            (uc, i) => (
              <motion.div
                key={uc}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <CheckCircle
                  size={11}
                  style={{ color: C.sage }}
                  strokeWidth={1.5}
                />
                <span className="body-small" style={{ fontSize: 12 }}>
                  {uc}
                </span>
              </motion.div>
            ),
          )}
        </div>
      </div>
    </InfoCard>
  );
}

export default function Scene15_ThresholdCrypto({
  step,
  onStepComplete,
}: SceneProps) {
  const [splitting, setSplitting] = useState(false);

  useEffect(() => {
    if (step >= STEP_DURATIONS.length) return;
    const timer = setTimeout(onStepComplete, STEP_DURATIONS[step]);
    return () => clearTimeout(timer);
  }, [step, onStepComplete]);

  useEffect(() => {
    if (step === 1) {
      const t = setTimeout(() => setSplitting(true), 400);
      return () => clearTimeout(t);
    }
    setSplitting(false);
  }, [step]);

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
          SCENE 15
        </motion.span>

        <motion.h1
          className="heading-display mt-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Threshold Cryptography
        </motion.h1>

        <motion.p
          className="body-text mt-2 max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Shamir secret sharing ensures the signing key never exists in one place.
          Any 3 of 5 holders can produce a valid signature.
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

      <div className="flex-1 px-12 max-w-6xl mx-auto w-full pb-8">
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
              <div className="flex flex-col items-center gap-6">
                <motion.svg
                  viewBox="0 0 520 200"
                  className="w-full"
                  style={{ maxWidth: 400, maxHeight: 200 }}
                >
                  <SVGDefs />
                  <OrbGlow visible={true} splitting={false} />
                </motion.svg>
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <span
                    className="heading-card"
                    style={{ color: C.gold, fontSize: 16 }}
                  >
                    Signing Secret S
                  </span>
                  <p
                    className="body-small mt-2"
                    style={{ color: C.inkMuted, maxWidth: 360 }}
                  >
                    The secret never exists in one place. It is split across
                    multiple holders using polynomial interpolation.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step >= 1 && (
            <motion.div
              key="crypto-view"
              className="flex gap-6 h-full"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex-1 min-w-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 520 400"
                  className="w-full"
                  style={{ maxWidth: 520, maxHeight: 420 }}
                >
                  <SVGDefs />

                  <OrbGlow
                    visible={step === 1}
                    splitting={splitting}
                  />

                  {step === 1 && splitting && (
                    <FragmentParticles active={true} />
                  )}

                  {step >= 1 && (
                    <PentagonNodes
                      step={step}
                      showSelected={step >= 2}
                    />
                  )}

                  {step === 1 && <PolynomialCurve visible={true} />}

                  {step === 3 && <ConvergenceAnimation active={true} />}

                  {step === 4 && (
                    <motion.g>
                      <motion.circle
                        cx={CENTER.x}
                        cy={CENTER.y}
                        r={30}
                        fill={`${C.sage}15`}
                        stroke={C.sage}
                        strokeWidth={2}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                      />
                      <motion.g
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                      >
                        <ShieldCheck
                          x={CENTER.x - 12}
                          y={CENTER.y - 12}
                          size={24}
                          style={{ color: C.sage }}
                          strokeWidth={1.5}
                        />
                      </motion.g>

                      <motion.circle
                        cx={CENTER.x}
                        cy={CENTER.y}
                        fill="none"
                        stroke={C.sage}
                        strokeWidth={1}
                        initial={{ r: 30, opacity: 0.6 }}
                        animate={{ r: 80, opacity: 0 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                    </motion.g>
                  )}
                </svg>
              </div>

              <div className="w-72 flex-shrink-0 flex flex-col gap-4">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="split-info"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <InfoCard title="Shamir Split" icon={Unlock} delay={0.1}>
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: `${C.gold}08` }}>
                            <span className="heading-card" style={{ fontSize: 20, color: C.gold }}>
                              3
                            </span>
                            <span className="body-small">of</span>
                            <span className="heading-card" style={{ fontSize: 20, color: C.gold }}>
                              5
                            </span>
                            <span className="body-small ml-1">
                              Threshold
                            </span>
                          </div>

                          <p className="body-small" style={{ fontSize: 12, lineHeight: 1.6 }}>
                            Any 3 shares can reconstruct S. Fewer than 3 reveals
                            zero information about the secret.
                          </p>

                          <div className="h-px" style={{ backgroundColor: C.ruleLight }} />

                          <div className="mono-hash p-2 rounded-md" style={{ backgroundColor: C.cream, fontSize: 10 }}>
                            f(x) = S + a₁x + a₂x²
                          </div>

                          <span className="body-small" style={{ fontSize: 11, color: C.inkFaint }}>
                            5 evaluation points on degree-2 polynomial
                          </span>
                        </div>
                      </InfoCard>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="sig-info"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <PartialSigCards />
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="lagrange-info"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <LagrangeCard />
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div
                      key="verify-info"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <VerificationCard />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
