import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Check,
  ArrowRight,
  Activity,
  Users,
  PieChart,
  Zap,
  Lock,
} from 'lucide-react';

const C = {
  cream: '#F5F0E8',
  card: '#FFFFFF',
  ink: '#1A1714',
  inkLight: '#3D3831',
  inkMuted: '#6B6560',
  inkFaint: '#9C968F',
  rule: '#E8E2D9',
  ruleLight: '#F0EBE3',
  accent: '#B8956A',
  bronze: '#A0784E',
  gold: '#C4A872',
  sage: '#7D8B6A',
  rose: '#B05A5A',
  terra: '#B87A5E',
};

const rgba = (hex: string, a: number) => {
  const c = hex.replace('#', '');
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
};

interface Props {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const DURATIONS = [4000, 6000, 5000, 4000];

interface Factor {
  name: string;
  shortName: string;
  weight: number;
  score: number;
  icon: typeof Shield;
}

const FACTORS: Factor[] = [
  { name: 'Authority', shortName: 'AUTH', weight: 0.3, score: 0.0, icon: Lock },
  { name: 'Circuit Breaker', shortName: 'CB', weight: 0.25, score: 0.0, icon: Zap },
  { name: 'Anomaly', shortName: 'ANOM', weight: 0.2, score: 0.15, icon: Activity },
  { name: 'Counterparty', shortName: 'CPTY', weight: 0.15, score: 0.1, icon: Users },
  { name: 'Concentration', shortName: 'CONC', weight: 0.1, score: 0.05, icon: PieChart },
];

const TOTAL_SCORE = FACTORS.reduce((s, f) => s + f.score * f.weight, 0);

function scoreColor(score: number): string {
  if (score >= 0.5) return C.rose;
  if (score >= 0.2) return C.terra;
  if (score >= 0.05) return C.gold;
  return C.sage;
}

/* ────────────────────── TransactionCard ────────────────────── */

function TransactionCard({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.rule}`,
        padding: '16px 22px',
        maxWidth: 440,
        width: '100%',
        marginBottom: 20,
        boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: rgba(C.accent, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Shield size={16} color={C.accent} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
            Transaction Review
          </div>
          <div style={{ fontSize: 10, color: C.inkFaint }}>
            Pre-authorization risk check
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 16px',
          fontSize: 11,
        }}
      >
        <div>
          <span style={{ color: C.inkFaint }}>From: </span>
          <span style={{ color: C.ink, fontWeight: 500 }}>Agent Alpha</span>
        </div>
        <div>
          <span style={{ color: C.inkFaint }}>To: </span>
          <span style={{ color: C.ink, fontWeight: 500 }}>Agent Beta</span>
        </div>
        <div>
          <span style={{ color: C.inkFaint }}>Value: </span>
          <span style={{ color: C.ink, fontWeight: 700 }}>$25,000</span>
        </div>
        <div>
          <span style={{ color: C.inkFaint }}>Type: </span>
          <span style={{ color: C.ink, fontWeight: 500 }}>compute_task</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 10,
          fontSize: 10,
          color: C.inkFaint,
          fontFamily: 'monospace',
        }}
      >
        <ArrowRight size={10} />
        Agent Alpha → Agent Beta, $25,000, compute_task
      </div>
    </motion.div>
  );
}

/* ────────────────────── Radar Chart SVG ────────────────────── */

function RadarChart({
  visible,
  animated,
}: {
  visible: boolean;
  animated: boolean;
}) {
  const cx = 200;
  const cy = 190;
  const maxR = 140;
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
  const count = FACTORS.length;

  const angle = (i: number) => (Math.PI * 2 * i) / count - Math.PI / 2;

  const vertex = (i: number, r: number) => ({
    x: cx + r * maxR * Math.cos(angle(i)),
    y: cy + r * maxR * Math.sin(angle(i)),
  });

  const polygonPoints = (r: number) =>
    Array.from({ length: count }, (_, i) => {
      const v = vertex(i, r);
      return `${v.x},${v.y}`;
    }).join(' ');

  const scorePoints = FACTORS.map((f, i) => vertex(i, f.score));
  const scorePolygon = scorePoints.map((p) => `${p.x},${p.y}`).join(' ');

  const labelOffset = 22;

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        background: C.card,
        borderRadius: 14,
        border: `1px solid ${C.rule}`,
        padding: 20,
        maxWidth: 440,
        width: '100%',
        marginBottom: 16,
        boxShadow: `0 2px 12px ${rgba(C.ink, 0.05)}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.inkFaint,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        Risk Radar
      </div>

      <svg
        viewBox="0 0 400 380"
        style={{ width: '100%', maxHeight: 360 }}
      >
        {/* Grid rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={polygonPoints(r)}
            fill="none"
            stroke={C.ruleLight}
            strokeWidth={r === 1 ? 1.2 : 0.7}
            strokeDasharray={r === 1 ? 'none' : '3 3'}
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: count }, (_, i) => {
          const outer = vertex(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke={C.ruleLight}
              strokeWidth={0.7}
            />
          );
        })}

        {/* Score polygon (animated) */}
        <motion.polygon
          points={animated ? scorePolygon : polygonPoints(0)}
          fill={rgba(C.gold, 0.15)}
          stroke={C.gold}
          strokeWidth={1.5}
          initial={{ opacity: 0 }}
          animate={{
            opacity: animated ? 0.9 : 0,
            points: animated ? scorePolygon : polygonPoints(0),
          }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Score dots */}
        {animated &&
          scorePoints.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={C.card}
              stroke={scoreColor(FACTORS[i].score)}
              strokeWidth={2}
              initial={{ opacity: 0, r: 0 }}
              animate={{ opacity: 1, r: 4 }}
              transition={{ delay: 0.6 + i * 0.15, duration: 0.3 }}
            />
          ))}

        {/* Axis labels */}
        {FACTORS.map((f, i) => {
          const labelR = 1 + labelOffset / maxR;
          const pos = vertex(i, labelR);
          const a = angle(i);
          const textAnchor =
            Math.abs(Math.cos(a)) < 0.1
              ? 'middle'
              : Math.cos(a) > 0
                ? 'start'
                : 'end';
          const dy = Math.sin(a) > 0.3 ? 14 : Math.sin(a) < -0.3 ? -4 : 4;

          return (
            <g key={i}>
              <text
                x={pos.x}
                y={pos.y + dy}
                textAnchor={textAnchor}
                fontSize={10}
                fill={C.inkMuted}
                fontWeight={500}
              >
                {f.name}
              </text>
              <text
                x={pos.x}
                y={pos.y + dy + 13}
                textAnchor={textAnchor}
                fontSize={9}
                fill={C.inkFaint}
              >
                {(f.weight * 100).toFixed(0)}% · {f.score.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={2.5} fill={C.inkFaint} />

        {/* Ring labels */}
        {rings.map((r) => (
          <text
            key={r}
            x={cx + 4}
            y={cy - r * maxR + 10}
            fontSize={8}
            fill={C.inkFaint}
            opacity={0.6}
          >
            {r.toFixed(1)}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}

/* ────────────────────── Factor Bars ────────────────────── */

function FactorBar({
  factor,
  index,
  animated,
}: {
  factor: Factor;
  index: number;
  animated: boolean;
}) {
  const contribution = factor.score * factor.weight;
  const barColor = scoreColor(factor.score);
  const Icon = factor.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: animated ? 1 : 0, x: animated ? 0 : -10 }}
      transition={{ delay: index * 0.15, duration: 0.3 }}
      style={{ marginBottom: 10 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={12} color={barColor} />
          <span style={{ fontSize: 11, color: C.ink, fontWeight: 500 }}>
            {factor.name}
          </span>
          <span style={{ fontSize: 9, color: C.inkFaint }}>
            ({(factor.weight * 100).toFixed(0)}%)
          </span>
        </div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: C.inkMuted }}>
          {factor.score.toFixed(2)} × {factor.weight.toFixed(2)} ={' '}
          <span style={{ color: barColor, fontWeight: 600 }}>
            {contribution.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: C.ruleLight,
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{
            height: '100%',
            borderRadius: 3,
            background: barColor,
          }}
          initial={{ width: '0%' }}
          animate={{ width: animated ? `${factor.score * 100}%` : '0%' }}
          transition={{ duration: 0.8, delay: index * 0.15, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

function SumEquation({ visible }: { visible: boolean }) {
  const contributions = FACTORS.map((f) => (f.score * f.weight).toFixed(3));

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      style={{
        marginTop: 12,
        padding: '10px 14px',
        borderRadius: 8,
        background: rgba(C.rule, 0.3),
        fontFamily: 'monospace',
        fontSize: 11,
        color: C.inkMuted,
        textAlign: 'center',
        overflowX: 'auto',
      }}
    >
      {contributions.join(' + ')} ={' '}
      <span style={{ color: C.gold, fontWeight: 700 }}>
        {TOTAL_SCORE.toFixed(3)}
      </span>
    </motion.div>
  );
}

/* ────────────────────── Score Display ────────────────────── */

function ScoreDisplay({ visible }: { visible: boolean }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!visible) {
      setDisplayScore(0);
      return;
    }
    let frame = 0;
    const totalFrames = 40;
    const id = setInterval(() => {
      frame++;
      const t = frame / totalFrames;
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(TOTAL_SCORE * eased);
      if (frame >= totalFrames) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: C.card,
        borderRadius: 14,
        border: `1px solid ${C.rule}`,
        padding: '24px 28px',
        maxWidth: 440,
        width: '100%',
        boxShadow: `0 2px 12px ${rgba(C.ink, 0.05)}`,
      }}
    >
      {/* Score number */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: C.ink,
            lineHeight: 1,
          }}
        >
          {displayScore.toFixed(3)}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.inkFaint,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginTop: 4,
          }}
        >
          Risk Score
        </div>
      </div>

      {/* Risk level badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            padding: '5px 16px',
            borderRadius: 6,
            background: rgba(C.sage, 0.12),
            color: C.sage,
            textTransform: 'uppercase',
          }}
        >
          MINIMAL
        </motion.div>
      </div>

      {/* Tolerance bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            color: C.inkFaint,
            marginBottom: 4,
          }}
        >
          <span>0.00</span>
          <span>1.00</span>
        </div>
        <div
          style={{
            position: 'relative',
            height: 10,
            borderRadius: 5,
            background: `linear-gradient(to right, ${rgba(C.sage, 0.2)}, ${rgba(C.gold, 0.2)} 40%, ${rgba(C.terra, 0.2)} 70%, ${rgba(C.rose, 0.2)})`,
            border: `1px solid ${C.ruleLight}`,
          }}
        >
          {/* Threshold line */}
          <div
            style={{
              position: 'absolute',
              left: '60%',
              top: -4,
              bottom: -4,
              width: 2,
              background: C.rose,
              borderRadius: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '60%',
              top: -16,
              transform: 'translateX(-50%)',
              fontSize: 8,
              color: C.rose,
              fontWeight: 600,
            }}
          >
            0.60
          </div>

          {/* Score marker */}
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${TOTAL_SCORE * 100}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              position: 'absolute',
              top: -3,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: C.card,
              border: `2px solid ${C.sage}`,
              transform: 'translateX(-50%)',
              boxShadow: `0 1px 4px ${rgba(C.ink, 0.15)}`,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 8,
            color: C.inkFaint,
            marginTop: 6,
          }}
        >
          <span>LOW</span>
          <span>THRESHOLD</span>
          <span>HIGH</span>
        </div>
      </div>

      {/* Approved badge */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 8,
          background: rgba(C.sage, 0.08),
          border: `1px solid ${rgba(C.sage, 0.2)}`,
        }}
      >
        <Check size={16} color={C.sage} strokeWidth={3} />
        <span style={{ fontSize: 14, fontWeight: 700, color: C.sage }}>
          APPROVED
        </span>
      </motion.div>

      {/* Explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{
          marginTop: 12,
          fontSize: 11,
          color: C.inkFaint,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Behavioral profile updated. Circuit breaker remains{' '}
        <span style={{ fontWeight: 600, color: C.sage }}>CLOSED</span>.
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────── Main Scene ────────────────────── */

export default function Scene06_RiskAssessment({
  step,
  onStepComplete,
}: Props) {
  const [radarAnimated, setRadarAnimated] = useState(false);
  const [barsAnimated, setBarsAnimated] = useState(false);

  useEffect(() => {
    if (step < 0 || step >= DURATIONS.length) return;
    const t = setTimeout(onStepComplete, DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step, onStepComplete]);

  useEffect(() => {
    if (step < 1) return;
    const t = setTimeout(() => setRadarAnimated(true), 400);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step < 2) return;
    const t = setTimeout(() => setBarsAnimated(true), 200);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="scene-bg min-h-screen flex flex-col items-center overflow-hidden px-8 py-12 md:px-16 md:py-16">
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 20 }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.accent,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Scene 06
        </div>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: C.ink,
            margin: 0,
            marginBottom: 4,
          }}
        >
          Risk Assessment
        </h2>
        <p style={{ fontSize: 14, color: C.inkMuted, margin: 0 }}>
          Five-factor analysis before every transaction
        </p>
      </motion.div>

      {/* Step description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          style={{
            fontSize: 12,
            color: C.inkMuted,
            marginBottom: 20,
            textAlign: 'center',
            maxWidth: 450,
          }}
        >
          {step === 0 &&
            'Every action passes through the risk engine.'}
          {step === 1 &&
            'Five risk dimensions evaluated simultaneously on the radar.'}
          {step === 2 &&
            'Each factor contributes a weighted score to the composite risk.'}
          {step === 3 &&
            'Final score computed. Transaction cleared or blocked.'}
        </motion.div>
      </AnimatePresence>

      {/* Transaction card */}
      <TransactionCard visible={step >= 0} />

      {/* Two-column layout: radar + bars */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          maxWidth: 900,
          width: '100%',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {/* Radar chart */}
        {step >= 1 && (
          <RadarChart visible={step >= 1} animated={radarAnimated} />
        )}

        {/* Factor bars + equation */}
        {step >= 2 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: C.card,
              borderRadius: 14,
              border: `1px solid ${C.rule}`,
              padding: 20,
              maxWidth: 440,
              width: '100%',
              boxShadow: `0 2px 12px ${rgba(C.ink, 0.05)}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.inkFaint,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Factor Analysis
            </div>
            {FACTORS.map((f, i) => (
              <FactorBar
                key={i}
                factor={f}
                index={i}
                animated={barsAnimated}
              />
            ))}
            <SumEquation visible={barsAnimated} />
          </motion.div>
        )}
      </div>

      {/* Score result */}
      {step >= 3 && (
        <div style={{ marginTop: 16, maxWidth: 440, width: '100%' }}>
          <ScoreDisplay visible={step >= 3} />
        </div>
      )}
      </div>
    </div>
  );
}
