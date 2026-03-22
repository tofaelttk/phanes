/**
 * AEOS Protocol — Contracts (TypeScript)
 *
 * Deterministic binding agreements between AI agents:
 *  - Multi-signature activation
 *  - Escrow with milestone release
 *  - Obligation tracking with fulfillment proofs
 *  - Breach detection and penalty calculation
 *  - Contract templates (service, data exchange, compute)
 */

import { randomBytes } from "crypto";
import { sha256 } from "./crypto";
import { AgentIdentity, Capability } from "./identity";

// =============================================================================
// TYPES
// =============================================================================

export enum ContractState {
  DRAFT = "DRAFT",
  PROPOSED = "PROPOSED",
  NEGOTIATING = "NEGOTIATING",
  AGREED = "AGREED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  DISPUTED = "DISPUTED",
  TERMINATED = "TERMINATED",
  EXPIRED = "EXPIRED",
}

export enum ObligationType {
  PAYMENT = "payment",
  DELIVERY = "delivery",
  ATTESTATION = "attestation",
  COMPUTATION = "computation",
  AVAILABILITY = "availability",
}

export interface Obligation {
  obligationId: string;
  obligationType: ObligationType;
  debtorDid: string;
  creditorDid: string;
  description: string;
  value: number;
  deadline: number;
  verificationMethod: string;
  verificationData: Record<string, unknown>;
  fulfilled: boolean;
  fulfilledAt?: number;
  fulfillmentProof?: string;
  penaltyOnBreach: number;
}

export interface EscrowMilestone {
  milestoneId: string;
  value: number;
  condition: string;
  released: boolean;
  releasedAt?: number;
  releaseProof?: string;
}

export interface ContractSignature {
  signerDid: string;
  signature: string;
  signedAt: number;
  keyId: string;
  termsHash: string;
}

// =============================================================================
// ESCROW
// =============================================================================

export class EscrowAccount {
  public readonly escrowId: string;
  public readonly totalValue: number;
  public readonly depositorDid: string;
  public readonly beneficiaryDid: string;
  public milestones: EscrowMilestone[];

  constructor(
    depositor: string,
    beneficiary: string,
    milestones: EscrowMilestone[]
  ) {
    this.escrowId = sha256(
      Buffer.from(`AEOS/escrow/${depositor}/${beneficiary}/${Date.now()}`)
    )
      .toString("hex")
      .slice(0, 16);
    this.depositorDid = depositor;
    this.beneficiaryDid = beneficiary;
    this.milestones = milestones;
    this.totalValue = milestones.reduce((sum, m) => sum + m.value, 0);
  }

  releaseMilestone(milestoneId: string, proof: string): number {
    const m = this.milestones.find(
      (ms) => ms.milestoneId === milestoneId && !ms.released
    );
    if (!m) return 0;
    m.released = true;
    m.releasedAt = Date.now() / 1000;
    m.releaseProof = proof;
    return m.value;
  }

  get releasedTotal(): number {
    return this.milestones
      .filter((m) => m.released)
      .reduce((sum, m) => sum + m.value, 0);
  }

  get remaining(): number {
    return this.totalValue - this.releasedTotal;
  }
}

// =============================================================================
// CONTRACT
// =============================================================================

export class Contract {
  public readonly contractId: string;
  public state: ContractState;
  public readonly parties: string[];
  public obligations: Obligation[];
  public escrow?: EscrowAccount;
  public signatures: ContractSignature[] = [];
  public readonly createdAt: number;
  public activatedAt?: number;
  public expiresAt?: number;
  public disputeId?: string;
  public metadata: Record<string, unknown>;

  constructor(params: {
    parties: string[];
    obligations: Obligation[];
    escrow?: EscrowAccount;
    durationHours?: number;
    metadata?: Record<string, unknown>;
  }) {
    this.contractId = sha256(
      Buffer.from(
        `AEOS/contract/${params.parties.join("/")}/${Date.now()}/${randomBytes(8).toString("hex")}`
      )
    )
      .toString("hex")
      .slice(0, 24);
    this.state = ContractState.PROPOSED;
    this.parties = params.parties;
    this.obligations = params.obligations;
    this.escrow = params.escrow;
    this.createdAt = Date.now() / 1000;
    this.expiresAt = params.durationHours
      ? this.createdAt + params.durationHours * 3600
      : undefined;
    this.metadata = params.metadata || {};
  }

  termsHash(): string {
    const terms = {
      contract_id: this.contractId,
      parties: [...this.parties].sort(),
      obligations: this.obligations
        .map((o) => ({
          id: o.obligationId,
          type: o.obligationType,
          debtor: o.debtorDid,
          creditor: o.creditorDid,
          value: o.value,
          deadline: o.deadline,
          penalty: o.penaltyOnBreach,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      escrow_total: this.escrow?.totalValue || 0,
      expires_at: this.expiresAt,
    };
    return sha256(
      Buffer.concat([
        Buffer.from("AEOS/contract-terms/"),
        Buffer.from(JSON.stringify(terms)),
      ])
    ).toString("hex");
  }

  sign(agent: AgentIdentity): ContractSignature {
    if (!this.parties.includes(agent.did)) {
      throw new Error(`Agent ${agent.did} is not a party to this contract`);
    }
    if (!agent.verifyAuthority(Capability.SIGN_CONTRACT)) {
      throw new Error(`Agent ${agent.did} lacks SIGN_CONTRACT capability`);
    }

    const th = this.termsHash();
    const sig = agent.signMessage(Buffer.from(th));

    const cs: ContractSignature = {
      signerDid: agent.did,
      signature: sig.toString("hex"),
      signedAt: Date.now() / 1000,
      keyId: agent.signingKey.keyId,
      termsHash: th,
    };
    this.signatures.push(cs);

    const signedParties = new Set(this.signatures.map((s) => s.signerDid));
    if (this.parties.every((p) => signedParties.has(p))) {
      this.state = ContractState.ACTIVE;
      this.activatedAt = Date.now() / 1000;
    }

    return cs;
  }

  fulfillObligation(
    obligationId: string,
    proof: string,
    fulfillerDid: string
  ): boolean {
    const ob = this.obligations.find((o) => o.obligationId === obligationId);
    if (!ob) return false;
    if (ob.debtorDid !== fulfillerDid) {
      throw new Error("Only debtor can fulfill obligation");
    }
    if (ob.fulfilled) return true;

    ob.fulfilled = true;
    ob.fulfilledAt = Date.now() / 1000;
    ob.fulfillmentProof = proof;

    if (this.escrow) {
      this.escrow.releaseMilestone(obligationId, proof);
    }

    if (this.obligations.every((o) => o.fulfilled)) {
      this.state = ContractState.COMPLETED;
    }

    return true;
  }

  checkBreaches(): Obligation[] {
    const now = Date.now() / 1000;
    return this.obligations.filter((o) => !o.fulfilled && now > o.deadline);
  }

  calculatePenalties(): Record<string, number> {
    const penalties: Record<string, number> = {};
    for (const o of this.obligations) {
      if (!o.fulfilled && Date.now() / 1000 > o.deadline && o.penaltyOnBreach > 0) {
        penalties[o.debtorDid] = (penalties[o.debtorDid] || 0) + o.penaltyOnBreach;
      }
    }
    return penalties;
  }

  summary(): Record<string, unknown> {
    return {
      contractId: this.contractId,
      state: this.state,
      parties: this.parties,
      totalObligations: this.obligations.length,
      fulfilledObligations: this.obligations.filter((o) => o.fulfilled).length,
      overdueObligations: this.checkBreaches().length,
      escrowTotal: this.escrow?.totalValue || 0,
      escrowReleased: this.escrow?.releasedTotal || 0,
      escrowRemaining: this.escrow?.remaining || 0,
      termsHash: this.termsHash(),
      signatures: this.signatures.length,
    };
  }
}

// =============================================================================
// CONTRACT FACTORY
// =============================================================================

export class ContractFactory {
  static serviceAgreement(
    clientDid: string,
    providerDid: string,
    description: string,
    price: number,
    deadlineHours: number = 24,
    penaltyPercent: number = 0.1
  ): Contract {
    const deadline = Date.now() / 1000 + deadlineHours * 3600;
    const penalty = Math.floor(price * penaltyPercent);

    const obligations: Obligation[] = [
      {
        obligationId: "payment",
        obligationType: ObligationType.PAYMENT,
        debtorDid: clientDid,
        creditorDid: providerDid,
        description: `Payment for: ${description}`,
        value: price,
        deadline,
        verificationMethod: "escrow_release",
        verificationData: { trigger: "delivery_confirmed" },
        fulfilled: false,
        penaltyOnBreach: penalty,
      },
      {
        obligationId: "delivery",
        obligationType: ObligationType.DELIVERY,
        debtorDid: providerDid,
        creditorDid: clientDid,
        description,
        value: price,
        deadline,
        verificationMethod: "cryptographic_proof",
        verificationData: { proof_type: "delivery_hash" },
        fulfilled: false,
        penaltyOnBreach: penalty,
      },
    ];

    const escrow = new EscrowAccount(clientDid, providerDid, [
      {
        milestoneId: "payment",
        value: price,
        condition: "delivery_confirmed",
        released: false,
      },
    ]);

    return new Contract({
      parties: [clientDid, providerDid],
      obligations,
      escrow,
      durationHours: deadlineHours * 2,
      metadata: { template: "service_agreement", service: description },
    });
  }

  static computeTask(
    requesterDid: string,
    computeDid: string,
    taskSpec: Record<string, unknown>,
    price: number,
    timeoutHours: number = 1.0
  ): Contract {
    const deadline = Date.now() / 1000 + timeoutHours * 3600;

    const obligations: Obligation[] = [
      {
        obligationId: "payment",
        obligationType: ObligationType.PAYMENT,
        debtorDid: requesterDid,
        creditorDid: computeDid,
        description: "Payment for compute task",
        value: price,
        deadline,
        verificationMethod: "escrow_release",
        verificationData: { trigger: "computation_verified" },
        fulfilled: false,
        penaltyOnBreach: 0,
      },
      {
        obligationId: "computation",
        obligationType: ObligationType.COMPUTATION,
        debtorDid: computeDid,
        creditorDid: requesterDid,
        description: "Execute and prove computation",
        value: price,
        deadline,
        verificationMethod: "verifiable_computation",
        verificationData: { task_spec: taskSpec },
        fulfilled: false,
        penaltyOnBreach: Math.floor(price * 0.2),
      },
    ];

    const escrow = new EscrowAccount(requesterDid, computeDid, [
      {
        milestoneId: "payment",
        value: price,
        condition: "computation_verified",
        released: false,
      },
    ]);

    return new Contract({
      parties: [requesterDid, computeDid],
      obligations,
      escrow,
      durationHours: timeoutHours * 3,
      metadata: { template: "compute_task", task_spec: taskSpec },
    });
  }
}
