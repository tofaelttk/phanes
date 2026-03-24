export type SceneStepStatus = 'pending' | 'active' | 'completed';

export type AgentTypeName = 'Autonomous' | 'Semi-Autonomous' | 'Delegated';

export type ContractStateName =
  | 'DRAFT'
  | 'PENDING_SIGNATURES'
  | 'ACTIVE'
  | 'FULFILLED'
  | 'DISPUTED'
  | 'TERMINATED'
  | 'EXPIRED'
  | 'SETTLED';

export type ObligationTypeName =
  | 'PAYMENT'
  | 'DELIVERY'
  | 'COMPUTATION'
  | 'DATA_FEED'
  | 'SLA_UPTIME'
  | 'MILESTONE';

export type RiskLevelName = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PBFTPhase =
  | 'IDLE'
  | 'PRE_PREPARE'
  | 'PREPARE'
  | 'COMMIT'
  | 'REPLY'
  | 'VIEW_CHANGE';

export type DisputeResolution =
  | 'PENDING'
  | 'AUTO_RESOLVED'
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'NO_REFUND'
  | 'ESCALATED';

export type SettlementRail = 'STRIPE' | 'USDC_ETH' | 'USDC_BASE' | 'USDC_ARB' | 'USDC_POLYGON';

export type LedgerEventType =
  | 'AGENT_REGISTERED'
  | 'CONTRACT_CREATED'
  | 'CONTRACT_ACTIVATED'
  | 'OBLIGATION_FULFILLED'
  | 'DISPUTE_FILED'
  | 'DISPUTE_RESOLVED'
  | 'EVIDENCE_SUBMITTED'
  | 'DELEGATION_CREATED'
  | 'TRANSACTION_REJECTED'
  | 'ESCROW_RELEASED'
  | 'SETTLEMENT_COMPLETED'
  | 'REPUTATION_UPDATED'
  | 'CIRCUIT_BREAKER_TRIPPED';

export type CapabilityName =
  | 'TRANSACT'
  | 'NEGOTIATE'
  | 'SIGN_CONTRACT'
  | 'DELEGATE'
  | 'DISPUTE'
  | 'ARBITRATE'
  | 'COMPUTE'
  | 'DATA_ACCESS'
  | 'GOVERNANCE'
  | 'STAKE';

export interface SimulationScene {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  duration: number;
  component: string;
}

export interface SceneStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  duration: number;
  status: SceneStepStatus;
}

export interface Position {
  x: number;
  y: number;
}

export interface AuthorityBounds {
  maxTransactionValue: number;
  maxDailyVolume: number;
  maxContractDurationHours: number;
  maxDelegationDepth: number;
  maxConcurrentContracts: number;
  maxCounterparties: number;
  allowedAssetTypes: string[];
}

export interface AgentNode {
  id: string;
  did: string;
  name: string;
  type: AgentTypeName;
  capabilities: CapabilityName[];
  reputation: number;
  position: Position;
  color: string;
  controllerDid?: string;
  model?: string;
  totalTransactions?: number;
  totalVolume?: number;
  bounds?: AuthorityBounds;
  publicKeyHex?: string;
  isActive?: boolean;
}

export interface EscrowState {
  totalValue: number;
  released: number;
  remaining: number;
  milestones: EscrowMilestone[];
}

export interface EscrowMilestone {
  id: string;
  label: string;
  amount: number;
  fulfilled: boolean;
  proofHash?: string;
}

export interface Obligation {
  id: string;
  type: ObligationTypeName;
  responsible: string;
  deadline?: number;
  fulfilled: boolean;
  proofHash?: string;
}

export interface ContractNode {
  id: string;
  parties: string[];
  state: ContractStateName;
  value: number;
  escrowTotal: number;
  escrowReleased: number;
  termsHash?: string;
  obligations?: Obligation[];
  escrow?: EscrowState;
  signatures?: ContractSignature[];
  createdAt?: number;
  activatedAt?: number;
}

export interface ContractSignature {
  signerDid: string;
  keyId: string;
  algorithm: string;
  signatureHex: string;
  timestamp: number;
}

export interface NetworkNode {
  id: string;
  x: number;
  y: number;
  type: 'agent' | 'contract' | 'arbitrator' | 'ledger' | 'escrow' | 'oracle' | 'relay';
  label: string;
  status: 'active' | 'pending' | 'inactive' | 'byzantine' | 'highlighted';
  color?: string;
  radius?: number;
  pulseIntensity?: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  label?: string;
  animated: boolean;
  color: string;
  width?: number;
  dashPattern?: number[];
  particleCount?: number;
}

export interface ParticleConfig {
  count: number;
  speed: number;
  color: string;
  size: number;
  trail: number;
  opacity?: number;
  fadeIn?: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface ConsensusReplica {
  id: string;
  phase: PBFTPhase;
  view: number;
  isLeader: boolean;
  isByzantine: boolean;
  sequenceNumber?: number;
  prepareCount?: number;
  commitCount?: number;
  position?: Position;
  label?: string;
}

export interface ConsensusMessage {
  type: 'PRE_PREPARE' | 'PREPARE' | 'COMMIT' | 'VIEW_CHANGE' | 'NEW_VIEW';
  from: string;
  to: string;
  view: number;
  sequence: number;
  digest?: string;
  timestamp?: number;
}

export interface QuorumCertificate {
  view: number;
  sequence: number;
  digest: string;
  signatures: string[];
  threshold: number;
  achieved: boolean;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  color: string;
  description?: string;
  threshold?: number;
}

export interface RiskAssessment {
  overall: number;
  level: RiskLevelName;
  factors: RiskFactor[];
  explanations: string[];
  approved: boolean;
  circuitBreakerTripped?: boolean;
}

export interface LedgerEntry {
  sequence: number;
  eventType: LedgerEventType;
  actorDid: string;
  timestamp: number;
  hash: string;
  prevHash: string;
  subjectDid?: string;
  data?: string;
  merkleRoot?: string;
  signature?: string;
}

export interface MerkleProof {
  entryHash: string;
  path: MerkleProofNode[];
  root: string;
  verified: boolean;
}

export interface MerkleProofNode {
  hash: string;
  direction: 'left' | 'right';
}

export interface DelegationLink {
  parentDid: string;
  childDid: string;
  capabilities: CapabilityName[];
  bounds: AuthorityBounds;
  depth: number;
  expiresAt: number;
  signatureHex: string;
}

export interface DisputeState {
  disputeId: string;
  plaintiffDid: string;
  defendantDid: string;
  contractId: string;
  reason: string;
  claimedDamages: number;
  resolution: DisputeResolution;
  resolutionAmount: number;
  evidenceCount: number;
  arbitrators: string[];
  votes: ArbitratorVote[];
  confidence?: number;
}

export interface ArbitratorVote {
  arbitratorDid: string;
  resolution: DisputeResolution;
  amount: number;
  reasoning: string;
  confidence: number;
}

export interface Evidence {
  id: string;
  submitterDid: string;
  type: string;
  dataHash: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

export interface AnomalyDetection {
  agentDid: string;
  anomalyScore: number;
  isAnomaly: boolean;
  features: AnomalyFeature[];
  model: 'isolation_forest' | 'markov' | 'entropy_drift';
  timestamp: number;
}

export interface AnomalyFeature {
  name: string;
  value: number;
  expected: number;
  deviation: number;
  contribution: number;
}

export interface GraphNode {
  id: string;
  did: string;
  pageRank: number;
  cluster: number;
  isSybil: boolean;
  connections: number;
  trustScore: number;
  position: Position;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  transactionCount: number;
  totalVolume: number;
}

export interface CollusionCluster {
  id: string;
  members: string[];
  density: number;
  suspicionScore: number;
  evidence: string[];
}

export interface SettlementFlow {
  id: string;
  contractId: string;
  rail: SettlementRail;
  amount: number;
  currency: string;
  payerDid: string;
  payeeDid: string;
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'SETTLED' | 'REFUNDED';
  stripePaymentIntentId?: string;
  onChainTxHash?: string;
  chain?: string;
  escrowAddress?: string;
}

export interface ThresholdShare {
  shareIndex: number;
  shareValue: string;
  holderDid: string;
  isRevealed: boolean;
}

export interface ThresholdConfig {
  threshold: number;
  totalShares: number;
  shares: ThresholdShare[];
  secretReconstructed: boolean;
  polynomial?: number[];
}

export interface TimeLockPuzzle {
  id: string;
  encryptedSecret: string;
  timeParameter: number;
  solved: boolean;
  solvedAt?: number;
}

export interface StateChannel {
  channelId: string;
  partyA: string;
  partyB: string;
  balanceA: number;
  balanceB: number;
  nonce: number;
  status: 'OPEN' | 'UPDATING' | 'CLOSING' | 'FORCE_CLOSING' | 'CLOSED';
  transactions: StateChannelTx[];
}

export interface StateChannelTx {
  nonce: number;
  deltaA: number;
  deltaB: number;
  timestamp: number;
  signatureA: string;
  signatureB: string;
}

export interface TokenState {
  tokenId: string;
  name: string;
  totalSupply: number;
  holders: TokenHolder[];
  decayRate: number;
  stakingApy: number;
  governanceWeight: number;
}

export interface TokenHolder {
  did: string;
  balance: number;
  staked: number;
  lastAccrual: number;
}

export interface BulletproofState {
  value: number;
  rangeBits: number;
  bitCommitments: string[];
  totalCommitment: string;
  verified: boolean;
  proofSizeBytes: number;
}

export interface ZKProofVisualization {
  proverDid: string;
  verifierDid: string;
  claim: string;
  phase: 'SETUP' | 'COMMIT' | 'CHALLENGE' | 'RESPONSE' | 'VERIFY';
  rounds: ZKRound[];
  accepted: boolean;
}

export interface ZKRound {
  index: number;
  commitment: string;
  challenge: string;
  response: string;
  verified: boolean;
}

export interface CascadeSimulation {
  triggerNode: string;
  affectedNodes: string[];
  propagationDepth: number;
  totalImpact: number;
  steps: CascadeStep[];
}

export interface CascadeStep {
  step: number;
  nodeId: string;
  impact: number;
  propagatedFrom: string;
}

export interface AnimationTimeline {
  totalDuration: number;
  currentTime: number;
  keyframes: Keyframe[];
}

export interface Keyframe {
  time: number;
  label: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface SceneConfig {
  scene: SimulationScene;
  steps: SceneStep[];
  agents?: AgentNode[];
  contracts?: ContractNode[];
  networkNodes?: NetworkNode[];
  networkEdges?: NetworkEdge[];
  particles?: ParticleConfig;
  replicas?: ConsensusReplica[];
  riskFactors?: RiskFactor[];
  ledgerEntries?: LedgerEntry[];
  delegationChain?: DelegationLink[];
  dispute?: DisputeState;
  settlement?: SettlementFlow;
  threshold?: ThresholdConfig;
  stateChannel?: StateChannel;
  anomaly?: AnomalyDetection;
  graph?: { nodes: GraphNode[]; edges: GraphEdge[] };
  bulletproof?: BulletproofState;
  zkProof?: ZKProofVisualization;
  cascade?: CascadeSimulation;
}
