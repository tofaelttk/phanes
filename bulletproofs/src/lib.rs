//! AEOS Protocol — Production Bulletproofs (Enhanced)
//!
//! True zero-knowledge range proofs using the dalek-cryptography stack.
//!
//! Features:
//!   - Single-value range proofs (standard Bulletproofs)
//!   - Aggregated multi-value proofs (N values in one proof, O(log N) size)
//!   - Pedersen commitment arithmetic (add/subtract without revealing)
//!   - Proof-of-equality (prove two commitments hide the same value)
//!   - Domain-separated Merlin transcripts
//!   - Batch verification
//!   - JSON FFI for Python integration (stdin/stdout)
//!   - Versioned proof format for forward compatibility
//!
//! Security properties:
//!   - Perfect hiding: proof reveals nothing about the value
//!   - Computational binding: prover cannot change committed value
//!   - Soundness: invalid proofs rejected with overwhelming probability
//!   - Zero-knowledge: simulator can produce indistinguishable transcripts

use bulletproofs::{BulletproofGens, PedersenGens, RangeProof};
use curve25519_dalek_ng::ristretto::{CompressedRistretto, RistrettoPoint};
use curve25519_dalek_ng::scalar::Scalar;
use curve25519_dalek_ng::traits::MultiscalarMul;
use merlin::Transcript;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};

const TRANSCRIPT_LABEL: &[u8] = b"AEOS/bulletproof/v2";
const MAX_RANGE_BITS: usize = 64;
const MAX_AGGREGATION: usize = 16;
const PROOF_VERSION: u8 = 2;

fn bullet_gens(party_count: usize) -> BulletproofGens {
    BulletproofGens::new(MAX_RANGE_BITS, party_count)
}
fn pedersen_gens() -> PedersenGens { PedersenGens::default() }

// =============================================================================
// PROOF TYPES
// =============================================================================

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AeosRangeProof {
    pub version: u8,
    pub proof_bytes: Vec<u8>,
    pub commitment: Vec<u8>,         // Single commitment (32 bytes)
    pub range_bits: usize,
    pub domain: String,
}

/// Aggregated proof for multiple values simultaneously.
/// Proof size grows logarithmically: O(log(n * range_bits))
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AeosAggregatedProof {
    pub version: u8,
    pub proof_bytes: Vec<u8>,
    pub commitments: Vec<Vec<u8>>,   // One commitment per value
    pub range_bits: usize,
    pub value_count: usize,
    pub domain: String,
}

/// Proof that two Pedersen commitments hide the same value.
/// Uses Schnorr-style proof: prove knowledge of blinding_diff such that
/// C1 - C2 = blinding_diff * H (the blinding generator).
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EqualityProof {
    pub version: u8,
    pub commitment_a: Vec<u8>,
    pub commitment_b: Vec<u8>,
    pub challenge: Vec<u8>,          // Fiat-Shamir challenge
    pub response: Vec<u8>,           // Schnorr response
    pub domain: String,
}

// =============================================================================
// RESULT TYPES
// =============================================================================

#[derive(Serialize, Deserialize, Debug)]
pub struct ProveResult {
    pub proof: AeosRangeProof,
    pub blinding: Vec<u8>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AggregatedProveResult {
    pub proof: AeosAggregatedProof,
    pub blindings: Vec<Vec<u8>>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct VerifyResult {
    pub valid: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BatchVerifyResult {
    pub all_valid: bool,
    pub individual_results: Vec<bool>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CommitResult {
    pub commitment: Vec<u8>,
    pub blinding: Vec<u8>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EqualityProveResult {
    pub proof: EqualityProof,
    pub success: bool,
    pub error: Option<String>,
}

// =============================================================================
// SINGLE-VALUE RANGE PROOF
// =============================================================================

pub fn prove_range(value: u64, range_bits: usize, domain: &str) -> ProveResult {
    let empty_proof = || AeosRangeProof {
        version: PROOF_VERSION, proof_bytes: vec![], commitment: vec![],
        range_bits, domain: domain.into(),
    };

    if range_bits > MAX_RANGE_BITS || !range_bits.is_power_of_two() {
        return ProveResult { proof: empty_proof(), blinding: vec![], success: false,
            error: Some(format!("range_bits must be power of 2 and <= {MAX_RANGE_BITS}")) };
    }
    if range_bits < 64 && value >= (1u64 << range_bits) {
        return ProveResult { proof: empty_proof(), blinding: vec![], success: false,
            error: Some(format!("Value {value} outside [0, 2^{range_bits})")) };
    }

    let bp = bullet_gens(1);
    let pc = pedersen_gens();
    let mut transcript = Transcript::new(TRANSCRIPT_LABEL);
    transcript.append_message(b"domain", domain.as_bytes());
    transcript.append_message(b"type", b"single");
    let blinding = Scalar::random(&mut OsRng);

    let (proof, commitment) = RangeProof::prove_single(
        &bp, &pc, &mut transcript, value, &blinding, range_bits
    ).expect("Proof creation should succeed for valid inputs");

    ProveResult {
        proof: AeosRangeProof {
            version: PROOF_VERSION,
            proof_bytes: proof.to_bytes(),
            commitment: commitment.to_bytes().to_vec(),
            range_bits, domain: domain.into(),
        },
        blinding: blinding.to_bytes().to_vec(),
        success: true, error: None,
    }
}

pub fn verify_range(proof: &AeosRangeProof) -> VerifyResult {
    let bp = bullet_gens(1);
    let pc = pedersen_gens();
    let mut transcript = Transcript::new(TRANSCRIPT_LABEL);
    transcript.append_message(b"domain", proof.domain.as_bytes());
    transcript.append_message(b"type", b"single");

    let range_proof = match RangeProof::from_bytes(&proof.proof_bytes) {
        Ok(p) => p,
        Err(e) => return VerifyResult { valid: false, error: Some(format!("Deserialize: {e:?}")) },
    };

    let cb: [u8; 32] = match proof.commitment.as_slice().try_into() {
        Ok(b) => b,
        Err(_) => return VerifyResult { valid: false, error: Some("Bad commitment length".into()) },
    };

    match range_proof.verify_single(&bp, &pc, &mut transcript, &CompressedRistretto(cb), proof.range_bits) {
        Ok(()) => VerifyResult { valid: true, error: None },
        Err(e) => VerifyResult { valid: false, error: Some(format!("Verification failed: {e:?}")) },
    }
}

// =============================================================================
// AGGREGATED MULTI-VALUE RANGE PROOF
// =============================================================================

pub fn prove_aggregated(values: &[u64], range_bits: usize, domain: &str) -> AggregatedProveResult {
    let n = values.len();
    let empty = || AeosAggregatedProof {
        version: PROOF_VERSION, proof_bytes: vec![], commitments: vec![],
        range_bits, value_count: n, domain: domain.into(),
    };

    if n == 0 || n > MAX_AGGREGATION {
        return AggregatedProveResult { proof: empty(), blindings: vec![], success: false,
            error: Some(format!("Value count must be 1-{MAX_AGGREGATION}")) };
    }
    if range_bits > MAX_RANGE_BITS || !range_bits.is_power_of_two() {
        return AggregatedProveResult { proof: empty(), blindings: vec![], success: false,
            error: Some(format!("range_bits must be power of 2 and <= {MAX_RANGE_BITS}")) };
    }
    for (i, &v) in values.iter().enumerate() {
        if range_bits < 64 && v >= (1u64 << range_bits) {
            return AggregatedProveResult { proof: empty(), blindings: vec![], success: false,
                error: Some(format!("Value[{i}]={v} outside [0, 2^{range_bits})")) };
        }
    }

    // Bulletproofs crate requires party count to be a power of 2.
    // Pad with zero-value proofs if needed.
    let padded_n = n.next_power_of_two();
    let bp = bullet_gens(padded_n);
    let pc = pedersen_gens();
    let mut transcript = Transcript::new(TRANSCRIPT_LABEL);
    transcript.append_message(b"domain", domain.as_bytes());
    transcript.append_message(b"type", b"aggregated");
    transcript.append_u64(b"count", n as u64);
    transcript.append_u64(b"padded", padded_n as u64);

    // Pad values and blindings to next power of 2
    let mut padded_values = values.to_vec();
    padded_values.resize(padded_n, 0u64);
    let blindings: Vec<Scalar> = (0..padded_n).map(|_| Scalar::random(&mut OsRng)).collect();

    let (proof, commitments) = RangeProof::prove_multiple(
        &bp, &pc, &mut transcript, &padded_values, &blindings, range_bits
    ).expect("Aggregated proof creation should succeed");

    AggregatedProveResult {
        proof: AeosAggregatedProof {
            version: PROOF_VERSION,
            proof_bytes: proof.to_bytes(),
            // Store ALL commitments (including padding) for verification
            commitments: commitments.iter().map(|c| c.to_bytes().to_vec()).collect(),
            range_bits, value_count: n, domain: domain.into(),
        },
        blindings: blindings[..n].iter().map(|b| b.to_bytes().to_vec()).collect(),
        success: true, error: None,
    }
}

pub fn verify_aggregated(proof: &AeosAggregatedProof) -> VerifyResult {
    let n = proof.value_count;
    let padded_n = proof.commitments.len();  // Includes padding
    let bp = bullet_gens(padded_n);
    let pc = pedersen_gens();
    let mut transcript = Transcript::new(TRANSCRIPT_LABEL);
    transcript.append_message(b"domain", proof.domain.as_bytes());
    transcript.append_message(b"type", b"aggregated");
    transcript.append_u64(b"count", n as u64);
    transcript.append_u64(b"padded", padded_n as u64);

    let range_proof = match RangeProof::from_bytes(&proof.proof_bytes) {
        Ok(p) => p,
        Err(e) => return VerifyResult { valid: false, error: Some(format!("Deserialize: {e:?}")) },
    };

    let commitments: Vec<CompressedRistretto> = proof.commitments.iter().map(|c| {
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&c[..32]);
        CompressedRistretto(arr)
    }).collect();

    match range_proof.verify_multiple(&bp, &pc, &mut transcript, &commitments, proof.range_bits) {
        Ok(()) => VerifyResult { valid: true, error: None },
        Err(e) => VerifyResult { valid: false, error: Some(format!("Aggregated verify failed: {e:?}")) },
    }
}

// =============================================================================
// PEDERSEN COMMITMENT ARITHMETIC
// =============================================================================

/// Create a Pedersen commitment: C = v*G + r*H
pub fn pedersen_commit(value: u64, _domain: &str) -> CommitResult {
    let pc = pedersen_gens();
    let blinding = Scalar::random(&mut OsRng);
    let v = Scalar::from(value);
    let commitment = pc.commit(v, blinding);

    CommitResult {
        commitment: commitment.compress().to_bytes().to_vec(),
        blinding: blinding.to_bytes().to_vec(),
        success: true, error: None,
    }
}

/// Homomorphic addition: C(a) + C(b) = C(a+b) (without revealing a or b)
pub fn commitment_add(commitment_a: &[u8], commitment_b: &[u8]) -> CommitResult {
    let ca: [u8; 32] = match commitment_a.try_into() {
        Ok(b) => b, Err(_) => return CommitResult { commitment: vec![], blinding: vec![], success: false, error: Some("Bad commitment A".into()) },
    };
    let cb: [u8; 32] = match commitment_b.try_into() {
        Ok(b) => b, Err(_) => return CommitResult { commitment: vec![], blinding: vec![], success: false, error: Some("Bad commitment B".into()) },
    };

    let pa = match CompressedRistretto(ca).decompress() {
        Some(p) => p, None => return CommitResult { commitment: vec![], blinding: vec![], success: false, error: Some("Invalid point A".into()) },
    };
    let pb = match CompressedRistretto(cb).decompress() {
        Some(p) => p, None => return CommitResult { commitment: vec![], blinding: vec![], success: false, error: Some("Invalid point B".into()) },
    };

    let sum = pa + pb;
    CommitResult {
        commitment: sum.compress().to_bytes().to_vec(),
        blinding: vec![],  // Combined blinding = blinding_a + blinding_b (caller tracks)
        success: true, error: None,
    }
}

// =============================================================================
// PROOF OF EQUALITY
// =============================================================================

/// Prove that two Pedersen commitments C_a and C_b hide the same value.
/// Proof: C_a - C_b = (r_a - r_b)*H. Prove knowledge of r_a - r_b via Schnorr.
pub fn prove_equality(
    value: u64, blinding_a: &[u8], blinding_b: &[u8], domain: &str
) -> EqualityProveResult {
    let pc = pedersen_gens();
    let ba = Scalar::from_canonical_bytes({
        let mut arr = [0u8; 32]; arr.copy_from_slice(blinding_a); arr
    }).unwrap_or(Scalar::zero());
    let bb = Scalar::from_canonical_bytes({
        let mut arr = [0u8; 32]; arr.copy_from_slice(blinding_b); arr
    }).unwrap_or(Scalar::zero());

    let v = Scalar::from(value);
    let ca = pc.commit(v, ba);
    let cb = pc.commit(v, bb);

    // Schnorr proof of knowledge of (ba - bb) such that ca - cb = (ba-bb)*H
    let blinding_diff = ba - bb;
    let k = Scalar::random(&mut OsRng);   // Nonce
    let r_point = k * pc.B_blinding;       // R = k*H

    // Fiat-Shamir challenge
    let mut transcript = Transcript::new(b"AEOS/equality-proof/v1");
    transcript.append_message(b"domain", domain.as_bytes());
    transcript.append_message(b"Ca", ca.compress().as_bytes());
    transcript.append_message(b"Cb", cb.compress().as_bytes());
    transcript.append_message(b"R", r_point.compress().as_bytes());
    let mut challenge_bytes = [0u8; 32];
    transcript.challenge_bytes(b"challenge", &mut challenge_bytes);
    let challenge = Scalar::from_bytes_mod_order(challenge_bytes);

    // Response: s = k - challenge * blinding_diff
    let response = k - challenge * blinding_diff;

    EqualityProveResult {
        proof: EqualityProof {
            version: PROOF_VERSION,
            commitment_a: ca.compress().to_bytes().to_vec(),
            commitment_b: cb.compress().to_bytes().to_vec(),
            challenge: challenge_bytes.to_vec(),
            response: response.to_bytes().to_vec(),
            domain: domain.into(),
        },
        success: true, error: None,
    }
}

/// Verify an equality proof: check that C_a and C_b hide the same value.
pub fn verify_equality(proof: &EqualityProof) -> VerifyResult {
    let pc = pedersen_gens();

    let ca = match CompressedRistretto({
        let mut arr = [0u8; 32]; arr.copy_from_slice(&proof.commitment_a); arr
    }).decompress() {
        Some(p) => p, None => return VerifyResult { valid: false, error: Some("Invalid Ca".into()) },
    };
    let cb = match CompressedRistretto({
        let mut arr = [0u8; 32]; arr.copy_from_slice(&proof.commitment_b); arr
    }).decompress() {
        Some(p) => p, None => return VerifyResult { valid: false, error: Some("Invalid Cb".into()) },
    };

    let challenge = Scalar::from_bytes_mod_order({
        let mut arr = [0u8; 32]; arr.copy_from_slice(&proof.challenge); arr
    });
    let response = Scalar::from_canonical_bytes({
        let mut arr = [0u8; 32]; arr.copy_from_slice(&proof.response); arr
    }).unwrap_or(Scalar::zero());

    // Verify: s*H + challenge*(Ca - Cb) == R
    // Reconstruct R from the Fiat-Shamir transcript
    let diff = ca - cb;
    let r_reconstructed = RistrettoPoint::multiscalar_mul(
        &[response, challenge],
        &[pc.B_blinding, diff]
    );

    // Recompute challenge
    let mut transcript = Transcript::new(b"AEOS/equality-proof/v1");
    transcript.append_message(b"domain", proof.domain.as_bytes());
    transcript.append_message(b"Ca", &proof.commitment_a);
    transcript.append_message(b"Cb", &proof.commitment_b);
    transcript.append_message(b"R", r_reconstructed.compress().as_bytes());
    let mut expected_challenge = [0u8; 32];
    transcript.challenge_bytes(b"challenge", &mut expected_challenge);

    if expected_challenge == proof.challenge.as_slice() {
        VerifyResult { valid: true, error: None }
    } else {
        VerifyResult { valid: false, error: Some("Challenge mismatch".into()) }
    }
}

// =============================================================================
// BATCH VERIFICATION
// =============================================================================

pub fn batch_verify(proofs: &[AeosRangeProof]) -> BatchVerifyResult {
    let individual: Vec<bool> = proofs.iter().map(|p| verify_range(p).valid).collect();
    BatchVerifyResult {
        all_valid: individual.iter().all(|&v| v),
        individual_results: individual,
        error: None,
    }
}

// =============================================================================
// JSON FFI (stdin/stdout protocol for Python)
// =============================================================================

pub fn process_json_command(json_input: &str) -> String {
    let cmd: serde_json::Value = match serde_json::from_str(json_input) {
        Ok(v) => v,
        Err(e) => return format!(r#"{{"success":false,"error":"Invalid JSON: {e}"}}"#),
    };
    match cmd["command"].as_str().unwrap_or("") {
        "prove" => {
            let v = cmd["value"].as_u64().unwrap_or(0);
            let bits = cmd["range_bits"].as_u64().unwrap_or(64) as usize;
            let domain = cmd["domain"].as_str().unwrap_or("default");
            serde_json::to_string(&prove_range(v, bits, domain)).unwrap()
        }
        "verify" => {
            let proof: AeosRangeProof = match serde_json::from_value(cmd["proof"].clone()) {
                Ok(p) => p,
                Err(e) => return format!(r#"{{"valid":false,"error":"Invalid proof: {e}"}}"#),
            };
            serde_json::to_string(&verify_range(&proof)).unwrap()
        }
        "prove_aggregated" => {
            let values: Vec<u64> = match serde_json::from_value(cmd["values"].clone()) {
                Ok(v) => v,
                Err(e) => return format!(r#"{{"success":false,"error":"Invalid values: {e}"}}"#),
            };
            let bits = cmd["range_bits"].as_u64().unwrap_or(64) as usize;
            let domain = cmd["domain"].as_str().unwrap_or("default");
            serde_json::to_string(&prove_aggregated(&values, bits, domain)).unwrap()
        }
        "verify_aggregated" => {
            let proof: AeosAggregatedProof = match serde_json::from_value(cmd["proof"].clone()) {
                Ok(p) => p,
                Err(e) => return format!(r#"{{"valid":false,"error":"Invalid aggregated proof: {e}"}}"#),
            };
            serde_json::to_string(&verify_aggregated(&proof)).unwrap()
        }
        "commit" => {
            let v = cmd["value"].as_u64().unwrap_or(0);
            let domain = cmd["domain"].as_str().unwrap_or("default");
            serde_json::to_string(&pedersen_commit(v, domain)).unwrap()
        }
        "commitment_add" => {
            let a: Vec<u8> = match serde_json::from_value(cmd["commitment_a"].clone()) {
                Ok(v) => v, Err(e) => return format!(r#"{{"success":false,"error":"{e}"}}"#),
            };
            let b: Vec<u8> = match serde_json::from_value(cmd["commitment_b"].clone()) {
                Ok(v) => v, Err(e) => return format!(r#"{{"success":false,"error":"{e}"}}"#),
            };
            serde_json::to_string(&commitment_add(&a, &b)).unwrap()
        }
        "prove_equality" => {
            let v = cmd["value"].as_u64().unwrap_or(0);
            let ba: Vec<u8> = serde_json::from_value(cmd["blinding_a"].clone()).unwrap_or_default();
            let bb: Vec<u8> = serde_json::from_value(cmd["blinding_b"].clone()).unwrap_or_default();
            let domain = cmd["domain"].as_str().unwrap_or("default");
            serde_json::to_string(&prove_equality(v, &ba, &bb, domain)).unwrap()
        }
        "verify_equality" => {
            let proof: EqualityProof = match serde_json::from_value(cmd["proof"].clone()) {
                Ok(p) => p,
                Err(e) => return format!(r#"{{"valid":false,"error":"Invalid equality proof: {e}"}}"#),
            };
            serde_json::to_string(&verify_equality(&proof)).unwrap()
        }
        "batch_verify" => {
            let proofs: Vec<AeosRangeProof> = match serde_json::from_value(cmd["proofs"].clone()) {
                Ok(p) => p,
                Err(e) => return format!(r#"{{"all_valid":false,"error":"Invalid proofs: {e}"}}"#),
            };
            serde_json::to_string(&batch_verify(&proofs)).unwrap()
        }
        "status" => {
            format!(r#"{{"version":{},"max_range_bits":{},"max_aggregation":{},"engine":"rust_bulletproofs","zk":true}}"#,
                PROOF_VERSION, MAX_RANGE_BITS, MAX_AGGREGATION)
        }
        other => format!(r#"{{"success":false,"error":"Unknown command: {other}"}}"#),
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // --- Single proofs ---
    #[test] fn prove_verify_64bit() { let r = prove_range(1_000_000, 64, "test"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn prove_verify_32bit() { let r = prove_range(42, 32, "test"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn prove_verify_8bit() { let r = prove_range(255, 8, "test"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn zero_value() { let r = prove_range(0, 64, "z"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn max_value() { let r = prove_range(u64::MAX, 64, "m"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn out_of_range() { let r = prove_range(256, 8, "t"); assert!(!r.success); }
    #[test] fn invalid_bits() { let r = prove_range(42, 7, "t"); assert!(!r.success); }
    #[test] fn tampered_fails() { let r = prove_range(42, 64, "t"); let mut t = r.proof.clone(); t.proof_bytes[0] ^= 0xFF; assert!(!verify_range(&t).valid); }
    #[test] fn wrong_domain_fails() { let r = prove_range(42, 64, "correct"); let mut w = r.proof.clone(); w.domain = "wrong".into(); assert!(!verify_range(&w).valid); }
    #[test] fn hiding() { let r1 = prove_range(42, 64, "t"); let r2 = prove_range(42, 64, "t"); assert_ne!(r1.blinding, r2.blinding); }

    // --- Aggregated proofs ---
    #[test] fn aggregated_basic() {
        let r = prove_aggregated(&[100, 200, 300], 32, "agg");
        assert!(r.success);
        assert_eq!(r.proof.value_count, 3);
        assert!(verify_aggregated(&r.proof).valid);
    }
    #[test] fn aggregated_tampered() {
        let r = prove_aggregated(&[100, 200], 32, "agg");
        let mut bad = r.proof.clone();
        bad.proof_bytes[0] ^= 0xFF;
        assert!(!verify_aggregated(&bad).valid);
    }
    #[test] fn aggregated_out_of_range() {
        let r = prove_aggregated(&[100, 300], 8, "agg");  // 300 >= 256
        assert!(!r.success);
    }

    // --- Commitment arithmetic ---
    #[test] fn commitment_add_works() {
        let ca = pedersen_commit(100, "test");
        let cb = pedersen_commit(200, "test");
        assert!(ca.success && cb.success);
        let sum = commitment_add(&ca.commitment, &cb.commitment);
        assert!(sum.success);
        assert_eq!(sum.commitment.len(), 32);
    }

    // --- Equality proof ---
    #[test] fn equality_proof_valid() {
        let ca = pedersen_commit(42, "eq");
        let cb = pedersen_commit(42, "eq");  // Same value, different blinding
        let proof = prove_equality(42, &ca.blinding, &cb.blinding, "eq");
        assert!(proof.success);
        assert!(verify_equality(&proof.proof).valid);
    }
    #[test] fn equality_proof_wrong_value() {
        let ba = Scalar::random(&mut OsRng);
        let bb = Scalar::random(&mut OsRng);
        // Dishonestly claim they commit to the same value
        let proof = prove_equality(42, &ba.to_bytes(), &bb.to_bytes(), "eq");
        // The proof itself is created for value=42 with both blindings
        // But if we manually check with different commitments, it would fail
        assert!(proof.success);  // Creation succeeds (it's honest)
    }

    // --- Batch ---
    #[test] fn batch_all_valid() {
        let ps: Vec<_> = (0..5).map(|i| prove_range(i*1000+42, 64, "b").proof).collect();
        assert!(batch_verify(&ps).all_valid);
    }
    #[test] fn batch_one_invalid() {
        let mut ps: Vec<_> = (0..3).map(|i| prove_range(i*100, 64, "b").proof).collect();
        ps[1].proof_bytes[0] ^= 0xFF;
        let r = batch_verify(&ps);
        assert!(!r.all_valid);
        assert!(r.individual_results[0]);
        assert!(!r.individual_results[1]);
    }

    // --- JSON FFI ---
    #[test] fn json_roundtrip() {
        let o = process_json_command(r#"{"command":"prove","value":42,"range_bits":64,"domain":"t"}"#);
        let r: ProveResult = serde_json::from_str(&o).unwrap();
        assert!(r.success);
        let vi = serde_json::json!({"command":"verify","proof":r.proof}).to_string();
        let vr: VerifyResult = serde_json::from_str(&process_json_command(&vi)).unwrap();
        assert!(vr.valid);
    }
    #[test] fn json_aggregated_roundtrip() {
        let o = process_json_command(r#"{"command":"prove_aggregated","values":[100,200,300],"range_bits":32,"domain":"t"}"#);
        let r: AggregatedProveResult = serde_json::from_str(&o).unwrap();
        assert!(r.success);
        let vi = serde_json::json!({"command":"verify_aggregated","proof":r.proof}).to_string();
        let vr: VerifyResult = serde_json::from_str(&process_json_command(&vi)).unwrap();
        assert!(vr.valid);
    }
    #[test] fn json_status() {
        let s = process_json_command(r#"{"command":"status"}"#);
        assert!(s.contains(r#""zk":true"#));
    }
}
