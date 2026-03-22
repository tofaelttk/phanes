/**
 * AEOS Protocol — TypeScript SDK Tests
 * Run: npm test (or node tests/test.js after build)
 */

const {
  KeyPair,
  sha256,
  createCommitment,
  verifyCommitment,
  MerkleAccumulator,
  vrfEvaluate,
  vrfVerify,
  encryptEnvelope,
  decryptEnvelope,
  AgentIdentity,
  AgentRegistry,
  AgentType,
  Capability,
  DelegationChain,
  boundsContain,
  Contract,
  ContractFactory,
  EscrowAccount,
  ContractState,
  PhanesClient,
} = require("../dist/index");

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    errors.push({ name, error: e });
    failed++;
  }
}

function assert(condition, msg = "Assertion failed") {
  if (!condition) throw new Error(msg);
}

// =============================================================================
// CRYPTO PRIMITIVES
// =============================================================================
console.log("\n═══ CRYPTO PRIMITIVES ═══");

test("KeyPair: generate, sign, verify", () => {
  const kp = KeyPair.generate();
  const msg = Buffer.from("test message");
  const sig = kp.sign(msg);
  assert(kp.verify(sig, msg), "Valid signature should verify");
  assert(!kp.verify(sig, Buffer.from("wrong")), "Wrong message should fail");
});

test("KeyPair: serialize and deserialize", () => {
  const kp = KeyPair.generate("signing");
  const serialized = kp.serialize();
  const restored = KeyPair.deserialize(serialized);
  assert(kp.keyId === restored.keyId, "Key IDs should match");
  const msg = Buffer.from("test");
  const sig = kp.sign(msg);
  assert(restored.verify(sig, msg), "Deserialized key should verify");
});

test("Pedersen commitment: binding and hiding", () => {
  const value = Buffer.from("secret_42");
  const c = createCommitment(value);
  assert(verifyCommitment(c, value), "Should verify with correct value");
  assert(!verifyCommitment(c, Buffer.from("wrong")), "Should fail with wrong value");
  const c2 = createCommitment(value);
  assert(!c.hash.equals(c2.hash), "Different blindings should produce different commitments");
});

test("Merkle accumulator: add and prove", () => {
  const acc = new MerkleAccumulator();
  acc.add(Buffer.from("item_0"));
  acc.add(Buffer.from("item_1"));
  acc.add(Buffer.from("item_2"));
  const proof = acc.prove(1);
  assert(MerkleAccumulator.verifyProof(proof), "Proof should verify");
});

test("Merkle accumulator: tamper detection", () => {
  const acc = new MerkleAccumulator();
  acc.add(Buffer.from("original"));
  const proof = acc.prove(0);
  proof.leaf = Buffer.from("tampered");
  assert(!MerkleAccumulator.verifyProof(proof), "Tampered proof should fail");
});

test("VRF: deterministic and verifiable", () => {
  const key = KeyPair.generate();
  const input = Buffer.from("dispute_12345");
  const r1 = vrfEvaluate(key, input);
  const r2 = vrfEvaluate(key, input);
  assert(r1.output.equals(r2.output), "VRF should be deterministic");
  assert(
    vrfVerify(key.publicKey, input, r1.output, r1.proof),
    "VRF should verify"
  );
});

test("VRF: different inputs produce different outputs", () => {
  const key = KeyPair.generate();
  const r1 = vrfEvaluate(key, Buffer.from("input_A"));
  const r2 = vrfEvaluate(key, Buffer.from("input_B"));
  assert(!r1.output.equals(r2.output), "Different inputs should give different outputs");
});

test("Encrypted envelope: round-trip", () => {
  const secret = new Uint8Array(32);
  for (let i = 0; i < 32; i++) secret[i] = i;
  const plaintext = Buffer.from("confidential agent data");
  const env = encryptEnvelope(plaintext, secret, "sender", "recipient");
  const decrypted = decryptEnvelope(env, secret);
  assert(decrypted.equals(plaintext), "Decrypted should match plaintext");
});

// =============================================================================
// IDENTITY
// =============================================================================
console.log("\n═══ IDENTITY ═══");

test("AgentIdentity: creation with DID", () => {
  const agent = AgentIdentity.create(
    "did:aeos:test-corp",
    AgentType.AUTONOMOUS,
    [Capability.TRANSACT, Capability.SIGN_CONTRACT],
    {
      maxTransactionValue: 100_000_00,
      maxDailyVolume: 500_000_00,
      maxContractDurationHours: 720,
      maxDelegationDepth: 2,
      maxConcurrentContracts: 10,
      maxCounterparties: 50,
    }
  );
  assert(agent.did.startsWith("did:aeos:"), "DID should start with did:aeos:");
  assert(agent.capabilities.has(Capability.TRANSACT), "Should have TRANSACT");
});

test("Authority bounds: containment check", () => {
  const parent = {
    maxTransactionValue: 100,
    maxDailyVolume: 1000,
    maxContractDurationHours: 720,
    maxDelegationDepth: 3,
    maxConcurrentContracts: 10,
    maxCounterparties: 50,
  };
  const child = {
    maxTransactionValue: 50,
    maxDailyVolume: 500,
    maxContractDurationHours: 360,
    maxDelegationDepth: 2,
    maxConcurrentContracts: 5,
    maxCounterparties: 25,
  };
  assert(boundsContain(parent, child), "Parent should contain child");
  assert(!boundsContain(child, parent), "Child should not contain parent");
});

test("Delegation chain: valid chain", () => {
  const parent = AgentIdentity.create(
    "did:aeos:corp",
    AgentType.SEMI_AUTONOMOUS,
    [Capability.TRANSACT, Capability.DELEGATE, Capability.SIGN_CONTRACT],
    {
      maxTransactionValue: 1000,
      maxDailyVolume: 5000,
      maxContractDurationHours: 100,
      maxDelegationDepth: 2,
      maxConcurrentContracts: 10,
      maxCounterparties: 20,
    }
  );
  const chain = parent.delegateTo(
    "did:aeos:child",
    [Capability.TRANSACT],
    {
      maxTransactionValue: 500,
      maxDailyVolume: 2000,
      maxContractDurationHours: 50,
      maxDelegationDepth: 1,
      maxConcurrentContracts: 5,
      maxCounterparties: 10,
    },
    24
  );
  assert(chain.verify(), "Chain should be valid");
  assert(chain.depth === 1, "Chain depth should be 1");
});

test("Delegation: cannot exceed parent bounds", () => {
  const parent = AgentIdentity.create(
    "did:aeos:corp",
    AgentType.AUTONOMOUS,
    [Capability.TRANSACT],
    {
      maxTransactionValue: 100,
      maxDailyVolume: 500,
      maxContractDurationHours: 24,
      maxDelegationDepth: 1,
      maxConcurrentContracts: 5,
      maxCounterparties: 10,
    }
  );
  let threw = false;
  try {
    parent.delegateTo("did:child", [Capability.TRANSACT], {
      maxTransactionValue: 200, // Exceeds!
      maxDailyVolume: 500,
      maxContractDurationHours: 24,
      maxDelegationDepth: 0,
      maxConcurrentContracts: 5,
      maxCounterparties: 10,
    });
  } catch (e) {
    threw = true;
  }
  assert(threw, "Should throw when exceeding bounds");
});

test("Agent registry: register and resolve", () => {
  const reg = new AgentRegistry();
  const agent = AgentIdentity.create(
    "did:aeos:corp",
    AgentType.AUTONOMOUS,
    [Capability.TRANSACT],
    {
      maxTransactionValue: 100,
      maxDailyVolume: 500,
      maxContractDurationHours: 24,
      maxDelegationDepth: 0,
      maxConcurrentContracts: 5,
      maxCounterparties: 10,
    }
  );
  const result = reg.register(agent);
  assert(result.proofValid, "Registry proof should be valid");
  const resolved = reg.resolve(agent.did);
  assert(resolved !== undefined, "Should resolve agent");
  assert(resolved.did === agent.did, "DIDs should match");
});

test("Agent registry: revocation", () => {
  const reg = new AgentRegistry();
  const agent = AgentIdentity.create(
    "did:aeos:corp",
    AgentType.AUTONOMOUS,
    [Capability.TRANSACT],
    {
      maxTransactionValue: 100,
      maxDailyVolume: 500,
      maxContractDurationHours: 24,
      maxDelegationDepth: 0,
      maxConcurrentContracts: 5,
      maxCounterparties: 10,
    }
  );
  reg.register(agent);
  assert(reg.revoke(agent.did), "Revocation should succeed");
  const resolved = reg.resolve(agent.did);
  assert(resolved.revoked, "Agent should be revoked");
});

test("DID Document: W3C format", () => {
  const agent = AgentIdentity.create(
    "did:aeos:corp",
    AgentType.AUTONOMOUS,
    [Capability.TRANSACT],
    {
      maxTransactionValue: 100,
      maxDailyVolume: 500,
      maxContractDurationHours: 24,
      maxDelegationDepth: 0,
      maxConcurrentContracts: 5,
      maxCounterparties: 10,
    }
  );
  const doc = agent.toDIDDocument();
  assert(doc.id === agent.did, "DID should match");
  assert(Array.isArray(doc.verificationMethod), "Should have verification methods");
});

// =============================================================================
// CONTRACTS
// =============================================================================
console.log("\n═══ CONTRACTS ═══");

test("Service agreement: full lifecycle", () => {
  const a = AgentIdentity.create("did:c1", AgentType.AUTONOMOUS,
    [Capability.TRANSACT, Capability.SIGN_CONTRACT],
    { maxTransactionValue: 100000, maxDailyVolume: 500000,
      maxContractDurationHours: 720, maxDelegationDepth: 0,
      maxConcurrentContracts: 10, maxCounterparties: 50 });
  const b = AgentIdentity.create("did:c2", AgentType.AUTONOMOUS,
    [Capability.TRANSACT, Capability.SIGN_CONTRACT],
    { maxTransactionValue: 100000, maxDailyVolume: 500000,
      maxContractDurationHours: 720, maxDelegationDepth: 0,
      maxConcurrentContracts: 10, maxCounterparties: 50 });
  const c = ContractFactory.serviceAgreement(a.did, b.did, "Test service", 5000);
  assert(c.state === ContractState.PROPOSED, "Should be PROPOSED");
  c.sign(a);
  c.sign(b);
  assert(c.state === ContractState.ACTIVE, "Should be ACTIVE after both sign");
});

test("Escrow: milestone release", () => {
  const e = new EscrowAccount("did:a", "did:b", [
    { milestoneId: "m1", value: 100, condition: "x", released: false },
    { milestoneId: "m2", value: 200, condition: "y", released: false },
  ]);
  assert(e.totalValue === 300, "Total should be 300");
  const released = e.releaseMilestone("m1", "proof");
  assert(released === 100, "Should release 100");
  assert(e.remaining === 200, "Remaining should be 200");
});

test("Contract: terms hash is deterministic", () => {
  const a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS,
    [Capability.SIGN_CONTRACT],
    { maxTransactionValue: 10000, maxDailyVolume: 50000,
      maxContractDurationHours: 720, maxDelegationDepth: 0,
      maxConcurrentContracts: 10, maxCounterparties: 50 });
  const c = ContractFactory.serviceAgreement(a.did, "did:other", "test", 1000);
  assert(c.termsHash() === c.termsHash(), "Terms hash should be deterministic");
});

test("Contract: obligation fulfillment + completion", () => {
  const a = AgentIdentity.create("did:c1", AgentType.AUTONOMOUS,
    [Capability.TRANSACT, Capability.SIGN_CONTRACT],
    { maxTransactionValue: 100000, maxDailyVolume: 500000,
      maxContractDurationHours: 720, maxDelegationDepth: 0,
      maxConcurrentContracts: 10, maxCounterparties: 50 });
  const b = AgentIdentity.create("did:c2", AgentType.AUTONOMOUS,
    [Capability.TRANSACT, Capability.SIGN_CONTRACT],
    { maxTransactionValue: 100000, maxDailyVolume: 500000,
      maxContractDurationHours: 720, maxDelegationDepth: 0,
      maxConcurrentContracts: 10, maxCounterparties: 50 });
  const c = ContractFactory.serviceAgreement(a.did, b.did, "compute", 25000);
  c.sign(a);
  c.sign(b);
  c.fulfillObligation("delivery", "proof_hash", b.did);
  c.fulfillObligation("payment", "payment_proof", a.did);
  assert(c.state === ContractState.COMPLETED, "Should be COMPLETED");
  assert(c.escrow.releasedTotal === 25000, "Escrow should be fully released");
});

test("Contract: compute task template", () => {
  const c = ContractFactory.computeTask("did:req", "did:comp",
    { model: "llama-4", tokens: 100000 }, 50000, 2.0);
  assert(c.obligations.length === 2, "Should have 2 obligations");
  assert(c.escrow.totalValue === 50000, "Escrow should match price");
  assert(c.metadata.template === "compute_task", "Template should be compute_task");
});

// =============================================================================
// CLIENT (type check only — no live server)
// =============================================================================
console.log("\n═══ CLIENT ═══");

test("PhanesClient: instantiation", () => {
  const client = new PhanesClient("http://localhost:8420");
  assert(client !== null, "Client should instantiate");
});

test("PhanesClient: with API key", () => {
  const client = new PhanesClient("http://localhost:8420", "test-key-123");
  assert(client !== null, "Client with API key should instantiate");
});

// =============================================================================
// RESULTS
// =============================================================================
console.log(`\n${"=".repeat(60)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${"=".repeat(60)}`);

if (errors.length > 0) {
  console.log("\nFailed tests:");
  for (const { name, error } of errors) {
    console.log(`\n--- ${name} ---`);
    console.log(error.stack);
  }
}

process.exit(failed > 0 ? 1 : 0);
