/**
 * AEOS Protocol — HTTP Client (TypeScript)
 *
 * Typed client for the AEOS REST API server.
 * Provides methods for all 17 endpoints with full type safety.
 *
 * Usage:
 *   const client = new PhanesClient("http://localhost:8420");
 *   const agent = await client.createAgent({ controllerDid: "did:aeos:my-corp" });
 *   const contract = await client.createContract({ ... });
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAgentParams {
  controllerDid: string;
  agentType?: string;
  capabilities?: string[];
  maxTransactionValue?: number;
  maxDailyVolume?: number;
  maxContractDurationHours?: number;
  maxDelegationDepth?: number;
  maxConcurrentContracts?: number;
  maxCounterparties?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateAgentResponse {
  did: string;
  controller: string;
  type: string;
  capabilities: string[];
  registry_proof_valid: boolean;
  registry_root: string;
  created_at: number;
}

export interface DelegateParams {
  childDid: string;
  capabilities?: string[];
  maxTransactionValue?: number;
  maxDailyVolume?: number;
  expiryHours?: number;
}

export interface CreateContractParams {
  template: "service_agreement" | "data_exchange" | "compute_task";
  clientDid: string;
  providerDid: string;
  description?: string;
  price?: number;
  deliveryDeadlineHours?: number;
  taskSpec?: Record<string, unknown>;
}

export interface ContractSummary {
  contract_id: string;
  state: string;
  parties: string[];
  total_obligations: number;
  fulfilled_obligations: number;
  overdue_obligations: number;
  escrow_total: number;
  escrow_released: number;
  escrow_remaining: number;
  terms_hash: string;
  signatures: number;
}

export interface RiskAssessment {
  approved: boolean;
  risk_score: number;
  risk_level: string;
  factors: Record<string, number>;
  explanations: string[];
}

export interface LedgerStats {
  total_entries: number;
  ledger_root: string;
  unique_actors: number;
  event_counts: Record<string, number>;
  chain_valid: boolean;
}

export interface LedgerEntry {
  entry_id: string;
  sequence: number;
  event_type: string;
  timestamp: number;
  actor: string;
  subject: string | null;
  data_hash: string;
  proof_valid: boolean;
  proof_path_length: number;
}

export interface DisputeSummary {
  dispute_id: string;
  contract_id: string;
  state: string;
  reason: string;
  claimed_damages: number;
  evidence_count: number;
  resolution: string | null;
  resolution_amount: number;
}

export interface NetworkHealth {
  total_agents_monitored: number;
  open_circuit_breakers: number;
  transactions_24h: number;
  volume_24h: number;
  average_risk_1h: number;
  insurance_pools: number;
}

// =============================================================================
// CLIENT
// =============================================================================

export class PhanesClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = "http://localhost:8420", apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AEOS API Error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  // =========================================================================
  // HEALTH
  // =========================================================================

  async health(): Promise<Record<string, unknown>> {
    return this.request("GET", "/health");
  }

  // =========================================================================
  // AGENTS
  // =========================================================================

  async createAgent(params: CreateAgentParams): Promise<CreateAgentResponse> {
    return this.request("POST", "/agents", {
      controller_did: params.controllerDid,
      agent_type: params.agentType || "autonomous",
      capabilities: params.capabilities || [
        "transact",
        "sign_contract",
        "dispute",
      ],
      max_transaction_value: params.maxTransactionValue || 10_000_00,
      max_daily_volume: params.maxDailyVolume || 50_000_00,
      max_contract_duration_hours: params.maxContractDurationHours || 720,
      max_delegation_depth: params.maxDelegationDepth || 2,
      max_concurrent_contracts: params.maxConcurrentContracts || 10,
      max_counterparties: params.maxCounterparties || 50,
      metadata: params.metadata || {},
    });
  }

  async getAgent(did: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/agents/${encodeURIComponent(did)}`);
  }

  async delegateAuthority(
    did: string,
    params: DelegateParams
  ): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/agents/${encodeURIComponent(did)}/delegate`,
      {
        child_did: params.childDid,
        capabilities: params.capabilities || ["transact"],
        max_transaction_value: params.maxTransactionValue || 1_000_00,
        max_daily_volume: params.maxDailyVolume || 5_000_00,
        expiry_hours: params.expiryHours || 24,
      }
    );
  }

  async revokeAgent(did: string): Promise<Record<string, unknown>> {
    return this.request("DELETE", `/agents/${encodeURIComponent(did)}`);
  }

  // =========================================================================
  // CONTRACTS
  // =========================================================================

  async createContract(params: CreateContractParams): Promise<ContractSummary> {
    return this.request("POST", "/contracts", {
      template: params.template,
      client_did: params.clientDid,
      provider_did: params.providerDid,
      description: params.description || "",
      price: params.price || 0,
      delivery_deadline_hours: params.deliveryDeadlineHours || 24,
      task_spec: params.taskSpec || {},
    });
  }

  async signContract(
    contractId: string,
    signerDid: string
  ): Promise<Record<string, unknown>> {
    return this.request("POST", `/contracts/${contractId}/sign`, {
      signer_did: signerDid,
    });
  }

  async fulfillObligation(
    contractId: string,
    obligationId: string,
    fulfillerDid: string,
    proofData: string = ""
  ): Promise<Record<string, unknown>> {
    return this.request("POST", `/contracts/${contractId}/fulfill`, {
      obligation_id: obligationId,
      fulfiller_did: fulfillerDid,
      proof_data: proofData,
    });
  }

  async getContract(contractId: string): Promise<ContractSummary> {
    return this.request("GET", `/contracts/${contractId}`);
  }

  // =========================================================================
  // DISPUTES
  // =========================================================================

  async fileDispute(
    plaintiffDid: string,
    contractId: string,
    reason: string,
    description: string,
    claimedDamages: number
  ): Promise<DisputeSummary> {
    return this.request("POST", "/disputes", {
      plaintiff_did: plaintiffDid,
      contract_id: contractId,
      reason,
      description,
      claimed_damages: claimedDamages,
    });
  }

  async submitEvidence(
    disputeId: string,
    submitterDid: string,
    evidenceType: string,
    data: string
  ): Promise<Record<string, unknown>> {
    return this.request("POST", `/disputes/${disputeId}/evidence`, {
      submitter_did: submitterDid,
      evidence_type: evidenceType,
      data,
    });
  }

  async resolveDispute(disputeId: string): Promise<DisputeSummary> {
    return this.request("POST", `/disputes/${disputeId}/resolve`);
  }

  async getDispute(disputeId: string): Promise<DisputeSummary> {
    return this.request("GET", `/disputes/${disputeId}`);
  }

  // =========================================================================
  // RISK
  // =========================================================================

  async assessRisk(
    agentDid: string,
    counterpartyDid: string,
    value: number,
    txType: string = "transaction"
  ): Promise<RiskAssessment> {
    return this.request("POST", "/risk/assess", {
      agent_did: agentDid,
      counterparty_did: counterpartyDid,
      value,
      tx_type: txType,
    });
  }

  async networkHealth(): Promise<NetworkHealth> {
    return this.request("GET", "/risk/health");
  }

  // =========================================================================
  // LEDGER
  // =========================================================================

  async ledgerStats(): Promise<LedgerStats> {
    return this.request("GET", "/ledger/stats");
  }

  async getLedgerEntry(index: number): Promise<LedgerEntry> {
    return this.request("GET", `/ledger/entry/${index}`);
  }
}
