/**
 * AEOS Protocol — Agent Identity (TypeScript)
 *
 * DID-based agent identity with:
 *  - Ed25519 signing keys
 *  - Scoped capabilities with quantitative bounds
 *  - Delegation chains with containment verification
 *  - Selective disclosure via commitments
 *  - W3C DID Document export
 */

import { KeyPair, sha256, createCommitment, MerkleAccumulator } from "./crypto";

// =============================================================================
// TYPES
// =============================================================================

export enum AgentType {
  AUTONOMOUS = "AUTONOMOUS",
  SEMI_AUTONOMOUS = "SEMI_AUTONOMOUS",
  DELEGATED = "DELEGATED",
  COMPOSITE = "COMPOSITE",
}

export enum Capability {
  TRANSACT = "transact",
  NEGOTIATE = "negotiate",
  SIGN_CONTRACT = "sign_contract",
  DELEGATE = "delegate",
  ACCESS_DATA = "access_data",
  MODIFY_STATE = "modify_state",
  DISPUTE = "dispute",
  INSURE = "insure",
  BORROW = "borrow",
  LEND = "lend",
}

export interface AuthorityBounds {
  maxTransactionValue: number;
  maxDailyVolume: number;
  maxContractDurationHours: number;
  maxDelegationDepth: number;
  maxConcurrentContracts: number;
  maxCounterparties: number;
  allowedAssetTypes?: string[];
  restrictedCounterparties?: string[];
  timeWindowStart?: number;
  timeWindowEnd?: number;
}

export function boundsContain(
  parent: AuthorityBounds,
  child: AuthorityBounds
): boolean {
  return (
    child.maxTransactionValue <= parent.maxTransactionValue &&
    child.maxDailyVolume <= parent.maxDailyVolume &&
    child.maxContractDurationHours <= parent.maxContractDurationHours &&
    child.maxDelegationDepth <= parent.maxDelegationDepth &&
    child.maxConcurrentContracts <= parent.maxConcurrentContracts &&
    child.maxCounterparties <= parent.maxCounterparties
  );
}

// =============================================================================
// DELEGATION CHAIN
// =============================================================================

export interface DelegationLink {
  delegator: string;
  delegate: string;
  capabilities: Capability[];
  bounds: AuthorityBounds;
  expiry: number;
  createdAt: number;
  signature: string;
  delegatorKeyId: string;
}

export class DelegationChain {
  public links: DelegationLink[] = [];

  addLink(
    delegatorKey: KeyPair,
    delegatorDid: string,
    delegateDid: string,
    capabilities: Capability[],
    bounds: AuthorityBounds,
    expiry: number
  ): void {
    const link: Omit<DelegationLink, "signature" | "delegatorKeyId"> = {
      delegator: delegatorDid,
      delegate: delegateDid,
      capabilities,
      bounds,
      expiry,
      createdAt: Date.now() / 1000,
    };

    const linkBytes = Buffer.from(JSON.stringify(link));
    const linkHash = sha256(
      Buffer.concat([Buffer.from("AEOS/delegation/"), linkBytes])
    );
    const signature = delegatorKey.sign(linkHash);

    this.links.push({
      ...link,
      signature: signature.toString("hex"),
      delegatorKeyId: delegatorKey.keyId,
    });
  }

  verify(): boolean {
    const now = Date.now() / 1000;
    for (let i = 0; i < this.links.length; i++) {
      if (this.links[i].expiry < now) return false;
      if (i > 0) {
        const parentBounds = this.links[i - 1].bounds;
        const childBounds = this.links[i].bounds;
        if (!boundsContain(parentBounds, childBounds)) return false;

        const parentCaps = new Set(this.links[i - 1].capabilities);
        const childCaps = this.links[i].capabilities;
        if (!childCaps.every((c) => parentCaps.has(c))) return false;
      }
    }
    return true;
  }

  get depth(): number {
    return this.links.length;
  }

  get rootAuthority(): string {
    return this.links.length > 0 ? this.links[0].delegator : "";
  }

  get leafAgent(): string {
    return this.links.length > 0
      ? this.links[this.links.length - 1].delegate
      : "";
  }
}

// =============================================================================
// VERIFIABLE CREDENTIAL
// =============================================================================

export interface VerifiableCredential {
  credentialId: string;
  issuerDid: string;
  subjectDid: string;
  credentialType: string;
  claims: Record<string, unknown>;
  issuedAt: number;
  expiresAt: number;
  signature: string;
  revocationId: string;
}

// =============================================================================
// AGENT IDENTITY
// =============================================================================

export class AgentIdentity {
  public readonly did: string;
  public readonly agentType: AgentType;
  public readonly signingKey: KeyPair;
  public readonly encryptionKey: KeyPair;
  public readonly controllerDid: string;
  public readonly capabilities: Set<Capability>;
  public readonly authorityBounds: AuthorityBounds;
  public delegationChain: DelegationChain;
  public credentials: VerifiableCredential[] = [];
  public credentialTree: MerkleAccumulator = new MerkleAccumulator();
  public reputationScore: number = 0.0;
  public totalTransactions: number = 0;
  public totalVolume: number = 0;
  public disputesFiled: number = 0;
  public disputesLost: number = 0;
  public readonly createdAt: number;
  public revoked: boolean = false;
  public revokedAt?: number;
  public metadata: Record<string, unknown>;

  private constructor(params: {
    did: string;
    agentType: AgentType;
    signingKey: KeyPair;
    encryptionKey: KeyPair;
    controllerDid: string;
    capabilities: Set<Capability>;
    authorityBounds: AuthorityBounds;
    metadata?: Record<string, unknown>;
  }) {
    this.did = params.did;
    this.agentType = params.agentType;
    this.signingKey = params.signingKey;
    this.encryptionKey = params.encryptionKey;
    this.controllerDid = params.controllerDid;
    this.capabilities = params.capabilities;
    this.authorityBounds = params.authorityBounds;
    this.delegationChain = new DelegationChain();
    this.createdAt = Date.now() / 1000;
    this.metadata = params.metadata || {};
  }

  static create(
    controllerDid: string,
    agentType: AgentType,
    capabilities: Capability[],
    bounds: AuthorityBounds,
    metadata?: Record<string, unknown>
  ): AgentIdentity {
    const signingKey = KeyPair.generate("signing");
    const encryptionKey = KeyPair.generate("encryption");

    const didHash = sha256(
      Buffer.concat([
        Buffer.from("AEOS/did/"),
        Buffer.from(signingKey.publicKey),
      ])
    )
      .toString("hex")
      .slice(0, 32);

    return new AgentIdentity({
      did: `did:aeos:${didHash}`,
      agentType,
      signingKey,
      encryptionKey,
      controllerDid,
      capabilities: new Set(capabilities),
      authorityBounds: bounds,
      metadata,
    });
  }

  signMessage(message: Buffer): Buffer {
    const payload = sha256(
      Buffer.concat([
        Buffer.from("AEOS/agent-sign/"),
        Buffer.from(this.did),
        message,
      ])
    );
    return this.signingKey.sign(payload);
  }

  verifyAuthority(action: Capability, value: number = 0): boolean {
    if (this.revoked) return false;
    if (!this.capabilities.has(action)) return false;
    if (
      action === Capability.TRANSACT &&
      value > this.authorityBounds.maxTransactionValue
    )
      return false;
    return true;
  }

  delegateTo(
    childDid: string,
    capabilities: Capability[],
    bounds: AuthorityBounds,
    expiryHours: number = 24
  ): DelegationChain {
    for (const cap of capabilities) {
      if (!this.capabilities.has(cap)) {
        throw new Error(`Cannot delegate capability '${cap}' — you don't have it`);
      }
    }
    if (!boundsContain(this.authorityBounds, bounds)) {
      throw new Error("Cannot delegate authority beyond your own bounds");
    }
    if (this.delegationChain.depth >= this.authorityBounds.maxDelegationDepth) {
      throw new Error("Maximum delegation depth exceeded");
    }

    const chain = new DelegationChain();
    chain.links = [...this.delegationChain.links];
    chain.addLink(
      this.signingKey,
      this.did,
      childDid,
      capabilities,
      bounds,
      Date.now() / 1000 + expiryHours * 3600
    );
    return chain;
  }

  revoke(): void {
    this.revoked = true;
    this.revokedAt = Date.now() / 1000;
    this.capabilities.clear();
  }

  toDIDDocument(): Record<string, unknown> {
    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://aeos.protocol/v1",
      ],
      id: this.did,
      controller: this.controllerDid,
      verificationMethod: [
        {
          id: `${this.did}#signing-key`,
          type: "Ed25519VerificationKey2020",
          controller: this.did,
          publicKeyMultibase: `z${this.signingKey.publicKeyHex()}`,
        },
      ],
      service: [
        {
          id: `${this.did}#aeos-agent`,
          type: "AEOSAgent",
          serviceEndpoint: {
            agentType: this.agentType,
            capabilities: Array.from(this.capabilities),
            reputationScore: this.reputationScore,
            totalTransactions: this.totalTransactions,
          },
        },
      ],
      created: this.createdAt,
      revoked: this.revoked,
    };
  }
}

// =============================================================================
// AGENT REGISTRY
// =============================================================================

export class AgentRegistry {
  private agents: Map<string, AgentIdentity> = new Map();
  private accumulator: MerkleAccumulator = new MerkleAccumulator();
  private revocationList: Set<string> = new Set();
  private didToIndex: Map<string, number> = new Map();

  register(agent: AgentIdentity): { proofValid: boolean; root: string } {
    if (this.agents.has(agent.did)) {
      throw new Error(`Agent ${agent.did} already registered`);
    }
    this.agents.set(agent.did, agent);
    const index = this.accumulator.add(Buffer.from(agent.did));
    this.didToIndex.set(agent.did, index);
    const proof = this.accumulator.prove(index);
    return {
      proofValid: MerkleAccumulator.verifyProof(proof),
      root: this.accumulator.root.toString("hex"),
    };
  }

  resolve(did: string): AgentIdentity | undefined {
    const agent = this.agents.get(did);
    if (agent && this.revocationList.has(did)) {
      agent.revoke();
    }
    return agent;
  }

  revoke(did: string): boolean {
    const agent = this.agents.get(did);
    if (!agent) return false;
    agent.revoke();
    this.revocationList.add(did);
    return true;
  }

  get size(): number {
    return this.agents.size;
  }

  get root(): string {
    return this.accumulator.root.toString("hex");
  }

  stats(): Record<string, unknown> {
    return {
      totalAgents: this.agents.size,
      revokedAgents: this.revocationList.size,
      registryRoot: this.root,
    };
  }
}
