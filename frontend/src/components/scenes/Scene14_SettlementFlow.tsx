import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Link,
  ArrowDown,
  CheckCircle,
  ArrowRight,
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

const STEP_DURATIONS = [4000, 5000, 5000, 5000];

const CHAINS = [
  { name: 'Ethereum', shorthand: 'ETH', selected: false },
  { name: 'Base', shorthand: 'BASE', selected: true },
  { name: 'Arbitrum', shorthand: 'ARB', selected: false },
  { name: 'Polygon', shorthand: 'MATIC', selected: false },
];

const STRIPE_STEPS = [
  {
    title: 'PaymentIntent Created',
    detail: 'capture_method: manual',
    status: 'requires_capture',
    statusColor: C.gold,
    piId: 'pi_3NkmR2CZ5K...8vYp',
  },
  {
    title: 'PI Captured',
    detail: '$25,000 transferred',
    status: 'succeeded',
    statusColor: C.sage,
    piId: 'pi_3NkmR2CZ5K...8vYp',
  },
  {
    title: 'Refund Issued',
    detail: 'If dispute or breach',
    status: 'refunded',
    statusColor: C.rose,
    piId: 're_1NkmT4CZ5K...2wXq',
  },
];

const TX_CARDS = [
  {
    fn: 'approve(escrow, $25K)',
    selector: '0x095ea7b3',
    desc: 'Payer authorizes escrow to pull USDC',
  },
  {
    fn: 'transferFrom(payer, escrow, $25K)',
    selector: '0x23b872dd',
    desc: 'Funds locked in escrow contract',
  },
  {
    fn: 'transfer(payee, $25K)',
    selector: '0xa9059cbb',
    desc: 'Released to payee on fulfillment',
  },
];

function StripeFlowSVG({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const boxW = 260;
  const boxH = 90;
  const startX = 20;
  const gap = 36;
  const arrowLabels = ['Obligation Fulfilled', 'If Dispute'];

  return (
    <motion.svg
      viewBox="0 0 300 420"
      className="w-full"
      style={{ maxWidth: 300 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <defs>
        <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="2" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.06" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {STRIPE_STEPS.map((s, i) => {
        const y = i * (boxH + gap);
        return (
          <motion.g
            key={`stripe-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.25 }}
          >
            <rect
              x={startX}
              y={y}
              width={boxW}
              height={boxH}
              rx={10}
              fill={C.card}
              stroke={C.rule}
              strokeWidth={1}
              filter="url(#card-shadow)"
            />

            <text
              x={startX + 14}
              y={y + 22}
              fill={C.ink}
              fontSize={13}
              fontWeight={600}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {s.title}
            </text>

            <text
              x={startX + 14}
              y={y + 42}
              fill={C.inkMuted}
              fontSize={11}
              fontFamily="'JetBrains Mono', monospace"
            >
              {s.detail}
            </text>

            <rect
              x={startX + 14}
              y={y + 54}
              width={80}
              height={20}
              rx={4}
              fill={`${s.statusColor}15`}
              stroke={s.statusColor}
              strokeWidth={0.5}
            />
            <text
              x={startX + 54}
              y={y + 67}
              textAnchor="middle"
              fill={s.statusColor}
              fontSize={10}
              fontWeight={500}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {s.status}
            </text>

            <text
              x={startX + 14}
              y={y + 84}
              fill={C.inkGhost}
              fontSize={9}
              fontFamily="'JetBrains Mono', monospace"
            >
              {s.piId}
            </text>

            {i < STRIPE_STEPS.length - 1 && (
              <g>
                <motion.line
                  x1={startX + boxW / 2}
                  y1={y + boxH + 2}
                  x2={startX + boxW / 2}
                  y2={y + boxH + gap - 2}
                  stroke={C.rule}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.25 }}
                />
                <motion.polygon
                  points={`${startX + boxW / 2 - 4},${y + boxH + gap - 8} ${startX + boxW / 2 + 4},${y + boxH + gap - 8} ${startX + boxW / 2},${y + boxH + gap - 2}`}
                  fill={C.accent}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.25 }}
                />
                <text
                  x={startX + boxW / 2 + 10}
                  y={y + boxH + gap / 2 + 3}
                  fill={C.inkFaint}
                  fontSize={9}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {arrowLabels[i]}
                </text>
              </g>
            )}
          </motion.g>
        );
      })}
    </motion.svg>
  );
}

function ChainSelector({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      className="flex flex-col gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Link size={14} style={{ color: C.accent }} strokeWidth={1.5} />
        <span className="heading-card" style={{ fontSize: 14 }}>
          Chain Selection
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CHAINS.map((chain, i) => (
          <motion.div
            key={chain.name}
            className="card-elevated px-3 py-2 flex items-center gap-2"
            style={{
              borderColor: chain.selected ? C.gold : C.rule,
              borderWidth: chain.selected ? 2 : 1,
              backgroundColor: chain.selected ? `${C.gold}08` : C.card,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08 }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: chain.selected ? C.gold : C.inkGhost,
              }}
            />
            <span
              className="body-small"
              style={{
                fontSize: 12,
                fontWeight: chain.selected ? 600 : 400,
                color: chain.selected ? C.ink : C.inkMuted,
              }}
            >
              {chain.name}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="card-elevated p-4 mt-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between">
            <span className="body-small">Escrow Address</span>
          </div>
          <div
            className="mono-hash p-2 rounded-md"
            style={{
              backgroundColor: `${C.cream}`,
              fontSize: 11,
              wordBreak: 'break-all',
              lineHeight: 1.6,
              color: C.bronze,
            }}
          >
            SHA-256(contract_id + chain)
            <br />
            → 0x7a3b...f91e
          </div>

          <div className="h-px" style={{ backgroundColor: C.ruleLight }} />

          <div className="flex justify-between">
            <span className="body-small">USDC Contract (Base)</span>
          </div>
          <span
            className="mono-hash"
            style={{ fontSize: 11, color: C.bronze }}
          >
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
          </span>

          <div className="h-px" style={{ backgroundColor: C.ruleLight }} />

          <div className="flex justify-between">
            <span className="body-small">Network</span>
            <span
              className="mono-hash"
              style={{ color: C.sage, fontSize: 11 }}
            >
              Base Mainnet (Chain 8453)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="body-small">Block Finality</span>
            <span
              className="mono-hash"
              style={{ color: C.sage, fontSize: 11 }}
            >
              ~2 seconds
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TransactionCards({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <ArrowRight size={14} style={{ color: C.accent }} strokeWidth={1.5} />
        <span className="heading-card" style={{ fontSize: 14 }}>
          On-Chain Transactions
        </span>
      </div>

      {TX_CARDS.map((tx, i) => (
        <motion.div
          key={tx.selector}
          className="card-elevated p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.3 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: `${C.accent}15`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.accent,
                  }}
                >
                  {i + 1}
                </div>
                <span
                  className="mono-hash"
                  style={{ fontSize: 12, color: C.ink }}
                >
                  {tx.fn}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span
                  className="body-small"
                  style={{ fontSize: 11, color: C.inkFaint }}
                >
                  Selector:
                </span>
                <span
                  className="mono-hash"
                  style={{ fontSize: 11, color: C.bronze }}
                >
                  {tx.selector}
                </span>
              </div>

              <span
                className="body-small"
                style={{ fontSize: 12, color: C.inkMuted }}
              >
                {tx.desc}
              </span>
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.3, type: 'spring' }}
            >
              <CheckCircle
                size={18}
                style={{ color: i < 2 ? C.sage : C.inkGhost }}
                strokeWidth={1.5}
              />
            </motion.div>
          </div>

          {i < TX_CARDS.length - 1 && (
            <motion.div
              className="flex justify-center mt-3 -mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.5 + i * 0.3 }}
            >
              <ArrowDown size={14} style={{ color: C.inkGhost }} />
            </motion.div>
          )}
        </motion.div>
      ))}

      <motion.div
        className="card-elevated p-3 text-center"
        style={{ backgroundColor: `${C.sage}08`, borderColor: `${C.sage}30` }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <span className="body-small" style={{ color: C.sage, fontWeight: 500 }}>
          $25,000 USDC settled on Base. Finality: ~2 seconds.
        </span>
      </motion.div>
    </motion.div>
  );
}

function SettlementFlowSVG({ step }: { step: number }) {
  const svgW = 560;
  const svgH = 120;
  const leftX = 130;
  const rightX = 430;
  const midY = 60;

  return (
    <motion.svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full mb-6"
      style={{ maxHeight: 120 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <defs>
        <linearGradient id="flow-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
          <stop offset="50%" stopColor={C.gold} stopOpacity={0.1} />
          <stop offset="100%" stopColor={C.sage} stopOpacity={0.3} />
        </linearGradient>
      </defs>

      <rect
        x={0}
        y={0}
        width={svgW}
        height={svgH}
        rx={12}
        fill={C.card}
        stroke={C.rule}
        strokeWidth={1}
      />

      <motion.line
        x1={leftX + 50}
        y1={midY}
        x2={rightX - 50}
        y2={midY}
        stroke="url(#flow-grad)"
        strokeWidth={2}
        strokeDasharray="6 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />

      {step >= 1 && (
        <motion.circle
          r={3}
          fill={C.gold}
          animate={{
            cx: [leftX + 50, rightX - 50],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          cy={midY}
        />
      )}

      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <circle
          cx={leftX}
          cy={midY}
          r={30}
          fill={`${C.accent}10`}
          stroke={C.accent}
          strokeWidth={1.5}
        />
        <text
          x={leftX}
          y={midY - 6}
          textAnchor="middle"
          fill={C.ink}
          fontSize={10}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
        >
          FIAT
        </text>
        <text
          x={leftX}
          y={midY + 8}
          textAnchor="middle"
          fill={C.inkMuted}
          fontSize={8}
          fontFamily="Inter, system-ui, sans-serif"
        >
          Stripe
        </text>
      </motion.g>

      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <circle
          cx={rightX}
          cy={midY}
          r={30}
          fill={`${C.sage}10`}
          stroke={C.sage}
          strokeWidth={1.5}
        />
        <text
          x={rightX}
          y={midY - 6}
          textAnchor="middle"
          fill={C.ink}
          fontSize={10}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
        >
          USDC
        </text>
        <text
          x={rightX}
          y={midY + 8}
          textAnchor="middle"
          fill={C.inkMuted}
          fontSize={8}
          fontFamily="Inter, system-ui, sans-serif"
        >
          On-Chain
        </text>
      </motion.g>

      <text
        x={svgW / 2}
        y={midY + 2}
        textAnchor="middle"
        fill={C.inkFaint}
        fontSize={9}
        fontFamily="Inter, system-ui, sans-serif"
      >
        dual-rail settlement
      </text>
    </motion.svg>
  );
}

export default function Scene14_SettlementFlow({
  step,
  onStepComplete,
}: SceneProps) {
  useEffect(() => {
    if (step >= STEP_DURATIONS.length) return;
    const timer = setTimeout(onStepComplete, STEP_DURATIONS[step]);
    return () => clearTimeout(timer);
  }, [step, onStepComplete]);

  return (
    <div
      className="scene-bg min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${C.creamLight} 0%, ${C.cream} 40%, ${C.creamDark} 100%)`,
      }}
    >
      <div className="pt-14 pb-6 px-12 max-w-6xl mx-auto w-full">
        <motion.span
          className="section-label block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          SCENE 14
        </motion.span>

        <motion.h1
          className="heading-display mt-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Settlement
        </motion.h1>

        <motion.p
          className="body-text mt-2 max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Dual-rail settlement: traditional fiat through Stripe, and
          programmable on-chain flows via USDC.
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
              <div className="flex gap-16 items-center">
                <motion.div
                  className="flex flex-col items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${C.accent}12`,
                      border: `1px solid ${C.accent}30`,
                    }}
                  >
                    <CreditCard
                      size={32}
                      style={{ color: C.accent }}
                      strokeWidth={1.2}
                    />
                  </div>
                  <span
                    className="heading-card"
                    style={{ color: C.ink, fontSize: 15 }}
                  >
                    Fiat (Stripe)
                  </span>
                  <span className="body-small" style={{ fontSize: 12 }}>
                    PaymentIntent API
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <ArrowRight
                    size={24}
                    style={{ color: C.inkGhost }}
                    strokeWidth={1.5}
                  />
                </motion.div>

                <motion.div
                  className="flex flex-col items-center gap-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${C.sage}12`,
                      border: `1px solid ${C.sage}30`,
                    }}
                  >
                    <Link
                      size={32}
                      style={{ color: C.sage }}
                      strokeWidth={1.2}
                    />
                  </div>
                  <span
                    className="heading-card"
                    style={{ color: C.ink, fontSize: 15 }}
                  >
                    On-Chain (USDC)
                  </span>
                  <span className="body-small" style={{ fontSize: 12 }}>
                    ERC-20 Settlement
                  </span>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step >= 1 && (
            <motion.div
              key="flow-view"
              className="flex flex-col gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <SettlementFlowSVG step={step} />

              <div className="flex gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard
                      size={15}
                      style={{ color: C.accent }}
                      strokeWidth={1.5}
                    />
                    <span
                      className="heading-card"
                      style={{ fontSize: 14, color: C.ink }}
                    >
                      Stripe Flow
                    </span>
                  </div>

                  <AnimatePresence>
                    {step >= 1 && <StripeFlowSVG visible={true} />}
                  </AnimatePresence>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Link
                      size={15}
                      style={{ color: C.sage }}
                      strokeWidth={1.5}
                    />
                    <span
                      className="heading-card"
                      style={{ fontSize: 14, color: C.ink }}
                    >
                      USDC On-Chain Flow
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 2 && (
                      <motion.div
                        key="chain-sel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <ChainSelector visible={true} />
                      </motion.div>
                    )}

                    {step >= 3 && (
                      <motion.div
                        key="tx-cards"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <TransactionCards visible={true} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {step === 1 && (
                    <motion.div
                      className="flex items-center justify-center h-64"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                    >
                      <div className="text-center">
                        <Link
                          size={28}
                          style={{ color: C.inkGhost }}
                          strokeWidth={1}
                          className="mx-auto mb-3"
                        />
                        <span
                          className="body-small"
                          style={{ color: C.inkGhost }}
                        >
                          On-chain flow details next
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
