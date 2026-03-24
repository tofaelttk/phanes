import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Lock,
  Check,
  User,
  FileSignature,
  ShieldCheck,
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

const DURATIONS = [4000, 5000, 5000, 5000, 4000];
const ALICE_SIG = '4a7f3bc21e09d856';
const BOB_SIG = '9d2e8f14c7a3b065';
const TERMS_HASH = '7c3a9f82d1b6e405';

/* ────────────────────── CyclingHex ────────────────────── */

function CyclingHex({
  target,
  active,
  prefix = '0x',
  color = C.accent,
}: {
  target: string;
  active: boolean;
  prefix?: string;
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
      const s =
        target.slice(0, settled) +
        Array.from({ length: target.length - settled }, () =>
          HEX[Math.floor(Math.random() * 16)],
        ).join('');
      setDisplay(s);
      if (settled >= target.length) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [active, target]);

  return (
    <span
      style={{
        fontFamily: '"SF Mono","Fira Code","Cascadia Code",monospace',
        fontSize: 11,
        color,
        letterSpacing: 0.5,
      }}
    >
      {prefix}
      {display.slice(0, 8)}…
    </span>
  );
}

/* ────────────────────── AgentCard ────────────────────── */

function AgentCard({
  name,
  did,
  role,
  glowing,
  glowColor,
  signed,
  sigHex,
  sigActive,
}: {
  name: string;
  did: string;
  role: string;
  glowing: boolean;
  glowColor: string;
  signed: boolean;
  sigHex: string;
  sigActive: boolean;
}) {
  return (
    <motion.div
      layout
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1.5px solid ${glowing ? glowColor : C.rule}`,
        padding: '18px 20px',
        width: 170,
        boxShadow: glowing
          ? `0 0 24px ${rgba(glowColor, 0.2)}, 0 2px 10px ${rgba(C.ink, 0.06)}`
          : `0 2px 10px ${rgba(C.ink, 0.06)}`,
        transition: 'border-color 0.6s, box-shadow 0.6s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: rgba(glowColor, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <User size={16} color={glowColor} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
            {name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.inkFaint,
              fontFamily: 'monospace',
            }}
          >
            {did}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 10,
          color: C.inkMuted,
          background: rgba(C.rule, 0.4),
          borderRadius: 4,
          padding: '2px 8px',
          display: 'inline-block',
          marginBottom: 10,
        }}
      >
        {role}
      </div>

      <AnimatePresence>
        {glowing && !signed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
              fontSize: 11,
              color: glowColor,
              fontWeight: 500,
            }}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Key size={14} color={glowColor} />
            </motion.div>
            Signing…
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {signed && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 8,
              background: rgba(C.sage, 0.08),
              borderRadius: 6,
              padding: '6px 10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: C.sage,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              <Check size={12} strokeWidth={3} />
              Signed
            </div>
            <CyclingHex
              target={sigHex}
              active={sigActive}
              color={glowColor}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────── ContractCard ────────────────────── */

function ContractCard({
  state,
  signatures,
  sigCount,
  showEscrow,
  showLedger,
}: {
  state: 'PROPOSED' | 'ACTIVE';
  signatures: Array<{ signer: string; hex: string; color: string }>;
  sigCount: number;
  showEscrow: boolean;
  showLedger: boolean;
}) {
  const isActive = state === 'ACTIVE';
  const borderColor = isActive ? C.gold : C.rule;
  const badgeBg = isActive ? rgba(C.sage, 0.12) : rgba(C.inkFaint, 0.1);
  const badgeColor = isActive ? C.sage : C.inkFaint;

  return (
    <motion.div
      layout
      style={{
        background: C.card,
        borderRadius: 14,
        border: `1.5px solid ${borderColor}`,
        padding: '20px 24px',
        width: 250,
        boxShadow: isActive
          ? `0 0 20px ${rgba(C.gold, 0.15)}, 0 4px 20px ${rgba(C.ink, 0.08)}`
          : `0 4px 20px ${rgba(C.ink, 0.08)}`,
        transition: 'border-color 0.8s, box-shadow 0.8s',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FileSignature size={18} color={C.inkMuted} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
            Contract
          </span>
        </div>
        <motion.div
          layout
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.8,
            padding: '3px 10px',
            borderRadius: 4,
            background: badgeBg,
            color: badgeColor,
            textTransform: 'uppercase',
          }}
        >
          {state}
        </motion.div>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: C.ink,
          marginBottom: 6,
        }}
      >
        $25,000
      </div>

      {/* Terms hash */}
      <div
        style={{
          fontSize: 10,
          color: C.inkFaint,
          fontFamily: 'monospace',
          marginBottom: 14,
          padding: '4px 8px',
          background: rgba(C.rule, 0.3),
          borderRadius: 4,
          display: 'inline-block',
        }}
      >
        terms: 0x{TERMS_HASH.slice(0, 10)}…
      </div>

      {/* Signatures section */}
      <div
        style={{
          borderTop: `1px solid ${C.ruleLight}`,
          paddingTop: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: C.inkFaint,
            marginBottom: 8,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Signatures ({sigCount} of 2)
        </div>

        {/* Signature slots */}
        {[0, 1].map((idx) => {
          const sig = signatures[idx];
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 28,
                marginBottom: 4,
                padding: '0 8px',
                borderRadius: 4,
                border: `1px dashed ${sig ? sig.color : C.ruleLight}`,
                background: sig ? rgba(sig.color, 0.04) : 'transparent',
                transition: 'all 0.4s',
              }}
            >
              {sig ? (
                <motion.div
                  initial={{ opacity: 0, x: idx === 0 ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: sig.color,
                  }}
                >
                  <ShieldCheck size={12} />
                  {sig.signer}: 0x{sig.hex.slice(0, 8)}…
                </motion.div>
              ) : (
                <span
                  style={{ fontSize: 10, color: C.inkFaint, fontStyle: 'italic' }}
                >
                  {idx === 0 ? 'Alice' : 'Bob'} — awaiting
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Escrow */}
      <AnimatePresence>
        {showEscrow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              borderTop: `1px solid ${C.ruleLight}`,
              paddingTop: 12,
              marginTop: 4,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                color: C.ink,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.6 }}
              >
                <Lock size={16} color={C.gold} />
              </motion.div>
              LOCKED $25,000
            </div>
            <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 4 }}>
              Escrow secured until obligations met
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ledger entry */}
      <AnimatePresence>
        {showLedger && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            style={{
              borderTop: `1px solid ${C.ruleLight}`,
              paddingTop: 10,
              marginTop: 10,
              fontSize: 9,
              fontFamily: 'monospace',
              color: C.inkFaint,
              lineHeight: 1.5,
            }}
          >
            <div>EVENT: contract_activated</div>
            <div>seq: 4 | hash: 0x{rHex(10)}…</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────── Connection SVG ────────────────────── */

function ConnectionsSVG({
  step,
  aliceSigning,
  bobSigning,
}: {
  step: number;
  aliceSigning: boolean;
  bobSigning: boolean;
}) {
  return (
    <svg
      viewBox="0 0 780 320"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'visible',
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="msig-arrow"
          markerWidth="6"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <polygon points="0 0, 6 2, 0 4" fill={C.rule} />
        </marker>
        <linearGradient id="key-glow-alice" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.accent} stopOpacity={0.6} />
          <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="key-glow-bob" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor={C.terra} stopOpacity={0.6} />
          <stop offset="100%" stopColor={C.terra} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Left dashed connection */}
      {step >= 0 && (
        <motion.path
          d="M 185 160 L 268 160"
          stroke={step >= 1 ? C.accent : C.rule}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.0, delay: 0.4 }}
        />
      )}

      {/* Right dashed connection */}
      {step >= 0 && (
        <motion.path
          d="M 595 160 L 512 160"
          stroke={step >= 2 ? C.terra : C.rule}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.0, delay: 0.6 }}
        />
      )}

      {/* Alice key glow trail */}
      {aliceSigning && (
        <motion.rect
          x={185}
          y={155}
          width={80}
          height={10}
          rx={5}
          fill="url(#key-glow-alice)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.5, repeat: 2 }}
        />
      )}

      {/* Bob key glow trail */}
      {bobSigning && (
        <motion.rect
          x={515}
          y={155}
          width={80}
          height={10}
          rx={5}
          fill="url(#key-glow-bob)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.5, repeat: 2 }}
        />
      )}

      {/* Alice key icon traveling */}
      {aliceSigning && (
        <motion.g
          initial={{ x: 0, opacity: 1 }}
          animate={{ x: [0, 30, 60, 80], opacity: [1, 1, 0.7, 0] }}
          transition={{ duration: 1.8 }}
        >
          <circle cx={190} cy={160} r={10} fill={rgba(C.accent, 0.15)} />
          <motion.circle
            cx={190}
            cy={160}
            r={10}
            fill="none"
            stroke={C.accent}
            strokeWidth={1}
            initial={{ r: 10 }}
            animate={{ r: [10, 16, 10] }}
            transition={{ duration: 0.8, repeat: 2 }}
            opacity={0.4}
          />
        </motion.g>
      )}

      {/* Bob key icon traveling */}
      {bobSigning && (
        <motion.g
          initial={{ x: 0, opacity: 1 }}
          animate={{ x: [0, -30, -60, -80], opacity: [1, 1, 0.7, 0] }}
          transition={{ duration: 1.8 }}
        >
          <circle cx={590} cy={160} r={10} fill={rgba(C.terra, 0.15)} />
          <motion.circle
            cx={590}
            cy={160}
            r={10}
            fill="none"
            stroke={C.terra}
            strokeWidth={1}
            initial={{ r: 10 }}
            animate={{ r: [10, 16, 10] }}
            transition={{ duration: 0.8, repeat: 2 }}
            opacity={0.4}
          />
        </motion.g>
      )}
    </svg>
  );
}

/* ────────────────────── Pipeline SVG ────────────────────── */

function SignaturePipeline({
  visible,
  color,
  signer,
}: {
  visible: boolean;
  color: string;
  signer: string;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.4 }}
      style={{
        marginTop: 12,
        background: C.card,
        borderRadius: 10,
        border: `1px solid ${C.rule}`,
        padding: '12px 20px',
        maxWidth: 520,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.inkFaint,
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {signer} signing pipeline
      </div>
      <svg
        viewBox="0 0 480 56"
        style={{ width: '100%', height: 56 }}
      >
        <defs>
          <marker
            id="pipe-arrow"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill={C.inkFaint} />
          </marker>
        </defs>

        {/* Box 1: terms_hash */}
        <motion.rect
          x={4}
          y={10}
          width={110}
          height={36}
          rx={6}
          fill={rgba(color, 0.06)}
          stroke={rgba(color, 0.3)}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        />
        <text
          x={59}
          y={33}
          textAnchor="middle"
          fontSize={10}
          fill={C.inkMuted}
          fontFamily="monospace"
        >
          terms_hash
        </text>

        {/* Arrow 1 */}
        <motion.path
          d="M 120 28 L 158 28"
          stroke={C.inkFaint}
          strokeWidth={1}
          fill="none"
          markerEnd="url(#pipe-arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        />

        {/* Box 2: Ed25519 */}
        <motion.rect
          x={164}
          y={10}
          width={120}
          height={36}
          rx={6}
          fill={rgba(color, 0.12)}
          stroke={color}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />
        <text
          x={224}
          y={33}
          textAnchor="middle"
          fontSize={10}
          fill={color}
          fontWeight={600}
          fontFamily="monospace"
        >
          Ed25519
        </text>

        {/* Arrow 2 */}
        <motion.path
          d="M 290 28 L 328 28"
          stroke={C.inkFaint}
          strokeWidth={1}
          fill="none"
          markerEnd="url(#pipe-arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.7 }}
        />

        {/* Box 3: signature */}
        <motion.rect
          x={334}
          y={10}
          width={130}
          height={36}
          rx={6}
          fill={rgba(color, 0.06)}
          stroke={rgba(color, 0.3)}
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        />
        <text
          x={399}
          y={33}
          textAnchor="middle"
          fontSize={10}
          fill={color}
          fontFamily="monospace"
        >
          → signature
        </text>
      </svg>
    </motion.div>
  );
}

/* ────────────────────── Verification ────────────────────── */

function VerifyItem({
  label,
  detail,
  delay,
  visible,
}: {
  label: string;
  detail?: string;
  delay: number;
  visible: boolean;
}) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!visible) {
      setChecked(false);
      return;
    }
    const t = setTimeout(() => setChecked(true), delay * 1000);
    return () => clearTimeout(t);
  }, [visible, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -12 }}
      transition={{ duration: 0.3, delay }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
      }}
    >
      <motion.div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          border: `1.5px solid ${checked ? C.sage : C.rule}`,
          background: checked ? rgba(C.sage, 0.1) : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.3s',
        }}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Check size={13} color={C.sage} strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div>
        <span
          style={{
            fontSize: 13,
            color: checked ? C.sage : C.inkMuted,
            fontWeight: checked ? 600 : 400,
            transition: 'color 0.3s',
          }}
        >
          {label}
          {checked && ' ✓'}
        </span>
        {detail && (
          <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 1 }}>
            {detail}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ────────────────────── Gold Particles ────────────────────── */

function GoldParticles({ active }: { active: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 200,
        delay: Math.random() * 0.8,
        size: 2 + Math.random() * 3,
        dur: 1.4 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 60,
      })),
    [],
  );

  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '45%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: C.gold,
          }}
          initial={{ y: 0, x: 0, opacity: 0.9 }}
          animate={{
            y: -120 - Math.random() * 80,
            x: p.drift,
            opacity: 0,
          }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ────────────────────── Main Scene ────────────────────── */

export default function Scene05_MultiSigActivation({
  step,
  onStepComplete,
}: Props) {
  const [aliceSigning, setAliceSigning] = useState(false);
  const [aliceSigned, setAliceSigned] = useState(false);
  const [bobSigning, setBobSigning] = useState(false);
  const [bobSigned, setBobSigned] = useState(false);
  const [contractState, setContractState] = useState<'PROPOSED' | 'ACTIVE'>(
    'PROPOSED',
  );
  const [showEscrow, setShowEscrow] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [sigCount, setSigCount] = useState(0);
  const [aliceSigActive, setAliceSigActive] = useState(false);
  const [bobSigActive, setBobSigActive] = useState(false);

  useEffect(() => {
    if (step < 0 || step >= DURATIONS.length) return;
    const t = setTimeout(onStepComplete, DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step, onStepComplete]);

  useEffect(() => {
    if (step < 1) return;
    setAliceSigning(true);
    const t1 = setTimeout(() => setAliceSigActive(true), 800);
    const t2 = setTimeout(() => {
      setAliceSigned(true);
      setAliceSigning(false);
      setSigCount(1);
    }, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  useEffect(() => {
    if (step < 2) return;
    setBobSigning(true);
    const t1 = setTimeout(() => setBobSigActive(true), 800);
    const t2 = setTimeout(() => {
      setBobSigned(true);
      setBobSigning(false);
      setSigCount(2);
    }, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  useEffect(() => {
    if (step < 4) return;
    const t1 = setTimeout(() => setContractState('ACTIVE'), 400);
    const t2 = setTimeout(() => setShowEscrow(true), 800);
    const t3 = setTimeout(() => setShowLedger(true), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [step]);

  const signatures = useMemo(() => {
    const s: Array<{ signer: string; hex: string; color: string }> = [];
    if (aliceSigned)
      s.push({ signer: 'Alice', hex: ALICE_SIG, color: C.accent });
    if (bobSigned) s.push({ signer: 'Bob', hex: BOB_SIG, color: C.terra });
    return s;
  }, [aliceSigned, bobSigned]);

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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 28 }}
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
          Scene 05
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
          Multi-Signature Activation
        </h2>
        <p style={{ fontSize: 14, color: C.inkMuted, margin: 0 }}>
          Both parties sign — escrow locks automatically
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
            marginBottom: 24,
            textAlign: 'center',
            maxWidth: 450,
          }}
        >
          {step === 0 && 'Contract proposed. Awaiting signatures from both parties.'}
          {step === 1 && 'Alice reviews terms and signs with her Ed25519 private key.'}
          {step === 2 && 'Bob reviews and co-signs. Both signatures now on the contract.'}
          {step === 3 && 'Verifying all signatures against the terms hash…'}
          {step === 4 && 'All checks passed. Contract is now active with escrow locked.'}
        </motion.div>
      </AnimatePresence>

      {/* Main visualization */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 780,
          height: 320,
          marginBottom: 16,
        }}
      >
        <ConnectionsSVG
          step={step}
          aliceSigning={aliceSigning}
          bobSigning={bobSigning}
        />

        {/* Alice */}
        <motion.div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AgentCard
            name="Alice"
            did="did:aeos:9f3a7c…"
            role="Buyer"
            glowing={step === 1}
            glowColor={C.accent}
            signed={aliceSigned}
            sigHex={ALICE_SIG}
            sigActive={aliceSigActive}
          />
        </motion.div>

        {/* Contract */}
        <motion.div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ContractCard
            state={contractState}
            signatures={signatures}
            sigCount={sigCount}
            showEscrow={showEscrow}
            showLedger={showLedger}
          />
        </motion.div>

        {/* Bob */}
        <motion.div
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AgentCard
            name="Bob"
            did="did:aeos:2e8f14…"
            role="Provider"
            glowing={step === 2}
            glowColor={C.terra}
            signed={bobSigned}
            sigHex={BOB_SIG}
            sigActive={bobSigActive}
          />
        </motion.div>

        <GoldParticles active={step >= 4} />
      </div>

      {/* Signature pipeline */}
      <AnimatePresence>
        {step >= 1 && step <= 2 && (
          <SignaturePipeline
            visible
            color={step === 1 ? C.accent : C.terra}
            signer={step === 1 ? 'Alice' : 'Bob'}
          />
        )}
      </AnimatePresence>

      {/* Counter */}
      <AnimatePresence>
        {sigCount > 0 && step < 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: 13,
              color: C.inkMuted,
              marginTop: 10,
              fontWeight: 500,
            }}
          >
            Signature {sigCount} of 2
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              width: '100%',
              maxWidth: 400,
              marginTop: 16,
              background: C.card,
              borderRadius: 10,
              border: `1px solid ${C.rule}`,
              padding: '14px 20px',
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
              }}
            >
              Verification
            </div>
            <VerifyItem
              label="Terms hash match"
              detail="both signed same hash"
              delay={0}
              visible={step >= 3}
            />
            <VerifyItem
              label="Alice signature valid"
              delay={0.4}
              visible={step >= 3}
            />
            <VerifyItem
              label="Bob signature valid"
              delay={0.8}
              visible={step >= 3}
            />
            <VerifyItem
              label="Authority verified"
              delay={1.2}
              visible={step >= 3}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
