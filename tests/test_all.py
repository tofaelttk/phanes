#!/usr/bin/env python3
"""AEOS Protocol — Complete Test Suite

Tests all 19 modules:
  crypto_primitives, identity, contracts, disputes, risk, ledger,
  threshold_crypto, tokenization, state_channels, ml_engine,
  graph_intelligence, bft_ledger, mcp_server, settlement,
  bulletproofs_ffi, server (API), persistence, usdc_settlement

Run: python tests/test_all.py
"""
import time, sys, json, traceback, os
import numpy as np
sys.path.insert(0, '.')

from aeos.crypto_primitives import *
from aeos.identity import *
from aeos.contracts import *
from aeos.disputes import *
from aeos.risk import *
from aeos.ledger import Ledger, EventType
from aeos.threshold_crypto import *
from aeos.tokenization import *
from aeos.state_channels import StateChannel, ChannelState
from aeos.ml_engine import *
from aeos.graph_intelligence import TransactionGraph
from aeos.bft_ledger import PBFTNetwork, DistributedLedger, PBFTMessage, MessageType
from aeos.mcp_server import handle_request, handle_tool, TOOLS
from aeos.settlement import StripeSettlementEngine, SettlementRecord
from aeos.bulletproofs_ffi import BulletproofsEngine

passed = failed = 0
errors = []
def test(name):
    def decorator(func):
        global passed, failed
        try:
            func()
            print(f"  ✓ {name}")
            passed += 1
        except Exception as e:
            print(f"  ✗ {name}: {e}")
            errors.append((name, traceback.format_exc()))
            failed += 1
    return decorator

# =============================================================================
# 1. CRYPTO PRIMITIVES (9 tests)
# =============================================================================
print("\n═══ CRYPTO PRIMITIVES ═══")

@test("KeyPair sign/verify")
def _():
    kp = KeyPair.generate(); sig = kp.sign(b"msg")
    assert kp.verify(sig, b"msg") and not kp.verify(sig, b"wrong")

@test("Child key derivation deterministic")
def _():
    p = KeyPair.generate()
    assert p.derive_child(0).key_id == p.derive_child(0).key_id
    assert p.derive_child(0).key_id != p.derive_child(1).key_id

@test("Pedersen commitment binding+hiding")
def _():
    c = Commitment.create(b"secret")
    assert c.verify(b"secret") and not c.verify(b"wrong")
    assert Commitment.create(b"secret").value_hash != c.value_hash

@test("Range proof valid + Fiat-Shamir verification")
def _():
    p, _ = RangeProof.create(42, 8)
    assert p.verify()  # Real cryptographic verification, not just length check

@test("Range proof rejects out-of-range")
def _():
    try: RangeProof.create(256, 8); assert False
    except ValueError: pass

@test("Range proof rejects tampered challenge")
def _():
    import copy
    p, _ = RangeProof.create(100, 8)
    bad = copy.deepcopy(p)
    bad.challenge = b'\x00' * 32
    assert not bad.verify()

@test("Range proof rejects tampered bit proof")
def _():
    import copy
    p, _ = RangeProof.create(100, 8)
    bad = copy.deepcopy(p)
    bad.bit_proofs[0] = b'\xff' * 32
    assert not bad.verify()

@test("Merkle accumulator prove/verify")
def _():
    a = MerkleAccumulator(); a.add(b"0"); a.add(b"1"); a.add(b"2")
    assert a.prove(1).verify()

@test("Merkle tamper detection")
def _():
    a = MerkleAccumulator(); a.add(b"x"); p = a.prove(0); p.leaf = b"y"
    assert not p.verify()

@test("VRF deterministic + verifiable")
def _():
    k = KeyPair.generate()
    o1, p1 = VRF.evaluate(k, b"in")
    o2, p2 = VRF.evaluate(k, b"in")
    assert o1 == o2 and VRF.verify(k.public_key, b"in", o1, p1)

@test("Encrypted envelope round-trip")
def _():
    s = b"shared_secret_key_material_here!"
    e = EncryptedEnvelope.encrypt(b"msg", s, "a", "b")
    assert e.decrypt(s) == b"msg"

# =============================================================================
# 2. IDENTITY (5 tests)
# =============================================================================
print("\n═══ IDENTITY ═══")

@test("Agent creation + DID format")
def _():
    a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=100))
    assert a.did.startswith("did:aeos:")

@test("Authority containment enforced")
def _():
    p = AuthorityBounds(max_transaction_value=100, max_daily_volume=1000, max_delegation_depth=3, max_concurrent_contracts=10, max_counterparties=50, max_contract_duration_hours=720, allowed_asset_types=["USD"])
    c = AuthorityBounds(max_transaction_value=50, max_daily_volume=500, max_delegation_depth=2, max_concurrent_contracts=5, max_counterparties=25, max_contract_duration_hours=360, allowed_asset_types=["USD"])
    assert p.contains(c) and not c.contains(p)

@test("Delegation chain valid")
def _():
    a = AgentIdentity.create("did:c", AgentType.SEMI_AUTONOMOUS, {CapabilityScope.TRANSACT, CapabilityScope.DELEGATE}, AuthorityBounds(max_transaction_value=1000, max_delegation_depth=2, max_daily_volume=5000, max_concurrent_contracts=10, max_counterparties=20, max_contract_duration_hours=100))
    chain = a.delegate_to("did:child", {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=500, max_delegation_depth=1, max_daily_volume=2000, max_concurrent_contracts=5, max_counterparties=10, max_contract_duration_hours=50))
    assert chain.verify_chain()

@test("Cannot exceed parent bounds")
def _():
    a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=100, max_delegation_depth=1, max_daily_volume=500, max_concurrent_contracts=5, max_counterparties=10, max_contract_duration_hours=24))
    try: a.delegate_to("did:c2", {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=200)); assert False
    except ValueError: pass

@test("Registry register/resolve/revoke")
def _():
    r = AgentRegistry(); a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=100))
    assert r.register(a).verify(); assert r.resolve(a.did).did == a.did
    r.revoke(a.did, b"sig"); assert r.is_revoked(a.did)

# =============================================================================
# 3. CONTRACTS (3 tests)
# =============================================================================
print("\n═══ CONTRACTS ═══")

@test("Service agreement lifecycle")
def _():
    a = AgentIdentity.create("did:c1", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT}, AuthorityBounds(max_transaction_value=100000))
    b = AgentIdentity.create("did:c2", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT}, AuthorityBounds(max_transaction_value=100000))
    c = ContractFactory.service_agreement(a.did, b.did, "Test", 5000)
    c.sign(a); c.sign(b); assert c.state == ContractState.ACTIVE

@test("Escrow milestone release")
def _():
    e = EscrowAccount.create("a", "b", [{"milestone_id":"m1","value":100,"condition":"x"},{"milestone_id":"m2","value":200,"condition":"y"}])
    assert e.total_value == 300; e.release_milestone("m1", b"p"); assert e.remaining == 200

@test("Terms hash deterministic")
def _():
    a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.SIGN_CONTRACT}, AuthorityBounds(max_transaction_value=10000))
    c = ContractFactory.data_exchange(a.did, "did:s", "data", 1000, "abc")
    assert c.terms_hash() == c.terms_hash()

# =============================================================================
# 4. THRESHOLD CRYPTO (6 tests)
# =============================================================================
print("\n═══ THRESHOLD CRYPTO ═══")

@test("Shamir split + reconstruct")
def _():
    shares, _ = ShamirSecretSharing.split(123456789, 3, 5)
    assert ShamirSecretSharing.reconstruct(shares[:3]) == 123456789

@test("VSS share verification (HMAC binding)")
def _():
    shares, _ = ShamirSecretSharing.split(999, 3, 5)
    for s in shares:
        assert s.verify(), f"Share {s.index} should verify"

@test("VSS rejects tampered share value")
def _():
    import copy
    shares, _ = ShamirSecretSharing.split(42, 3, 5)
    bad = copy.deepcopy(shares[0])
    bad.value = 999999
    assert not bad.verify()

@test("VSS rejects tampered index")
def _():
    import copy
    shares, _ = ShamirSecretSharing.split(42, 3, 5)
    bad = copy.deepcopy(shares[0])
    bad.index = 99
    assert not bad.verify()

@test("Any t shares work")
def _():
    shares, _ = ShamirSecretSharing.split(999, 3, 5)
    assert ShamirSecretSharing.reconstruct([shares[0], shares[2], shares[4]]) == 999
    assert ShamirSecretSharing.reconstruct([shares[1], shares[3], shares[4]]) == 999

@test("t-1 shares insufficient")
def _():
    shares, _ = ShamirSecretSharing.split(42, 3, 5)
    try: ShamirSecretSharing.reconstruct(shares[:2]); assert False
    except ValueError: pass

@test("Threshold signatures sign+verify")
def _():
    s = ThresholdSignatureScheme.setup(2, 3, ["a","b","c"])
    p1 = s.partial_sign(s.key_shares[0], b"msg")
    p2 = s.partial_sign(s.key_shares[1], b"msg")
    c = s.combine_signatures([p1, p2], b"msg")
    assert s.verify_threshold_signature(c, b"msg")
    assert not s.verify_threshold_signature(c, b"wrong")

@test("Time-lock puzzle solve+verify")
def _():
    p = TimeLockPuzzle.create(b"secret_bid", 100)
    assert p.verify_solution(b"secret_bid")

@test("Multi-party escrow threshold release")
def _():
    e = MultiPartyEscrow.create(10000, ["a","b","c"], 2)
    p1 = e.threshold_scheme.partial_sign(e.threshold_scheme.key_shares[0], b"release")
    p2 = e.threshold_scheme.partial_sign(e.threshold_scheme.key_shares[1], b"release")
    assert e.request_release(b"release", [p1, p2]) and e.released

# =============================================================================
# 5. TOKENIZATION (6 tests)
# =============================================================================
print("\n═══ TOKENIZATION ═══")

@test("Token mint + transfer")
def _():
    t = TokenFactory.authority_token("i", "h", "tx", 100)
    n = t.transfer("r", 40); assert n and n.amount == 40 and t.amount == 60

@test("Non-transferable reputation")
def _():
    t = TokenFactory.reputation_token("s", "a", 100)
    assert t.transfer("other") is None

@test("Token decay")
def _():
    t = Token.mint(TokenType.REPUTATION, "s", "a", 1000, TokenPolicy(decay_rate=0.5))
    t.created_at = time.time() - 86400
    assert abs(t.effective_amount() - 500) < 5

@test("Token staking accrual")
def _():
    t = Token.mint(TokenType.GOVERNANCE, "s", "a", 1000, TokenPolicy(accrual_rate=0.1))
    st = t.stake(); st.staked_at = time.time() - 86400; st.unstake_cooldown = 0
    assert st.accrued_value() > 1000

@test("Token registry balances")
def _():
    r = TokenRegistry()
    r.register(TokenFactory.compute_credit("s", "a", 500, 10))
    r.register(TokenFactory.compute_credit("s", "a", 300, 10))
    assert r.get_balance("a").get('service_credit', 0) == 800

@test("Token expiry blocks redemption")
def _():
    t = Token.mint(TokenType.SERVICE_CREDIT, "s", "a", 100, TokenPolicy(expires_at=time.time()-1))
    assert not t.redeem(b"p") and t.state == TokenState.EXPIRED

# =============================================================================
# 6. STATE CHANNELS (5 tests)
# =============================================================================
print("\n═══ STATE CHANNELS ═══")

@test("Channel open + transact")
def _():
    ch = StateChannel.open("a", "b", KeyPair.generate(), KeyPair.generate(), 1000, 1000)
    ch.transact(100); assert ch.latest_state.balance_a == 900 and ch.latest_state.balance_b == 1100

@test("100 micro-transactions")
def _():
    ch = StateChannel.open("a", "b", KeyPair.generate(), KeyPair.generate(), 5000, 5000)
    for _ in range(100): ch.transact(10)
    assert ch.latest_state.balance_a == 4000 and ch.latest_state.sequence == 100

@test("Reject overdraft")
def _():
    ch = StateChannel.open("a", "b", KeyPair.generate(), KeyPair.generate(), 100, 100)
    try: ch.transact(101); assert False
    except ValueError: pass

@test("Cooperative close")
def _():
    ch = StateChannel.open("a", "b", KeyPair.generate(), KeyPair.generate(), 1000, 1000)
    ch.transact(250); r = ch.cooperative_close()
    assert r['settlement_a'] == 750 and r['settlement_b'] == 1250 and not ch.is_open

@test("Value conservation invariant")
def _():
    ch = StateChannel.open("a", "b", KeyPair.generate(), KeyPair.generate(), 3000, 7000)
    for _ in range(50):
        try: ch.transact(np.random.randint(-50, 50))
        except ValueError: pass
    assert ch.latest_state.total == 10000

# =============================================================================
# 7. ML ENGINE (2 tests)
# =============================================================================
print("\n═══ ML ENGINE ═══")

@test("Isolation Forest outlier detection")
def _():
    np.random.seed(42); X = np.random.randn(200, 5)
    f = IsolationForest(n_trees=50, max_samples=100); f.fit(X)
    assert f.score_single(np.array([10,10,10,10,10])) > f.score_single(X[0])

@test("Ensemble scorer detects anomaly")
def _():
    s = EnsembleAnomalyScorer("did:t")
    for i in range(60):
        s.observe({'value': 1000+i*10, 'timestamp': time.time()-(60-i), 'counterparty_did': f'cp:{i%5}', 'counterparty_reputation': 0.7})
    assert s.is_trained
    r = s.observe({'value': 999999, 'timestamp': time.time(), 'counterparty_did': 'new', 'counterparty_reputation': 0.1})
    assert r['ensemble_score'] > 0

# =============================================================================
# 8. GRAPH INTELLIGENCE (4 tests)
# =============================================================================
print("\n═══ GRAPH INTELLIGENCE ═══")

@test("PageRank computes")
def _():
    g = TransactionGraph()
    g.add_transaction("a","b",1000); g.add_transaction("b","c",500); g.add_transaction("c","a",300)
    pr = g.compute_pagerank(); assert len(pr) == 3 and all(0<v<1 for v in pr.values())

@test("Cycle detection")
def _():
    g = TransactionGraph()
    g.add_transaction("a","b",100); g.add_transaction("b","c",100); g.add_transaction("c","a",100)
    assert len(g._find_short_cycles(4)) > 0

@test("Cascade simulation")
def _():
    g = TransactionGraph()
    for i in range(10): g.add_transaction(f"a{i}",f"a{i+1}",10000)
    r = g.simulate_cascade("a0", simulations=100); assert r['avg_cascade_size'] > 0

@test("Sybil detection")
def _():
    g = TransactionGraph()
    g.add_transaction("t1","t2",10000); g.add_transaction("t2","t1",8000)
    for i in range(5): g.add_transaction(f"s{i}",f"s{(i+1)%5}",100)
    s = g.detect_sybil_clusters({"t1","t2"}); assert len(s) > 0

# =============================================================================
# 9. DISPUTE RESOLUTION (1 test)
# =============================================================================
print("\n═══ DISPUTE RESOLUTION ═══")

@test("Auto-resolution on breach")
def _():
    a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT, CapabilityScope.DISPUTE}, AuthorityBounds(max_transaction_value=100000))
    b = AgentIdentity.create("did:c2", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT, CapabilityScope.DISPUTE}, AuthorityBounds(max_transaction_value=100000))
    c = ContractFactory.service_agreement(a.did, b.did, "test", 5000, 0.0001)
    c.sign(a); c.sign(b)
    for ob in c.obligations:
        if ob.debtor_did == b.did: ob.deadline = time.time()-1
    d = Dispute.file(a, c, DisputeReason.NON_DELIVERY, "fail", 5000)
    assert d.attempt_auto_resolution(c) is not None

# =============================================================================
# 10. RISK ENGINE (2 tests)
# =============================================================================
print("\n═══ RISK ENGINE ═══")

@test("Circuit breaker trip+recover")
def _():
    cb = CircuitBreaker(agent_did="t", failure_threshold=3, reset_timeout=0.1)
    assert cb.check(); cb.record_failure("1"); cb.record_failure("2"); cb.record_failure("3")
    assert not cb.check(); time.sleep(0.15); assert cb.check()

@test("Insurance pool stake+claim")
def _():
    p = InsurancePool.create(["fraud"], 5000, 0.02)
    p.stake("a", 10000); cl = p.file_claim("a", 3000, "fraud", b"ev")
    assert cl['amount_approved'] == 3000 and p.solvency_ratio == 0.7

# =============================================================================
# 11. LEDGER (2 tests)
# =============================================================================
print("\n═══ LEDGER ═══")

@test("Ledger chain integrity")
def _():
    l = Ledger(); a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=100))
    l.append(EventType.AGENT_REGISTERED, a); l.append(EventType.TRANSACTION_APPROVED, a)
    v, _ = l.verify_chain_integrity(); assert v

@test("Ledger Merkle proof")
def _():
    l = Ledger(); a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=100))
    l.append(EventType.AGENT_REGISTERED, a); l.append(EventType.CONTRACT_CREATED, a)
    assert l.prove_entry(0).verify()

# =============================================================================
# 12. BFT DISTRIBUTED LEDGER (8 tests)
# =============================================================================
print("\n═══ BFT DISTRIBUTED LEDGER ═══")

@test("PBFT 4-node consensus")
def _():
    net = PBFTNetwork(4)
    r = net.submit({'type': 'tx', 'amt': 100})
    assert r['committed'] and r['committed_replicas'] == 4

@test("PBFT state agreement (10 ops)")
def _():
    net = PBFTNetwork(4)
    for i in range(10): assert net.submit({'v': i})['committed']
    assert len(set(r.state_hash for r in net.replicas.values())) == 1

@test("PBFT tolerates 1 Byzantine (4 nodes)")
def _():
    net = PBFTNetwork(4); net.set_byzantine({2})
    assert net.submit({'x': 1})['committed']

@test("PBFT tolerates 2 Byzantine (7 nodes)")
def _():
    net = PBFTNetwork(7); net.set_byzantine({1, 5})
    for i in range(5): assert net.submit({'i': i})['committed']
    c = [r for rid, r in net.replicas.items() if rid not in net.byzantine]
    assert len(set(r.state_hash for r in c)) == 1

@test("PBFT rejects >f faults")
def _():
    try: n = PBFTNetwork(4); n.set_byzantine({0,1,2}); assert False
    except ValueError: pass

@test("PBFT quorum certificate valid")
def _():
    r = PBFTNetwork(4).submit({'cert': True})
    qc = r['quorum_certificate']
    assert qc['valid'] and qc['signatures'] >= qc['quorum']

@test("PBFT view change (Byzantine primary)")
def _():
    net = PBFTNetwork(4); net.set_byzantine({0})
    assert net.submit({'vc': True})['committed']

@test("DistributedLedger application layer")
def _():
    dl = DistributedLedger(4)
    assert dl.submit({'type': 'agent_registered', 'did': 'did:aeos:a', 'name': 'A'})['committed']
    assert dl.submit({'type': 'contract_created', 'contract_id': 'c1', 'val': 25000})['committed']
    assert dl.submit({'type': 'obligation_fulfilled', 'contract_id': 'c1'})['committed']
    assert dl.query('did:aeos:a')['name'] == 'A'
    assert dl.query('c1')['fulfilled'] == True
    assert dl.status()['network']['consensus_ok']

# =============================================================================
# 13. MCP SERVER (4 tests)
# =============================================================================
print("\n═══ MCP SERVER ═══")

@test("MCP initialize + list tools")
def _():
    r = handle_request({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {}})
    assert r['result']['serverInfo']['name'] == 'aeos-protocol'
    r2 = handle_request({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list', 'params': {}})
    assert len(r2['result']['tools']) == 11

@test("MCP create agent + resolve")
def _():
    r = handle_request({'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call', 'params': {
        'name': 'aeos_create_agent',
        'arguments': {'controller_did': 'did:aeos:test-corp', 'name': 'TestBot'}
    }})
    result = json.loads(r['result']['content'][0]['text'])
    assert result['did'].startswith('did:aeos:')
    assert result['registry_proof_valid']

@test("MCP contract lifecycle")
def _():
    # Create two agents
    r1 = handle_tool('aeos_create_agent', {'controller_did': 'did:c1', 'name': 'A'})
    r2 = handle_tool('aeos_create_agent', {'controller_did': 'did:c2', 'name': 'B'})
    a_did, b_did = r1['did'], r2['did']
    # Create contract
    c = handle_tool('aeos_create_contract', {'template': 'service_agreement',
        'client_did': a_did, 'provider_did': b_did, 'price': 500000, 'description': 'test'})
    cid = c['contract_id']
    # Sign both
    handle_tool('aeos_sign_contract', {'contract_id': cid, 'signer_did': a_did})
    s2 = handle_tool('aeos_sign_contract', {'contract_id': cid, 'signer_did': b_did})
    assert s2['state'] == 'ACTIVE'

@test("MCP risk assessment")
def _():
    r1 = handle_tool('aeos_create_agent', {'controller_did': 'did:risk1', 'name': 'R1'})
    r2 = handle_tool('aeos_create_agent', {'controller_did': 'did:risk2', 'name': 'R2'})
    risk = handle_tool('aeos_assess_risk', {
        'agent_did': r1['did'], 'counterparty_did': r2['did'], 'value': 50000
    })
    assert 'risk_score' in risk and 'approved' in risk

# =============================================================================
# 14. SETTLEMENT ENGINE (3 tests)
# =============================================================================
print("\n═══ SETTLEMENT ENGINE ═══")

@test("Settlement engine initialization")
def _():
    engine = StripeSettlementEngine(
        secret_key='sk_test_fake_for_testing_only',
        test_mode=True
    )
    s = engine.status()
    assert s['engine'] == 'stripe'
    assert s['test_mode'] == True
    assert s['active_settlements'] == 0

@test("Settlement record tracking")
def _():
    engine = StripeSettlementEngine(secret_key='sk_test_fake', test_mode=True)
    record = SettlementRecord(
        record_id='stl_test', contract_id='c-001',
        stripe_payment_intent_id='pi_test',
        amount=25000, currency='usd', status='authorized',
        payer_did='did:aeos:alice', payee_did='did:aeos:bob',
        created_at=time.time()
    )
    engine.records[record.record_id] = record
    engine.contract_to_pi['c-001'] = 'pi_test'
    assert engine.get_settlement('c-001')['status'] == 'authorized'
    assert len(engine.list_settlements()) == 1
    assert engine.status()['total_escrowed'] == 25000

@test("Settlement rejects live key in test mode")
def _():
    try:
        StripeSettlementEngine(secret_key='sk_live_xxx', test_mode=True)
        assert False
    except ValueError as e:
        assert 'live key' in str(e).lower()

# =============================================================================
# 15. BULLETPROOFS FFI (4 tests — works with Rust binary OR Python fallback)
# =============================================================================
print("\n═══ BULLETPROOFS FFI ═══")

@test("Bulletproofs prove + verify")
def _():
    engine = BulletproofsEngine()
    result = engine.prove(100_000, 64, "authority_bound")
    assert result['success']
    v = engine.verify(result['proof'])
    assert v['valid']
    if engine.is_zk:
        print("    (using Rust — true zero-knowledge)")

@test("Bulletproofs tampered proof rejected")
def _():
    engine = BulletproofsEngine()
    result = engine.prove(50000, 32, "test")
    bad_proof = dict(result['proof'])
    bad_proof.pop('_proof_object', None)
    if engine.is_zk:
        # Rust path: tamper the proof bytes
        bp = list(bad_proof.get('proof_bytes', []))
        if bp:
            bp[0] = (bp[0] + 1) % 256
            bad_proof['proof_bytes'] = bp
    else:
        # Python fallback: tamper the challenge
        bad_proof['challenge'] = '00' * 32
    v = engine.verify(bad_proof)
    assert not v['valid']

@test("Bulletproofs batch verify")
def _():
    engine = BulletproofsEngine()
    r1 = engine.prove(50000, 32, "d1")
    r2 = engine.prove(99999, 32, "d2")
    assert engine.verify(r1['proof'])['valid']
    assert engine.verify(r2['proof'])['valid']
    batch = engine.batch_verify([r1['proof'], r2['proof']])
    assert batch['all_valid']

@test("Bulletproofs ZK status reporting")
def _():
    engine = BulletproofsEngine()
    s = engine.status()
    if engine.is_zk:
        assert s.get('zk') == True or s.get('engine') == 'rust_bulletproofs'
    else:
        assert s.get('zk') == False
        assert 'fallback' in s.get('engine', '')

# =============================================================================
# 16. REST API SERVER (4 tests — skipped if FastAPI not installed)
# =============================================================================
print("\n═══ REST API SERVER ═══")

try:
    from aeos.server import app
    from starlette.testclient import TestClient
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

if HAS_FASTAPI:
    @test("Server health endpoint")
    def _():
        client = TestClient(app)
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()['status'] == 'ok'

    @test("Server create agent endpoint")
    def _():
        client = TestClient(app)
        r = client.post("/agents", json={"controller_did": "did:aeos:test-company"})
        assert r.status_code in (200, 201)
        assert r.json()['did'].startswith('did:aeos:')

    @test("Server contract creation endpoint")
    def _():
        client = TestClient(app)
        a1 = client.post("/agents", json={"controller_did": "did:c1"}).json()
        a2 = client.post("/agents", json={"controller_did": "did:c2"}).json()
        r = client.post("/contracts", json={
            "template": "service_agreement",
            "client_did": a1['did'], "provider_did": a2['did'],
            "description": "API test", "price": 100000
        })
        assert r.status_code in (200, 201)
        assert 'contract_id' in r.json()

    @test("Server risk assessment endpoint")
    def _():
        client = TestClient(app)
        a1 = client.post("/agents", json={"controller_did": "did:r1"}).json()
        a2 = client.post("/agents", json={"controller_did": "did:r2"}).json()
        r = client.post("/risk/assess", json={
            "agent_did": a1['did'], "counterparty_did": a2['did'],
            "value": 50000, "tx_type": "purchase"
        })
        assert r.status_code == 200
        assert 'risk_score' in r.json()
else:
    skipped = 4
    print(f"  ⊘ Skipped 4 server tests (FastAPI not installed — pip install phanes[server])")

# =============================================================================
# 17. PERSISTENCE ENGINE (5 tests)
# =============================================================================
print("\n═══ PERSISTENCE ENGINE ═══")

from aeos.persistence import StorageEngine

@test("Persistence: agent put+get+revoke")
def _():
    DB = '/tmp/aeos_test_suite.db'
    if os.path.exists(DB): os.remove(DB)
    db = StorageEngine(DB)
    db.put_agent({'did': 'did:aeos:test1', 'controller_did': 'did:corp',
        'agent_type': 'AUTONOMOUS', 'capabilities': ['transact'],
        'bounds': {'max_tx': 100000}, 'public_key': 'abc', 'created_at': time.time()})
    a = db.get_agent('did:aeos:test1')
    assert a and a['did'] == 'did:aeos:test1'
    db.revoke_agent('did:aeos:test1', 'test')
    a2 = db.get_agent('did:aeos:test1')
    assert a2['revoked_at'] is not None
    db.close(); os.remove(DB)

@test("Persistence: contract CRUD + state update")
def _():
    DB = '/tmp/aeos_test_suite2.db'
    if os.path.exists(DB): os.remove(DB)
    db = StorageEngine(DB)
    db.put_contract({'contract_id': 'c-test', 'template': 'service',
        'parties': ['a', 'b'], 'terms': {'price': 5000}, 'terms_hash': 'h1',
        'state': 'PROPOSED', 'escrow_total': 5000, 'obligations': [],
        'created_at': time.time()})
    c = db.get_contract('c-test')
    assert c['state'] == 'PROPOSED'
    db.update_contract_state('c-test', 'ACTIVE', activated_at=time.time())
    c2 = db.get_contract('c-test')
    assert c2['state'] == 'ACTIVE'
    db.close(); os.remove(DB)

@test("Persistence: ledger append + chain verify")
def _():
    DB = '/tmp/aeos_test_suite3.db'
    if os.path.exists(DB): os.remove(DB)
    db = StorageEngine(DB)
    from aeos.crypto_primitives import sha256 as _sha256
    prev = '0' * 64
    for i in range(5):
        h = _sha256(f'e{i}{prev}'.encode()).hex()
        db.append_ledger('TEST', 'did:a', f's{i}', {'i': i}, h, prev)
        prev = h
    assert db.ledger_count() == 5
    ok, _ = db.verify_ledger_chain()
    assert ok
    db.close(); os.remove(DB)

@test("Persistence: settlement + risk profile")
def _():
    DB = '/tmp/aeos_test_suite4.db'
    if os.path.exists(DB): os.remove(DB)
    db = StorageEngine(DB)
    db.put_contract({'contract_id': 'c1', 'template': 't', 'parties': [],
        'terms': {}, 'terms_hash': 'h', 'obligations': [], 'created_at': time.time()})
    db.put_settlement({'record_id': 'stl1', 'contract_id': 'c1',
        'stripe_pi_id': 'pi_test', 'amount': 25000, 'status': 'authorized',
        'payer_did': 'did:a', 'payee_did': 'did:b', 'created_at': time.time()})
    assert db.get_settlement('c1')['amount'] == 25000
    db.put_agent({'did': 'did:a', 'controller_did': 'did:c', 'agent_type': 'A',
        'capabilities': [], 'bounds': {}, 'public_key': 'x', 'created_at': time.time()})
    db.put_risk_profile({'agent_did': 'did:a', 'transaction_count': 10,
        'total_volume': 50000, 'profile_data': {'x': 1}})
    assert db.get_risk_profile('did:a')['transaction_count'] == 10
    db.close(); os.remove(DB)

@test("Persistence: stats + WAL mode")
def _():
    DB = '/tmp/aeos_test_suite5.db'
    if os.path.exists(DB): os.remove(DB)
    db = StorageEngine(DB)
    db.put_agent({'did': 'did:s1', 'controller_did': 'did:c', 'agent_type': 'A',
        'capabilities': [], 'bounds': {}, 'public_key': 'x', 'created_at': time.time()})
    db.put_contract({'contract_id': 'c1', 'template': 't', 'parties': [],
        'terms': {}, 'terms_hash': 'h', 'obligations': [], 'created_at': time.time()})
    s = db.stats()
    assert s['agents'] == 1 and s['contracts'] == 1 and s['db_size_bytes'] > 0
    db.close(); os.remove(DB)

# =============================================================================
# 18. USDC ON-CHAIN SETTLEMENT (5 tests)
# =============================================================================
print("\n═══ USDC ON-CHAIN SETTLEMENT ═══")

from aeos.usdc_settlement import (
    USDCSettlementEngine, Chain, EscrowStatus,
    derive_escrow_address, usdc_to_atomic, atomic_to_usdc,
    encode_transfer, encode_approve, USDC_ADDRESSES, CHAIN_ID
)

@test("USDC atomic conversion + chain config")
def _():
    assert usdc_to_atomic(25000.00) == 25_000_000_000
    assert atomic_to_usdc(25_000_000_000) == 25000.00
    assert CHAIN_ID[Chain.BASE] == 8453
    assert CHAIN_ID[Chain.ETHEREUM] == 1
    assert len(USDC_ADDRESSES) == 6

@test("Deterministic escrow address derivation")
def _():
    a1 = derive_escrow_address('c-001', Chain.BASE)
    a2 = derive_escrow_address('c-001', Chain.BASE)
    a3 = derive_escrow_address('c-002', Chain.BASE)
    assert a1 == a2  # deterministic
    assert a1 != a3  # different contract = different address
    assert a1.startswith('0x') and len(a1) == 42

@test("ABI encoding (transfer, approve, transferFrom)")
def _():
    t = encode_transfer('0x' + 'ab' * 20, 1000000)
    assert t.startswith('0xa9059cbb') and len(t) == 2 + 8 + 64 + 64
    a = encode_approve('0x' + 'cd' * 20, 5000000)
    assert a.startswith('0x095ea7b3')

@test("USDC escrow lifecycle (create → lock → release)")
def _():
    engine = USDCSettlementEngine(chain=Chain.BASE)
    escrow = engine.create_escrow('c-001', 25000.00,
        '0x' + 'aa' * 20, '0x' + 'bb' * 20,
        payer_did='did:alice', payee_did='did:bob', deadline_hours=24)
    assert escrow.status == EscrowStatus.PENDING
    assert escrow.amount_usd == 25000.00
    # Build transactions
    approve_tx = engine.build_approve_tx(escrow)
    assert approve_tx.to == USDC_ADDRESSES[Chain.BASE]
    lock_tx = engine.build_lock_tx(escrow)
    assert '23b872dd' in lock_tx.data  # transferFrom
    release_tx = engine.build_release_tx(escrow)
    assert 'a9059cbb' in release_tx.data  # transfer
    # State transitions
    engine.mark_locked(escrow.escrow_id, '0xtx1')
    assert escrow.status == EscrowStatus.LOCKED
    engine.mark_released(escrow.escrow_id, '0xtx2')
    assert escrow.status == EscrowStatus.RELEASED

@test("USDC multi-chain support")
def _():
    for chain in [Chain.ETHEREUM, Chain.BASE, Chain.ARBITRUM, Chain.POLYGON]:
        e = USDCSettlementEngine(chain=chain)
        esc = e.create_escrow('test', 100.0, '0x' + 'aa' * 20, '0x' + 'bb' * 20)
        assert esc.chain == chain
        assert e.status()['chain'] == chain.value

@test("USDC ChainClient requires web3")
def _():
    from aeos.usdc_settlement import ChainClient
    try:
        client = ChainClient(Chain.BASE_SEPOLIA)
        # If web3 is installed, this works — that's fine
    except ImportError as e:
        assert 'web3' in str(e).lower()

# =============================================================================
# Ed25519 SIGNATURE CROSS-MODULE (1 test)
# =============================================================================
print("\n═══ CROSS-MODULE INTEGRATION ═══")

@test("Ed25519 signatures consistent across modules")
def _():
    k1 = KeyPair.generate(purpose='cross-test')
    k2 = KeyPair.generate(purpose='cross-test-2')
    # PBFT message signing
    m = PBFTMessage(MessageType.PREPARE, 0, 1, 0, 'abc123')
    m.sign(k1)
    assert m.verify(k1) and not m.verify(k2)
    # Identity signing
    sig = k1.sign(b"identity_data")
    assert k1.verify(sig, b"identity_data")

# =============================================================================
# RESULTS
# =============================================================================
skipped_count = 0 if HAS_FASTAPI else 4
total = passed + failed
print(f"\n{'='*70}")
if skipped_count:
    print(f"  RESULTS: {passed} passed, {failed} failed, {skipped_count} skipped, {total + skipped_count} total")
else:
    print(f"  RESULTS: {passed} passed, {failed} failed, {total} total")
print(f"{'='*70}")
if errors:
    print("\nFAILED:")
    for n, tb in errors: print(f"\n--- {n} ---\n{tb}")
sys.exit(1 if failed else 0)
