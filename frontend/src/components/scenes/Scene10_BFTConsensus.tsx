import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ShieldCheck, Zap,
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

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const STEP_DURATIONS = [5000, 5000, 5000, 5000, 5000];

interface NodeDef {
  id: number;
  x: number;
  y: number;
  label: string;
  isByzantine: boolean;
  isLeader: boolean;
}

const NODES: NodeDef[] = [
  { id: 0, x: 380, y: 72,  label: 'PRIMARY (Leader)', isByzantine: false, isLeader: true },
  { id: 1, x: 588, y: 225, label: 'Replica 1',        isByzantine: false, isLeader: false },
  { id: 2, x: 380, y: 378, label: 'Byzantine ✗',      isByzantine: true,  isLeader: false },
  { id: 3, x: 172, y: 225, label: 'Replica 3',        isByzantine: false, isLeader: false },
];

const NODE_R = 30;

const PHASE_LABELS: Record<number, string> = {
  0: 'IDLE',
  1: 'Phase 1: PRE-PREPARE',
  2: 'Phase 2: PREPARE',
  3: 'Phase 3: COMMIT',
  4: 'Execution & Result',
};

const PHASE_DESCS: Record<number, string> = {
  0: 'Tolerates 1 malicious node in a 4-node network. Requires 2f+1 = 3 agreement.',
  1: 'Leader broadcasts proposed block to all replicas.',
  2: 'Correct replicas exchange prepare votes to confirm receipt.',
  3: 'Replicas exchange commit votes — point of no return.',
  4: 'All correct replicas execute and produce matching state.',
};

type PhaseState =
  | 'IDLE'
  | 'PRE-PREPARED'
  | 'PREPARED'
  | 'COMMITTED'
  | 'EXECUTED';

const NODE_PHASES: PhaseState[][] = [
  ['IDLE',         'IDLE',         'IDLE', 'IDLE'],
  ['PRE-PREPARED', 'PRE-PREPARED', 'IDLE', 'PRE-PREPARED'],
  ['PREPARED',     'PREPARED',     'IDLE', 'PREPARED'],
  ['COMMITTED',    'COMMITTED',    'IDLE', 'COMMITTED'],
  ['EXECUTED',     'EXECUTED',     'IDLE', 'EXECUTED'],
];

const PHASE_COLORS: Record<PhaseState, string> = {
  IDLE: C.inkFaint,
  'PRE-PREPARED': C.bronze,
  PREPARED: C.gold,
  COMMITTED: C.sage,
  EXECUTED: C.sage,
};

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */
function edgePoints(
  x1: number, y1: number, x2: number, y2: number, r: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  return {
    sx: x1 + ux * (r + 4),
    sy: y1 + uy * (r + 4),
    ex: x2 - ux * (r + 4),
    ey: y2 - uy * (r + 4),
  };
}

function curvedPath(
  x1: number, y1: number, x2: number, y2: number, curve: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  return `M${x1},${y1} Q${mx + nx * curve},${my + ny * curve} ${x2},${y2}`;
}

function makeArrowPath(from: NodeDef, to: NodeDef, curve: number): string {
  const ep = edgePoints(from.x, from.y, to.x, to.y, NODE_R);
  return curvedPath(ep.sx, ep.sy, ep.ex, ep.ey, curve);
}

/* ------------------------------------------------------------------ */
/*  Replica Node                                                       */
/* ------------------------------------------------------------------ */
function ReplicaNode({
  node, phase, showHash, hashValue,
}: {
  node: NodeDef; phase: PhaseState;
  showHash?: boolean; hashValue?: string;
}) {
  const borderColor = node.isByzantine
    ? C.rose
    : node.isLeader
      ? C.bronze
      : C.rule;

  const phaseColor = node.isByzantine ? C.rose : PHASE_COLORS[phase];

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: node.id * 0.12,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
    >
      {/* Outer glow for leader */}
      {node.isLeader && (
        <motion.circle
          cx={node.x} cy={node.y} r={NODE_R + 8}
          fill="none" stroke={C.bronze} strokeWidth={1}
          opacity={0.2}
          animate={{ r: [NODE_R + 8, NODE_R + 14, NODE_R + 8] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={node.x} cy={node.y} r={NODE_R}
        fill={C.card}
        stroke={borderColor}
        strokeWidth={node.isByzantine ? 2 : 2.5}
        strokeDasharray={node.isByzantine ? '6 4' : 'none'}
      />

      {/* Inner circle */}
      <circle
        cx={node.x} cy={node.y} r={NODE_R - 6}
        fill={borderColor} opacity={0.06}
      />

      {/* Node number */}
      <text
        x={node.x} y={node.y + 5}
        textAnchor="middle"
        fill={node.isByzantine ? C.rose : C.ink}
        fontSize={16} fontWeight={700}
      >
        {node.id}
      </text>

      {/* Crown for leader */}
      {node.isLeader && (
        <motion.text
          x={node.x} y={node.y - NODE_R - 10}
          textAnchor="middle"
          fill={C.gold}
          fontSize={16}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          ★
        </motion.text>
      )}

      {/* X for byzantine */}
      {node.isByzantine && (
        <motion.text
          x={node.x + NODE_R + 10} y={node.y - NODE_R + 8}
          fill={C.rose}
          fontSize={14} fontWeight={700}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          style={{ transformOrigin: `${node.x + NODE_R + 10}px ${node.y - NODE_R + 8}px` }}
        >
          ✗
        </motion.text>
      )}

      {/* Label */}
      <text
        x={node.x}
        y={node.y + NODE_R + 18}
        textAnchor="middle"
        fill={node.isByzantine ? C.rose : C.inkLight}
        fontSize={10} fontWeight={600}
      >
        {node.label}
      </text>

      {/* Phase badge */}
      <motion.g
        key={phase}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <rect
          x={node.x - 38} y={node.y + NODE_R + 22}
          width={76} height={18} rx={9}
          fill={phaseColor} opacity={0.12}
        />
        <rect
          x={node.x - 38} y={node.y + NODE_R + 22}
          width={76} height={18} rx={9}
          fill="none" stroke={phaseColor} strokeWidth={0.8}
        />
        <text
          x={node.x} y={node.y + NODE_R + 35}
          textAnchor="middle"
          fill={phaseColor}
          fontSize={8} fontWeight={600}
        >
          {node.isByzantine && phase === 'IDLE' ? 'IDLE' : phase}
        </text>
      </motion.g>

      {/* State hash (step 4) */}
      <AnimatePresence>
        {showHash && hashValue && (
          <motion.g
            initial={{ opacity: 0, x: node.x < 380 ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <rect
              x={node.x - 36} y={node.y + NODE_R + 44}
              width={72} height={16} rx={4}
              fill={node.isByzantine ? C.rose : C.sage}
              opacity={0.08}
            />
            <text
              x={node.x} y={node.y + NODE_R + 55}
              textAnchor="middle"
              fill={node.isByzantine ? C.rose : C.sage}
              fontSize={7.5} fontWeight={500} fontFamily="monospace"
            >
              {hashValue}
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Execution flash */}
      {phase === 'EXECUTED' && !node.isByzantine && (
        <motion.circle
          cx={node.x} cy={node.y} r={NODE_R}
          fill={C.sage} opacity={0}
          animate={{ opacity: [0.3, 0], r: [NODE_R, NODE_R + 20] }}
          transition={{ duration: 0.8 }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        />
      )}
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Background Connections (thin lines between all nodes)              */
/* ------------------------------------------------------------------ */
function BackgroundConnections() {
  const pairs: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
  ];
  return (
    <g>
      {pairs.map(([a, b]) => {
        const nA = NODES[a];
        const nB = NODES[b];
        return (
          <motion.line
            key={`${a}-${b}`}
            x1={nA.x} y1={nA.y} x2={nB.x} y2={nB.y}
            stroke={C.rule} strokeWidth={1} strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ duration: 0.8, delay: 0.4 + a * 0.05 }}
          />
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated Arrow with traveling dot                                  */
/* ------------------------------------------------------------------ */
interface ArrowDef {
  from: number;
  to: number;
  label?: string;
  dropped?: boolean;
  curve?: number;
  delay?: number;
  color?: string;
}

function AnimatedArrow({ def }: { def: ArrowDef }) {
  const fromNode = NODES[def.from];
  const toNode = NODES[def.to];
  const curve = def.curve ?? 0;
  const d = makeArrowPath(fromNode, toNode, curve);
  const color = def.dropped ? C.rose : (def.color ?? C.bronze);
  const delay = def.delay ?? 0;

  const ep = edgePoints(fromNode.x, fromNode.y, toNode.x, toNode.y, NODE_R);
  const midX = (ep.sx + ep.ex) / 2;
  const midY = (ep.sy + ep.ey) / 2;
  const dx = ep.ex - ep.sx;
  const dy = ep.ey - ep.sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  const labelOff = (curve > 0 ? 1 : curve < 0 ? -1 : 1) * 14;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      {/* Path line */}
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: def.dropped ? 0.6 : 1 }}
        transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      />

      {/* Arrowhead (only if not dropped) */}
      {!def.dropped && (
        <motion.circle
          cx={ep.ex} cy={ep.ey} r={3.5}
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 1, duration: 0.3 }}
          style={{ transformOrigin: `${ep.ex}px ${ep.ey}px` }}
        />
      )}

      {/* Traveling dot */}
      <motion.circle
        r={4}
        fill={color}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          offsetDistance: ['0%', def.dropped ? '60%' : '100%'],
        }}
        transition={{
          duration: 1.4,
          delay: delay + 0.1,
          ease: 'easeInOut',
        }}
        style={{ offsetPath: `path("${d}")` } as React.CSSProperties}
      />

      {/* Message label */}
      {def.label && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.3 }}
        >
          <rect
            x={midX + nx * labelOff - 38}
            y={midY + ny * labelOff - 8}
            width={76} height={16} rx={4}
            fill={C.card} stroke={color} strokeWidth={0.8}
          />
          <text
            x={midX + nx * labelOff}
            y={midY + ny * labelOff + 4}
            textAnchor="middle"
            fill={color} fontSize={7.5} fontWeight={600} fontFamily="monospace"
          >
            {def.label}
          </text>
        </motion.g>
      )}

      {/* Dropped X mark */}
      {def.dropped && (
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.8, type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            transformOrigin: `${midX + nx * 6}px ${midY + ny * 6}px`,
          }}
        >
          <circle
            cx={midX + nx * 6} cy={midY + ny * 6} r={10}
            fill={C.rose} opacity={0.15}
          />
          <text
            x={midX + nx * 6} y={midY + ny * 6 + 4}
            textAnchor="middle"
            fill={C.rose} fontSize={12} fontWeight={700}
          >
            ✗
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Arrow Sets per Phase                                               */
/* ------------------------------------------------------------------ */
function getArrowsForStep(step: number): ArrowDef[] {
  if (step === 1) {
    return [
      { from: 0, to: 1, label: 'PP(v=0, seq=1)', curve: 12, delay: 0.2 },
      { from: 0, to: 2, label: 'PP(v=0, seq=1)', curve: 0, delay: 0.4, dropped: true },
      { from: 0, to: 3, label: 'PP(v=0, seq=1)', curve: -12, delay: 0.6 },
    ];
  }
  if (step === 2) {
    return [
      { from: 0, to: 1, curve: 12,  delay: 0.1, color: C.gold },
      { from: 1, to: 0, curve: 12,  delay: 0.3, color: C.gold },
      { from: 0, to: 3, curve: -12, delay: 0.2, color: C.gold },
      { from: 3, to: 0, curve: -12, delay: 0.4, color: C.gold },
      { from: 1, to: 3, curve: 12,  delay: 0.3, color: C.gold },
      { from: 3, to: 1, curve: 12,  delay: 0.5, color: C.gold },
    ];
  }
  if (step === 3) {
    return [
      { from: 0, to: 1, curve: 12,  delay: 0.1, color: C.sage },
      { from: 1, to: 0, curve: 12,  delay: 0.25, color: C.sage },
      { from: 0, to: 3, curve: -12, delay: 0.15, color: C.sage },
      { from: 3, to: 0, curve: -12, delay: 0.3, color: C.sage },
      { from: 1, to: 3, curve: 12,  delay: 0.2, color: C.sage },
      { from: 3, to: 1, curve: 12,  delay: 0.35, color: C.sage },
    ];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/*  Vote Counter Card                                                  */
/* ------------------------------------------------------------------ */
function VoteCounter({
  visible, phaseLabel, votes, quorum,
}: {
  visible: boolean; phaseLabel: string; votes: number; quorum: number;
}) {
  if (!visible) return null;
  const achieved = votes >= quorum;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      style={{
        background: C.card,
        border: `1.5px solid ${achieved ? C.sage : C.rule}`,
        borderRadius: 12,
        padding: '14px 18px',
        minWidth: 200,
      }}
    >
      <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 500, marginBottom: 8 }}>
        {phaseLabel} Votes
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 24, fontWeight: 700,
          color: achieved ? C.sage : C.bronze,
          fontFamily: 'monospace',
        }}>
          {votes}/{quorum}
        </span>
        <span style={{ fontSize: 11, color: C.inkFaint }}>
          (≥ quorum {quorum})
        </span>
        {achieved && (
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            style={{ color: C.sage, fontSize: 14, fontWeight: 700 }}
          >
            ✓
          </motion.span>
        )}
      </div>
      {/* Progress bar */}
      <div style={{
        marginTop: 10, height: 4, borderRadius: 2,
        background: C.ruleLight, overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(votes / quorum) * 100}%` }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: 2,
            background: achieved ? C.sage : C.gold,
          }}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quorum Certificate                                                 */
/* ------------------------------------------------------------------ */
function QuorumCertificateCard({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const sigs = [
    { node: 'Node 0', hex: '0x3a7f…c912' },
    { node: 'Node 1', hex: '0x8b2e…d4a1' },
    { node: 'Node 3', hex: '0xf1c0…7e38' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{
        background: C.card,
        border: `1.5px solid ${C.sage}`,
        borderRadius: 14,
        padding: '16px 20px',
        minWidth: 320,
        maxWidth: 360,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <ShieldCheck size={15} color={C.sage} />
        <span style={{ color: C.ink, fontSize: 13, fontWeight: 600 }}>Quorum Certificate</span>
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          style={{
            marginLeft: 'auto',
            background: `${C.sage}18`,
            color: C.sage,
            fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 8,
          }}
        >
          VALID ✓
        </motion.span>
      </div>

      <div style={{
        fontSize: 10, color: C.inkMuted, fontFamily: 'monospace',
        padding: '8px 10px',
        background: C.creamLight,
        borderRadius: 8,
        marginBottom: 10,
        lineHeight: 1.8,
      }}>
        <div>view: 0, seq: 1</div>
        <div>digest: 0xabc3f7…e192</div>
      </div>

      <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 6, fontWeight: 500 }}>
        3 Ed25519 Signatures
      </div>
      {sigs.map((s, i) => (
        <motion.div
          key={s.node}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '5px 0',
            borderTop: i > 0 ? `1px solid ${C.ruleLight}` : 'none',
          }}
        >
          <span style={{ fontSize: 10, color: C.inkLight }}>{s.node}</span>
          <span style={{ fontSize: 10, color: C.sage, fontFamily: 'monospace' }}>{s.hex}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Consensus Result Banner                                            */
/* ------------------------------------------------------------------ */
function ConsensusResult({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        background: C.card,
        border: `1.5px solid ${C.sage}`,
        borderRadius: 14,
        padding: '16px 20px',
        minWidth: 280,
        maxWidth: 320,
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 14,
          padding: '8px 12px',
          background: `${C.sage}10`,
          borderRadius: 10,
          border: `1px solid ${C.sage}30`,
        }}
      >
        <CheckCircle2 size={18} color={C.sage} />
        <span style={{ color: C.sage, fontSize: 15, fontWeight: 700 }}>
          Consensus Achieved
        </span>
      </motion.div>

      <div style={{ fontSize: 11, lineHeight: 1.8, color: C.inkMuted }}>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}
        >
          <ShieldCheck size={13} color={C.sage} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            <strong style={{ color: C.inkLight }}>Safety:</strong> No two correct replicas
            committed different values.
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.65 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}
        >
          <Zap size={13} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            <strong style={{ color: C.inkLight }}>Liveness:</strong> View change protocol
            recovers from faulty primaries.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Parameter Labels                                                   */
/* ------------------------------------------------------------------ */
function ParamLabels({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const params = [
    { label: 'n', value: '4', color: C.ink },
    { label: 'f', value: '1', color: C.rose },
    { label: 'quorum', value: '3', color: C.sage },
  ];
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      {params.map((p, i) => (
        <g key={p.label}>
          <rect
            x={320 + i * 56} y={208}
            width={48} height={22} rx={6}
            fill={C.card} stroke={C.rule} strokeWidth={1}
          />
          <text
            x={344 + i * 56} y={223}
            textAnchor="middle"
            fill={p.color} fontSize={9} fontWeight={600} fontFamily="monospace"
          >
            {p.label}={p.value}
          </text>
        </g>
      ))}
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Phase Header SVG                                                   */
/* ------------------------------------------------------------------ */
function PhaseHeaderSVG({ step }: { step: number }) {
  const label = PHASE_LABELS[step] ?? '';
  const color = step === 0 ? C.inkFaint
    : step === 1 ? C.bronze
    : step === 2 ? C.gold
    : step === 3 ? C.sage
    : C.sage;

  return (
    <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <rect
        x={290} y={195} width={180} height={24} rx={12}
        fill={color} opacity={0.08}
      />
      <rect
        x={290} y={195} width={180} height={24} rx={12}
        fill="none" stroke={color} strokeWidth={1}
      />
      <text
        x={380} y={211}
        textAnchor="middle"
        fill={color} fontSize={10} fontWeight={700}
      >
        {label}
      </text>
    </motion.g>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function Scene10_BFTConsensus({ step: _step, currentStep, onStepComplete }: Props) {
  useEffect(() => {
    if (currentStep >= STEP_DURATIONS.length) return;
    const timer = setTimeout(onStepComplete, STEP_DURATIONS[currentStep]);
    return () => clearTimeout(timer);
  }, [currentStep, onStepComplete]);

  const phases = NODE_PHASES[currentStep] ?? NODE_PHASES[0];
  const arrows = useMemo(() => getArrowsForStep(currentStep), [currentStep]);
  const showHashes = currentStep >= 4;
  const hashes = ['0xa7f3…b2c1', '0xa7f3…b2c1', '0xdead…beef', '0xa7f3…b2c1'];

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
        SCENE 10
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
        PBFT Three-Phase Commit
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ color: C.inkMuted, fontSize: 13, margin: '4px 0 0', textAlign: 'center', maxWidth: 520 }}
      >
        {PHASE_DESCS[currentStep]}
      </motion.p>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0 20px' }}>
        {STEP_DURATIONS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              background: i <= currentStep ? (i <= 1 ? C.bronze : i <= 3 ? C.gold : C.sage) : C.rule,
              scale: i === currentStep ? [1, 1.3, 1] : 1,
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
        transition={{ delay: 0.25, duration: 0.6 }}
        style={{
          width: '100%', maxWidth: 820,
          background: C.card,
          border: `1.5px solid ${C.rule}`,
          borderRadius: 18,
          padding: '10px 12px',
          boxShadow: '0 2px 12px rgba(26,23,20,0.04)',
        }}
      >
        <svg viewBox="0 0 760 460" width="100%" style={{ display: 'block' }}>
          {/* Subtle grid */}
          <defs>
            <pattern id="bftGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r={0.5} fill={C.rule} opacity={0.4} />
            </pattern>
          </defs>
          <rect width="760" height="460" fill="url(#bftGrid)" rx={12} />

          {/* Background connections */}
          <BackgroundConnections />

          {/* Phase header */}
          <PhaseHeaderSVG step={currentStep} />

          {/* Parameter labels (step 0) */}
          <ParamLabels visible={currentStep === 0} />

          {/* Animated arrows for current phase */}
          <AnimatePresence mode="wait">
            <motion.g
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {arrows.map((a, i) => (
                <AnimatedArrow key={`${currentStep}-${i}`} def={a} />
              ))}
            </motion.g>
          </AnimatePresence>

          {/* Replica nodes */}
          {NODES.map((node) => (
            <ReplicaNode
              key={node.id}
              node={node}
              phase={phases[node.id]}
              showHash={showHashes}
              hashValue={showHashes ? hashes[node.id] : undefined}
            />
          ))}
        </svg>
      </motion.div>

      {/* Bottom cards */}
      <AnimatePresence>
        {(currentStep === 2 || currentStep === 3) && (
          <motion.div
            key={`votes-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 16 }}
          >
            <VoteCounter
              visible
              phaseLabel={currentStep === 2 ? 'Prepare' : 'Commit'}
              votes={3}
              quorum={3}
            />
          </motion.div>
        )}

        {currentStep >= 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', gap: 16, marginTop: 16,
              flexWrap: 'wrap', justifyContent: 'center',
            }}
          >
            <QuorumCertificateCard visible />
            <ConsensusResult visible />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
