import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Shield,
  CheckCircle2, XCircle, ArrowRight, Hash,
  TrendingDown, Lock, Unlock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Palette                                                            */
/* ------------------------------------------------------------------ */
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
  sage: '#7D8B6A',
  rose: '#B05A5A',
  terra: '#B87A5E',
};

interface Props {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const STEP_DURATIONS = [4000, 5000, 5000, 5000, 4000];
const PHASE_LABELS = [
  'Contract Breach',
  'Dispute Filed',
  'Evidence Submission',
  'Auto-Resolution',
  'Resolution Applied',
];

/* ------------------------------------------------------------------ */
/*  Countdown hook                                                     */
/* ------------------------------------------------------------------ */
function useCountdown(from: number, durationMs: number, active: boolean): number {
  const [val, setVal] = useState(from);
  useEffect(() => {
    if (!active) { setVal(from); return; }
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / durationMs, 1);
      setVal(Math.max(0, Math.round(from * (1 - p))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, durationMs, active]);
  return val;
}

/* ------------------------------------------------------------------ */
/*  Contract Card SVG                                                  */
/* ------------------------------------------------------------------ */
function ContractCardSVG({
  countdown, expired,
}: {
  countdown: number; expired: boolean;
}) {
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <motion.g
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Card background */}
      <rect
        x={220} y={40} width={320} height={180} rx={14}
        fill={C.card} stroke={expired ? C.rose : C.rule} strokeWidth={expired ? 2 : 1.5}
      />
      {/* Top bar */}
      <rect
        x={220} y={40} width={320} height={6} rx={3}
        fill={expired ? C.rose : C.bronze}
      />

      {/* Contract icon */}
      <rect x={240} y={60} width={28} height={28} rx={8} fill={C.bronze} opacity={0.1} />
      <text x={254} y={80} textAnchor="middle" fill={C.bronze} fontSize={14}>📄</text>

      {/* Title */}
      <text x={280} y={73} fill={C.ink} fontSize={14} fontWeight={700}>
        Data Feed Service
      </text>
      <text x={280} y={88} fill={C.inkMuted} fontSize={10}>
        Contract #0x7f2a…e391
      </text>

      {/* Value */}
      <text x={500} y={73} textAnchor="end" fill={C.ink} fontSize={16} fontWeight={700} fontFamily="monospace">
        $15,000
      </text>

      {/* Divider */}
      <line x1={236} y1={100} x2={524} y2={100} stroke={C.ruleLight} strokeWidth={1} />

      {/* Deadline countdown */}
      <text x={254} y={122} fill={C.inkMuted} fontSize={10}>Delivery Deadline</text>

      {/* Timer display */}
      <motion.g>
        <rect
          x={236} y={130} width={120} height={36} rx={8}
          fill={expired ? C.rose : C.gold} opacity={0.08}
        />
        <rect
          x={236} y={130} width={120} height={36} rx={8}
          fill="none" stroke={expired ? C.rose : C.gold} strokeWidth={1}
        />
        <text
          x={296} y={154}
          textAnchor="middle"
          fill={expired ? C.rose : C.ink}
          fontSize={18} fontWeight={700} fontFamily="monospace"
        >
          {expired ? '00:00' : timeStr}
        </text>
      </motion.g>

      {/* Expired flash */}
      <AnimatePresence>
        {expired && (
          <motion.g
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <rect
              x={370} y={132} width={154} height={32} rx={8}
              fill={C.rose} opacity={0.12}
            />
            <rect
              x={370} y={132} width={154} height={32} rx={8}
              fill="none" stroke={C.rose} strokeWidth={1.5}
            />
            <text
              x={447} y={153}
              textAnchor="middle"
              fill={C.rose} fontSize={12} fontWeight={700}
            >
              DEADLINE EXPIRED
            </text>
            {/* Pulsing ring */}
            <motion.rect
              x={370} y={132} width={154} height={32} rx={8}
              fill="none" stroke={C.rose} strokeWidth={2}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 0], scale: [1, 1.06] }}
              transition={{ duration: 1.2, repeat: 2 }}
              style={{ transformOrigin: '447px 148px' }}
            />
          </motion.g>
        )}
      </AnimatePresence>

      {/* Bob indicator */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: expired ? 1 : 0.5 }}
        transition={{ delay: 0.5 }}
      >
        <circle cx={254} cy={192} r={10} fill={C.sage} opacity={0.1} />
        <text x={254} y={196} textAnchor="middle" fill={C.sage} fontSize={8} fontWeight={700}>B</text>
        <text x={272} y={196} fill={expired ? C.rose : C.inkMuted} fontSize={10}>
          {expired ? 'No delivery' : 'Pending…'}
        </text>
        {expired && (
          <motion.circle
            cx={240} cy={192} r={4}
            fill={C.rose}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.g>
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Dispute Card                                                       */
/* ------------------------------------------------------------------ */
function DisputeCard({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: C.card,
        borderTop: `3px solid ${C.rose}`,
        border: `1.5px solid ${C.rule}`,
        borderRadius: 14,
        padding: '18px 22px',
        width: '100%',
        maxWidth: 480,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Scale size={16} color={C.rose} />
        <span style={{ color: C.ink, fontSize: 14, fontWeight: 700 }}>Dispute Filed</span>
      </div>

      {[
        { label: 'Dispute ID', value: '0x9e3a…7f12', mono: true },
        { label: 'Reason', value: 'NON_DELIVERY', color: C.rose },
        { label: 'Damages', value: '$15,000', color: C.ink },
      ].map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.08 }}
          style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '7px 0',
            borderTop: i > 0 ? `1px solid ${C.ruleLight}` : 'none',
          }}
        >
          <span style={{ color: C.inkMuted, fontSize: 12 }}>{row.label}</span>
          <span style={{
            color: row.color ?? C.inkLight,
            fontSize: 12, fontWeight: 600,
            fontFamily: row.mono ? 'monospace' : 'inherit',
          }}>
            {row.value}
          </span>
        </motion.div>
      ))}

      {/* State transition */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 12, padding: '8px 12px',
          background: `${C.rose}08`, borderRadius: 8,
          border: `1px solid ${C.rose}20`,
        }}
      >
        <span style={{
          background: `${C.sage}15`, color: C.sage,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
        }}>
          ACTIVE
        </span>
        <ArrowRight size={12} color={C.inkFaint} />
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          style={{
            background: `${C.rose}15`, color: C.rose,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
          }}
        >
          DISPUTED
        </motion.span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ color: C.inkFaint, fontSize: 10, marginTop: 10 }}
      >
        Three-tier resolution: Auto → Committee → Appeal
      </motion.p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Evidence Pipeline SVG                                              */
/* ------------------------------------------------------------------ */
function EvidencePipeline({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const stages = [
    { label: 'SLA Violation Log', x: 60, icon: '📋' },
    { label: 'SHA-256', x: 220, icon: '⚙' },
    { label: 'Evidence Hash', x: 380, icon: '🔐' },
    { label: 'Pedersen Commit', x: 530, icon: '⚙' },
    { label: 'Commitment', x: 680, icon: '🔒' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        width: '100%', maxWidth: 800,
        background: C.card,
        border: `1.5px solid ${C.rule}`,
        borderRadius: 16,
        padding: '16px 12px',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 8px', marginBottom: 12,
      }}>
        <Hash size={14} color={C.bronze} />
        <span style={{ color: C.ink, fontSize: 13, fontWeight: 600 }}>Evidence Pipeline</span>
      </div>

      <svg viewBox="0 0 760 140" width="100%" style={{ display: 'block' }}>
        {/* Connection arrows */}
        {stages.slice(0, -1).map((s, i) => {
          const next = stages[i + 1];
          return (
            <motion.g key={i}>
              <motion.line
                x1={s.x + 40} y1={35}
                x2={next.x - 30} y2={35}
                stroke={C.bronze} strokeWidth={1.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.4 }}
              />
              {/* Traveling dot */}
              <motion.circle
                r={3} fill={C.gold}
                initial={{ cx: s.x + 40, cy: 35, opacity: 0 }}
                animate={{
                  cx: [s.x + 40, next.x - 30],
                  cy: 35,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.4 }}
              />
              <motion.polygon
                points={`${next.x - 30},30 ${next.x - 22},35 ${next.x - 30},40`}
                fill={C.bronze}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.4 }}
              />
            </motion.g>
          );
        })}

        {/* Stage nodes */}
        {stages.map((s, i) => (
          <motion.g
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.3, duration: 0.4 }}
          >
            <rect
              x={s.x - 30} y={14} width={60} height={42} rx={10}
              fill={i % 2 === 0 ? C.creamLight : `${C.bronze}08`}
              stroke={C.rule} strokeWidth={1}
            />
            <text
              x={s.x} y={33}
              textAnchor="middle"
              fill={C.ink} fontSize={14}
            >
              {s.icon}
            </text>
            <text
              x={s.x} y={50}
              textAnchor="middle"
              fill={C.inkMuted} fontSize={7} fontWeight={500}
            >
              {s.label}
            </text>
          </motion.g>
        ))}

        {/* Output hashes */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          <text x={380} y={82} textAnchor="middle" fill={C.inkFaint} fontSize={8}>
            Evidence Hash
          </text>
          <rect x={310} y={86} width={140} height={18} rx={4} fill={C.bronze} opacity={0.06} />
          <text
            x={380} y={99} textAnchor="middle"
            fill={C.bronze} fontSize={8.5} fontWeight={600} fontFamily="monospace"
          >
            0xb7e2…4f91a3d8
          </text>
        </motion.g>

        {/* Merkle tree visualization */}
        <motion.g
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          {/* Root */}
          <rect x={335} y={110} width={90} height={18} rx={4} fill={C.sage} opacity={0.1} />
          <rect x={335} y={110} width={90} height={18} rx={4} fill="none" stroke={C.sage} strokeWidth={0.8} />
          <text x={380} y={123} textAnchor="middle" fill={C.sage} fontSize={7} fontWeight={600} fontFamily="monospace">
            Root: 0xe1f…
          </text>
          {/* Branches */}
          <line x1={355} y1={110} x2={330} y2={106} stroke={C.sage} strokeWidth={0.8} opacity={0.5} />
          <line x1={405} y1={110} x2={430} y2={106} stroke={C.sage} strokeWidth={0.8} opacity={0.5} />
          <circle cx={330} cy={104} r={3} fill={C.sage} opacity={0.2} />
          <circle cx={430} cy={104} r={3} fill={C.sage} opacity={0.2} />
          {/* New leaf highlight */}
          <motion.circle
            cx={430} cy={104} r={5}
            fill="none" stroke={C.sage} strokeWidth={1}
            animate={{ opacity: [0.8, 0.2, 0.8], r: [5, 8, 5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.g>
      </svg>

      {/* Immutability note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', marginTop: 4,
          fontSize: 10, color: C.inkFaint,
        }}
      >
        <Lock size={10} color={C.inkFaint} />
        Evidence is immutable — cannot be retracted. Index: 0
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Auto-Resolution Checklist                                          */
/* ------------------------------------------------------------------ */
function AutoResolutionChecklist({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const checks = [
    { text: 'Delivery deadline passed', pass: false, delay: 0.2 },
    { text: 'No fulfillment proof from Bob', pass: false, delay: 0.5 },
    { text: 'Plaintiff (Alice) has no breaches', pass: true, delay: 0.8 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: C.card,
        border: `1.5px solid ${C.rule}`,
        borderRadius: 14,
        padding: '18px 22px',
        minWidth: 340,
        maxWidth: 440,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Shield size={15} color={C.bronze} />
        <span style={{ color: C.ink, fontSize: 13, fontWeight: 600 }}>Auto-Resolution Engine</span>
      </div>

      {checks.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: c.delay, duration: 0.4 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 0',
            borderTop: i > 0 ? `1px solid ${C.ruleLight}` : 'none',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: c.delay + 0.2, type: 'spring', stiffness: 300, damping: 20 }}
          >
            {c.pass ? (
              <CheckCircle2 size={16} color={C.sage} />
            ) : (
              <XCircle size={16} color={C.rose} />
            )}
          </motion.div>
          <span style={{ color: c.pass ? C.sage : C.rose, fontSize: 12 }}>
            {c.pass ? '✓' : '✗'} {c.text}
          </span>
        </motion.div>
      ))}

      {/* Verdict */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{
          marginTop: 14, padding: '8px 12px',
          background: `${C.sage}08`, borderRadius: 8,
          border: `1px solid ${C.sage}20`,
          fontSize: 11, color: C.inkMuted, lineHeight: 1.7,
        }}
      >
        <div>Defendant breached, plaintiff clear → <strong style={{ color: C.sage }}>FULL_REFUND</strong></div>
      </motion.div>

      {/* Resolution badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 260, damping: 20 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 12, padding: '6px 14px',
          background: `${C.sage}15`, borderRadius: 20,
          border: `1px solid ${C.sage}30`,
        }}
      >
        <CheckCircle2 size={14} color={C.sage} />
        <span style={{ color: C.sage, fontSize: 12, fontWeight: 700 }}>FULL_REFUND</span>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Resolution Applied                                                 */
/* ------------------------------------------------------------------ */
function ResolutionApplied({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const ledger = [
    { event: 'dispute_filed', hash: '0xa1b2…c3d4' },
    { event: 'evidence_submitted', hash: '0xd4e5…f6a7' },
    { event: 'dispute_resolved', hash: '0xf7a8…b9c0' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
        width: '100%', maxWidth: 800,
      }}
    >
      {/* Refund flow SVG */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          background: C.card,
          border: `1.5px solid ${C.rule}`,
          borderRadius: 14,
          padding: '16px 20px',
          flex: '1 1 260px',
          maxWidth: 320,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Unlock size={14} color={C.sage} />
          <span style={{ color: C.ink, fontSize: 13, fontWeight: 600 }}>Refund Flow</span>
        </div>

        <svg viewBox="0 0 280 100" width="100%" style={{ display: 'block' }}>
          {/* Escrow box */}
          <rect x={95} y={20} width={90} height={50} rx={10} fill={C.gold} opacity={0.08} />
          <rect x={95} y={20} width={90} height={50} rx={10} fill="none" stroke={C.gold} strokeWidth={1.5} />
          <text x={140} y={42} textAnchor="middle" fill={C.gold} fontSize={8} fontWeight={600}>Escrow</text>
          <text x={140} y={56} textAnchor="middle" fill={C.ink} fontSize={11} fontWeight={700} fontFamily="monospace">$15,000</text>

          {/* Alice box */}
          <rect x={0} y={28} width={60} height={36} rx={8} fill={C.card} stroke={C.bronze} strokeWidth={1.5} />
          <text x={30} y={51} textAnchor="middle" fill={C.bronze} fontSize={10} fontWeight={600}>Alice</text>

          {/* Arrow: Escrow → Alice */}
          <motion.line
            x1={95} y1={45} x2={65} y2={45}
            stroke={C.sage} strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
          <motion.polygon
            points="67,41 60,45 67,49"
            fill={C.sage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          />

          {/* Refund particles */}
          {[0, 1, 2, 3].map((i) => (
            <motion.circle
              key={i} r={2.5} fill={C.gold}
              initial={{ cx: 130, cy: 45, opacity: 0 }}
              animate={{
                cx: [130, 90, 50],
                cy: [45, 45 + (i - 1.5) * 6, 45 + (i - 1.5) * 3],
                opacity: [0, 0.8, 0],
              }}
              transition={{ duration: 1.2, delay: 0.4 + i * 0.15, repeat: 1 }}
            />
          ))}

          {/* Status */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <rect x={95} y={78} width={90} height={16} rx={4} fill={C.sage} opacity={0.1} />
            <text x={140} y={90} textAnchor="middle" fill={C.sage} fontSize={8} fontWeight={600}>
              RESOLVED
            </text>
          </motion.g>
        </svg>
      </motion.div>

      {/* Reputation + ledger card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          background: C.card,
          border: `1.5px solid ${C.rule}`,
          borderRadius: 14,
          padding: '16px 20px',
          flex: '1 1 260px',
          maxWidth: 340,
        }}
      >
        {/* Bob reputation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingDown size={14} color={C.rose} />
          <span style={{ color: C.ink, fontSize: 13, fontWeight: 600 }}>Reputation Impact</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            background: `${C.rose}06`, borderRadius: 8,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, color: C.ink, fontWeight: 500 }}>Bob</span>
          <span style={{ fontSize: 12, color: C.inkMuted, fontFamily: 'monospace' }}>0.76</span>
          <ArrowRight size={10} color={C.inkFaint} />
          <span style={{ fontSize: 12, color: C.rose, fontWeight: 700, fontFamily: 'monospace' }}>0.71</span>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
            style={{
              background: `${C.rose}15`, color: C.rose,
              fontSize: 10, fontWeight: 700, padding: '2px 7px',
              borderRadius: 8, fontFamily: 'monospace',
            }}
          >
            -0.05 ↓
          </motion.span>
        </motion.div>

        {/* Ledger entries */}
        <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 500, marginBottom: 8 }}>
          Ledger Entries
        </div>
        {ledger.map((entry, i) => (
          <motion.div
            key={entry.event}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0',
              borderTop: i > 0 ? `1px solid ${C.ruleLight}` : 'none',
            }}
          >
            {/* Hash chain connector */}
            {i > 0 && (
              <div style={{
                position: 'absolute', left: -4, top: -6,
                width: 1, height: 12, background: C.rule,
              }} />
            )}
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === 2 ? C.sage : C.bronze,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: C.inkLight, flex: 1 }}>{entry.event}</span>
            <span style={{ fontSize: 9, color: C.inkFaint, fontFamily: 'monospace' }}>{entry.hash}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function Scene11_DisputeResolution({ step: _step, currentStep, onStepComplete }: Props) {
  const countdown = useCountdown(90, 3200, currentStep >= 0);
  const expired = countdown === 0 || currentStep >= 1;

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
      padding: '36px 24px 28px',
    }}>
      {/* Header */}
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          color: C.inkFaint, fontSize: 11, fontWeight: 600,
          letterSpacing: 2.5, textTransform: 'uppercase',
        }}
      >
        SCENE 11
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        style={{
          color: C.ink, fontSize: 28, fontWeight: 700,
          margin: '6px 0 0', letterSpacing: -0.5,
        }}
      >
        Dispute Resolution
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ color: C.inkMuted, fontSize: 13, margin: '4px 0 0', textAlign: 'center' }}
      >
        Automated arbitration when obligations are breached
      </motion.p>

      {/* Phase label */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          marginTop: 14,
          padding: '5px 16px',
          borderRadius: 20,
          background: C.card,
          border: `1px solid ${C.rule}`,
          fontSize: 12,
          fontWeight: 600,
          color: currentStep >= 3 ? C.sage : currentStep >= 1 ? C.rose : C.bronze,
        }}
      >
        {PHASE_LABELS[currentStep] ?? PHASE_LABELS[4]}
      </motion.div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px' }}>
        {STEP_DURATIONS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              background: i <= currentStep ? (i <= 2 ? C.rose : C.sage) : C.rule,
              scale: i === currentStep ? [1, 1.25, 1] : 1,
            }}
            transition={{ scale: { duration: 1.2, repeat: Infinity } }}
            style={{ width: 8, height: 8, borderRadius: '50%' }}
          />
        ))}
      </div>

      {/* Step 0: Contract with countdown */}
      {currentStep <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            width: '100%', maxWidth: 620,
            background: C.card,
            border: `1.5px solid ${C.rule}`,
            borderRadius: 18,
            padding: '12px 16px',
            boxShadow: '0 2px 12px rgba(26,23,20,0.04)',
          }}
        >
          <svg viewBox="0 0 760 240" width="100%" style={{ display: 'block' }}>
            <ContractCardSVG countdown={countdown} expired={expired} />
          </svg>
        </motion.div>
      )}

      {/* Step 1: Dispute card */}
      <AnimatePresence>
        {currentStep >= 1 && currentStep < 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 16, width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <DisputeCard visible />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2: Evidence pipeline */}
      <AnimatePresence>
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 16, width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <EvidencePipeline visible />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 3: Auto-resolution */}
      <AnimatePresence>
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}
          >
            <AutoResolutionChecklist visible />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 4: Resolution applied */}
      <AnimatePresence>
        {currentStep >= 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 16, width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <ResolutionApplied visible />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
