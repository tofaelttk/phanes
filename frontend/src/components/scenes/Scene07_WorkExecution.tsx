import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  FileText,
  Check,
  Settings,
  Box,
  Fingerprint,
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

const HEX = 'abcdef0123456789';
const rHex = (n: number) =>
  Array.from({ length: n }, () => HEX[Math.floor(Math.random() * 16)]).join('');
const rgba = (hex: string, a: number) => {
  const c = hex.replace('#', '');
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
};

interface Props {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const DURATIONS = [4000, 5000, 5000, 4000];
const PROOF_HASH = '8a3f7d19c2e6b054';
const GRID_COLS = 8;
const GRID_ROWS = 4;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

/* ────────────────────── CyclingHex ────────────────────── */

function CyclingHex({
  target,
  active,
  color = C.accent,
}: {
  target: string;
  active: boolean;
  color?: string;
}) {
  const [display, setDisplay] = useState(rHex(target.length));
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setDisplay(target);
      frameRef.current = 0;
      return;
    }
    let settled = 0;
    frameRef.current = 0;
    const id = setInterval(() => {
      frameRef.current++;
      if (frameRef.current % 3 === 0 && settled < target.length) settled++;
      setDisplay(
        target.slice(0, settled) +
          Array.from({ length: target.length - settled }, () =>
            HEX[Math.floor(Math.random() * 16)],
          ).join(''),
      );
      if (settled >= target.length) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [active, target]);

  return (
    <span
      style={{
        fontFamily: '"SF Mono","Fira Code",monospace',
        fontSize: 12,
        color,
        fontWeight: 600,
      }}
    >
      0x{display.slice(0, 12)}…
    </span>
  );
}

/* ────────────────────── TaskSpecCard ────────────────────── */

function TaskSpecCard({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const specs = [
    { label: 'Model', value: 'llama-4-405b' },
    { label: 'Input', value: '100K tokens' },
    { label: 'Output', value: '50K tokens' },
    { label: 'Max Latency', value: '5,000ms' },
    { label: 'SLA', value: '99.9%' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        gap: 16,
        maxWidth: 680,
        width: '100%',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
      }}
    >
      {/* Task spec */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.rule}`,
          padding: '16px 22px',
          flex: '1 1 320px',
          boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: rgba(C.gold, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={15} color={C.gold} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
            Task Specification
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 16px',
            fontSize: 11,
          }}
        >
          {specs.map((s) => (
            <div key={s.label}>
              <span style={{ color: C.inkFaint }}>{s.label}: </span>
              <span
                style={{
                  color: C.ink,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent card */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.rule}`,
          padding: '16px 20px',
          flex: '0 0 180px',
          boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: rgba(C.terra, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={14} color={C.terra} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
              Bob
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.inkFaint,
                fontFamily: 'monospace',
              }}
            >
              did:aeos:2e8f14…
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: C.terra,
            fontWeight: 500,
          }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Settings size={12} />
          </motion.div>
          Executing…
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────── Processing Grid SVG ────────────────────── */

function ProcessingGrid({
  visible,
  progress,
}: {
  visible: boolean;
  progress: number;
}) {
  const cellSize = 22;
  const gap = 4;
  const w = GRID_COLS * (cellSize + gap) - gap;
  const h = GRID_ROWS * (cellSize + gap) - gap;
  const filledCount = Math.floor(progress * TOTAL_CELLS);

  if (!visible) return null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', maxWidth: w, height: h }}
    >
      {Array.from({ length: TOTAL_CELLS }, (_, idx) => {
        const col = idx % GRID_COLS;
        const row = Math.floor(idx / GRID_COLS);
        const filled = idx < filledCount;
        return (
          <motion.rect
            key={idx}
            x={col * (cellSize + gap)}
            y={row * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx={3}
            fill={filled ? C.gold : C.ruleLight}
            stroke={filled ? rgba(C.gold, 0.5) : C.rule}
            strokeWidth={0.5}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: filled ? 1 : 0.4 }}
            transition={{ duration: 0.15 }}
          />
        );
      })}
    </svg>
  );
}

/* ────────────────────── NeuralNetwork SVG ────────────────────── */

function NeuralNetworkSVG({
  visible,
  litProgress,
}: {
  visible: boolean;
  litProgress: number;
}) {
  const layers = [4, 6, 2];
  const layerX = [40, 130, 220];
  const svgW = 260;
  const svgH = 160;

  const nodes = useMemo(() => {
    const result: Array<{ x: number; y: number; layer: number; idx: number }> = [];
    layers.forEach((count, li) => {
      const x = layerX[li];
      const spacing = svgH / (count + 1);
      for (let i = 0; i < count; i++) {
        result.push({ x, y: spacing * (i + 1), layer: li, idx: i });
      }
    });
    return result;
  }, []);

  const connections = useMemo(() => {
    const result: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      index: number;
    }> = [];
    let ci = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const fromNodes = nodes.filter((n) => n.layer === li);
      const toNodes = nodes.filter((n) => n.layer === li + 1);
      fromNodes.forEach((fn) => {
        toNodes.forEach((tn) => {
          result.push({
            x1: fn.x,
            y1: fn.y,
            x2: tn.x,
            y2: tn.y,
            index: ci++,
          });
        });
      });
    }
    return result;
  }, [nodes]);

  const totalConnections = connections.length;
  const litCount = Math.floor(litProgress * totalConnections);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div
        style={{
          fontSize: 9,
          color: C.inkFaint,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        Neural inference
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: svgW, height: svgH }}>
        {/* Connections */}
        {connections.map((c) => (
          <line
            key={c.index}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke={c.index < litCount ? C.gold : C.ruleLight}
            strokeWidth={c.index < litCount ? 1.2 : 0.5}
            opacity={c.index < litCount ? 0.7 : 0.3}
          />
        ))}
        {/* Nodes */}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={6}
            fill={C.card}
            stroke={litProgress > 0 ? C.gold : C.rule}
            strokeWidth={1.2}
          />
        ))}
        {/* Layer labels */}
        {['Input', 'Hidden', 'Output'].map((label, i) => (
          <text
            key={label}
            x={layerX[i]}
            y={svgH - 2}
            textAnchor="middle"
            fontSize={8}
            fill={C.inkFaint}
          >
            {label}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}

/* ────────────────────── DataBlockGrid ────────────────────── */

function DataBlockGrid({ visible }: { visible: boolean }) {
  const blocks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        hash: rHex(10),
      })),
    [],
  );

  if (!visible) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        maxWidth: 440,
        width: '100%',
      }}
    >
      {blocks.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          style={{
            background: C.card,
            borderRadius: 8,
            border: `1px solid ${C.rule}`,
            padding: '8px 10px',
            textAlign: 'center',
          }}
        >
          <Box size={12} color={C.inkFaint} style={{ marginBottom: 4 }} />
          <div
            style={{
              fontSize: 8,
              fontFamily: 'monospace',
              color: C.inkMuted,
            }}
          >
            0x{b.hash.slice(0, 6)}…
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ────────────────────── LatencyGauge SVG ────────────────────── */

function LatencyGauge({
  visible,
  value,
  max,
}: {
  visible: boolean;
  value: number;
  max: number;
}) {
  const cx = 120;
  const cy = 110;
  const r = 90;
  const ratio = value / max;
  const startAngle = Math.PI;
  const endAngle = 0;
  const needleAngle = startAngle - ratio * Math.PI;

  const arc = (startA: number, endA: number, radius: number) => {
    const sx = cx + radius * Math.cos(startA);
    const sy = cy - radius * Math.sin(startA);
    const ex = cx + radius * Math.cos(endA);
    const ey = cy - radius * Math.sin(endA);
    const largeArc = startA - endA > Math.PI ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
  };

  const ticks = [0, 1000, 2000, 3000, 4000, 5000];

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      style={{ textAlign: 'center' }}
    >
      <svg viewBox="0 0 240 130" style={{ width: '100%', maxWidth: 240, height: 130 }}>
        {/* Background arc */}
        <path
          d={arc(startAngle, endAngle, r)}
          fill="none"
          stroke={C.ruleLight}
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        <motion.path
          d={arc(startAngle, needleAngle, r)}
          fill="none"
          stroke={C.gold}
          strokeWidth={8}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        />

        {/* Tick marks */}
        {ticks.map((t) => {
          const a = startAngle - (t / max) * Math.PI;
          const ix = cx + (r - 14) * Math.cos(a);
          const iy = cy - (r - 14) * Math.sin(a);
          const ox = cx + (r + 4) * Math.cos(a);
          const oy = cy - (r + 4) * Math.sin(a);
          const lx = cx + (r + 14) * Math.cos(a);
          const ly = cy - (r + 14) * Math.sin(a);
          return (
            <g key={t}>
              <line
                x1={ix}
                y1={iy}
                x2={ox}
                y2={oy}
                stroke={C.inkFaint}
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly + 3}
                textAnchor="middle"
                fontSize={7}
                fill={C.inkFaint}
              >
                {(t / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={cx + (r - 20) * Math.cos(needleAngle)}
          y2={cy - (r - 20) * Math.sin(needleAngle)}
          stroke={C.ink}
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ x2: cx + (r - 20) * Math.cos(startAngle), y2: cy - (r - 20) * Math.sin(startAngle) }}
          animate={{ x2: cx + (r - 20) * Math.cos(needleAngle), y2: cy - (r - 20) * Math.sin(needleAngle) }}
          transition={{ duration: 1, delay: 0.3 }}
        />
        <circle cx={cx} cy={cy} r={4} fill={C.ink} />

        {/* Value */}
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={C.ink}
          fontFamily="monospace"
        >
          {value.toLocaleString()}ms
        </text>
      </svg>
    </motion.div>
  );
}

/* ────────────────────── ProofPipeline SVG ────────────────────── */

function ProofPipeline({
  visible,
  hashActive,
}: {
  visible: boolean;
  hashActive: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.rule}`,
        padding: '16px 20px',
        maxWidth: 560,
        width: '100%',
        boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
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
        Proof Generation Pipeline
      </div>

      <svg viewBox="0 0 520 60" style={{ width: '100%', height: 60 }}>
        <defs>
          <marker
            id="proof-arrow"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill={C.inkFaint} />
          </marker>
        </defs>

        {/* Box 1: Output */}
        <motion.rect
          x={4}
          y={12}
          width={90}
          height={36}
          rx={6}
          fill={rgba(C.gold, 0.08)}
          stroke={rgba(C.gold, 0.3)}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        />
        <text
          x={49}
          y={35}
          textAnchor="middle"
          fontSize={10}
          fill={C.inkMuted}
          fontFamily="monospace"
        >
          Output
        </text>

        {/* Arrow 1 */}
        <motion.path
          d="M 100 30 L 130 30"
          stroke={C.inkFaint}
          strokeWidth={1}
          fill="none"
          markerEnd="url(#proof-arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        />

        {/* Box 2: Agent DID */}
        <motion.rect
          x={136}
          y={12}
          width={100}
          height={36}
          rx={6}
          fill={rgba(C.terra, 0.08)}
          stroke={rgba(C.terra, 0.3)}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        />
        <text
          x={186}
          y={35}
          textAnchor="middle"
          fontSize={10}
          fill={C.terra}
          fontFamily="monospace"
        >
          Agent DID
        </text>

        {/* Arrow 2 */}
        <motion.path
          d="M 242 30 L 272 30"
          stroke={C.inkFaint}
          strokeWidth={1}
          fill="none"
          markerEnd="url(#proof-arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        />

        {/* Box 3: SHA-256 */}
        <motion.rect
          x={278}
          y={12}
          width={100}
          height={36}
          rx={6}
          fill={rgba(C.accent, 0.12)}
          stroke={C.accent}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        />
        <text
          x={328}
          y={35}
          textAnchor="middle"
          fontSize={10}
          fill={C.accent}
          fontWeight={600}
          fontFamily="monospace"
        >
          SHA-256
        </text>
        {/* Spinning gear indicator */}
        <motion.circle
          cx={364}
          cy={22}
          r={5}
          fill="none"
          stroke={C.accent}
          strokeWidth={1}
          strokeDasharray="4 2"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '364px 22px' }}
        />

        {/* Arrow 3 */}
        <motion.path
          d="M 384 30 L 414 30"
          stroke={C.inkFaint}
          strokeWidth={1}
          fill="none"
          markerEnd="url(#proof-arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        />

        {/* Box 4: Proof */}
        <motion.rect
          x={420}
          y={12}
          width={96}
          height={36}
          rx={6}
          fill={rgba(C.accent, 0.06)}
          stroke={rgba(C.accent, 0.3)}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        />
        <text
          x={468}
          y={35}
          textAnchor="middle"
          fontSize={10}
          fill={C.accent}
          fontFamily="monospace"
        >
          Proof
        </text>
      </svg>

      {/* Hash result */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Fingerprint size={14} color={C.accent} />
        <CyclingHex target={PROOF_HASH} active={hashActive} color={C.accent} />
      </div>

      {/* Explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          marginTop: 10,
          fontSize: 11,
          color: C.inkFaint,
          lineHeight: 1.5,
          borderTop: `1px solid ${C.ruleLight}`,
          paddingTop: 10,
        }}
      >
        The proof cryptographically binds output to agent identity. Tampering
        invalidates the proof.
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────── Main Scene ────────────────────── */

export default function Scene07_WorkExecution({
  step,
  onStepComplete,
}: Props) {
  const [gridProgress, setGridProgress] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [netProgress, setNetProgress] = useState(0);
  const [hashActive, setHashActive] = useState(false);

  useEffect(() => {
    if (step < 0 || step >= DURATIONS.length) return;
    const t = setTimeout(onStepComplete, DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step, onStepComplete]);

  useEffect(() => {
    if (step < 1) return;
    let frame = 0;
    const total = 80;
    const id = setInterval(() => {
      frame++;
      const t = frame / total;
      const eased = 1 - Math.pow(1 - t, 3);
      setGridProgress(eased);
      setTokenCount(Math.round(eased * 100000));
      setNetProgress(eased);
      if (frame >= total) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step < 3) return;
    const t = setTimeout(() => setHashActive(true), 600);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: C.cream,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px 32px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
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
          Scene 07
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
          Work Execution
        </h2>
        <p style={{ fontSize: 14, color: C.inkMuted, margin: 0 }}>
          Agent performs compute task and generates proof
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
            maxWidth: 460,
          }}
        >
          {step === 0 && 'Bob receives the task specification and begins execution.'}
          {step === 1 && 'Processing input tokens through the neural model…'}
          {step === 2 && 'Output generated. Verifying SLA compliance.'}
          {step === 3 && 'Generating cryptographic proof binding output to identity.'}
        </motion.div>
      </AnimatePresence>

      {/* Task spec */}
      <TaskSpecCard visible={step >= 0} />

      {/* Processing grid + neural net */}
      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            gap: 16,
            maxWidth: 680,
            width: '100%',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {/* Grid + progress */}
          <div
            style={{
              background: C.card,
              borderRadius: 12,
              border: `1px solid ${C.rule}`,
              padding: '16px 20px',
              flex: '1 1 280px',
              boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: C.inkFaint,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Processing Grid
            </div>
            <ProcessingGrid visible progress={gridProgress} />

            {/* Progress bar */}
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: C.inkMuted,
                  marginBottom: 4,
                }}
              >
                <span>Progress</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {Math.round(gridProgress * 100)}%
                </span>
              </div>
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
                    background: C.gold,
                  }}
                  animate={{ width: `${gridProgress * 100}%` }}
                />
              </div>
            </div>

            {/* Token counter */}
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                fontFamily: 'monospace',
                color: C.inkMuted,
              }}
            >
              Tokens:{' '}
              <span style={{ color: C.ink, fontWeight: 600 }}>
                {tokenCount.toLocaleString()}
              </span>{' '}
              / 100,000
            </div>
          </div>

          {/* Neural network */}
          <div
            style={{
              background: C.card,
              borderRadius: 12,
              border: `1px solid ${C.rule}`,
              padding: '16px 20px',
              flex: '1 1 280px',
              boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
            }}
          >
            <NeuralNetworkSVG visible litProgress={netProgress} />
          </div>
        </motion.div>
      )}

      {/* Output section */}
      {step >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            gap: 16,
            maxWidth: 680,
            width: '100%',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          {/* Data blocks */}
          <div
            style={{
              background: C.card,
              borderRadius: 12,
              border: `1px solid ${C.rule}`,
              padding: '16px 20px',
              flex: '1 1 300px',
              boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.inkFaint,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Output Blocks
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: C.ink,
                  fontWeight: 600,
                }}
              >
                50,000 tokens
              </span>
            </div>
            <DataBlockGrid visible />
          </div>

          {/* Latency + SLA */}
          <div
            style={{
              background: C.card,
              borderRadius: 12,
              border: `1px solid ${C.rule}`,
              padding: '16px 20px',
              flex: '0 0 260px',
              boxShadow: `0 2px 10px ${rgba(C.ink, 0.05)}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: C.inkFaint,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Latency
            </div>
            <LatencyGauge visible value={2341} max={5000} />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: C.sage,
                fontWeight: 600,
              }}
            >
              <Check size={14} strokeWidth={3} />
              SLA Compliance (2,341ms &lt; 5,000ms)
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Proof pipeline */}
      {step >= 3 && <ProofPipeline visible hashActive={hashActive} />}
    </div>
  );
}
