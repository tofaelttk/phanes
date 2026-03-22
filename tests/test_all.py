#!/usr/bin/env python3
"""AEOS Protocol — Comprehensive Test Suite"""
import time, sys, json, traceback
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

@test("Range proof valid")
def _():
    p, _ = RangeProof.create(42, 8); assert p.verify_structure()

@test("Range proof rejects out-of-range")
def _():
    try: RangeProof.create(256, 8); assert False
    except ValueError: pass

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

print("\n═══ IDENTITY ═══")
@test("Agent creation + DID")
def _():
    a = AgentIdentity.create("did:c", AgentType.AUTONOMOUS, {CapabilityScope.TRANSACT}, AuthorityBounds(max_transaction_value=100))
    assert a.did.startswith("did:aeos:")

@test("Authority containment")
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

print("\n═══ THRESHOLD CRYPTO ═══")
@test("Shamir split + reconstruct")
def _():
    shares, _ = ShamirSecretSharing.split(123456789, 3, 5)
    assert ShamirSecretSharing.reconstruct(shares[:3]) == 123456789

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

@test("Value conservation")
def _():
    ch = StateChannel.open("a", "b", KeyPair.generate(), KeyPair.generate(), 3000, 7000)
    for _ in range(50):
        amt = np.random.randint(-50, 50)
        try: ch.transact(amt)
        except ValueError: pass
    assert ch.latest_state.total == 10000

print("\n═══ ML ENGINE ═══")
@test("Isolation Forest outlier detection")
def _():
    np.random.seed(42); X = np.random.randn(200, 5)
    f = IsolationForest(n_trees=50, max_samples=100); f.fit(X)
    assert f.score_single(np.array([10,10,10,10,10])) > f.score_single(X[0])

@test("Ensemble scorer builds + scores")
def _():
    s = EnsembleAnomalyScorer("did:t")
    for i in range(60):
        s.observe({'value': 1000+i*10, 'timestamp': time.time()-(60-i), 'counterparty_did': f'cp:{i%5}', 'counterparty_reputation': 0.7})
    assert s.is_trained
    r = s.observe({'value': 999999, 'timestamp': time.time(), 'counterparty_did': 'new', 'counterparty_reputation': 0.1})
    assert r['ensemble_score'] > 0

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

print(f"\n{'='*70}")
print(f"  RESULTS: {passed} passed, {failed} failed, {passed+failed} total")
print(f"{'='*70}")
if errors:
    print("\nFAILED:")
    for n, tb in errors: print(f"\n--- {n} ---\n{tb}")
sys.exit(1 if failed else 0)
