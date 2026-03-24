import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  AlertTriangle,
  Shield,
  Zap,
  Star,
  TrendingUp,
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

interface GNode {
  id: string;
  x: number;
  y: number;
  color: string;
  pageRank: number;
  waveOrder: number;
}

interface GEdge {
  from: string;
  to: string;
  weight: number;
}

const NODES: GNode[] = [
  { id: 'A', x: 300, y: 48, color: C.accent, pageRank: 0.18, waveOrder: 0 },
  { id: 'B', x: 478, y: 118, color: C.terra, pageRank: 0.09, waveOrder: 1 },
  { id: 'C', x: 510, y: 278, color: C.accent, pageRank: 0.15, waveOrder: 2 },
  { id: 'D', x: 392, y: 385, color: C.bronze, pageRank: 0.08, waveOrder: 2 },
  { id: 'E', x: 208, y: 385, color: C.terra, pageRank: 0.12, waveOrder: 2 },
  { id: 'F', x: 90, y: 278, color: C.bronze, pageRank: 0.07, waveOrder: 2 },
  { id: 'G', x: 122, y: 118, color: C.accent, pageRank: 0.06, waveOrder: 1 },
  { id: 'H', x: 300, y: 216, color: C.gold, pageRank: 0.11, waveOrder: 1 },
];

const EDGES: GEdge[] = [
  { from: 'A', to: 'B', weight: 3 },
  { from: 'A', to: 'G', weight: 2 },
  { from: 'A', to: 'H', weight: 4 },
  { from: 'B', to: 'C', weight: 3 },
  { from: 'B', to: 'D', weight: 2 },
  { from: 'B', to: 'H', weight: 1 },
  { from: 'C', to: 'D', weight: 2 },
  { from: 'C', to: 'H', weight: 3 },
  { from: 'D', to: 'E', weight: 1 },
  { from: 'D', to: 'F', weight: 4 },
  { from: 'E', to: 'F', weight: 3 },
  { from: 'E', to: 'H', weight: 2 },
  { from: 'F', to: 'B', weight: 3 },
  { from: 'F', to: 'G', weight: 2 },
  { from: 'G', to: 'H', weight: 3 },
];

const COLLUSION_CYCLE = ['D', 'F', 'B'];
const SYBIL_SUSPECTS = ['F', 'G'];
const SEED_NODES = ['A', 'C'];
const TOP_PAGERANK = [
  { id: 'A', score: 0.18 },
  { id: 'C', score: 0.15 },
  { id: 'E', score: 0.12 },
];

const STEP_DURATIONS = [4000, 6000, 5000, 5000, 4000];

function getNode(id: string): GNode {
  return NODES.find((n) => n.id === id)!;
}

function isCollusionEdge(edge: GEdge): boolean {
  const idx1 = COLLUSION_CYCLE.indexOf(edge.from);
  const idx2 = COLLUSION_CYCLE.indexOf(edge.to);
  if (idx1 === -1 || idx2 === -1) return false;
  return (
    (idx1 + 1) % COLLUSION_CYCLE.length === idx2 ||
    (idx2 + 1) % COLLUSION_CYCLE.length === idx1
  );
}

function GraphEdges({
  step,
  waveActive,
}: {
  step: number;
  waveActive: boolean;
}) {
  return (
    <g>
      {EDGES.map((edge, i) => {
        const from = getNode(edge.from);
        const to = getNode(edge.to);
        const isCollusion = isCollusionEdge(edge);

        let strokeColor = C.rule;
        let strokeWidth = edge.weight * 0.6 + 0.5;
        let opacity = 0.6;

        if (step === 1 && waveActive) {
          strokeColor = C.gold;
          opacity = 0.25;
        } else if (step === 1) {
          strokeColor = C.accent;
          opacity = 0.35;
        }

        if (step === 2) {
          if (isCollusion) {
            strokeColor = C.rose;
            strokeWidth = 3;
            opacity = 1;
          } else {
            opacity = 0.12;
            strokeColor = C.inkGhost;
          }
        }

        if (step === 3) {
          const touchesSybil =
            SYBIL_SUSPECTS.includes(edge.from) ||
            SYBIL_SUSPECTS.includes(edge.to);
          if (touchesSybil) {
            strokeColor = C.inkGhost;
            opacity = 0.3;
            strokeWidth = 1;
          } else {
            strokeColor = C.accent;
            opacity = 0.4;
          }
        }

        if (step === 4) {
          const touchesE = edge.from === 'E' || edge.to === 'E';
          const affectedNodes = ['C', 'F', 'H'];
          const touchesAffected =
            affectedNodes.includes(edge.from) ||
            affectedNodes.includes(edge.to);
          if (touchesE) {
            strokeColor = C.rose;
            opacity = 0.9;
            strokeWidth = 2.5;
          } else if (touchesAffected) {
            strokeColor = C.rose;
            opacity = 0.3;
          } else {
            opacity = 0.15;
          }
        }

        return (
          <motion.line
            key={`edge-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity, pathLength: 1 }}
            transition={{ duration: 0.6, delay: i * 0.04 }}
          />
        );
      })}

      {step === 2 &&
        EDGES.filter(isCollusionEdge).map((edge, i) => {
          const from = getNode(edge.from);
          const to = getNode(edge.to);
          return (
            <motion.line
              key={`collusion-glow-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={C.rose}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.15}
              filter="url(#glow-rose)"
            />
          );
        })}
    </g>
  );
}

function GraphNodes({
  step,
  wavePhase,
  showRankings,
}: {
  step: number;
  wavePhase: number;
  showRankings: boolean;
}) {
  return (
    <g>
      {NODES.map((node, i) => {
        const isTopRank =
          showRankings && TOP_PAGERANK.some((t) => t.id === node.id);
        const isSybil = step === 3 && SYBIL_SUSPECTS.includes(node.id);
        const isSeed = step === 3 && SEED_NODES.includes(node.id);
        const isCascadeTrigger = step === 4 && node.id === 'E';
        const isCascadeAffected =
          step === 4 && ['C', 'F', 'H'].includes(node.id);
        const isCollusionNode =
          step === 2 && COLLUSION_CYCLE.includes(node.id);

        const baseRadius = 18;
        let radius = baseRadius;
        let strokeColor = 'transparent';
        let strokeW = 0;
        let nodeOpacity = 1;

        if (isTopRank) {
          radius = 22;
          strokeColor = C.gold;
          strokeW = 3;
        }

        if (isCollusionNode) {
          strokeColor = C.rose;
          strokeW = 2.5;
        }

        if (isSybil) {
          nodeOpacity = 0.6;
          strokeColor = C.rose;
          strokeW = 1.5;
        }

        if (isSeed) {
          strokeColor = C.gold;
          strokeW = 2.5;
        }

        if (isCascadeTrigger) {
          strokeColor = C.rose;
          strokeW = 3;
        }

        if (isCascadeAffected) {
          strokeColor = `${C.rose}66`;
          strokeW = 2;
        }

        const shouldPulse =
          step === 1 && wavePhase >= node.waveOrder && wavePhase <= 6;

        return (
          <motion.g key={`node-${node.id}`}>
            {shouldPulse && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={baseRadius}
                fill="none"
                stroke={C.gold}
                strokeWidth={2}
                initial={{ r: baseRadius, opacity: 0.8 }}
                animate={{
                  r: [baseRadius, baseRadius + 20, baseRadius + 30],
                  opacity: [0.8, 0.3, 0],
                }}
                transition={{
                  duration: 1.2,
                  delay: node.waveOrder * 0.5,
                  repeat: 2,
                  repeatDelay: 0.8,
                }}
              />
            )}

            {isTopRank && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={radius + 6}
                fill="none"
                stroke={C.gold}
                strokeWidth={1}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                filter="url(#glow-gold)"
              />
            )}

            <motion.circle
              cx={node.x}
              cy={node.y}
              r={radius}
              fill={`url(#grad-${node.id})`}
              stroke={strokeColor}
              strokeWidth={strokeW}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: nodeOpacity }}
              transition={{
                type: 'spring',
                stiffness: 200,
                delay: 0.1 + i * 0.06,
              }}
            />

            <motion.text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={C.card}
              fontSize={12}
              fontWeight={600}
              fontFamily="Inter, system-ui, sans-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              style={{ pointerEvents: 'none' }}
            >
              {node.id}
            </motion.text>

            {isSybil && (
              <motion.g
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <rect
                  x={node.x - 22}
                  y={node.y - 38}
                  width={44}
                  height={18}
                  rx={4}
                  fill={C.rose}
                  opacity={0.9}
                />
                <text
                  x={node.x}
                  y={node.y - 26}
                  textAnchor="middle"
                  fill={C.card}
                  fontSize={9}
                  fontWeight={600}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  Sybil?
                </text>
              </motion.g>
            )}

            {isSeed && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                <polygon
                  points={starPoints(node.x + 22, node.y - 16, 7, 3.5, 5)}
                  fill={C.gold}
                />
              </motion.g>
            )}

            {isCascadeTrigger && (
              <>
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  fill="none"
                  stroke={C.rose}
                  strokeWidth={2}
                  initial={{ r: 18, opacity: 0.9 }}
                  animate={{ r: 120, opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  fill="none"
                  stroke={C.rose}
                  strokeWidth={1.5}
                  initial={{ r: 18, opacity: 0.7 }}
                  animate={{ r: 160, opacity: 0 }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeOut',
                    delay: 0.6,
                  }}
                />
              </>
            )}
          </motion.g>
        );
      })}
    </g>
  );
}

function starPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
): string {
  const result: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    result.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return result.join(' ');
}

function CollusionDots() {
  const cycleNodes = COLLUSION_CYCLE.map(getNode);

  return (
    <g>
      {[0, 0.33, 0.66].map((offset, di) => (
        <motion.circle
          key={`dot-${di}`}
          r={4}
          fill={C.rose}
          animate={{
            cx: [
              cycleNodes[0].x,
              cycleNodes[1].x,
              cycleNodes[2].x,
              cycleNodes[0].x,
            ],
            cy: [
              cycleNodes[0].y,
              cycleNodes[1].y,
              cycleNodes[2].y,
              cycleNodes[0].y,
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'linear',
            delay: offset * 2.5,
          }}
        />
      ))}
    </g>
  );
}

function TrustPropagation() {
  return (
    <g>
      {SEED_NODES.map((seedId) => {
        const seed = getNode(seedId);
        return (
          <motion.circle
            key={`trust-${seedId}`}
            cx={seed.x}
            cy={seed.y}
            fill="none"
            stroke={C.gold}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            initial={{ r: 20, opacity: 0.8 }}
            animate={{ r: 180, opacity: 0 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        );
      })}

      {SYBIL_SUSPECTS.map((sid) => {
        const sn = getNode(sid);
        return (
          <motion.rect
            key={`dim-${sid}`}
            x={sn.x - 28}
            y={sn.y - 28}
            width={56}
            height={56}
            rx={28}
            fill={C.cream}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
          />
        );
      })}
    </g>
  );
}

function SVGDefs() {
  return (
    <defs>
      {NODES.map((node) => (
        <radialGradient key={`grad-${node.id}`} id={`grad-${node.id}`}>
          <stop offset="0%" stopColor={node.color} stopOpacity={1} />
          <stop offset="100%" stopColor={node.color} stopOpacity={0.75} />
        </radialGradient>
      ))}

      <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor={C.gold} floodOpacity={0.5} />
        <feComposite in2="blur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="glow-rose" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feFlood floodColor={C.rose} floodOpacity={0.4} />
        <feComposite in2="blur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="shadow-soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="0" dy="2" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.08" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
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
  icon: typeof Share2;
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
      <div
        className="h-px mb-3"
        style={{ backgroundColor: C.ruleLight }}
      />
      {children}
    </motion.div>
  );
}

function RankingsCard({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <InfoCard title="PageRank Scores" icon={TrendingUp} delay={0.2}>
      <div className="flex flex-col gap-2.5">
        {TOP_PAGERANK.map((entry, i) => (
          <motion.div
            key={entry.id}
            className="flex justify-between items-center"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    i === 0 ? C.gold : i === 1 ? C.accent : C.terra,
                }}
              />
              <span className="body-small" style={{ color: C.ink }}>
                Node {entry.id}
              </span>
            </div>
            <span className="mono-hash" style={{ color: C.gold }}>
              {entry.score.toFixed(2)}
            </span>
          </motion.div>
        ))}
      </div>
      <motion.p
        className="body-small mt-3"
        style={{ color: C.inkFaint, fontSize: 12 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Trust propagation converged after 3 iterations.
        Higher PageRank indicates more trusted position in network.
      </motion.p>
    </InfoCard>
  );
}

function CollusionCard() {
  return (
    <InfoCard title="Circular Flow Detected" icon={AlertTriangle} delay={0.1} accentColor={C.rose}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="mono-hash" style={{ fontSize: 13, color: C.rose }}>
            D → F → B → D
          </span>
        </div>
        <div
          className="h-px"
          style={{ backgroundColor: C.ruleLight }}
        />
        {[
          { label: 'Reciprocity Score', value: '0.85' },
          { label: 'Suspicion Level', value: '0.78' },
          { label: 'Cycle Density', value: '1.00' },
          { label: 'Volume in Cycle', value: '$47,200' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            className="flex justify-between"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
          >
            <span className="body-small">{item.label}</span>
            <span className="mono-hash" style={{ color: C.rose }}>
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>
      <motion.p
        className="body-small mt-3"
        style={{ color: C.inkFaint, fontSize: 12 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Mutual transaction loop suggests possible collusion.
        Flagged for deeper analysis.
      </motion.p>
    </InfoCard>
  );
}

function SybilCard() {
  return (
    <InfoCard title="Sybil Analysis" icon={Shield} delay={0.1} accentColor={C.rose}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Star size={12} style={{ color: C.gold }} />
          <span className="body-small" style={{ color: C.ink }}>
            Seed nodes: A, C (verified identities)
          </span>
        </div>
        <div
          className="h-px"
          style={{ backgroundColor: C.ruleLight }}
        />
        {SYBIL_SUSPECTS.map((sid, i) => {
          const sn = getNode(sid);
          return (
            <motion.div
              key={sid}
              className="flex flex-col gap-1 p-2.5 rounded-lg"
              style={{ backgroundColor: `${C.rose}08` }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
            >
              <div className="flex justify-between">
                <span className="body-small" style={{ color: C.ink }}>
                  Node {sid}
                </span>
                <span
                  className="mono-hash"
                  style={{ color: C.rose, fontSize: 11 }}
                >
                  SUSPECT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="body-small">Trust/degree ratio</span>
                <span className="mono-hash" style={{ color: C.inkFaint }}>
                  {sid === 'F' ? '0.12' : '0.09'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="body-small">PageRank</span>
                <span className="mono-hash" style={{ color: C.inkFaint }}>
                  {sn.pageRank.toFixed(2)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <motion.p
        className="body-small mt-3"
        style={{ color: C.inkFaint, fontSize: 12 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Low trust-per-degree ratio — likely fake identities.
        Trust propagation from verified seeds dims at these nodes.
      </motion.p>
    </InfoCard>
  );
}

function CascadeCard() {
  return (
    <InfoCard title="Cascade Simulation" icon={Zap} delay={0.1} accentColor={C.rose}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: C.rose }}
          />
          <span className="body-small" style={{ color: C.ink }}>
            Trigger: Node E failure
          </span>
        </div>
        <div
          className="h-px"
          style={{ backgroundColor: C.ruleLight }}
        />
        {[
          { label: 'Avg Cascade Size', value: '2.3 nodes' },
          { label: 'Max Cascade Size', value: '4 nodes' },
          { label: 'Systemic Importance', value: '0.23' },
          { label: 'Affected Nodes', value: 'C, F, H' },
          { label: 'Recovery Time', value: '~12 min' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            className="flex justify-between"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
          >
            <span className="body-small">{item.label}</span>
            <span className="mono-hash" style={{ color: C.rose }}>
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>
      <motion.p
        className="body-small mt-3"
        style={{ color: C.inkFaint, fontSize: 12 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Node E's failure propagates to 3 connected nodes.
        Moderate systemic risk — not a critical single point of failure.
      </motion.p>
    </InfoCard>
  );
}

function NetworkGraphSVG({
  step,
  wavePhase,
  showRankings,
}: {
  step: number;
  wavePhase: number;
  showRankings: boolean;
}) {
  return (
    <motion.svg
      viewBox="0 0 600 430"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{ maxHeight: 420 }}
    >
      <SVGDefs />

      <GraphEdges step={step} waveActive={wavePhase < 6} />

      {step === 3 && <TrustPropagation />}

      <GraphNodes
        step={step}
        wavePhase={wavePhase}
        showRankings={showRankings}
      />

      {step === 2 && <CollusionDots />}

      {step === 1 && (
        <g>
          {EDGES.map((edge, i) => {
            const from = getNode(edge.from);
            const to = getNode(edge.to);
            return (
              <motion.circle
                key={`flow-${i}`}
                r={2.5}
                fill={C.gold}
                initial={{ opacity: 0 }}
                animate={{
                  cx: [from.x, to.x],
                  cy: [from.y, to.y],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.5 + i * 0.15,
                  repeat: 2,
                  repeatDelay: 0.5,
                }}
              />
            );
          })}
        </g>
      )}
    </motion.svg>
  );
}

export default function Scene13_GraphIntelligence({
  step,
  onStepComplete,
}: SceneProps) {
  const [wavePhase, setWavePhase] = useState(-1);
  const [showRankings, setShowRankings] = useState(false);

  useEffect(() => {
    if (step >= STEP_DURATIONS.length) return;
    const timer = setTimeout(onStepComplete, STEP_DURATIONS[step]);
    return () => clearTimeout(timer);
  }, [step, onStepComplete]);

  useEffect(() => {
    if (step !== 1) {
      setWavePhase(-1);
      setShowRankings(false);
      return;
    }
    let phase = 0;
    const interval = setInterval(() => {
      setWavePhase(phase);
      phase++;
      if (phase > 6) clearInterval(interval);
    }, 600);
    const rankTimer = setTimeout(() => setShowRankings(true), 4200);
    return () => {
      clearInterval(interval);
      clearTimeout(rankTimer);
    };
  }, [step]);

  return (
    <div
      className="scene-bg min-h-screen flex flex-col"
      style={{ background: `linear-gradient(180deg, ${C.creamLight} 0%, ${C.cream} 40%, ${C.creamDark} 100%)` }}
    >
      <div className="pt-14 pb-6 px-12 max-w-6xl mx-auto w-full">
        <motion.span
          className="section-label block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          SCENE 13
        </motion.span>

        <motion.h1
          className="heading-display mt-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Graph Intelligence
        </motion.h1>

        <motion.p
          className="body-text mt-2 max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Network-level trust analysis, collusion detection, and Sybil resistance
          through transaction graph topology.
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
              <div className="text-center max-w-lg">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <Share2
                    size={48}
                    style={{ color: C.accent }}
                    strokeWidth={1.2}
                    className="mx-auto mb-6"
                  />
                </motion.div>
                <motion.p
                  className="body-text"
                  style={{ color: C.inkMuted, lineHeight: 1.8 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Every transaction creates a connection. Every connection reveals
                  structure. AEOS analyzes the full agent interaction graph to
                  surface trust rankings, detect collusion rings, identify Sybil
                  attacks, and simulate failure cascades.
                </motion.p>
              </div>
            </motion.div>
          )}

          {step >= 1 && (
            <motion.div
              key="graph-view"
              className="flex gap-6 h-full"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex-1 min-w-0">
                <NetworkGraphSVG
                  step={step}
                  wavePhase={wavePhase}
                  showRankings={showRankings}
                />
              </div>

              <div className="w-72 flex-shrink-0 flex flex-col gap-4">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="rank-panel"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <InfoCard
                        title="PageRank Analysis"
                        icon={TrendingUp}
                        delay={0.1}
                      >
                        <p
                          className="body-small"
                          style={{ color: C.inkMuted, lineHeight: 1.7 }}
                        >
                          Trust waves propagate from each node to neighbors.
                          Nodes receiving more inbound trust accumulate higher
                          PageRank scores.
                        </p>
                      </InfoCard>
                      <div className="mt-4">
                        <RankingsCard visible={showRankings} />
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="collusion-panel"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <CollusionCard />
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="sybil-panel"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <SybilCard />
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div
                      key="cascade-panel"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <CascadeCard />
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
