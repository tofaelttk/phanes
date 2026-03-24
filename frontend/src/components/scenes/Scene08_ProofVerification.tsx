import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  FileSignature,
  User,
  Link,
  Unlock,
  CircleDot,
  CheckCircle,
  CreditCard,
  Cpu,
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

const DURATIONS = [4000, 5000, 5000, 5000];
const BOB_PROOF = 'c7e3a9f18d2b6054';
const ALICE_PROOF = '5b8d4f21a6c3e097';

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
        fontSize: 11,
        color,
        fontWeight: 600,
      }}
    >
      0x{display.slice(0, 10)}…
    </span>
  );
}

/* ────────────────────── ObligationRow ────────────────────── */

function ObligationRow({
  type,
  responsible,
  fulfilled,
  icon: Icon,
  animating,
}: {
  type: string;
  responsible: string;
  fulfilled: boolean;
  icon: typeof Cpu;
  animating: boolean;
}) {
  return (
    <motion.div
      layout
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderRadius: 8,
        border: `1px solid ${fulfilled ? rgba(C.sage, 0.3) : C.ruleLight}`,
        background: fulfilled ? rgba(C.sage, 0.04) : 'transparent',
        marginBottom: 6,
        transition: 'all 0.5s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: rgba(fulfilled ? C.sage : C.inkFaint, 0.08),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={14} color={fulfilled ? C.sage : C.inkFaint} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
            {type}
          </div>
          <div style={{ fontSize: 10, color: C.inkFaint }}>
            {responsible}
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {fulfilled ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: C.sage,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <CheckCircle size={16} strokeWidth={2.5} />
            Fulfilled
          </motion.div>
        ) : animating ? (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              fontSize: 11,
              color: C.gold,
              fontWeight: 500,
            }}
          >
            Verifying…
          </motion.div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: C.inkFaint,
              fontSize: 11,
            }}
          >
            <CircleDot size={14} />
            Unfulfilled
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────── VerifyItem ────────────────────── */

function VerifyItem({
  label,
  delay,
  visible,
}: {
  label: string;
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -10 }}
      transition={{ duration: 0.25, delay }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
      }}
    >
      <motion.div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
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
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <Check size={12} color={C.sage} strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <span
        style={{
          fontSize: 12,
          color: checked ? C.sage : C.inkMuted,
          fontWeight: checked ? 600 : 400,
          transition: 'color 0.3s',
        }}
      >
        {checked ? '✓ ' : '☐ '}
        {label}
      </span>
    </motion.div>
  );
}

/* ────────────────────── EscrowUpdate ────────────────────── */

function EscrowUpdate({
  visible,
  milestone,
}: {
  visible: boolean;
  milestone: string;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 6,
        background: rgba(C.gold, 0.06),
        border: `1px solid ${rgba(C.gold, 0.2)}`,
        fontSize: 11,
        color: C.gold,
        fontWeight: 500,
        marginTop: 8,
      }}
    >
      <Unlock size={14} />
      Milestone &lsquo;{milestone}&rsquo; released
    </motion.div>
  );
}

/* ────────────────────── LedgerEntry ────────────────────── */

function LedgerEntry({
  event,
  hash,
  prevHash,
  index,
  delay,
}: {
  event: string;
  hash: string;
  prevHash: string;
  index: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        background: C.card,
        borderRadius: 8,
        border: `1px solid ${C.rule}`,
        padding: '10px 14px',
        minWidth: 180,
        boxShadow: `0 1px 6px ${rgba(C.ink, 0.04)}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.accent,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        Entry #{index + 1}
      </div>
      <div style={{ fontSize: 11, color: C.ink, fontWeight: 600, marginBottom: 4 }}>
        {event}
      </div>
      <div
        style={{
          fontSize: 9,
          fontFamily: 'monospace',
          color: C.inkFaint,
          lineHeight: 1.6,
        }}
      >
        <div>
          hash: <span style={{ color: C.inkMuted }}>0x{hash.slice(0, 10)}…</span>
        </div>
        <div>
          prev: <span style={{ color: C.inkMuted }}>0x{prevHash.slice(0, 10)}…</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────── Ledger Chain SVG ────────────────────── */

function LedgerChain({
  visible,
  entries,
}: {
  visible: boolean;
  entries: Array<{ event: string; hash: string; prevHash: string }>;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        background: C.card,
        borderRadius: 14,
        border: `1px solid ${C.rule}`,
        padding: '18px 22px',
        maxWidth: 620,
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
          marginBottom: 14,
        }}
      >
        Ledger Entries
      </div>

      {/* Chain visualization with SVG arrows */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {entries.map((e, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
            }}
          >
            <LedgerEntry
              event={e.event}
              hash={e.hash}
              prevHash={e.prevHash}
              index={i}
              delay={0.4 + i * 0.3}
            />
            {i < entries.length - 1 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.7 + i * 0.3, duration: 0.3 }}
                style={{ padding: '0 4px' }}
              >
                <svg viewBox="0 0 32 20" style={{ width: 32, height: 20 }}>
                  <defs>
                    <marker
                      id={`chain-arrow-${i}`}
                      markerWidth="6"
                      markerHeight="4"
                      refX="5"
                      refY="2"
                      orient="auto"
                    >
                      <polygon points="0 0, 6 2, 0 4" fill={C.gold} />
                    </marker>
                  </defs>
                  <line
                    x1={2}
                    y1={10}
                    x2={26}
                    y2={10}
                    stroke={C.gold}
                    strokeWidth={1.5}
                    markerEnd={`url(#chain-arrow-${i})`}
                  />
                </svg>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Hash chain explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        style={{
          marginTop: 12,
          fontSize: 10,
          color: C.inkFaint,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Link size={12} color={C.gold} />
        Each entry&apos;s prev_hash links to the preceding entry, forming a
        tamper-evident chain.
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────── Main Scene ────────────────────── */

export default function Scene08_ProofVerification({
  step,
  onStepComplete,
}: Props) {
  const [compVerifying, setCompVerifying] = useState(false);
  const [compFulfilled, setCompFulfilled] = useState(false);
  const [payVerifying, setPayVerifying] = useState(false);
  const [payFulfilled, setPayFulfilled] = useState(false);
  const [bobProofActive, setBobProofActive] = useState(false);
  const [aliceProofActive, setAliceProofActive] = useState(false);
  const [contractState, setContractState] = useState<'ACTIVE' | 'COMPLETED'>(
    'ACTIVE',
  );
  const [showCompEscrow, setShowCompEscrow] = useState(false);
  const [showPayEscrow, setShowPayEscrow] = useState(false);

  const ledgerEntries = useMemo(
    () => [
      {
        event: 'obligation_fulfilled',
        hash: rHex(16),
        prevHash: rHex(16),
      },
      {
        event: 'obligation_fulfilled',
        hash: rHex(16),
        prevHash: rHex(16),
      },
      {
        event: 'contract_completed',
        hash: rHex(16),
        prevHash: rHex(16),
      },
    ],
    [],
  );

  useEffect(() => {
    if (step < 0 || step >= DURATIONS.length) return;
    const t = setTimeout(onStepComplete, DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step, onStepComplete]);

  useEffect(() => {
    if (step < 1) return;
    setCompVerifying(true);
    setBobProofActive(true);
    const t1 = setTimeout(() => {
      setCompFulfilled(true);
      setCompVerifying(false);
    }, 3200);
    const t2 = setTimeout(() => setShowCompEscrow(true), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  useEffect(() => {
    if (step < 2) return;
    setPayVerifying(true);
    setAliceProofActive(true);
    const t1 = setTimeout(() => {
      setPayFulfilled(true);
      setPayVerifying(false);
    }, 3200);
    const t2 = setTimeout(() => setShowPayEscrow(true), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  useEffect(() => {
    if (step < 3) return;
    const t = setTimeout(() => setContractState('COMPLETED'), 800);
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
          Scene 08
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
          Proof Verification
        </h2>
        <p style={{ fontSize: 14, color: C.inkMuted, margin: 0 }}>
          Cryptographic verification of obligation fulfillment
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
            maxWidth: 500,
          }}
        >
          {step === 0 &&
            'Each obligation must be individually verified with cryptographic proof.'}
          {step === 1 &&
            "Verifying Bob's computation proof against the contract terms."}
          {step === 2 &&
            "Verifying Alice's payment proof. Escrow released on success."}
          {step === 3 &&
            'All obligations fulfilled. Contract completed and ledger updated.'}
        </motion.div>
      </AnimatePresence>

      {/* Contract card with obligations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: C.card,
          borderRadius: 14,
          border: `1px solid ${contractState === 'COMPLETED' ? C.sage : C.rule}`,
          padding: '20px 24px',
          maxWidth: 500,
          width: '100%',
          marginBottom: 16,
          boxShadow:
            contractState === 'COMPLETED'
              ? `0 0 16px ${rgba(C.sage, 0.1)}, 0 4px 16px ${rgba(C.ink, 0.06)}`
              : `0 4px 16px ${rgba(C.ink, 0.06)}`,
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
              Contract Obligations
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
              background:
                contractState === 'COMPLETED'
                  ? rgba(C.sage, 0.12)
                  : rgba(C.accent, 0.1),
              color:
                contractState === 'COMPLETED' ? C.sage : C.accent,
              textTransform: 'uppercase',
            }}
          >
            {contractState}
          </motion.div>
        </div>

        {/* Obligations */}
        <ObligationRow
          type="Computation"
          responsible="Bob"
          fulfilled={compFulfilled}
          icon={Cpu}
          animating={compVerifying}
        />
        <ObligationRow
          type="Payment"
          responsible="Alice"
          fulfilled={payFulfilled}
          icon={CreditCard}
          animating={payVerifying}
        />

        {/* Completion message */}
        <AnimatePresence>
          {step >= 3 && contractState === 'COMPLETED' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 8,
                background: rgba(C.sage, 0.06),
                border: `1px solid ${rgba(C.sage, 0.15)}`,
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: C.sage,
              }}
            >
              ✓ All obligations fulfilled
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Verification sections */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          maxWidth: 800,
          width: '100%',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {/* Bob's verification */}
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: C.card,
              borderRadius: 12,
              border: `1px solid ${C.rule}`,
              padding: '16px 20px',
              flex: '1 1 320px',
              maxWidth: 380,
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
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: rgba(C.terra, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={13} color={C.terra} />
              </div>
              <div>
                <div
                  style={{ fontSize: 12, fontWeight: 600, color: C.ink }}
                >
                  Bob — Computation Proof
                </div>
                <CyclingHex
                  target={BOB_PROOF}
                  active={bobProofActive}
                  color={C.terra}
                />
              </div>
            </div>

            <div
              style={{
                borderTop: `1px solid ${C.ruleLight}`,
                paddingTop: 10,
              }}
            >
              <VerifyItem
                label="Proof hash integrity"
                delay={0.5}
                visible={step >= 1}
              />
              <VerifyItem
                label="Deadline compliance (within 24h)"
                delay={1.0}
                visible={step >= 1}
              />
              <VerifyItem
                label="Debtor authority (Bob)"
                delay={1.5}
                visible={step >= 1}
              />
              <VerifyItem
                label="Proof matches committed output"
                delay={2.0}
                visible={step >= 1}
              />
            </div>

            <EscrowUpdate
              visible={showCompEscrow}
              milestone="computation_verified"
            />
          </motion.div>
        )}

        {/* Alice's verification */}
        {step >= 2 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: C.card,
              borderRadius: 12,
              border: `1px solid ${C.rule}`,
              padding: '16px 20px',
              flex: '1 1 320px',
              maxWidth: 380,
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
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: rgba(C.accent, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={13} color={C.accent} />
              </div>
              <div>
                <div
                  style={{ fontSize: 12, fontWeight: 600, color: C.ink }}
                >
                  Alice — Payment Proof
                </div>
                <CyclingHex
                  target={ALICE_PROOF}
                  active={aliceProofActive}
                  color={C.accent}
                />
              </div>
            </div>

            <div
              style={{
                borderTop: `1px solid ${C.ruleLight}`,
                paddingTop: 10,
              }}
            >
              <VerifyItem
                label="Payment hash integrity"
                delay={0.5}
                visible={step >= 2}
              />
              <VerifyItem
                label="Amount matches ($25,000)"
                delay={1.0}
                visible={step >= 2}
              />
              <VerifyItem
                label="Debtor authority (Alice)"
                delay={1.5}
                visible={step >= 2}
              />
              <VerifyItem
                label="Payment confirmed on-chain"
                delay={2.0}
                visible={step >= 2}
              />
            </div>

            <EscrowUpdate
              visible={showPayEscrow}
              milestone="payment_verified"
            />
          </motion.div>
        )}
      </div>

      {/* Ledger chain */}
      {step >= 3 && (
        <LedgerChain visible={step >= 3} entries={ledgerEntries} />
      )}
    </div>
  );
}
