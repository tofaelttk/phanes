import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Ban, Eye } from 'lucide-react';

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

const STEP_DURATIONS = [4000, 5000, 4000, 5000, 5000];
const PHASE_LABELS = [
  'Building Baseline',
  'Recording Transactions',
  'Profile Statistics',
  'Anomaly Detected',
  'Ensemble Scoring',
];

/* ------------------------------------------------------------------ */
/*  Deterministic transaction data                                     */
/* ------------------------------------------------------------------ */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

interface TxPoint {
  id: number;
  time: number;
  value: number;
}

const TX_POINTS: TxPoint[] = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  time: 40 + (i / 19) * 620,
  value: 1000 + seededRandom(i + 42) * 2000 + (seededRandom(i * 7) - 0.5) * 800,
}));

const CHART = {
  left: 60,
  right: 710,
  top: 30,
  bottom: 270,
  yMin: 0,
  yMax: 100000,
};

function valueToY(v: number): number {
  const p = (v - CHART.yMin) / (CHART.yMax - CHART.yMin);
  return CHART.bottom - p * (CHART.bottom - CHART.top);
}

function timeToX(t: number): number {
  return t;
}

/* ------------------------------------------------------------------ */
/*  Scatter Axes SVG                                                   */
/* ------------------------------------------------------------------ */
function ChartAxes() {
  const yTicks = [0, 25000, 50000, 75000, 100000];
  const xLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

  return (
    <g>
      {/* Y-axis */}
      <motion.line
        x1={CHART.left} y1={CHART.top - 5}
        x2={CHART.left} y2={CHART.bottom + 5}
        stroke={C.rule} strokeWidth={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6 }}
      />
      {/* X-axis */}
      <motion.line
        x1={CHART.left - 5} y1={CHART.bottom}
        x2={CHART.right + 5} y2={CHART.bottom}
        stroke={C.rule} strokeWidth={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      />

      {/* Y ticks */}
      {yTicks.map((v, i) => {
        const y = valueToY(v);
        return (
          <motion.g
            key={v}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
          >
            <line x1={CHART.left - 4} y1={y} x2={CHART.left} y2={y} stroke={C.rule} strokeWidth={1} />
            <line
              x1={CHART.left} y1={y} x2={CHART.right} y2={y}
              stroke={C.rule} strokeWidth={0.5} strokeDasharray="3 4" opacity={0.4}
            />
            <text
              x={CHART.left - 8} y={y + 3}
              textAnchor="end"
              fill={C.inkFaint} fontSize={8} fontFamily="monospace"
            >
              ${(v / 1000).toFixed(0)}K
            </text>
          </motion.g>
        );
      })}

      {/* X labels */}
      {xLabels.map((label, i) => {
        const x = CHART.left + (i / (xLabels.length - 1)) * (CHART.right - CHART.left);
        return (
          <motion.text
            key={label}
            x={x} y={CHART.bottom + 16}
            textAnchor="middle"
            fill={C.inkFaint} fontSize={8}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
          >
            {label}
          </motion.text>
        );
      })}

      {/* Axis labels */}
      <text
        x={16} y={(CHART.top + CHART.bottom) / 2}
        textAnchor="middle"
        fill={C.inkFaint} fontSize={8}
        transform={`rotate(-90, 16, ${(CHART.top + CHART.bottom) / 2})`}
      >
        Transaction Value
      </text>
      <text
        x={(CHART.left + CHART.right) / 2} y={CHART.bottom + 30}
        textAnchor="middle"
        fill={C.inkFaint} fontSize={8}
      >
        Time
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Scatter Dots                                                       */
/* ------------------------------------------------------------------ */
function ScatterDots({ visible, count }: { visible: boolean; count: number }) {
  if (!visible) return null;
  const shown = TX_POINTS.slice(0, count);

  return (
    <g>
      {shown.map((pt, i) => (
        <motion.g key={pt.id}>
          <motion.circle
            cx={timeToX(pt.time)}
            cy={valueToY(pt.value)}
            r={5}
            fill={C.gold}
            stroke={C.card}
            strokeWidth={1.5}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.85, scale: 1 }}
            transition={{
              delay: i * 0.12,
              duration: 0.35,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{
              transformOrigin: `${timeToX(pt.time)}px ${valueToY(pt.value)}px`,
            }}
          />
          {/* Subtle glow */}
          <motion.circle
            cx={timeToX(pt.time)}
            cy={valueToY(pt.value)}
            r={8}
            fill={C.gold}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0] }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
          />
        </motion.g>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Gaussian Bell Curve                                                */
/* ------------------------------------------------------------------ */
function GaussianCurve({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const mean = 2000;
  const sigma = 500;
  const points: string[] = [];

  for (let v = 500; v <= 3500; v += 30) {
    const z = (v - mean) / sigma;
    const g = Math.exp(-0.5 * z * z);
    const amplitude = 80;
    const y = valueToY(v) - g * amplitude;
    const x = timeToX((CHART.left + CHART.right) / 2 + (v - mean) * 0.15);
    points.push(`${x},${y}`);
  }

  const pathD = `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(' ')}`;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Filled area */}
      <motion.path
        d={`${pathD} L${points[points.length - 1].split(',')[0]},${CHART.bottom} L${points[0].split(',')[0]},${CHART.bottom} Z`}
        fill={C.gold}
        opacity={0}
        animate={{ opacity: 0.08 }}
        transition={{ duration: 1 }}
      />
      {/* Curve line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={C.bronze}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      {/* Mean line */}
      <motion.line
        x1={(CHART.left + CHART.right) / 2}
        y1={valueToY(mean) - 85}
        x2={(CHART.left + CHART.right) / 2}
        y2={valueToY(mean) + 10}
        stroke={C.bronze}
        strokeWidth={1}
        strokeDasharray="4 3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
      />

      {/* μ label */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <rect
          x={(CHART.left + CHART.right) / 2 - 45}
          y={valueToY(mean) - 100}
          width={90} height={18} rx={4}
          fill={C.card} stroke={C.bronze} strokeWidth={0.8}
        />
        <text
          x={(CHART.left + CHART.right) / 2}
          y={valueToY(mean) - 87}
          textAnchor="middle"
          fill={C.bronze} fontSize={9} fontWeight={600} fontFamily="monospace"
        >
          μ=$2,000 σ=$500
        </text>
      </motion.g>

      {/* Sigma bounds */}
      {[-1, 1].map((dir) => {
        const x = (CHART.left + CHART.right) / 2 + dir * 0.15 * 500;
        return (
          <motion.line
            key={dir}
            x1={x} y1={valueToY(mean + dir * sigma) - 30}
            x2={x} y2={valueToY(mean + dir * sigma) + 10}
            stroke={C.gold} strokeWidth={0.8} strokeDasharray="2 3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.2 }}
          />
        );
      })}

      {/* Baseline label */}
      <motion.text
        x={(CHART.left + CHART.right) / 2}
        y={CHART.bottom - 12}
        textAnchor="middle"
        fill={C.sage} fontSize={9} fontWeight={600}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        Behavioral baseline established
      </motion.text>
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Anomalous Point                                                    */
/* ------------------------------------------------------------------ */
function AnomalousPoint({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const anomalyX = 520;
  const anomalyY = valueToY(95000);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      style={{ transformOrigin: `${anomalyX}px ${anomalyY}px` }}
    >
      {/* Pulsing rings */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={anomalyX} cy={anomalyY}
          r={8}
          fill="none"
          stroke={C.rose}
          strokeWidth={1.5}
          animate={{
            r: [8, 22 + i * 8],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 1.8,
            delay: i * 0.4,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Main dot */}
      <motion.circle
        cx={anomalyX} cy={anomalyY}
        r={8}
        fill={C.rose}
        stroke={C.card}
        strokeWidth={2}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{ transformOrigin: `${anomalyX}px ${anomalyY}px` }}
      />

      {/* Alert icon */}
      <motion.text
        x={anomalyX} y={anomalyY - 16}
        textAnchor="middle"
        fill={C.rose} fontSize={14}
        animate={{ y: [anomalyY - 16, anomalyY - 20, anomalyY - 16] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        ⚠
      </motion.text>

      {/* Label */}
      <motion.g
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <rect
          x={anomalyX + 16} y={anomalyY - 22}
          width={160} height={40} rx={8}
          fill={C.card} stroke={C.rose} strokeWidth={1.5}
        />
        <text
          x={anomalyX + 28} y={anomalyY - 6}
          fill={C.rose} fontSize={11} fontWeight={700} fontFamily="monospace"
        >
          $95,000
        </text>
        <text
          x={anomalyX + 28} y={anomalyY + 8}
          fill={C.inkMuted} fontSize={8}
        >
          to unknown counterparty
        </text>
      </motion.g>

      {/* Connection line to cluster */}
      <motion.line
        x1={anomalyX} y1={anomalyY + 8}
        x2={anomalyX} y2={valueToY(3000)}
        stroke={C.rose} strokeWidth={1}
        strokeDasharray="3 3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      />
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Gauge Meter SVG                                                    */
/* ------------------------------------------------------------------ */
function GaugeMeter({
  label, score, delay: d, size = 72,
}: {
  label: string; score: number; delay: number; size?: number;
}) {
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const fillAngle = score * 180;

  const scoreColor = score >= 0.7 ? C.rose : score >= 0.5 ? C.terra : C.gold;

  const startAngle = 180;
  const endAngle = startAngle + fillAngle;

  function polarToCart(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  const arcStart = polarToCart(startAngle, r);
  const arcEnd = polarToCart(endAngle, r);
  const largeArc = fillAngle > 180 ? 1 : 0;
  const arcPath = `M${arcStart.x},${arcStart.y} A${r},${r} 0 ${largeArc} 1 ${arcEnd.x},${arcEnd.y}`;

  const bgStart = polarToCart(180, r);
  const bgEnd = polarToCart(360, r);
  const bgPath = `M${bgStart.x},${bgStart.y} A${r},${r} 0 0 1 ${bgEnd.x},${bgEnd.y}`;

  const needleAngle = 180 + score * 180;
  const needleTip = polarToCart(needleAngle, r - 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: d, duration: 0.4 }}
      style={{ textAlign: 'center' }}
    >
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke={C.ruleLight}
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d={arcPath}
          fill="none"
          stroke={scoreColor}
          strokeWidth={6}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: d + 0.2, duration: 1, ease: 'easeOut' }}
        />
        {/* Needle */}
        <motion.line
          x1={cx} y1={cy}
          x2={needleTip.x} y2={needleTip.y}
          stroke={C.ink}
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ rotate: -90 }}
          animate={{ rotate: 0 }}
          transition={{ delay: d + 0.3, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
        <circle cx={cx} cy={cy} r={3} fill={C.ink} />
        {/* Score */}
        <text
          x={cx} y={cy + 14}
          textAnchor="middle"
          fill={scoreColor}
          fontSize={12} fontWeight={700} fontFamily="monospace"
        >
          {score.toFixed(2)}
        </text>
      </svg>
      <div style={{ fontSize: 9, color: C.inkMuted, fontWeight: 500, marginTop: -2 }}>
        {label}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ensemble Scoring Panel                                             */
/* ------------------------------------------------------------------ */
function EnsemblePanel({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const detectors = [
    { label: 'Isolation Forest', score: 0.82, delay: 0.2 },
    { label: 'Markov Surprise', score: 0.65, delay: 0.5 },
    { label: 'Entropy Drift', score: 0.30, delay: 0.8 },
    { label: 'Z-Score', score: 0.95, delay: 1.1 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, width: '100%', maxWidth: 800,
      }}
    >
      {/* Gauge meters */}
      <motion.div
        style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
          background: C.card,
          border: `1.5px solid ${C.rule}`,
          borderRadius: 16,
          padding: '20px 24px',
          width: '100%',
        }}
      >
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 4,
        }}>
          <Eye size={14} color={C.bronze} />
          <span style={{ color: C.ink, fontSize: 13, fontWeight: 600 }}>Ensemble Scoring</span>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {detectors.map((d) => (
            <GaugeMeter key={d.label} {...d} />
          ))}
        </div>
      </motion.div>

      {/* Combined result */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
          width: '100%',
        }}
      >
        {/* Ensemble result card */}
        <motion.div
          style={{
            background: C.card,
            border: `1.5px solid ${C.rose}`,
            borderRadius: 14,
            padding: '16px 20px',
            flex: '1 1 220px',
            maxWidth: 300,
          }}
        >
          <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 8 }}>
            Combined Ensemble Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 28, fontWeight: 700, color: C.rose,
              fontFamily: 'monospace',
            }}>
              0.72
            </span>
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, type: 'spring' }}
              style={{
                background: `${C.rose}15`, color: C.rose,
                fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 10,
              }}
            >
              ANOMALY DETECTED
            </motion.span>
          </div>

          {/* Score bar */}
          <div style={{
            marginTop: 12, height: 6, borderRadius: 3,
            background: C.ruleLight, overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '72%' }}
              transition={{ duration: 1, delay: 1.6, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 3,
                background: `linear-gradient(90deg, ${C.gold}, ${C.rose})`,
              }}
            />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 4, fontSize: 8, color: C.inkFaint,
          }}>
            <span>0.0 Normal</span>
            <span>0.5 Threshold</span>
            <span>1.0 Anomaly</span>
          </div>
        </motion.div>

        {/* Circuit breaker card */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2, duration: 0.4 }}
          style={{
            background: C.card,
            border: `1.5px solid ${C.rose}`,
            borderRadius: 14,
            padding: '16px 20px',
            flex: '1 1 200px',
            maxWidth: 260,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={14} color={C.rose} />
            <span style={{ color: C.ink, fontSize: 13, fontWeight: 600 }}>Circuit Breaker</span>
          </div>

          {/* State transition */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0',
          }}>
            <span style={{
              background: `${C.sage}15`, color: C.sage,
              fontSize: 11, fontWeight: 700, padding: '3px 10px',
              borderRadius: 8,
            }}>
              CLOSED
            </span>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 32 }}
              transition={{ delay: 2.2, duration: 0.4 }}
              style={{ height: 2, background: C.rose, borderRadius: 1 }}
            />
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.4, type: 'spring' }}
              style={{
                background: `${C.rose}15`, color: C.rose,
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 8,
              }}
            >
              OPEN
            </motion.span>
          </div>

          {/* Rejected badge */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 12, padding: '8px 12px',
              background: `${C.rose}08`,
              borderRadius: 8,
              border: `1px solid ${C.rose}20`,
            }}
          >
            <Ban size={14} color={C.rose} />
            <span style={{ color: C.rose, fontSize: 12, fontWeight: 700 }}>
              Transaction REJECTED
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function Scene12_AnomalyDetection({ currentStep, onStepComplete }: Props) {
  useEffect(() => {
    if (currentStep >= STEP_DURATIONS.length) return;
    const timer = setTimeout(onStepComplete, STEP_DURATIONS[currentStep]);
    return () => clearTimeout(timer);
  }, [currentStep, onStepComplete]);

  const showDots = currentStep >= 1;
  const showCurve = currentStep >= 2;
  const showAnomaly = currentStep >= 3;
  const showEnsemble = currentStep >= 4;

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
        SCENE 12
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
        ML Anomaly Detection
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ color: C.inkMuted, fontSize: 13, margin: '4px 0 0', textAlign: 'center', maxWidth: 480 }}
      >
        ML ensemble catches behavioral anomalies in real-time
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
          color: currentStep >= 3 ? C.rose : C.bronze,
        }}
      >
        {PHASE_LABELS[currentStep] ?? PHASE_LABELS[4]}
      </motion.div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px' }}>
        {STEP_DURATIONS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              background: i <= currentStep ? (i >= 3 ? C.rose : C.gold) : C.rule,
              scale: i === currentStep ? [1, 1.25, 1] : 1,
            }}
            transition={{ scale: { duration: 1.2, repeat: Infinity } }}
            style={{ width: 8, height: 8, borderRadius: '50%' }}
          />
        ))}
      </div>

      {/* Step 0: Baseline building */}
      <AnimatePresence>
        {currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 16, marginTop: 40,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ color: C.bronze }}
            >
              <Activity size={32} />
            </motion.div>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ color: C.inkMuted, fontSize: 14 }}
            >
              Building behavioral baseline…
            </motion.p>
            {/* Animated dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, delay: i * 0.3, repeat: Infinity }}
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: C.bronze,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps 1-3: Scatter plot chart */}
      {currentStep >= 1 && currentStep <= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            width: '100%', maxWidth: 820,
            background: C.card,
            border: `1.5px solid ${C.rule}`,
            borderRadius: 18,
            padding: '16px 16px 8px',
            boxShadow: '0 2px 12px rgba(26,23,20,0.04)',
          }}
        >
          <svg viewBox="0 0 760 300" width="100%" style={{ display: 'block' }}>
            <ChartAxes />
            <ScatterDots visible={showDots} count={20} />
            <GaussianCurve visible={showCurve} />
            <AnomalousPoint visible={showAnomaly} />
          </svg>

          {/* Bottom info line */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '6px 8px', fontSize: 11, color: C.inkMuted,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Activity size={12} color={currentStep >= 3 ? C.rose : C.gold} />
            {currentStep === 1 && '20 transactions recorded. Building profile…'}
            {currentStep === 2 && 'Behavioral baseline established. Normal range: $1,000–$3,000'}
            {currentStep === 3 && (
              <span style={{ color: C.rose, fontWeight: 600 }}>
                ⚠ Anomalous transaction detected: $95,000 (47.5σ deviation)
              </span>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Step 4: Ensemble scoring */}
      <AnimatePresence>
        {showEnsemble && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: currentStep === 4 ? 0 : 16, width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <EnsemblePanel visible />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
