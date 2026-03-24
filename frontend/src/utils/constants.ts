export const COLORS = {
  cream: '#F5F0E8',
  creamLight: '#FAF7F1',
  creamDark: '#EDE7DD',
  warmWhite: '#FEFCF9',
  card: '#FFFFFF',

  ink: '#1A1714',
  inkLight: '#3D3831',
  inkMuted: '#6B6560',
  inkFaint: '#9C968F',
  inkGhost: '#C4BEB6',

  rule: '#E8E2D9',
  ruleLight: '#F0EBE3',
  ruleDark: '#D5CFC5',

  accent: '#B8956A',
  bronze: '#A0784E',
  gold: '#C4A872',
  sage: '#7D8B6A',
  rose: '#B05A5A',
  terra: '#B87A5E',
  slate: '#7A7872',
} as const;

export const SCENE_TITLES = [
  {
    id: 'intro-problem',
    title: 'The Problem',
    subtitle: 'Why AI agents need economic infrastructure',
    icon: 'AlertTriangle',
    duration: 18000,
  },
  {
    id: 'intro-solution',
    title: 'The Solution',
    subtitle: 'AEOS — 19 modules, one protocol',
    icon: 'Layers',
    duration: 16000,
  },
  {
    id: 'agent-genesis',
    title: 'Agent Genesis',
    subtitle: 'Creating a cryptographic identity from nothing',
    icon: 'Fingerprint',
    duration: 22000,
  },
  {
    id: 'delegation',
    title: 'Authority Delegation',
    subtitle: 'Chain of trust from company to agent to sub-agent',
    icon: 'GitBranch',
    duration: 18000,
  },
  {
    id: 'contract-formation',
    title: 'Contract Formation',
    subtitle: 'Two agents negotiate and create a binding agreement',
    icon: 'FileSignature',
    duration: 20000,
  },
  {
    id: 'multi-sig',
    title: 'Multi-Signature Activation',
    subtitle: 'Both parties sign — escrow locks automatically',
    icon: 'PenTool',
    duration: 16000,
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    subtitle: 'Five-factor analysis before every transaction',
    icon: 'Shield',
    duration: 18000,
  },
  {
    id: 'work-execution',
    title: 'Work Execution',
    subtitle: 'Agent performs compute task and generates proof',
    icon: 'Cpu',
    duration: 18000,
  },
  {
    id: 'verification',
    title: 'Proof Verification',
    subtitle: 'Cryptographic verification of obligation fulfillment',
    icon: 'CheckCircle',
    duration: 16000,
  },
  {
    id: 'escrow-release',
    title: 'Escrow Release',
    subtitle: 'Milestone verified — funds flow to the provider',
    icon: 'Unlock',
    duration: 14000,
  },
  {
    id: 'bft-consensus',
    title: 'BFT Consensus',
    subtitle: 'PBFT three-phase commit across distributed replicas',
    icon: 'Network',
    duration: 22000,
  },
  {
    id: 'dispute',
    title: 'Dispute Resolution',
    subtitle: 'Automated arbitration when obligations are breached',
    icon: 'Scale',
    duration: 20000,
  },
  {
    id: 'anomaly-detection',
    title: 'Anomaly Detection',
    subtitle: 'ML ensemble catches behavioral anomalies in real-time',
    icon: 'Activity',
    duration: 18000,
  },
  {
    id: 'graph-intel',
    title: 'Graph Intelligence',
    subtitle: 'Network-level trust, collusion, and Sybil detection',
    icon: 'Share2',
    duration: 18000,
  },
  {
    id: 'settlement',
    title: 'Settlement',
    subtitle: 'Stripe fiat and USDC on-chain settlement flows',
    icon: 'Wallet',
    duration: 16000,
  },
  {
    id: 'threshold-crypto',
    title: 'Threshold Cryptography',
    subtitle: 'Shamir secret sharing — no single point of compromise',
    icon: 'Key',
    duration: 18000,
  },
  {
    id: 'full-lifecycle',
    title: 'The Complete Stack',
    subtitle: 'End-to-end — everything an AI agent needs to exist',
    icon: 'Orbit',
    duration: 22000,
  },
  {
    id: 'the-future',
    title: 'The Future',
    subtitle: 'The agent economy is being built right now',
    icon: 'Sparkles',
    duration: 15000,
  },
] as const;

export const AGENT_TYPES = {
  AUTONOMOUS: 'Autonomous',
  SEMI_AUTONOMOUS: 'Semi-Autonomous',
  DELEGATED: 'Delegated',
  COMPOSITE: 'Composite',
} as const;

export const CAPABILITIES = [
  'transact', 'negotiate', 'sign_contract', 'delegate',
  'access_data', 'modify_state', 'dispute', 'insure', 'borrow', 'lend',
] as const;

export const CONTRACT_STATES = [
  'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED',
  'ACTIVE', 'COMPLETED', 'DISPUTED', 'TERMINATED', 'EXPIRED',
] as const;

export const OBLIGATION_TYPES = [
  'payment', 'delivery', 'attestation', 'computation', 'availability',
] as const;

export const RISK_LEVELS = [
  'MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'BLOCKED',
] as const;

export const PBFT_PHASES = [
  'IDLE', 'PRE-PREPARE', 'PREPARE', 'COMMIT', 'EXECUTE',
] as const;

export const DISPUTE_REASONS = [
  'non_delivery', 'quality_mismatch', 'late_delivery',
  'payment_failure', 'unauthorized_action', 'fraud',
] as const;

export const LEDGER_EVENT_TYPES = [
  'agent_registered', 'contract_created', 'contract_activated',
  'obligation_fulfilled', 'dispute_filed', 'dispute_resolved',
  'delegation_created', 'transaction_approved', 'transaction_rejected',
  'risk_alert', 'circuit_breaker_tripped',
] as const;

export const TOTAL_SCENES = SCENE_TITLES.length;

export const STEP_DELAY_MS = 3500;
