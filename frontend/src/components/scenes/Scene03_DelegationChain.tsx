import { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Bot,
  Check,
  Shield,
  ChevronDown,
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

const STEP_DURATIONS = [4000, 4000, 4000, 4000, 4000];

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
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

/* ─── Delegation Node Card (SVG) ─── */
function DelegationNode({
  x,
  y,
  width,
  height,
  icon: Icon,
  iconColor,
  topBorderColor,
  name,
  did,
  badge,
  badgeColor,
  capabilities,
  boundsLabel,
  delay = 0,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  icon: typeof Bot;
  iconColor: string;
  topBorderColor: string;
  name: string;
  did: string;
  badge: string;
  badgeColor: string;
  capabilities?: { name: string; color: string }[];
  boundsLabel?: string;
  delay?: number;
}) {
  return (
    <motion.g
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Card shadow */}
      <rect
        x={x + 2}
        y={y + 2}
        width={width}
        height={height}
        rx={10}
        fill={C.creamDark}
      />
      {/* Card body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        fill={C.card}
        stroke={C.border}
        strokeWidth={1}
      />
      {/* Top accent border */}
      <rect
        x={x}
        y={y}
        width={width}
        height={4}
        rx={2}
        fill={topBorderColor}
      />

      {/* Icon circle */}
      <circle
        cx={x + 30}
        cy={y + 32}
        r={16}
        fill={C.card}
        stroke={C.border}
        strokeWidth={1}
      />
      <ForeignIcon x={x + 30} y={y + 32} size={20}>
        <Icon size={14} color={iconColor} strokeWidth={1.5} />
      </ForeignIcon>

      {/* Name */}
      <text
        x={x + 56}
        y={y + 28}
        fill={C.ink}
        fontSize={13}
        fontFamily={SANS}
        fontWeight={600}
      >
        {name}
      </text>

      {/* DID */}
      <text
        x={x + 56}
        y={y + 44}
        fill={C.bronze}
        fontSize={10}
        fontFamily={MONO}
        letterSpacing="0.02em"
      >
        {did}
      </text>

      {/* Badge */}
      <rect
        x={x + width - 100}
        y={y + 18}
        width={84}
        height={22}
        rx={11}
        fill={badgeColor}
        opacity={0.12}
      />
      <text
        x={x + width - 58}
        y={y + 33}
        textAnchor="middle"
        fill={badgeColor}
        fontSize={9}
        fontFamily={SANS}
        fontWeight={600}
        letterSpacing="0.04em"
      >
        {badge}
      </text>

      {/* Capability badges */}
      {capabilities && capabilities.length > 0 && (
        <>
          <text
            x={x + 16}
            y={y + 70}
            fill={C.inkFaint}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
            letterSpacing="0.08em"
          >
            CAPABILITIES
          </text>
          {capabilities.map((cap, i) => (
            <g key={cap.name}>
              <rect
                x={x + 16 + i * 54}
                y={y + 78}
                width={48}
                height={18}
                rx={9}
                fill={cap.color}
                opacity={0.1}
              />
              <text
                x={x + 40 + i * 54}
                y={y + 90}
                textAnchor="middle"
                fill={cap.color}
                fontSize={7}
                fontFamily={SANS}
                fontWeight={600}
                letterSpacing="0.04em"
              >
                {cap.name}
              </text>
            </g>
          ))}
        </>
      )}

      {/* Bounds label */}
      {boundsLabel && (
        <text
          x={x + 16}
          y={y + height - 12}
          fill={C.inkFaint}
          fontSize={9}
          fontFamily={SANS}
        >
          {boundsLabel}
        </text>
      )}
    </motion.g>
  );
}

/* ─── Connection line with flowing particles ─── */
function ConnectionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  delay = 0,
  particleColor = C.bronze,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  delay?: number;
  particleColor?: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
    >
      {/* Line */}
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={C.border}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.6 }}
      />

      {/* Flowing particles */}
      {[0, 1, 2].map((i) => (
        <circle key={i} r={2.5} fill={particleColor} opacity={0.5}>
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            begin={`${delay + i * 0.7}s`}
            path={`M ${x1} ${y1} L ${x2} ${y2}`}
          />
          <animate
            attributeName="opacity"
            values="0;0.6;0"
            dur="2s"
            repeatCount="indefinite"
            begin={`${delay + i * 0.7}s`}
          />
        </circle>
      ))}

      {/* Label */}
      {label && (
        <g>
          <rect
            x={midX - 38}
            y={midY - 10}
            width={76}
            height={20}
            rx={10}
            fill={C.creamDark}
            stroke={C.border}
            strokeWidth={0.5}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
          >
            {label}
          </text>
        </g>
      )}
    </motion.g>
  );
}

/* ─── Step 0: Title ─── */
function TitleStep() {
  return (
    <StepWrapper label="Authority flows from a root controller through signed delegations. Each child's bounds must be strictly contained within the parent's.">
      <svg
        viewBox="0 0 800 350"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        {/* Decorative delegation chain icon */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Top node */}
          <circle cx={400} cy={80} r={28} fill={C.card} stroke={C.gold} strokeWidth={2} />
          <ForeignIcon x={400} y={80} size={28}>
            <Building2 size={16} color={C.gold} strokeWidth={1.5} />
          </ForeignIcon>

          {/* Lines down */}
          <motion.line
            x1={400} y1={108} x2={300} y2={168}
            stroke={C.border} strokeWidth={1.5} strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          />
          <motion.line
            x1={400} y1={108} x2={500} y2={168}
            stroke={C.border} strokeWidth={1.5} strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          />

          {/* Middle nodes */}
          <motion.circle
            cx={300} cy={190} r={22} fill={C.card} stroke={C.bronze} strokeWidth={1.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          />
          <ForeignIcon x={300} y={190} size={22}>
            <Bot size={12} color={C.bronze} strokeWidth={1.5} />
          </ForeignIcon>
          <motion.circle
            cx={500} cy={190} r={22} fill={C.card} stroke={C.terra} strokeWidth={1.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          />
          <ForeignIcon x={500} y={190} size={22}>
            <Bot size={12} color={C.terra} strokeWidth={1.5} />
          </ForeignIcon>

          {/* More lines down */}
          <motion.line
            x1={300} y1={212} x2={260} y2={260}
            stroke={C.border} strokeWidth={1} strokeDasharray="3 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          />
          <motion.line
            x1={300} y1={212} x2={340} y2={260}
            stroke={C.border} strokeWidth={1} strokeDasharray="3 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          />

          {/* Bottom nodes (smaller) */}
          {[260, 340].map((x, i) => (
            <motion.circle
              key={x}
              cx={x} cy={278} r={14} fill={C.card} stroke={C.inkGhost} strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1.3 + i * 0.1 }}
            />
          ))}

          {/* Flowing particles on paths */}
          {[
            { path: `M 400 108 L 300 168`, delay: 0.8 },
            { path: `M 400 108 L 500 168`, delay: 1 },
            { path: `M 300 212 L 260 260`, delay: 1.3 },
          ].map((p, i) => (
            <circle key={i} r={2} fill={C.gold} opacity={0.5}>
              <animateMotion
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${p.delay}s`}
                path={p.path}
              />
              <animate
                attributeName="opacity"
                values="0;0.6;0"
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${p.delay}s`}
              />
            </circle>
          ))}
        </motion.g>

        {/* Authority label */}
        <motion.text
          x={400}
          y={330}
          textAnchor="middle"
          fill={C.inkGhost}
          fontSize={10}
          fontFamily={MONO}
          letterSpacing="0.06em"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.5 }}
        >
          AUTHORITY FLOWS DOWNWARD
        </motion.text>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 1: Controller Node ─── */
function ControllerNode() {
  const controllerDid = useCyclingHex('did:aeos:controller:a7f3', true, 55);

  return (
    <StepWrapper label="The root controller — typically a company or organization — holds the highest authority level.">
      <svg
        viewBox="0 0 800 200"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <DelegationNode
          x={250}
          y={20}
          width={300}
          height={110}
          icon={Building2}
          iconColor={C.gold}
          topBorderColor={C.gold}
          name="Acme Corp"
          did={controllerDid}
          badge="Root Authority"
          badgeColor={C.gold}
          boundsLabel="Full Authority • No Restrictions"
          delay={0.2}
        />

        {/* Crown / authority glow */}
        <motion.polygon
          points={hexPoints(400, -6, 18)}
          fill="none"
          stroke={C.gold}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        />
        <ForeignIcon x={400} y={-6} size={20}>
          <Shield size={12} color={C.gold} strokeWidth={1.5} />
        </ForeignIcon>

        {/* Arrow pointing down */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <ForeignIcon x={400} y={160} size={24}>
            <ChevronDown size={16} color={C.inkGhost} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={400}
            y={185}
            textAnchor="middle"
            fill={C.inkGhost}
            fontSize={9}
            fontFamily={SANS}
          >
            delegates to...
          </text>
        </motion.g>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 2: Agent Alpha ─── */
function AgentAlpha() {
  const controllerDid = 'did:aeos:ctrl:a7f3...';
  const alphaDid = useCyclingHex('did:aeos:agent:b2c8e1', true, 50);

  const allCaps = [
    { name: 'TRANSACT', color: C.gold },
    { name: 'SIGN', color: C.bronze },
    { name: 'NEGOTIATE', color: C.terra },
    { name: 'DISPUTE', color: C.rose },
    { name: 'DELEGATE', color: C.sage },
  ];

  return (
    <StepWrapper label="Agent Alpha receives delegated authority from the controller with full capabilities and $100K transaction bounds.">
      <svg
        viewBox="0 0 800 360"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        {/* Controller (compact) */}
        <DelegationNode
          x={275}
          y={10}
          width={250}
          height={60}
          icon={Building2}
          iconColor={C.gold}
          topBorderColor={C.gold}
          name="Acme Corp"
          did={controllerDid}
          badge="Root"
          badgeColor={C.gold}
          delay={0}
        />

        {/* Connection line */}
        <ConnectionLine
          x1={400}
          y1={72}
          x2={400}
          y2={140}
          label="delegates to"
          delay={0.3}
        />

        {/* Agent Alpha */}
        <DelegationNode
          x={220}
          y={140}
          width={360}
          height={115}
          icon={Bot}
          iconColor={C.bronze}
          topBorderColor={C.bronze}
          name="Agent Alpha"
          did={alphaDid}
          badge="Semi-Autonomous"
          badgeColor={C.bronze}
          capabilities={allCaps}
          boundsLabel="Max Tx: $100,000 • 5 Capabilities"
          delay={0.5}
        />

        {/* Bounds visualization — hexagonal frame */}
        <motion.polygon
          points={hexPoints(400, 200, 45)}
          fill="none"
          stroke={C.bronze}
          strokeWidth={1}
          strokeDasharray="3 4"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        />

        {/* Down arrow */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <ForeignIcon x={400} y={280} size={24}>
            <ChevronDown size={16} color={C.inkGhost} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={400}
            y={305}
            textAnchor="middle"
            fill={C.inkGhost}
            fontSize={9}
            fontFamily={SANS}
          >
            can further delegate...
          </text>
        </motion.g>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 3: Sub-Agent with Bounds Containment ─── */
function SubAgent() {
  const alphaDid = 'did:aeos:agent:b2c8...';
  const subDid = useCyclingHex('did:aeos:sub:f9a3d7', true, 50);

  const subCaps = [
    { name: 'TRANSACT', color: C.gold },
    { name: 'SIGN', color: C.bronze },
  ];

  return (
    <StepWrapper label="Each delegation level has strictly narrower authority. The sub-agent's $10K bound fits inside Alpha's $100K bound.">
      <svg
        viewBox="0 0 800 500"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        {/* Controller (compact) */}
        <DelegationNode
          x={290}
          y={5}
          width={220}
          height={50}
          icon={Building2}
          iconColor={C.gold}
          topBorderColor={C.gold}
          name="Acme Corp"
          did="did:aeos:ctrl:a7f3..."
          badge="Root"
          badgeColor={C.gold}
          delay={0}
        />

        <ConnectionLine x1={400} y1={57} x2={400} y2={90} delay={0.15} />

        {/* Agent Alpha (compact) */}
        <DelegationNode
          x={265}
          y={90}
          width={270}
          height={55}
          icon={Bot}
          iconColor={C.bronze}
          topBorderColor={C.bronze}
          name="Agent Alpha"
          did={alphaDid}
          badge="Semi-Auto"
          badgeColor={C.bronze}
          delay={0.2}
        />

        <ConnectionLine
          x1={400}
          y1={147}
          x2={400}
          y2={195}
          label="delegates to"
          delay={0.4}
        />

        {/* Sub-agent */}
        <DelegationNode
          x={220}
          y={195}
          width={360}
          height={105}
          icon={Bot}
          iconColor={C.terra}
          topBorderColor={C.terra}
          name="Alpha-Sub-1"
          did={subDid}
          badge="Delegated"
          badgeColor={C.terra}
          capabilities={subCaps}
          boundsLabel="Max Tx: $10,000 • 2 Capabilities (subset)"
          delay={0.5}
        />

        {/* ── Bounds Containment Visualization ── */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          {/* Outer ring — parent bounds ($100K) */}
          <motion.circle
            cx={400}
            cy={400}
            r={65}
            fill="none"
            stroke={C.bronze}
            strokeWidth={2}
            strokeDasharray="6 4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.1, duration: 0.5, type: 'spring' }}
          />
          <text
            x={400}
            y={400 - 68 - 6}
            textAnchor="middle"
            fill={C.bronze}
            fontSize={10}
            fontFamily={MONO}
            fontWeight={600}
          >
            $100K (Parent)
          </text>

          {/* Inner ring — child bounds ($10K) */}
          <motion.circle
            cx={400}
            cy={400}
            r={32}
            fill={`${C.gold}08`}
            stroke={C.gold}
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.4, duration: 0.5, type: 'spring' }}
          />
          <text
            x={400}
            y={404}
            textAnchor="middle"
            fill={C.gold}
            fontSize={10}
            fontFamily={MONO}
            fontWeight={600}
          >
            $10K
          </text>

          {/* Containment symbol */}
          <text
            x={400}
            y={400 + 75}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={10}
            fontFamily={MONO}
          >
            Child ⊂ Parent
          </text>

          {/* Animated ring pulse */}
          <motion.circle
            cx={400}
            cy={400}
            r={65}
            fill="none"
            stroke={C.bronze}
            strokeWidth={0.5}
            initial={{ opacity: 0 }}
            animate={{
              r: [65, 72, 65],
              opacity: [0, 0.3, 0],
            }}
            transition={{ delay: 1.8, duration: 2.5, repeat: Infinity }}
          />
        </motion.g>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 4: Verification Cascade ─── */
function VerificationCascade() {
  const [checks, setChecks] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  useEffect(() => {
    const timers = [600, 1000, 1400, 1800, 2200, 2600].map((ms, i) =>
      setTimeout(() => {
        setChecks((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const chainNodes = [
    { x: 400, y: 30, label: 'Acme Corp', color: C.gold, r: 24 },
    { x: 400, y: 130, label: 'Agent Alpha', color: C.bronze, r: 20 },
    { x: 400, y: 230, label: 'Alpha-Sub-1', color: C.terra, r: 20 },
  ];

  const verifications = [
    { y: 70, label: 'Signature ✓', nodeIndex: 0 },
    { y: 100, label: 'Bounds ⊂ Parent ✓', nodeIndex: 0 },
    { y: 170, label: 'Signature ✓', nodeIndex: 1 },
    { y: 195, label: 'Capabilities ⊂ Parent ✓', nodeIndex: 1 },
    { y: 260, label: 'Expiry Valid ✓', nodeIndex: 2 },
    { y: 280, label: 'Chain Valid: true', nodeIndex: 2 },
  ];

  return (
    <StepWrapper label="3-level hierarchy. Each level has strictly narrower authority. Every link is cryptographically verified.">
      <svg
        viewBox="0 0 800 380"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        {/* Chain connections */}
        {[0, 1].map((i) => (
          <motion.line
            key={i}
            x1={chainNodes[i].x}
            y1={chainNodes[i].y + chainNodes[i].r}
            x2={chainNodes[i + 1].x}
            y2={chainNodes[i + 1].y - chainNodes[i + 1].r}
            stroke={checks[i * 2] ? C.sage : C.border}
            strokeWidth={2}
            strokeDasharray="5 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.2 + i * 0.3, duration: 0.5 }}
          />
        ))}

        {/* Chain nodes */}
        {chainNodes.map((node, i) => (
          <motion.g
            key={node.label}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.2, duration: 0.4 }}
          >
            {/* Sage glow when verified */}
            {checks[i * 2] && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.r + 8}
                fill="none"
                stroke={C.sage}
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={C.card}
              stroke={checks[i * 2] ? C.sage : node.color}
              strokeWidth={2}
            />
            <ForeignIcon x={node.x} y={node.y} size={22}>
              {i === 0 ? (
                <Building2
                  size={13}
                  color={checks[0] ? C.sage : node.color}
                  strokeWidth={1.5}
                />
              ) : (
                <Bot
                  size={13}
                  color={checks[i * 2] ? C.sage : node.color}
                  strokeWidth={1.5}
                />
              )}
            </ForeignIcon>
            <text
              x={node.x + node.r + 14}
              y={node.y + 4}
              fill={C.ink}
              fontSize={11}
              fontFamily={SANS}
              fontWeight={500}
            >
              {node.label}
            </text>
          </motion.g>
        ))}

        {/* Verification checkmarks cascade */}
        {verifications.map((v, i) => (
          <AnimatePresence key={i}>
            {checks[i] && (
              <motion.g
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  type: 'spring',
                  stiffness: 200,
                }}
              >
                <rect
                  x={520}
                  y={v.y - 10}
                  width={180}
                  height={22}
                  rx={11}
                  fill={C.sage}
                  opacity={0.1}
                />
                <ForeignIcon x={538} y={v.y + 1} size={16}>
                  <Check size={10} color={C.sage} strokeWidth={2.5} />
                </ForeignIcon>
                <text
                  x={552}
                  y={v.y + 5}
                  fill={C.sage}
                  fontSize={10}
                  fontFamily={MONO}
                  fontWeight={500}
                >
                  {v.label}
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        ))}

        {/* Flowing verification particles */}
        {checks[0] && (
          <>
            {[0, 1, 2].map((i) => (
              <circle key={`vp${i}`} r={2.5} fill={C.sage} opacity={0.4}>
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  begin={`${i * 1}s`}
                  path={`M ${chainNodes[0].x} ${chainNodes[0].y + chainNodes[0].r} L ${chainNodes[2].x} ${chainNodes[2].y - chainNodes[2].r}`}
                />
                <animate
                  attributeName="opacity"
                  values="0;0.6;0"
                  dur="3s"
                  repeatCount="indefinite"
                  begin={`${i * 1}s`}
                />
              </circle>
            ))}
          </>
        )}

        {/* Final summary badge */}
        <AnimatePresence>
          {checks[5] && (
            <motion.g
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 12 }}
            >
              <rect
                x={300}
                y={325}
                width={200}
                height={34}
                rx={17}
                fill={C.sage}
                opacity={0.12}
              />
              <ForeignIcon x={326} y={342} size={20}>
                <Shield size={12} color={C.sage} strokeWidth={2} />
              </ForeignIcon>
              <text
                x={410}
                y={347}
                textAnchor="middle"
                fill={C.sage}
                fontSize={12}
                fontFamily={SANS}
                fontWeight={600}
              >
                Full Chain Verified
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </StepWrapper>
  );
}

/* ─── Main Component ─── */
export default function Scene03_DelegationChain({
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
    'Overview',
    'Controller',
    'Agent Alpha',
    'Sub-Agent',
    'Verification',
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
          SCENE 03
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
          Authority Delegation
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
          Chain of trust from company to agent to sub-agent
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
          {step === 0 && <TitleStep key="s0" />}
          {step === 1 && <ControllerNode key="s1" />}
          {step === 2 && <AgentAlpha key="s2" />}
          {step === 3 && <SubAgent key="s3" />}
          {step === 4 && <VerificationCascade key="s4" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
