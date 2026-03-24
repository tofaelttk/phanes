import { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  FileText,
  Lock,
  Cpu,
  DollarSign,
  Clock,
  AlertTriangle,
  Search,
  Sparkles,
  ArrowLeftRight,
  Shield,
} from 'lucide-react';

interface SceneProps {
  step: number;
  currentStep: number;
  onStepComplete: () => void;
}

const C = {
  cream: '#F5F0E8',
  creamDark: '#EDE7DD',
  card: '#FFFFFF',
  ink: '#1A1714',
  inkLight: '#3D3831',
  inkMuted: '#6B6560',
  inkFaint: '#9C968F',
  inkGhost: '#C4BEB6',
  border: '#E8E2D9',
  borderLight: '#F0EBE3',
  bronze: '#B8956A',
  bronzeDark: '#A0784E',
  sage: '#7D8B6A',
  rose: '#B05A5A',
  terra: '#B87A5E',
  gold: '#C4A872',
} as const;

const MONO = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const SANS = "'Inter',system-ui,sans-serif";
const HEX_CHARS = '0123456789abcdef';

const STEP_DURATIONS = [4000, 5000, 5000, 5000, 5000];

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy}`;
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startDeg));
  const sy = cy + r * Math.sin(toRad(startDeg));
  const ex = cx + r * Math.cos(toRad(endDeg));
  const ey = cy + r * Math.sin(toRad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
}

function randomHex(len: number): string {
  return Array.from({ length: len }, () =>
    HEX_CHARS[Math.floor(Math.random() * 16)],
  ).join('');
}

function useCyclingHex(target: string, active: boolean, charMs = 50) {
  const [display, setDisplay] = useState('');
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setDisplay('');
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const settled = Math.min(
        Math.floor(elapsed / charMs),
        target.length,
      );
      const chars = target.split('').map((ch, i) => {
        if (i < settled) return ch;
        if (!/[a-f0-9]/i.test(ch)) return ch;
        return HEX_CHARS[Math.floor(Math.random() * 16)];
      });
      setDisplay(chars.join(''));
      if (settled < target.length) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, charMs]);

  return display || (active ? randomHex(target.length) : '');
}

function ForeignIcon({
  x,
  y,
  size,
  children,
}: {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
}) {
  return (
    <foreignObject
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </foreignObject>
  );
}

function StepWrapper({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <motion.div
      className="w-full flex flex-col items-center gap-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
      <motion.p
        className="text-center max-w-xl"
        style={{
          fontFamily: SANS,
          fontSize: '14px',
          lineHeight: '1.6',
          color: C.inkMuted,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {label}
      </motion.p>
    </motion.div>
  );
}

/* ─── Agent Node SVG ─── */
function AgentNodeSvg({
  x,
  y,
  name,
  did,
  accentColor,
  delay = 0,
}: {
  x: number;
  y: number;
  name: string;
  did: string;
  accentColor: string;
  delay?: number;
}) {
  const r = 30;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Outer pulse ring */}
      <motion.circle
        cx={x}
        cy={y}
        r={r + 10}
        fill="none"
        stroke={accentColor}
        strokeWidth={0.8}
        animate={{
          r: [r + 10, r + 16, r + 10],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={C.card}
        stroke={accentColor}
        strokeWidth={2}
      />
      {/* Bot icon */}
      <ForeignIcon x={x} y={y} size={28}>
        <Bot size={16} color={accentColor} strokeWidth={1.5} />
      </ForeignIcon>
      {/* Name */}
      <text
        x={x}
        y={y + r + 18}
        textAnchor="middle"
        fill={C.ink}
        fontSize={12}
        fontFamily={SANS}
        fontWeight={600}
      >
        {name}
      </text>
      {/* DID */}
      <text
        x={x}
        y={y + r + 33}
        textAnchor="middle"
        fill={accentColor}
        fontSize={9}
        fontFamily={MONO}
        letterSpacing="0.02em"
      >
        {did}
      </text>
    </motion.g>
  );
}

/* ─── Step 0: Two Agents ─── */
function TwoAgents() {
  return (
    <StepWrapper label="Two agents discover each other across the network. A potential economic interaction begins.">
      <svg
        viewBox="0 0 800 320"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <AgentNodeSvg
          x={180}
          y={140}
          name="Alice"
          did="did:aeos:alice:3f7a..."
          accentColor={C.bronze}
          delay={0.2}
        />
        <AgentNodeSvg
          x={620}
          y={140}
          name="Bob"
          did="did:aeos:bob:8c2e..."
          accentColor={C.terra}
          delay={0.4}
        />

        {/* Empty space indicator in center */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <line
            x1={280}
            y1={140}
            x2={520}
            y2={140}
            stroke={C.border}
            strokeWidth={1}
            strokeDasharray="4 8"
          />
          <text
            x={400}
            y={140}
            textAnchor="middle"
            fill={C.inkGhost}
            fontSize={10}
            fontFamily={SANS}
          >
            ?
          </text>
        </motion.g>

        {/* Decorative hexagons in background */}
        {[
          { x: 400, y: 60, r: 20 },
          { x: 350, y: 250, r: 15 },
          { x: 460, y: 230, r: 12 },
        ].map((h, i) => (
          <motion.polygon
            key={i}
            points={hexPoints(h.x, h.y, h.r)}
            fill="none"
            stroke={C.border}
            strokeWidth={0.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{
              delay: 1 + i * 0.3,
              duration: 3,
              repeat: Infinity,
            }}
          />
        ))}
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 1: Discovery ─── */
function Discovery() {
  const aliceX = 150;
  const bobX = 650;
  const cy = 160;
  const scanRings = [60, 100, 140, 180, 220];

  return (
    <StepWrapper label="Counterparty discovery — agents scan the network for compatible partners that match their requirements.">
      <svg
        viewBox="0 0 800 340"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        {/* Alice's scan rings */}
        {scanRings.map((r, i) => (
          <motion.path
            key={`ar${i}`}
            d={arcPath(aliceX, cy, r, -60, 60)}
            fill="none"
            stroke={C.bronze}
            strokeWidth={1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
            transition={{
              delay: 0.3 + i * 0.25,
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        ))}

        {/* Bob's scan rings */}
        {scanRings.map((r, i) => (
          <motion.path
            key={`br${i}`}
            d={arcPath(bobX, cy, r, 120, 240)}
            fill="none"
            stroke={C.terra}
            strokeWidth={1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
            transition={{
              delay: 0.5 + i * 0.25,
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        ))}

        {/* Agent nodes */}
        <AgentNodeSvg
          x={aliceX}
          y={cy}
          name="Alice"
          did="did:aeos:alice:3f7a..."
          accentColor={C.bronze}
          delay={0}
        />
        <AgentNodeSvg
          x={bobX}
          y={cy}
          name="Bob"
          did="did:aeos:bob:8c2e..."
          accentColor={C.terra}
          delay={0.1}
        />

        {/* Scanning label */}
        <motion.text
          x={400}
          y={100}
          textAnchor="middle"
          fill={C.inkFaint}
          fontSize={11}
          fontFamily={SANS}
          fontWeight={500}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Counterparty Discovery...
        </motion.text>

        {/* Sparkle when lines meet in center */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8] }}
          transition={{ delay: 1.5, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <ForeignIcon x={400} y={cy} size={28}>
            <Sparkles size={16} color={C.gold} strokeWidth={1.5} />
          </ForeignIcon>
        </motion.g>

        {/* Discovery particles flying between agents */}
        {[0, 1, 2].map((i) => (
          <circle key={`dp${i}`} r={2} fill={C.bronze} opacity={0.4}>
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              begin={`${i * 1}s`}
              path={`M ${aliceX + 40} ${cy} L ${bobX - 40} ${cy}`}
            />
            <animate
              attributeName="opacity"
              values="0;0.5;0"
              dur="3s"
              repeatCount="indefinite"
              begin={`${i * 1}s`}
            />
          </circle>
        ))}
        {[0, 1].map((i) => (
          <circle key={`dp2${i}`} r={2} fill={C.terra} opacity={0.4}>
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              begin={`${0.5 + i * 1.2}s`}
              path={`M ${bobX - 40} ${cy} L ${aliceX + 40} ${cy}`}
            />
            <animate
              attributeName="opacity"
              values="0;0.5;0"
              dur="3s"
              repeatCount="indefinite"
              begin={`${0.5 + i * 1.2}s`}
            />
          </circle>
        ))}

        {/* Search icons near agents */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5 }}
        >
          <ForeignIcon x={aliceX + 40} y={cy - 40} size={18}>
            <Search size={11} color={C.bronze} strokeWidth={1.5} />
          </ForeignIcon>
          <ForeignIcon x={bobX - 40} y={cy - 40} size={18}>
            <Search size={11} color={C.terra} strokeWidth={1.5} />
          </ForeignIcon>
        </motion.g>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 2: Contract Template ─── */
function ContractTemplate() {
  const fields = [
    { label: 'Type', value: 'Compute Task', Icon: FileText },
    { label: 'Service', value: 'ML Inference (llama-4-405b)', Icon: Cpu },
    { label: 'Price', value: '$25,000', Icon: DollarSign },
    { label: 'Deadline', value: '24 hours', Icon: Clock },
    { label: 'Penalty', value: '10%', Icon: AlertTriangle },
  ];

  const [visibleFields, setVisibleFields] = useState(0);

  useEffect(() => {
    const timers = fields.map((_, i) =>
      setTimeout(() => setVisibleFields(i + 1), 600 + i * 500),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const aliceX = 130;
  const bobX = 670;
  const cy = 200;
  const cardX = 250;
  const cardY = 60;
  const cardW = 300;
  const cardH = 280;

  return (
    <StepWrapper label="The contract template defines terms, service level, pricing, and penalties — all machine-readable.">
      <svg
        viewBox="0 0 800 400"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        {/* Agents (small) */}
        <AgentNodeSvg
          x={aliceX}
          y={cy}
          name="Alice"
          did="did:aeos:alice..."
          accentColor={C.bronze}
          delay={0}
        />
        <AgentNodeSvg
          x={bobX}
          y={cy}
          name="Bob"
          did="did:aeos:bob..."
          accentColor={C.terra}
          delay={0}
        />

        {/* Connection lines from agents to contract */}
        <motion.line
          x1={aliceX + 35}
          y1={cy}
          x2={cardX}
          y2={cy}
          stroke={C.border}
          strokeWidth={1}
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        />
        <motion.line
          x1={bobX - 35}
          y1={cy}
          x2={cardX + cardW}
          y2={cy}
          stroke={C.border}
          strokeWidth={1}
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        />

        {/* Contract card */}
        <motion.g
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Shadow */}
          <rect
            x={cardX + 3}
            y={cardY + 3}
            width={cardW}
            height={cardH}
            rx={12}
            fill={C.creamDark}
          />
          {/* Body */}
          <rect
            x={cardX}
            y={cardY}
            width={cardW}
            height={cardH}
            rx={12}
            fill={C.card}
            stroke={C.border}
            strokeWidth={1}
          />
          {/* Top accent */}
          <rect
            x={cardX}
            y={cardY}
            width={cardW}
            height={4}
            rx={2}
            fill={C.bronze}
          />

          {/* Header */}
          <ForeignIcon x={cardX + 24} y={cardY + 30} size={20}>
            <FileText size={12} color={C.bronze} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={cardX + 42}
            y={cardY + 34}
            fill={C.ink}
            fontSize={13}
            fontFamily={SANS}
            fontWeight={700}
          >
            Contract Template
          </text>

          {/* Divider */}
          <line
            x1={cardX + 16}
            y1={cardY + 50}
            x2={cardX + cardW - 16}
            y2={cardY + 50}
            stroke={C.borderLight}
            strokeWidth={1}
          />

          {/* Fields */}
          {fields.map((field, i) => {
            const fy = cardY + 70 + i * 42;
            const visible = i < visibleFields;
            return (
              <motion.g
                key={field.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: visible ? 1 : 0,
                  x: visible ? 0 : -10,
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Field icon */}
                <ForeignIcon x={cardX + 28} y={fy + 2} size={18}>
                  <field.Icon
                    size={11}
                    color={C.inkFaint}
                    strokeWidth={1.5}
                  />
                </ForeignIcon>
                {/* Label */}
                <text
                  x={cardX + 44}
                  y={fy}
                  fill={C.inkFaint}
                  fontSize={9}
                  fontFamily={SANS}
                  fontWeight={500}
                  letterSpacing="0.06em"
                >
                  {field.label.toUpperCase()}
                </text>
                {/* Value */}
                <text
                  x={cardX + 44}
                  y={fy + 16}
                  fill={C.ink}
                  fontSize={12}
                  fontFamily={MONO}
                  fontWeight={500}
                >
                  {visible ? field.value : ''}
                </text>
                {/* Divider */}
                {i < fields.length - 1 && (
                  <line
                    x1={cardX + 16}
                    y1={fy + 28}
                    x2={cardX + cardW - 16}
                    y2={fy + 28}
                    stroke={C.borderLight}
                    strokeWidth={0.5}
                  />
                )}
              </motion.g>
            );
          })}
        </motion.g>

        {/* Flowing particles to contract */}
        <circle r={2} fill={C.bronze} opacity={0.4}>
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            path={`M ${aliceX + 35} ${cy} L ${cardX} ${cy}`}
          />
        </circle>
        <circle r={2} fill={C.terra} opacity={0.4}>
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            begin="1.5s"
            path={`M ${bobX - 35} ${cy} L ${cardX + cardW} ${cy}`}
          />
        </circle>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 3: Obligations ─── */
function Obligations() {
  const aliceX = 130;
  const bobX = 670;
  const cy = 80;

  const oblCardW = 220;
  const oblCardH = 130;
  const leftOblX = 160;
  const rightOblX = 420;
  const oblY = 160;

  return (
    <StepWrapper label="Reciprocal obligations — Alice commits to payment, Bob commits to delivery. Both must be fulfilled for settlement.">
      <svg
        viewBox="0 0 800 380"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        {/* Agent labels at top */}
        <AgentNodeSvg
          x={aliceX}
          y={cy}
          name="Alice"
          did="did:aeos:alice..."
          accentColor={C.bronze}
          delay={0}
        />
        <AgentNodeSvg
          x={bobX}
          y={cy}
          name="Bob"
          did="did:aeos:bob..."
          accentColor={C.terra}
          delay={0.1}
        />

        {/* Connection lines down to obligation cards */}
        <motion.line
          x1={aliceX} y1={cy + 45} x2={leftOblX + oblCardW / 2} y2={oblY}
          stroke={C.bronze} strokeWidth={1} strokeDasharray="4 4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
        <motion.line
          x1={bobX} y1={cy + 45} x2={rightOblX + oblCardW / 2} y2={oblY}
          stroke={C.terra} strokeWidth={1} strokeDasharray="4 4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        />

        {/* ── Left Obligation: Payment ── */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <rect
            x={leftOblX + 2}
            y={oblY + 2}
            width={oblCardW}
            height={oblCardH}
            rx={10}
            fill={C.creamDark}
          />
          <rect
            x={leftOblX}
            y={oblY}
            width={oblCardW}
            height={oblCardH}
            rx={10}
            fill={C.card}
            stroke={C.bronze}
            strokeWidth={1}
          />
          <rect
            x={leftOblX}
            y={oblY}
            width={oblCardW}
            height={3}
            rx={1.5}
            fill={C.bronze}
          />
          <ForeignIcon x={leftOblX + 24} y={oblY + 26} size={22}>
            <DollarSign size={13} color={C.bronze} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={leftOblX + 42}
            y={oblY + 24}
            fill={C.inkFaint}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
            letterSpacing="0.06em"
          >
            OBLIGATION
          </text>
          <text
            x={leftOblX + 42}
            y={oblY + 40}
            fill={C.ink}
            fontSize={14}
            fontFamily={SANS}
            fontWeight={700}
          >
            Payment
          </text>
          <line
            x1={leftOblX + 12}
            y1={oblY + 52}
            x2={leftOblX + oblCardW - 12}
            y2={oblY + 52}
            stroke={C.borderLight}
            strokeWidth={0.5}
          />
          <text
            x={leftOblX + 16}
            y={oblY + 70}
            fill={C.inkFaint}
            fontSize={10}
            fontFamily={SANS}
          >
            Alice → Bob
          </text>
          <text
            x={leftOblX + 16}
            y={oblY + 88}
            fill={C.bronze}
            fontSize={16}
            fontFamily={MONO}
            fontWeight={700}
          >
            $25,000
          </text>
          {/* Lock icon */}
          <ForeignIcon x={leftOblX + oblCardW - 24} y={oblY + 80} size={20}>
            <Lock size={12} color={C.inkGhost} strokeWidth={1.5} />
          </ForeignIcon>
          {/* Status circle */}
          <circle
            cx={leftOblX + 16}
            cy={oblY + 112}
            r={5}
            fill="none"
            stroke={C.inkGhost}
            strokeWidth={1.5}
          />
          <text
            x={leftOblX + 28}
            y={oblY + 116}
            fill={C.inkFaint}
            fontSize={9}
            fontFamily={SANS}
          >
            Unfulfilled
          </text>
        </motion.g>

        {/* ── Right Obligation: Delivery ── */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <rect
            x={rightOblX + 2}
            y={oblY + 2}
            width={oblCardW}
            height={oblCardH}
            rx={10}
            fill={C.creamDark}
          />
          <rect
            x={rightOblX}
            y={oblY}
            width={oblCardW}
            height={oblCardH}
            rx={10}
            fill={C.card}
            stroke={C.terra}
            strokeWidth={1}
          />
          <rect
            x={rightOblX}
            y={oblY}
            width={oblCardW}
            height={3}
            rx={1.5}
            fill={C.terra}
          />
          <ForeignIcon x={rightOblX + 24} y={oblY + 26} size={22}>
            <Cpu size={13} color={C.terra} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={rightOblX + 42}
            y={oblY + 24}
            fill={C.inkFaint}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
            letterSpacing="0.06em"
          >
            OBLIGATION
          </text>
          <text
            x={rightOblX + 42}
            y={oblY + 40}
            fill={C.ink}
            fontSize={14}
            fontFamily={SANS}
            fontWeight={700}
          >
            Delivery
          </text>
          <line
            x1={rightOblX + 12}
            y1={oblY + 52}
            x2={rightOblX + oblCardW - 12}
            y2={oblY + 52}
            stroke={C.borderLight}
            strokeWidth={0.5}
          />
          <text
            x={rightOblX + 16}
            y={oblY + 70}
            fill={C.inkFaint}
            fontSize={10}
            fontFamily={SANS}
          >
            Bob → Alice
          </text>
          <text
            x={rightOblX + 16}
            y={oblY + 88}
            fill={C.terra}
            fontSize={13}
            fontFamily={MONO}
            fontWeight={600}
          >
            ML Inference
          </text>
          <ForeignIcon x={rightOblX + oblCardW - 24} y={oblY + 80} size={20}>
            <Cpu size={12} color={C.inkGhost} strokeWidth={1.5} />
          </ForeignIcon>
          <circle
            cx={rightOblX + 16}
            cy={oblY + 112}
            r={5}
            fill="none"
            stroke={C.inkGhost}
            strokeWidth={1.5}
          />
          <text
            x={rightOblX + 28}
            y={oblY + 116}
            fill={C.inkFaint}
            fontSize={9}
            fontFamily={SANS}
          >
            Unfulfilled
          </text>
        </motion.g>

        {/* Reciprocal arrows between obligation cards */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <line
            x1={leftOblX + oblCardW + 4}
            y1={oblY + oblCardH / 2}
            x2={rightOblX - 4}
            y2={oblY + oblCardH / 2}
            stroke={C.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <ForeignIcon
            x={(leftOblX + oblCardW + rightOblX) / 2}
            y={oblY + oblCardH / 2}
            size={24}
          >
            <ArrowLeftRight
              size={13}
              color={C.inkGhost}
              strokeWidth={1.5}
            />
          </ForeignIcon>
          <text
            x={(leftOblX + oblCardW + rightOblX) / 2}
            y={oblY + oblCardH / 2 + 18}
            textAnchor="middle"
            fill={C.inkGhost}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
          >
            Reciprocal
          </text>
        </motion.g>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 4: Escrow Vault ─── */
function EscrowVault() {
  const pedersenHash = useCyclingHex('0x9a4b7c2e1f83d065', true, 55);
  const termsHash = useCyclingHex('0x7a3f2b8e1dc95064', true, 65);
  const [locked, setLocked] = useState(false);
  const [amountFlowing, setAmountFlowing] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setAmountFlowing(true), 800);
    const t2 = setTimeout(() => setLocked(true), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const vaultCx = 400;
  const vaultCy = 190;
  const vaultR = 55;

  return (
    <StepWrapper label="Funds are locked in escrow with a Pedersen commitment — cryptographically binding, released only on fulfillment.">
      <svg
        viewBox="0 0 800 420"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="vaultGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="6"
              result="blur"
            />
            <feFlood
              floodColor={C.gold}
              floodOpacity="0.3"
              result="color"
            />
            <feComposite
              in="color"
              in2="blur"
              operator="in"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Alice (left) */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <circle
            cx={120}
            cy={vaultCy}
            r={24}
            fill={C.card}
            stroke={C.bronze}
            strokeWidth={1.5}
          />
          <ForeignIcon x={120} y={vaultCy} size={22}>
            <Bot size={13} color={C.bronze} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={120}
            y={vaultCy + 38}
            textAnchor="middle"
            fill={C.ink}
            fontSize={10}
            fontFamily={SANS}
            fontWeight={500}
          >
            Alice
          </text>
        </motion.g>

        {/* Amount flowing from Alice to vault */}
        {amountFlowing && (
          <>
            <motion.line
              x1={148}
              y1={vaultCy}
              x2={vaultCx - vaultR - 10}
              y2={vaultCy}
              stroke={C.border}
              strokeWidth={1}
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />
            {/* Flowing amount particle */}
            <motion.text
              fill={C.bronze}
              fontSize={12}
              fontFamily={MONO}
              fontWeight={700}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 2, repeat: locked ? 0 : Infinity }}
            >
              <animateMotion
                dur="2s"
                repeatCount={locked ? '1' : 'indefinite'}
                path={`M 155 ${vaultCy - 5} L ${vaultCx - vaultR - 15} ${vaultCy - 5}`}
              />
              $25,000
            </motion.text>
            {[0, 1, 2].map((i) => (
              <circle key={i} r={3} fill={C.gold} opacity={0.5}>
                <animateMotion
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin={`${i * 0.5}s`}
                  path={`M 148 ${vaultCy} L ${vaultCx - vaultR - 10} ${vaultCy}`}
                />
                <animate
                  attributeName="opacity"
                  values="0;0.6;0"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin={`${i * 0.5}s`}
                />
              </circle>
            ))}
          </>
        )}

        {/* ── Vault ── */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Glow when locked */}
          {locked && (
            <motion.circle
              cx={vaultCx}
              cy={vaultCy}
              r={vaultR + 12}
              fill="none"
              stroke={C.gold}
              strokeWidth={1}
              filter="url(#vaultGlow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}

          {/* Vault hexagon */}
          <polygon
            points={hexPoints(vaultCx, vaultCy, vaultR)}
            fill={C.card}
            stroke={locked ? C.gold : C.border}
            strokeWidth={locked ? 2.5 : 1.5}
          />
          {/* Inner ring */}
          <polygon
            points={hexPoints(vaultCx, vaultCy, vaultR * 0.6)}
            fill="none"
            stroke={C.border}
            strokeWidth={0.8}
            strokeDasharray="2 3"
          />

          {/* Lock icon */}
          <ForeignIcon x={vaultCx} y={vaultCy - 10} size={28}>
            <Lock
              size={16}
              color={locked ? C.gold : C.inkGhost}
              strokeWidth={1.5}
            />
          </ForeignIcon>

          {/* Amount inside */}
          <motion.text
            x={vaultCx}
            y={vaultCy + 16}
            textAnchor="middle"
            fill={locked ? C.gold : C.inkFaint}
            fontSize={locked ? 14 : 12}
            fontFamily={MONO}
            fontWeight={700}
            animate={locked ? { scale: [1, 1.05, 1] } : {}}
            transition={locked ? { duration: 0.4 } : {}}
          >
            {locked ? '$25,000' : '...'}
          </motion.text>

          {/* LOCKED badge */}
          <AnimatePresence>
            {locked && (
              <motion.g
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <rect
                  x={vaultCx - 32}
                  y={vaultCy + vaultR + 10}
                  width={64}
                  height={20}
                  rx={10}
                  fill={C.gold}
                  opacity={0.15}
                />
                <text
                  x={vaultCx}
                  y={vaultCy + vaultR + 24}
                  textAnchor="middle"
                  fill={C.gold}
                  fontSize={9}
                  fontFamily={SANS}
                  fontWeight={700}
                  letterSpacing="0.08em"
                >
                  LOCKED
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── Pedersen Commitment ── */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: locked ? 1 : 0, y: locked ? 0 : 10 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <rect
            x={200}
            y={310}
            width={400}
            height={80}
            rx={10}
            fill={C.card}
            stroke={C.border}
            strokeWidth={1}
          />

          {/* Pedersen hash */}
          <text
            x={220}
            y={334}
            fill={C.inkFaint}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
            letterSpacing="0.06em"
          >
            PEDERSEN COMMITMENT
          </text>
          <text
            x={220}
            y={350}
            fill={C.bronze}
            fontSize={11}
            fontFamily={MONO}
            fontWeight={500}
          >
            {pedersenHash}
          </text>

          {/* Terms hash */}
          <text
            x={220}
            y={370}
            fill={C.inkFaint}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
            letterSpacing="0.06em"
          >
            TERMS HASH
          </text>
          <text
            x={220}
            y={386}
            fill={C.terra}
            fontSize={11}
            fontFamily={MONO}
            fontWeight={500}
          >
            {termsHash}
          </text>
        </motion.g>

        {/* Contract State badge */}
        <AnimatePresence>
          {locked && (
            <motion.g
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 180 }}
            >
              <rect
                x={620}
                y={320}
                width={130}
                height={28}
                rx={14}
                fill={C.bronze}
                opacity={0.12}
              />
              <ForeignIcon x={644} y={334} size={16}>
                <Shield size={10} color={C.bronze} strokeWidth={2} />
              </ForeignIcon>
              <text
                x={695}
                y={338}
                textAnchor="middle"
                fill={C.bronze}
                fontSize={10}
                fontFamily={SANS}
                fontWeight={600}
              >
                PROPOSED
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Orbiting vault particles */}
        {locked &&
          Array.from({ length: 4 }).map((_, i) => (
            <circle key={i} r={2} fill={C.gold} opacity={0.3}>
              <animateMotion
                dur={`${3 + i * 0.5}s`}
                repeatCount="indefinite"
                begin={`${i * 0.4}s`}
                path={circlePath(vaultCx, vaultCy, vaultR + 20)}
              />
            </circle>
          ))}
      </svg>
    </StepWrapper>
  );
}

/* ─── Main Component ─── */
export default function Scene04_ContractFormation({
  step,
  onStepComplete,
}: SceneProps) {
  useEffect(() => {
    if (step >= 0 && step < STEP_DURATIONS.length) {
      const t = setTimeout(onStepComplete, STEP_DURATIONS[step]);
      return () => clearTimeout(t);
    }
  }, [step, onStepComplete]);

  const progress =
    STEP_DURATIONS.length > 1
      ? (step / (STEP_DURATIONS.length - 1)) * 100
      : 0;

  const stepLabels = [
    'Agents',
    'Discovery',
    'Template',
    'Obligations',
    'Escrow',
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: C.cream }}
    >
      <div className="pt-14 pb-4 px-12 max-w-5xl mx-auto w-full">
        <motion.span
          style={{
            fontFamily: SANS,
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: C.inkFaint,
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          SCENE 04
        </motion.span>
        <motion.h1
          style={{
            fontFamily: SANS,
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: C.ink,
            marginTop: '8px',
            lineHeight: 1.15,
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Contract Formation
        </motion.h1>
        <motion.p
          style={{
            fontFamily: SANS,
            fontSize: '15px',
            color: C.inkMuted,
            marginTop: '6px',
            lineHeight: 1.5,
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Two agents negotiate and create a binding agreement
        </motion.p>

        <div
          className="mt-5 w-full rounded-full overflow-hidden"
          style={{ height: 2, backgroundColor: C.creamDark }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: C.bronze }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {stepLabels.map((label, i) => (
            <motion.span
              key={label}
              style={{
                fontFamily: SANS,
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.03em',
                padding: '3px 10px',
                borderRadius: 999,
                backgroundColor:
                  i === step
                    ? C.bronze
                    : i < step
                      ? `${C.sage}22`
                      : C.borderLight,
                color:
                  i === step
                    ? '#fff'
                    : i < step
                      ? C.sage
                      : C.inkGhost,
                transition: 'all 0.3s ease',
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.04 }}
            >
              {label}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-10">
        <AnimatePresence mode="wait">
          {step === 0 && <TwoAgents key="s0" />}
          {step === 1 && <Discovery key="s1" />}
          {step === 2 && <ContractTemplate key="s2" />}
          {step === 3 && <Obligations key="s3" />}
          {step === 4 && <EscrowVault key="s4" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
