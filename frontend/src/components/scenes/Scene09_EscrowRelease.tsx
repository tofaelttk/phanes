import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Shield, ArrowRight,
} from 'lucide-react';

const C = {
  cream: '#F5F0E8',
  creamLight: '#FAF7F1',
  card: '#FFFFFF',
  ink: '#1A1714',
  inkLight: '#3D3831',
  inkMuted: '#6B6560',
  inkFaint: '#9C968F',
  rule: '#E8E2D9',
  ruleLight: '#F0EBE3',
  bronze: '#B8956A',
  gold: '#C4A872',
  goldLight: '#D4BE92',
  sage: '#7D8B6A',
  rose: '#B05A5A',
  terra: '#B87A5E',
};

interface Props {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const STEP_DURATIONS = [4000, 4000, 5000, 4000];
const PHASE_LABELS = [
  'Escrow Locked',
  'Milestone Verified',
  'Funds Releasing',
  'Settlement Complete',
];

function useCounter(target: number, duration: number, active: boolean): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return val;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

/* ------------------------------------------------------------------ */
/*  SVG Agent Card                                                     */
/* ------------------------------------------------------------------ */
function AgentCardSVG({
  x, y, name, subtitle, color, showAmount, amountText, reputation, did,
}: {
  x: number; y: number; name: string; subtitle: string;
  color: string; showAmount?: boolean; amountText?: string;
  reputation?: string; did?: string;
}) {
  return (
    <motion.g
      initial={{ opacity: 0, x: x < 380 ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <rect
        x={x - 65} y={y - 52} width={130} height={104} rx={12}
        fill={C.card} stroke={C.rule} strokeWidth={1.5}
      />
      <rect
        x={x - 65} y={y - 52} width={130} height={4} rx={2}
        fill={color} opacity={0.6}
      />
      <circle cx={x} cy={y - 22} r={18} fill={color} opacity={0.1} />
      <circle cx={x} cy={y - 22} r={18} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={x} cy={y - 27} r={5.5} fill="none" stroke={color} strokeWidth={1.4} />
      <path
        d={`M${x - 9},${y - 14} Q${x - 9},${y - 20} ${x},${y - 20} Q${x + 9},${y - 20} ${x + 9},${y - 14}`}
        fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round"
      />
      <text x={x} y={y + 8} textAnchor="middle" fill={C.ink} fontSize={13} fontWeight={600}>
        {name}
      </text>
      <text x={x} y={y + 22} textAnchor="middle" fill={C.inkMuted} fontSize={9.5}>
        {subtitle}
      </text>
      {did && (
        <text x={x} y={y + 34} textAnchor="middle" fill={C.inkFaint} fontSize={8} fontFamily="monospace">
          {did}
        </text>
      )}
      {reputation && (
        <text x={x} y={y + 44} textAnchor="middle" fill={color} fontSize={9} fontWeight={500}>
          rep: {reputation}
        </text>
      )}
      <AnimatePresence>
        {showAmount && (
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <rect
              x={x - 42} y={y + 50} width={84} height={26} rx={8}
              fill={C.sage} opacity={0.12}
            />
            <rect
              x={x - 42} y={y + 50} width={84} height={26} rx={8}
              fill="none" stroke={C.sage} strokeWidth={1} opacity={0.4}
            />
            <text
              x={x} y={y + 67} textAnchor="middle"
              fill={C.sage} fontSize={12} fontWeight={700} fontFamily="monospace"
            >
              {amountText}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  SVG Vault                                                          */
/* ------------------------------------------------------------------ */
function VaultBody({
  unlocked, remaining, showRelease,
}: {
  unlocked: boolean; remaining: number; showRelease: boolean;
}) {
  const labelText = showRelease
    ? (remaining > 0 ? `$${fmt(remaining)} LOCKED` : 'VAULT EMPTY')
    : '$25,000 LOCKED';

  return (
    <g>
      <motion.rect
        x={295} y={95} width={170} height={130} rx={16}
        fill={C.card}
        stroke={unlocked ? C.sage : C.gold}
        strokeWidth={3}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: '380px 160px' }}
      />
      <motion.rect
        x={302} y={102} width={156} height={116} rx={12}
        fill="none" stroke={C.ruleLight} strokeWidth={1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.4 }}
      />
      {[310, 450].map((rx) => (
        <motion.g key={rx} initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 0.5 }}>
          <circle cx={rx} cy={110} r={3} fill="none" stroke={C.gold} strokeWidth={1} opacity={0.4} />
          <circle cx={rx} cy={110} r={1} fill={C.gold} opacity={0.3} />
          <circle cx={rx} cy={210} r={3} fill="none" stroke={C.gold} strokeWidth={1} opacity={0.4} />
          <circle cx={rx} cy={210} r={1} fill={C.gold} opacity={0.3} />
        </motion.g>
      ))}
      <motion.line
        x1={380} y1={102} x2={380} y2={218}
        stroke={C.ruleLight} strokeWidth={1} strokeDasharray="3 3"
        initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 0.5 }}
      />

      {/* Lock mechanism */}
      <g>
        <motion.rect
          x={366} y={142} width={28} height={22} rx={4}
          fill={unlocked ? C.sage : C.bronze}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        />
        <motion.circle
          cx={380} cy={150} r={3.5}
          fill={unlocked ? C.creamLight : C.cream}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        />
        <motion.rect
          x={379} y={150} width={2} height={7} rx={1}
          fill={unlocked ? C.creamLight : C.cream}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        />
        <motion.path
          d={
            unlocked
              ? 'M371,142 V132 Q371,122 380,122 Q389,122 389,132 V138'
              : 'M371,142 V134 Q371,124 380,124 Q389,124 389,134 V142'
          }
          fill="none"
          stroke={unlocked ? C.sage : C.bronze}
          strokeWidth={3.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: 1,
            y: unlocked ? -6 : 0,
            rotate: unlocked ? -30 : 0,
          }}
          transition={{
            pathLength: { delay: 0.5, duration: 0.6 },
            y: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
            rotate: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
          }}
          style={{ transformOrigin: '389px 142px' }}
        />
      </g>

      {unlocked && (
        <motion.circle
          cx={380} cy={148} r={30}
          fill="none"
          stroke={C.sage}
          strokeWidth={1}
          initial={{ opacity: 0.6, scale: 0.8 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ transformOrigin: '380px 148px' }}
        />
      )}

      <motion.text
        x={380} y={185}
        textAnchor="middle"
        fill={remaining === 0 && showRelease ? C.sage : C.ink}
        fontSize={11}
        fontWeight={600}
        fontFamily="monospace"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {labelText}
      </motion.text>
      {showRelease && remaining > 0 && (
        <motion.text
          x={380} y={200}
          textAnchor="middle"
          fill={C.inkFaint}
          fontSize={9}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Remaining: ${fmt(remaining)}
        </motion.text>
      )}
      {showRelease && remaining === 0 && (
        <motion.text
          x={380} y={200}
          textAnchor="middle"
          fill={C.sage}
          fontSize={9}
          fontWeight={500}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Remaining: $0
        </motion.text>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Connection Path                                                    */
/* ------------------------------------------------------------------ */
function ConnectionLine({
  x1, y1, x2, y2, active, delay = 0, dashed = false,
}: {
  x1: number; y1: number; x2: number; y2: number;
  active: boolean; delay?: number; dashed?: boolean;
}) {
  const cpY = Math.min(y1, y2) - 25;
  const midX = (x1 + x2) / 2;
  const d = `M${x1},${y1} Q${midX},${cpY} ${x2},${y2}`;
  return (
    <g>
      <motion.path
        d={d}
        fill="none"
        stroke={active ? C.gold : C.rule}
        strokeWidth={active ? 2 : 1.5}
        strokeDasharray={dashed ? '6 4' : 'none'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      />
      {active && (
        <motion.circle
          r={3}
          fill={C.gold}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            offsetDistance: ['0%', '100%'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: delay + 0.5 }}
          style={{ offsetPath: `path("${d}")` } as React.CSSProperties}
        />
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Gold Particles (release flow)                                      */
/* ------------------------------------------------------------------ */
function GoldParticles({ active, count = 12 }: { active: boolean; count?: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: i * 0.22,
      size: 2.5 + Math.random() * 3.5,
      yOff: (Math.random() - 0.5) * 36,
      isDollar: i % 4 === 0,
    })),
  [count]);

  if (!active) return null;

  const sx = 465;
  const ex = 600;
  const baseY = 160;

  return (
    <g>
      {particles.map((p) => (
        <motion.g key={p.id}>
          <motion.circle
            cx={sx} cy={baseY + p.yOff} r={p.size}
            fill={C.gold}
            initial={{ opacity: 0 }}
            animate={{
              cx: [sx, (sx + ex) / 2 + (Math.random() - 0.5) * 20, ex],
              cy: [baseY + p.yOff, baseY + p.yOff - 18, baseY + p.yOff + 4],
              opacity: [0, 0.85, 0],
              r: [p.size, p.size * 1.3, p.size * 0.4],
            }}
            transition={{ duration: 1.6, delay: p.delay, repeat: 2, ease: 'easeInOut' }}
          />
          {p.isDollar && (
            <motion.text
              x={sx} y={baseY + p.yOff + 3}
              textAnchor="middle"
              fill={C.gold}
              fontSize={9}
              fontWeight={700}
              initial={{ opacity: 0 }}
              animate={{
                x: [sx, (sx + ex) / 2 + 8, ex],
                y: [baseY + p.yOff + 3, baseY + p.yOff - 14, baseY + p.yOff + 6],
                opacity: [0, 0.75, 0],
              }}
              transition={{ duration: 1.8, delay: p.delay + 0.05, repeat: 2, ease: 'easeInOut' }}
            >
              $
            </motion.text>
          )}
        </motion.g>
      ))}
      {/* Glow along the path */}
      <motion.ellipse
        cx={(sx + ex) / 2} cy={baseY}
        rx={60} ry={20}
        fill={C.gold} opacity={0}
        animate={{ opacity: [0, 0.06, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Milestone Badge                                                    */
/* ------------------------------------------------------------------ */
function MilestoneBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.g
      initial={{ opacity: 0, y: 12, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <rect x={316} y={60} width={128} height={28} rx={14} fill={C.sage} opacity={0.1} />
      <rect x={316} y={60} width={128} height={28} rx={14} fill="none" stroke={C.sage} strokeWidth={1.5} />
      <circle cx={334} cy={74} r={7} fill={C.sage} opacity={0.15} />
      <text x={334} y={78} textAnchor="middle" fill={C.sage} fontSize={10} fontWeight={700}>✓</text>
      <text x={386} y={78} textAnchor="middle" fill={C.sage} fontSize={9.5} fontWeight={600}>
        computation_verified
      </text>
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Settlement Summary (HTML overlay)                                  */
/* ------------------------------------------------------------------ */
function SettlementSummary({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const rows = [
    { label: 'Escrowed', value: '$25,000', color: C.ink },
    { label: 'Released', value: '$25,000', color: C.sage },
    { label: 'Refunded', value: '$0', color: C.inkMuted },
    { label: 'Status', value: 'COMPLETE', color: C.sage, bold: true },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: C.card,
        border: `1.5px solid ${C.rule}`,
        borderRadius: 14,
        padding: '18px 22px',
        minWidth: 240,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Shield size={15} color={C.bronze} />
        <span style={{ color: C.ink, fontSize: 14, fontWeight: 600 }}>Settlement Summary</span>
      </div>
      {rows.map((r, i) => (
        <motion.div
          key={r.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 * i + 0.1, duration: 0.35 }}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 0',
            borderTop: i > 0 ? `1px solid ${C.ruleLight}` : 'none',
          }}
        >
          <span style={{ color: C.inkMuted, fontSize: 12 }}>{r.label}</span>
          <span style={{
            color: r.color, fontSize: 12,
            fontWeight: r.bold ? 700 : 600,
            fontFamily: 'monospace',
          }}>
            {r.value}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reputation Card (HTML overlay)                                     */
/* ------------------------------------------------------------------ */
function ReputationCard({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const agents = [
    { name: 'Alice', from: '0.00', to: '0.01', delta: '+0.01', color: C.bronze },
    { name: 'Bob', from: '0.75', to: '0.76', delta: '+0.01', color: C.sage },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: C.card,
        border: `1.5px solid ${C.rule}`,
        borderRadius: 14,
        padding: '18px 22px',
        minWidth: 260,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <TrendingUp size={15} color={C.sage} />
        <span style={{ color: C.ink, fontSize: 14, fontWeight: 600 }}>Reputation Update</span>
      </div>
      {agents.map((a, i) => (
        <motion.div
          key={a.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 * i + 0.25, duration: 0.35 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0',
            borderTop: i > 0 ? `1px solid ${C.ruleLight}` : 'none',
          }}
        >
          <span style={{ color: C.ink, fontSize: 12, fontWeight: 500 }}>{a.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: C.inkMuted, fontSize: 12, fontFamily: 'monospace' }}>{a.from}</span>
            <ArrowRight size={10} color={C.inkFaint} />
            <span style={{ color: a.color, fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
              {a.to}
            </span>
            <motion.span
              initial={{ opacity: 0, scale: 0.4, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.5 + i * 0.2 }}
              style={{
                background: `${C.sage}18`,
                color: C.sage,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 8,
                fontFamily: 'monospace',
              }}
            >
              {a.delta} ↑
            </motion.span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Release Counter (SVG)                                              */
/* ------------------------------------------------------------------ */
function ReleaseCounter({ value, visible }: { value: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.g
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <rect x={318} y={240} width={124} height={34} rx={10} fill={C.gold} opacity={0.08} />
      <rect x={318} y={240} width={124} height={34} rx={10} fill="none" stroke={C.gold} strokeWidth={1} opacity={0.3} />
      <text
        x={380} y={262}
        textAnchor="middle"
        fill={C.gold}
        fontSize={14}
        fontWeight={700}
        fontFamily="monospace"
      >
        ${fmt(value)} Released
      </text>
    </motion.g>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function Scene09_EscrowRelease({ step: _step, currentStep, onStepComplete }: Props) {
  const isUnlocked = currentStep >= 1;
  const showParticles = currentStep >= 2;
  const showSummary = currentStep >= 3;
  const released = useCounter(25000, 3200, showParticles);
  const remaining = Math.max(0, 25000 - released);

  useEffect(() => {
    if (currentStep >= STEP_DURATIONS.length) return;
    const timer = setTimeout(onStepComplete, STEP_DURATIONS[currentStep]);
    return () => clearTimeout(timer);
  }, [currentStep, onStepComplete]);

  return (
    <div style={{
      minHeight: '100vh',
      background: C.cream,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px 32px',
    }}>
      {/* Header */}
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          color: C.inkFaint, fontSize: 11, fontWeight: 600,
          letterSpacing: 2.5, textTransform: 'uppercase',
        }}
      >
        SCENE 09
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08 }}
        style={{
          color: C.ink, fontSize: 30, fontWeight: 700,
          margin: '6px 0 0', letterSpacing: -0.5,
        }}
      >
        Escrow Release
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        style={{ color: C.inkMuted, fontSize: 14, margin: '4px 0 0', textAlign: 'center' }}
      >
        Milestone verified — funds flow to the provider
      </motion.p>

      {/* Phase label */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          marginTop: 16,
          padding: '5px 16px',
          borderRadius: 20,
          background: C.card,
          border: `1px solid ${C.rule}`,
          fontSize: 12,
          fontWeight: 600,
          color: C.bronze,
        }}
      >
        {PHASE_LABELS[currentStep] ?? PHASE_LABELS[3]}
      </motion.div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0 24px' }}>
        {STEP_DURATIONS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              background: i <= currentStep ? C.bronze : C.rule,
              scale: i === currentStep ? [1, 1.25, 1] : 1,
            }}
            transition={{ scale: { duration: 1.2, repeat: Infinity } }}
            style={{ width: 8, height: 8, borderRadius: '50%' }}
          />
        ))}
      </div>

      {/* Main SVG */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          width: '100%', maxWidth: 820,
          background: C.card,
          border: `1.5px solid ${C.rule}`,
          borderRadius: 18,
          padding: '12px 16px',
          boxShadow: '0 2px 12px rgba(26,23,20,0.04)',
        }}
      >
        <svg viewBox="0 0 760 290" width="100%" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="vaultGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.gold} stopOpacity={0.08} />
              <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Background glow under vault */}
          <motion.ellipse
            cx={380} cy={170} rx={100} ry={60}
            fill="url(#vaultGlow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: isUnlocked ? 1 : 0.5 }}
            transition={{ duration: 0.8 }}
          />

          {/* Connection lines */}
          <ConnectionLine
            x1={160} y1={160} x2={295} y2={160}
            active={currentStep >= 0} delay={0.6} dashed
          />
          <ConnectionLine
            x1={465} y1={160} x2={600} y2={160}
            active={showParticles} delay={0.4}
          />

          {/* Milestone badge */}
          <MilestoneBadge visible={currentStep >= 1} />

          {/* Vault */}
          <VaultBody
            unlocked={isUnlocked}
            remaining={showParticles ? remaining : 25000}
            showRelease={showParticles}
          />

          {/* Alice */}
          <AgentCardSVG
            x={95} y={160}
            name="Alice"
            subtitle="Requester"
            color={C.bronze}
            did="did:aeos:a1b2..."
            reputation="0.00"
          />

          {/* Bob */}
          <AgentCardSVG
            x={665} y={160}
            name="Bob"
            subtitle="Provider"
            color={C.sage}
            did="did:aeos:c3d4..."
            reputation="0.75"
            showAmount={showParticles && released > 0}
            amountText={`+$${fmt(released)}`}
          />

          {/* Gold release particles */}
          <GoldParticles active={showParticles} count={12} />

          {/* Release counter */}
          <ReleaseCounter value={released} visible={showParticles} />
        </svg>
      </motion.div>

      {/* Bottom cards */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', gap: 20, marginTop: 20,
              flexWrap: 'wrap', justifyContent: 'center',
            }}
          >
            <SettlementSummary visible />
            <ReputationCard visible />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
