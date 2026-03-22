/**
 * @phanes/sdk — AEOS Protocol TypeScript SDK
 *
 * The economic operating system for autonomous AI agents.
 *
 * Usage (local, no server needed):
 *   import { AgentIdentity, AgentType, Capability, ContractFactory } from "@phanes/sdk";
 *
 *   const agent = AgentIdentity.create("did:aeos:my-corp", AgentType.AUTONOMOUS,
 *     [Capability.TRANSACT, Capability.SIGN_CONTRACT],
 *     { maxTransactionValue: 100_000_00, ... });
 *
 * Usage (HTTP client to AEOS server):
 *   import { PhanesClient } from "@phanes/sdk";
 *
 *   const client = new PhanesClient("http://localhost:8420");
 *   const agent = await client.createAgent({ controllerDid: "did:aeos:my-corp" });
 */

// Cryptographic primitives
export {
  KeyPair,
  sha256,
  domainHash,
  createCommitment,
  verifyCommitment,
  MerkleAccumulator,
  vrfEvaluate,
  vrfVerify,
  encryptEnvelope,
  decryptEnvelope,
} from "./crypto";
export type {
  Commitment,
  MerkleProof,
  VRFOutput,
  EncryptedEnvelope,
  SerializedKeyPair,
} from "./crypto";

// Agent identity
export {
  AgentIdentity,
  AgentRegistry,
  AgentType,
  Capability,
  DelegationChain,
  boundsContain,
} from "./identity";
export type {
  AuthorityBounds,
  DelegationLink,
  VerifiableCredential,
} from "./identity";

// Contracts
export {
  Contract,
  ContractFactory,
  EscrowAccount,
  ContractState,
  ObligationType,
} from "./contracts";
export type {
  Obligation,
  EscrowMilestone,
  ContractSignature,
} from "./contracts";

// HTTP Client
export { PhanesClient } from "./client";
export type {
  CreateAgentParams,
  CreateAgentResponse,
  CreateContractParams,
  ContractSummary,
  RiskAssessment,
  LedgerStats,
  LedgerEntry,
  DisputeSummary,
  NetworkHealth,
  DelegateParams,
} from "./client";
