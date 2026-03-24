import { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Bot,
  Fingerprint,
  Zap,
  FileSignature,
  Users,
  Scale,
  GitBranch,
  Check,
  Settings,
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

const HEX_CHARS = '0123456789abcdef';
const MONO = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const SANS = "'Inter',system-ui,sans-serif";

const STEP_DURATIONS = [4000, 5000, 5000, 5000, 5000, 5000];

function hexPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  });
  return 'M ' + pts.join(' L ') + ' Z';
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy}`;
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

function useCountUp(target: number, active: boolean, duration = 2000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, duration]);

  return value;
}

function SvgDefs() {
  return (
    <defs>
      <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
        <feFlood floodColor={C.gold} floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="bronzeGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feFlood floodColor={C.bronze} floodOpacity="0.25" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="sageGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feFlood floodColor={C.sage} floodOpacity="0.3" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={C.bronze} />
        <stop offset="100%" stopColor={C.gold} />
      </linearGradient>
      <linearGradient id="terraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={C.terra} />
        <stop offset="100%" stopColor={C.bronze} />
      </linearGradient>
    </defs>
  );
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
      className="w-full flex flex-col items-center gap-6"
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
          letterSpacing: '-0.01em',
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

/* ─── Step 0: Key Generation Hexagon ─── */
function KeyGeneration() {
  const cx = 400;
  const cy = 210;
  const hexR = 72;
  const orbitR = 115;
  const particleCount = 10;

  return (
    <StepWrapper label="Entropy is gathered. An Ed25519 key pair is being generated from randomness.">
      <svg
        viewBox="0 0 800 440"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <SvgDefs />

        {/* Outer orbit ring */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={orbitR}
          fill="none"
          stroke={C.border}
          strokeWidth={1}
          strokeDasharray="4 6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1 }}
        />

        {/* Orbiting particles */}
        {Array.from({ length: particleCount }).map((_, i) => (
          <circle key={i} r={2.5 + (i % 3) * 0.5} fill={C.bronze} opacity={0.5}>
            <animateMotion
              dur={`${4 + i * 0.5}s`}
              repeatCount="indefinite"
              begin={`${i * 0.4}s`}
              path={circlePath(cx, cy, orbitR - 5 + (i % 3) * 4)}
            />
            <animate
              attributeName="opacity"
              values="0.2;0.7;0.2"
              dur={`${2.5 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Secondary orbit particles (smaller, faster, gold) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <circle key={`g${i}`} r={1.5} fill={C.gold} opacity={0.4}>
            <animateMotion
              dur={`${2.5 + i * 0.4}s`}
              repeatCount="indefinite"
              begin={`${i * 0.6}s`}
              path={circlePath(cx, cy, orbitR + 15)}
            />
          </circle>
        ))}

        {/* Pulsing glow hexagon (background) */}
        <motion.polygon
          points={hexPoints(cx, cy, hexR + 8)}
          fill="none"
          stroke={C.gold}
          strokeWidth={1}
          filter="url(#goldGlow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Main hexagon (rotating slowly) */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        >
          <polygon
            points={hexPoints(cx, cy, hexR)}
            fill={C.card}
            stroke={C.gold}
            strokeWidth={2}
          />
        </motion.g>

        {/* Inner decorative hexagon */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        >
          <polygon
            points={hexPoints(cx, cy, hexR * 0.55)}
            fill="none"
            stroke={C.border}
            strokeWidth={1}
            strokeDasharray="3 5"
          />
        </motion.g>

        {/* Key icon in center */}
        <ForeignIcon x={cx} y={cy - 10} size={36}>
          <Key size={24} color={C.gold} strokeWidth={1.5} />
        </ForeignIcon>

        {/* Text inside hexagon */}
        <motion.text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fill={C.inkMuted}
          fontSize={10}
          fontFamily={MONO}
          letterSpacing="0.04em"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Generating Ed25519 Key Pair...
        </motion.text>

        {/* Entropy dots flowing inward */}
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 5;
          const fromR = orbitR + 60;
          const sx = cx + fromR * Math.cos(angle);
          const sy = cy + fromR * Math.sin(angle);
          return (
            <circle key={`e${i}`} r={2} fill={C.gold} opacity={0.3}>
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
                path={`M ${sx} ${sy} L ${cx} ${cy}`}
              />
              <animate
                attributeName="opacity"
                values="0;0.6;0"
                dur="3s"
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
              />
            </circle>
          );
        })}

        {/* Bottom progress label */}
        <motion.text
          x={cx}
          y={380}
          textAnchor="middle"
          fill={C.inkFaint}
          fontSize={11}
          fontFamily={SANS}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Gathering entropy from system randomness...
        </motion.text>

        {/* Decorative hash fragments orbiting */}
        {['a7f3', '2b8e', 'c1d9'].map((frag, i) => (
          <motion.text
            key={frag}
            fill={C.inkGhost}
            fontSize={9}
            fontFamily={MONO}
            opacity={0.3}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{
              duration: 3,
              delay: i * 0.8,
              repeat: Infinity,
            }}
          >
            <animateMotion
              dur={`${6 + i * 2}s`}
              repeatCount="indefinite"
              begin={`${i}s`}
              path={circlePath(cx, cy, orbitR + 35 + i * 10)}
            />
            {frag}
          </motion.text>
        ))}
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 1: Key Split ─── */
function KeySplit() {
  const signingKeyId = 'a7f32b8e1dc9f045';
  const encryptionKeyId = 'e3b1c8d5f6a20974';
  const sigHash = useCyclingHex(signingKeyId, true, 45);
  const encHash = useCyclingHex(encryptionKeyId, true, 45);

  const leftCx = 240;
  const rightCx = 560;
  const cy = 190;
  const hexR = 56;

  return (
    <StepWrapper label="The key pair splits into a signing key (for authentication) and an encryption key (for secure communication).">
      <svg
        viewBox="0 0 800 420"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <SvgDefs />

        {/* Connection line between the two hexagons */}
        <motion.line
          x1={leftCx + hexR + 10}
          y1={cy}
          x2={rightCx - hexR - 10}
          y2={cy}
          stroke={C.border}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />

        {/* Flowing particle on connection */}
        <motion.circle
          r={3}
          fill={C.gold}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={`M ${leftCx + hexR + 10} ${cy} L ${rightCx - hexR - 10} ${cy}`}
          />
        </motion.circle>
        <motion.circle
          r={2}
          fill={C.bronze}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2 }}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            begin="1s"
            path={`M ${rightCx - hexR - 10} ${cy} L ${leftCx + hexR + 10} ${cy}`}
          />
        </motion.circle>

        {/* ── Left hexagon: Signing Key ── */}
        <motion.g
          initial={{ opacity: 0, x: 160 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Glow */}
          <polygon
            points={hexPoints(leftCx, cy, hexR + 6)}
            fill="none"
            stroke={C.bronze}
            strokeWidth={1}
            filter="url(#bronzeGlow)"
            opacity={0.4}
          />
          {/* Shape */}
          <polygon
            points={hexPoints(leftCx, cy, hexR)}
            fill={C.card}
            stroke={C.bronze}
            strokeWidth={2}
          />
          {/* Inner ring */}
          <polygon
            points={hexPoints(leftCx, cy, hexR * 0.5)}
            fill="none"
            stroke={C.border}
            strokeWidth={0.8}
            strokeDasharray="2 4"
          />
          {/* Icon */}
          <ForeignIcon x={leftCx} y={cy - 8} size={30}>
            <Key size={18} color={C.bronze} strokeWidth={1.5} />
          </ForeignIcon>
          {/* Label inside */}
          <text
            x={leftCx}
            y={cy + 20}
            textAnchor="middle"
            fill={C.inkMuted}
            fontSize={9}
            fontFamily={SANS}
            fontWeight={500}
          >
            Signing Key
          </text>

          {/* Orbiting dots */}
          {Array.from({ length: 4 }).map((_, i) => (
            <circle key={i} r={2} fill={C.bronze} opacity={0.4}>
              <animateMotion
                dur={`${3 + i * 0.5}s`}
                repeatCount="indefinite"
                begin={`${i * 0.3}s`}
                path={circlePath(leftCx, cy, hexR + 18)}
              />
            </circle>
          ))}
        </motion.g>

        {/* Signing Key ID below */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <text
            x={leftCx}
            y={cy + hexR + 40}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={10}
            fontFamily={SANS}
          >
            Signing Key
          </text>
          <text
            x={leftCx}
            y={cy + hexR + 58}
            textAnchor="middle"
            fill={C.bronze}
            fontSize={11}
            fontFamily={MONO}
            letterSpacing="0.03em"
          >
            {sigHash}
          </text>
        </motion.g>

        {/* ── Right hexagon: Encryption Key ── */}
        <motion.g
          initial={{ opacity: 0, x: -160 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <polygon
            points={hexPoints(rightCx, cy, hexR + 6)}
            fill="none"
            stroke={C.terra}
            strokeWidth={1}
            filter="url(#bronzeGlow)"
            opacity={0.4}
          />
          <polygon
            points={hexPoints(rightCx, cy, hexR)}
            fill={C.card}
            stroke={C.terra}
            strokeWidth={2}
          />
          <polygon
            points={hexPoints(rightCx, cy, hexR * 0.5)}
            fill="none"
            stroke={C.border}
            strokeWidth={0.8}
            strokeDasharray="2 4"
          />
          <ForeignIcon x={rightCx} y={cy - 8} size={30}>
            <Key size={18} color={C.terra} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={rightCx}
            y={cy + 20}
            textAnchor="middle"
            fill={C.inkMuted}
            fontSize={9}
            fontFamily={SANS}
            fontWeight={500}
          >
            Encryption Key
          </text>

          {Array.from({ length: 4 }).map((_, i) => (
            <circle key={i} r={2} fill={C.terra} opacity={0.4}>
              <animateMotion
                dur={`${3 + i * 0.5}s`}
                repeatCount="indefinite"
                begin={`${i * 0.3}s`}
                path={circlePath(rightCx, cy, hexR + 18)}
              />
            </circle>
          ))}
        </motion.g>

        {/* Encryption Key ID below */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <text
            x={rightCx}
            y={cy + hexR + 40}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={10}
            fontFamily={SANS}
          >
            Encryption Key
          </text>
          <text
            x={rightCx}
            y={cy + hexR + 58}
            textAnchor="middle"
            fill={C.terra}
            fontSize={11}
            fontFamily={MONO}
            letterSpacing="0.03em"
          >
            {encHash}
          </text>
        </motion.g>

        {/* Center "split" indicator */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <rect
            x={370}
            y={cy - 12}
            width={60}
            height={24}
            rx={12}
            fill={C.creamDark}
            stroke={C.border}
            strokeWidth={0.5}
          />
          <text
            x={400}
            y={cy + 4}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={9}
            fontFamily={SANS}
            fontWeight={500}
          >
            SPLIT
          </text>
        </motion.g>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 2: DID Derivation Pipeline ─── */
function DIDDerivation() {
  const didValue = 'did:aeos:7f3a2b8e1dc9';
  const didDisplay = useCyclingHex(didValue, true, 70);
  const [gearAngle, setGearAngle] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setGearAngle(((now - start) / 20) % 360);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const boxW = 160;
  const boxH = 70;
  const y = 170;
  const boxes = [
    { x: 100, label: 'Public Key', sublabel: 'Ed25519', color: C.bronze },
    { x: 320, label: 'SHA-256', sublabel: 'Hash Function', color: C.inkMuted },
    { x: 540, label: 'DID', sublabel: 'Self-Certifying', color: C.gold },
  ];

  return (
    <StepWrapper label="The DID is self-certifying — the private key proves ownership without a central registry.">
      <svg
        viewBox="0 0 800 400"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <SvgDefs />

        {/* Pipeline boxes */}
        {boxes.map((box, i) => (
          <motion.g
            key={box.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.25, duration: 0.5 }}
          >
            {/* Shadow */}
            <rect
              x={box.x + 2}
              y={y + 2}
              width={boxW}
              height={boxH}
              rx={8}
              fill={C.creamDark}
            />
            {/* Box */}
            <rect
              x={box.x}
              y={y}
              width={boxW}
              height={boxH}
              rx={8}
              fill={C.card}
              stroke={box.color}
              strokeWidth={1.5}
            />
            {/* Top accent line */}
            <rect
              x={box.x}
              y={y}
              width={boxW}
              height={3}
              rx={1}
              fill={box.color}
              opacity={0.6}
            />
            {/* Label */}
            <text
              x={box.x + boxW / 2}
              y={y + 30}
              textAnchor="middle"
              fill={C.ink}
              fontSize={13}
              fontFamily={SANS}
              fontWeight={600}
            >
              {box.label}
            </text>
            <text
              x={box.x + boxW / 2}
              y={y + 48}
              textAnchor="middle"
              fill={C.inkFaint}
              fontSize={10}
              fontFamily={SANS}
            >
              {box.sublabel}
            </text>
          </motion.g>
        ))}

        {/* Icons inside boxes */}
        <ForeignIcon x={boxes[0].x + boxW / 2} y={y - 20} size={32}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Key size={14} color={C.bronze} strokeWidth={1.5} />
          </div>
        </ForeignIcon>

        {/* Spinning gear for SHA-256 */}
        <g
          transform={`translate(${boxes[1].x + boxW / 2}, ${y - 20}) rotate(${gearAngle})`}
        >
          <circle r={16} fill={C.card} stroke={C.border} strokeWidth={1} />
          <ForeignIcon x={0} y={0} size={24}>
            <Settings size={14} color={C.inkMuted} strokeWidth={1.5} />
          </ForeignIcon>
        </g>

        <ForeignIcon x={boxes[2].x + boxW / 2} y={y - 20} size={32}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Fingerprint size={14} color={C.gold} strokeWidth={1.5} />
          </div>
        </ForeignIcon>

        {/* Arrows between boxes */}
        {[0, 1].map((i) => {
          const fromX = boxes[i].x + boxW;
          const toX = boxes[i + 1].x;
          const arrowY = y + boxH / 2;
          return (
            <motion.g
              key={`arrow${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.3, duration: 0.4 }}
            >
              <line
                x1={fromX + 6}
                y1={arrowY}
                x2={toX - 12}
                y2={arrowY}
                stroke={C.border}
                strokeWidth={1.5}
              />
              {/* Arrow head */}
              <polygon
                points={`${toX - 12},${arrowY - 4} ${toX - 4},${arrowY} ${toX - 12},${arrowY + 4}`}
                fill={C.inkGhost}
              />
              {/* Flowing dot */}
              <circle r={3} fill={C.gold} opacity={0.6}>
                <animateMotion
                  dur="1.5s"
                  repeatCount="indefinite"
                  path={`M ${fromX + 6} ${arrowY} L ${toX - 6} ${arrowY}`}
                />
              </circle>
            </motion.g>
          );
        })}

        {/* DID result display */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <rect
            x={200}
            y={y + boxH + 40}
            width={400}
            height={50}
            rx={8}
            fill={C.card}
            stroke={C.gold}
            strokeWidth={1}
          />
          <rect
            x={200}
            y={y + boxH + 40}
            width={400}
            height={3}
            rx={1}
            fill={C.gold}
            opacity={0.5}
          />
          <text
            x={400}
            y={y + boxH + 58}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={9}
            fontFamily={SANS}
            fontWeight={500}
            letterSpacing="0.08em"
          >
            DECENTRALIZED IDENTIFIER
          </text>
          <text
            x={400}
            y={y + boxH + 76}
            textAnchor="middle"
            fill={C.gold}
            fontSize={14}
            fontFamily={MONO}
            fontWeight={600}
            letterSpacing="0.02em"
          >
            {didDisplay}
          </text>
        </motion.g>

        {/* Decorative hash fragments */}
        {['0x7f3a', '0x2b8e', '0x1dc9'].map((h, i) => (
          <motion.text
            key={h}
            x={120 + i * 250}
            y={y + boxH + 120}
            textAnchor="middle"
            fill={C.inkGhost}
            fontSize={9}
            fontFamily={MONO}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{
              delay: 1.5 + i * 0.3,
              duration: 2.5,
              repeat: Infinity,
            }}
          >
            {h}
          </motion.text>
        ))}
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 3: Capability Assignment ─── */
function CapabilityAssignment() {
  const capabilities = [
    { name: 'TRANSACT', Icon: Zap, color: C.gold },
    { name: 'SIGN', Icon: FileSignature, color: C.bronze },
    { name: 'NEGOTIATE', Icon: Users, color: C.terra },
    { name: 'DISPUTE', Icon: Scale, color: C.rose },
    { name: 'DELEGATE', Icon: GitBranch, color: C.sage },
  ];

  const cx = 400;
  const cy = 200;
  const agentR = 36;
  const badgeOrbitR = 130;
  const badgeR = 28;

  const badgePositions = capabilities.map((_, i) => {
    const angle = (Math.PI * 2 * i) / capabilities.length - Math.PI / 2;
    return {
      x: cx + badgeOrbitR * Math.cos(angle),
      y: cy + badgeOrbitR * Math.sin(angle),
    };
  });

  return (
    <StepWrapper label="Capabilities define what this agent can do in the economy. Each is a signed attestation.">
      <svg
        viewBox="0 0 800 420"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <SvgDefs />

        {/* Connection lines from badges to center */}
        {badgePositions.map((pos, i) => (
          <motion.line
            key={`line${i}`}
            x1={cx}
            y1={cy}
            x2={pos.x}
            y2={pos.y}
            stroke={C.border}
            strokeWidth={1}
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
          />
        ))}

        {/* Flowing dots on connection lines */}
        {badgePositions.map((pos, i) => (
          <motion.circle
            key={`dot${i}`}
            r={2}
            fill={capabilities[i].color}
            opacity={0.4}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.3 + i * 0.1 }}
          >
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              begin={`${i * 0.5}s`}
              path={`M ${cx} ${cy} L ${pos.x} ${pos.y}`}
            />
          </motion.circle>
        ))}

        {/* Agent center circle */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Outer ring pulse */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={agentR + 8}
            fill="none"
            stroke={C.bronze}
            strokeWidth={1}
            animate={{ r: [agentR + 8, agentR + 14, agentR + 8], opacity: [0.3, 0.15, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={agentR}
            fill={C.card}
            stroke={C.bronze}
            strokeWidth={2}
          />
          <ForeignIcon x={cx} y={cy} size={32}>
            <Bot size={20} color={C.bronze} strokeWidth={1.5} />
          </ForeignIcon>
        </motion.g>

        {/* Capability hexagonal badges */}
        {capabilities.map((cap, i) => {
          const pos = badgePositions[i];
          return (
            <motion.g
              key={cap.name}
              initial={{
                opacity: 0,
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 300,
                scale: 0.3,
              }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{
                delay: 0.5 + i * 0.15,
                duration: 0.7,
                type: 'spring',
                stiffness: 120,
                damping: 14,
              }}
            >
              {/* Badge hex background */}
              <polygon
                points={hexPoints(pos.x, pos.y, badgeR + 4)}
                fill="none"
                stroke={cap.color}
                strokeWidth={0.8}
                opacity={0.3}
              />
              <polygon
                points={hexPoints(pos.x, pos.y, badgeR)}
                fill={C.card}
                stroke={cap.color}
                strokeWidth={1.5}
              />
              {/* Icon */}
              <ForeignIcon x={pos.x} y={pos.y - 2} size={22}>
                <cap.Icon size={13} color={cap.color} strokeWidth={1.5} />
              </ForeignIcon>
              {/* Label below badge */}
              <text
                x={pos.x}
                y={pos.y + badgeR + 18}
                textAnchor="middle"
                fill={cap.color}
                fontSize={9}
                fontFamily={SANS}
                fontWeight={600}
                letterSpacing="0.06em"
              >
                {cap.name}
              </text>
            </motion.g>
          );
        })}

        {/* Center label */}
        <motion.text
          x={cx}
          y={cy + agentR + 16}
          textAnchor="middle"
          fill={C.inkFaint}
          fontSize={9}
          fontFamily={SANS}
          fontWeight={500}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Agent
        </motion.text>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 4: Authority Bounds ─── */
function AuthorityBounds() {
  const cx = 400;
  const cy = 210;
  const outerR = 170;
  const innerR = 55;

  const bounds = [
    { label: 'Max Tx', value: 100000, display: '$100K' },
    { label: 'Volume/day', value: 500000, display: '$500K' },
    { label: 'Duration', value: 30, display: '30d' },
    { label: 'Max Depth', value: 2, display: '2' },
    { label: 'Contracts', value: 10, display: '10' },
    { label: 'Counterparties', value: 50, display: '50' },
  ];

  const active = true;
  const vals = [
    useCountUp(100, active, 1800),
    useCountUp(500, active, 1800),
    useCountUp(30, active, 1500),
    useCountUp(2, active, 1200),
    useCountUp(10, active, 1400),
    useCountUp(50, active, 1600),
  ];
  const suffixes = ['K', 'K', 'd', '', '', ''];
  const prefixes = ['$', '$', '', '', '', ''];

  const edgePositions = bounds.map((_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const midA = (Math.PI / 3) * (i + 0.5) - Math.PI / 2;
    return {
      x: cx + (outerR + 30) * Math.cos(midA),
      y: cy + (outerR + 30) * Math.sin(midA),
      edgeX: cx + outerR * Math.cos(a),
      edgeY: cy + outerR * Math.sin(a),
    };
  });

  return (
    <StepWrapper label="Authority bounds are enforced via ZK range proofs — the agent mathematically cannot exceed them.">
      <svg
        viewBox="0 0 800 470"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <SvgDefs />

        {/* Outer boundary hexagon (animated draw-in) */}
        <motion.path
          d={hexPath(cx, cy, outerR)}
          fill="none"
          stroke={C.bronze}
          strokeWidth={2}
          strokeDasharray="8 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />

        {/* Pulsing outer glow */}
        <motion.path
          d={hexPath(cx, cy, outerR + 6)}
          fill="none"
          stroke={C.gold}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1.5 }}
        />

        {/* Corner dots on outer hex */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          return (
            <motion.circle
              key={i}
              cx={cx + outerR * Math.cos(a)}
              cy={cy + outerR * Math.sin(a)}
              r={4}
              fill={C.card}
              stroke={C.bronze}
              strokeWidth={1.5}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.1, duration: 0.3 }}
            />
          );
        })}

        {/* Inner agent hexagon */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <polygon
            points={hexPoints(cx, cy, innerR)}
            fill={C.card}
            stroke={C.gold}
            strokeWidth={1.5}
          />
          <ForeignIcon x={cx} y={cy - 4} size={30}>
            <Bot size={18} color={C.gold} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={9}
            fontFamily={SANS}
          >
            Agent
          </text>
        </motion.g>

        {/* Radial lines from inner to outer hex */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          return (
            <motion.line
              key={`rad${i}`}
              x1={cx + innerR * Math.cos(a)}
              y1={cy + innerR * Math.sin(a)}
              x2={cx + outerR * Math.cos(a)}
              y2={cy + outerR * Math.sin(a)}
              stroke={C.border}
              strokeWidth={0.8}
              strokeDasharray="3 5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 1.5 + i * 0.08 }}
            />
          );
        })}

        {/* Bound labels around the hexagon edges */}
        {bounds.map((bound, i) => {
          const pos = edgePositions[i];
          return (
            <motion.g
              key={bound.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 1.8 + i * 0.15,
                duration: 0.4,
                type: 'spring',
                stiffness: 150,
              }}
            >
              {/* Connector line */}
              <line
                x1={pos.edgeX}
                y1={pos.edgeY}
                x2={pos.x}
                y2={pos.y}
                stroke={C.border}
                strokeWidth={0.8}
              />
              {/* Label background */}
              <rect
                x={pos.x - 48}
                y={pos.y - 18}
                width={96}
                height={36}
                rx={6}
                fill={C.card}
                stroke={C.border}
                strokeWidth={1}
              />
              {/* Label text */}
              <text
                x={pos.x}
                y={pos.y - 4}
                textAnchor="middle"
                fill={C.inkFaint}
                fontSize={8}
                fontFamily={SANS}
                fontWeight={500}
                letterSpacing="0.05em"
              >
                {bound.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 12}
                textAnchor="middle"
                fill={C.bronze}
                fontSize={13}
                fontFamily={MONO}
                fontWeight={700}
              >
                {prefixes[i]}
                {vals[i]}
                {suffixes[i]}
              </text>
            </motion.g>
          );
        })}

        {/* ZK badge */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.2 }}
        >
          <rect
            x={cx - 55}
            y={cy + outerR + 50}
            width={110}
            height={26}
            rx={13}
            fill={C.sage}
            opacity={0.15}
          />
          <text
            x={cx}
            y={cy + outerR + 68}
            textAnchor="middle"
            fill={C.sage}
            fontSize={10}
            fontFamily={MONO}
            fontWeight={600}
          >
            ZK ENFORCED
          </text>
        </motion.g>
      </svg>
    </StepWrapper>
  );
}

/* ─── Step 5: Merkle Tree Registration ─── */
function MerkleRegistration() {
  const rootHash = '8a4f2c1b7d9e3065';
  const rootDisplay = useCyclingHex(rootHash, true, 60);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const treeNodes = [
    { id: 'root', x: 400, y: 40, r: 22, label: 'Root', color: C.gold, hash: true },
    { id: 'n1', x: 260, y: 135, r: 16, label: '', color: C.inkGhost, hash: false },
    { id: 'n2', x: 540, y: 135, r: 16, label: '', color: C.inkGhost, hash: false },
    { id: 'l0', x: 185, y: 230, r: 13, label: 'L0', color: C.inkGhost, hash: false },
    { id: 'l1', x: 335, y: 230, r: 13, label: 'L1', color: C.inkGhost, hash: false },
    { id: 'l2', x: 465, y: 230, r: 13, label: 'L2', color: C.inkGhost, hash: false },
    { id: 'l3', x: 615, y: 230, r: 13, label: 'L3', color: C.inkGhost, hash: false },
  ];

  const newLeaf = { id: 'new', x: 540, y: 310, r: 16, label: 'NEW', color: C.gold };

  const edges = [
    { from: 'root', to: 'n1' },
    { from: 'root', to: 'n2' },
    { from: 'n1', to: 'l0' },
    { from: 'n1', to: 'l1' },
    { from: 'n2', to: 'l2' },
    { from: 'n2', to: 'l3' },
  ];

  const newEdge = { from: 'n2', to: 'new' };

  const nodeMap = Object.fromEntries(
    [...treeNodes, newLeaf].map((n) => [n.id, n]),
  );

  return (
    <StepWrapper label="Agent registered. DID: did:aeos:7f3a2b... | Status: ACTIVE">
      <svg
        viewBox="0 0 800 420"
        className="w-full max-w-3xl"
        style={{ overflow: 'visible' }}
      >
        <SvgDefs />

        {/* Tree edges */}
        {edges.map((e, i) => {
          const from = nodeMap[e.from];
          const to = nodeMap[e.to];
          return (
            <motion.line
              key={`${e.from}-${e.to}`}
              x1={from.x}
              y1={from.y + from.r}
              x2={to.x}
              y2={to.y - to.r}
              stroke={C.border}
              strokeWidth={1.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            />
          );
        })}

        {/* New edge (animated later) */}
        <motion.line
          x1={nodeMap[newEdge.from].x}
          y1={nodeMap[newEdge.from].y + nodeMap[newEdge.from].r}
          x2={newLeaf.x}
          y2={newLeaf.y - newLeaf.r}
          stroke={C.gold}
          strokeWidth={1.5}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        />

        {/* Existing tree nodes */}
        {treeNodes.map((node, i) => (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={C.card}
              stroke={node.color}
              strokeWidth={node.hash ? 2 : 1.2}
            />
            {node.label && (
              <text
                x={node.x}
                y={node.y + 3.5}
                textAnchor="middle"
                fill={node.hash ? C.gold : C.inkFaint}
                fontSize={node.hash ? 10 : 8}
                fontFamily={SANS}
                fontWeight={node.hash ? 600 : 400}
              >
                {node.label}
              </text>
            )}
            {/* Hash fragments inside non-leaf nodes */}
            {!node.label && (
              <text
                x={node.x}
                y={node.y + 3}
                textAnchor="middle"
                fill={C.inkGhost}
                fontSize={7}
                fontFamily={MONO}
              >
                h{i}
              </text>
            )}
          </motion.g>
        ))}

        {/* New leaf node (gold, highlighted) */}
        <motion.g
          initial={{ opacity: 0, scale: 0, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            delay: 1.3,
            duration: 0.6,
            type: 'spring',
            stiffness: 140,
          }}
        >
          {/* Glow ring */}
          <motion.circle
            cx={newLeaf.x}
            cy={newLeaf.y}
            r={newLeaf.r + 8}
            fill="none"
            stroke={C.gold}
            strokeWidth={1}
            filter="url(#goldGlow)"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <circle
            cx={newLeaf.x}
            cy={newLeaf.y}
            r={newLeaf.r}
            fill={C.card}
            stroke={C.gold}
            strokeWidth={2}
          />
          <ForeignIcon x={newLeaf.x} y={newLeaf.y} size={20}>
            <Bot size={12} color={C.gold} strokeWidth={1.5} />
          </ForeignIcon>
          <text
            x={newLeaf.x}
            y={newLeaf.y + newLeaf.r + 16}
            textAnchor="middle"
            fill={C.gold}
            fontSize={9}
            fontFamily={SANS}
            fontWeight={600}
            letterSpacing="0.06em"
          >
            NEW AGENT
          </text>
        </motion.g>

        {/* Root hash display */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <rect
            x={300}
            y={370}
            width={200}
            height={36}
            rx={6}
            fill={C.card}
            stroke={C.gold}
            strokeWidth={1}
          />
          <text
            x={400}
            y={384}
            textAnchor="middle"
            fill={C.inkFaint}
            fontSize={8}
            fontFamily={SANS}
            fontWeight={500}
            letterSpacing="0.05em"
          >
            MERKLE ROOT
          </text>
          <text
            x={400}
            y={399}
            textAnchor="middle"
            fill={C.gold}
            fontSize={11}
            fontFamily={MONO}
            fontWeight={600}
          >
            0x{rootDisplay}
          </text>
        </motion.g>

        {/* Hash update animation — particles flowing up from new leaf to root */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={`flow${i}`}
            r={2.5}
            fill={C.gold}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2 + i * 0.3 }}
          >
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin={`${2 + i * 0.5}s`}
              path={`M ${newLeaf.x} ${newLeaf.y} L ${nodeMap['n2'].x} ${nodeMap['n2'].y} L ${nodeMap['root'].x} ${nodeMap['root'].y}`}
            />
            <animate
              attributeName="opacity"
              values="0;0.6;0"
              dur="2s"
              repeatCount="indefinite"
              begin={`${2 + i * 0.5}s`}
            />
          </motion.circle>
        ))}

        {/* Verification checkmark */}
        <AnimatePresence>
          {showCheck && (
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            >
              <rect
                x={520}
                y={370}
                width={170}
                height={36}
                rx={18}
                fill={C.sage}
                opacity={0.12}
              />
              <ForeignIcon x={550} y={388} size={20}>
                <Check size={12} color={C.sage} strokeWidth={2.5} />
              </ForeignIcon>
              <text
                x={615}
                y={392}
                textAnchor="middle"
                fill={C.sage}
                fontSize={11}
                fontFamily={SANS}
                fontWeight={600}
              >
                Registry Proof Valid
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Leaf node hash labels */}
        {treeNodes
          .filter((n) => n.id.startsWith('l'))
          .map((n) => (
            <motion.text
              key={n.id}
              x={n.x}
              y={n.y + n.r + 14}
              textAnchor="middle"
              fill={C.inkGhost}
              fontSize={7}
              fontFamily={MONO}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.8 }}
            >
              {randomHex(6)}
            </motion.text>
          ))}
      </svg>
    </StepWrapper>
  );
}

/* ─── Main Component ─── */
export default function Scene02_AgentGenesis({
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
    'Key Generation',
    'Key Pair Split',
    'DID Derivation',
    'Capabilities',
    'Authority Bounds',
    'Registry',
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: C.cream }}
    >
      {/* Header */}
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
          transition={{ duration: 0.4 }}
        >
          SCENE 02
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
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Agent Genesis
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
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          Creating a cryptographic identity from nothing
        </motion.p>

        {/* Progress bar */}
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

        {/* Step indicator pills */}
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

      {/* Visualization */}
      <div className="flex-1 flex items-center justify-center px-6 pb-10">
        <AnimatePresence mode="wait">
          {step === 0 && <KeyGeneration key="s0" />}
          {step === 1 && <KeySplit key="s1" />}
          {step === 2 && <DIDDerivation key="s2" />}
          {step === 3 && <CapabilityAssignment key="s3" />}
          {step === 4 && <AuthorityBounds key="s4" />}
          {step === 5 && <MerkleRegistration key="s5" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
