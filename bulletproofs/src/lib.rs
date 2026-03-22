//! AEOS Protocol — Production Bulletproofs
//!
//! Real Bulletproofs range proofs using the dalek-cryptography stack.
//! Provides: Pedersen commitments on Ristretto255, range proofs,
//! batch verification, and JSON FFI for Python integration.

use bulletproofs::{BulletproofGens, PedersenGens, RangeProof};
use curve25519_dalek_ng::ristretto::CompressedRistretto;
use curve25519_dalek_ng::scalar::Scalar;
use merlin::Transcript;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};

const TRANSCRIPT_LABEL: &[u8] = b"AEOS/bulletproof/v1";
const MAX_RANGE_BITS: usize = 64;

fn bullet_gens() -> BulletproofGens { BulletproofGens::new(MAX_RANGE_BITS, 1) }
fn pedersen_gens() -> PedersenGens { PedersenGens::default() }

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AeosRangeProof {
    pub proof_bytes: Vec<u8>,
    pub commitment: Vec<u8>,
    pub range_bits: usize,
    pub domain: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProveResult {
    pub proof: AeosRangeProof,
    pub blinding: Vec<u8>,
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

pub fn prove_range(value: u64, range_bits: usize, domain: &str) -> ProveResult {
    if range_bits > MAX_RANGE_BITS || !range_bits.is_power_of_two() {
        return ProveResult { proof: AeosRangeProof { proof_bytes: vec![], commitment: vec![], range_bits, domain: domain.into() }, blinding: vec![], success: false, error: Some(format!("range_bits must be power of 2 and <= {MAX_RANGE_BITS}")) };
    }
    if range_bits < 64 && value >= (1u64 << range_bits) {
        return ProveResult { proof: AeosRangeProof { proof_bytes: vec![], commitment: vec![], range_bits, domain: domain.into() }, blinding: vec![], success: false, error: Some(format!("Value {value} outside [0, 2^{range_bits})")) };
    }

    let bp = bullet_gens();
    let pc = pedersen_gens();
    let mut transcript = Transcript::new(TRANSCRIPT_LABEL);
    transcript.append_message(b"domain", domain.as_bytes());
    let blinding = Scalar::random(&mut OsRng);

    let (proof, commitment) = RangeProof::prove_single(&bp, &pc, &mut transcript, value, &blinding, range_bits)
        .expect("Proof creation should succeed for valid inputs");

    ProveResult {
        proof: AeosRangeProof { proof_bytes: proof.to_bytes(), commitment: commitment.to_bytes().to_vec(), range_bits, domain: domain.into() },
        blinding: blinding.to_bytes().to_vec(),
        success: true, error: None,
    }
}

pub fn verify_range(proof: &AeosRangeProof) -> VerifyResult {
    let bp = bullet_gens();
    let pc = pedersen_gens();
    let mut transcript = Transcript::new(TRANSCRIPT_LABEL);
    transcript.append_message(b"domain", proof.domain.as_bytes());

    let range_proof = match RangeProof::from_bytes(&proof.proof_bytes) {
        Ok(p) => p,
        Err(e) => return VerifyResult { valid: false, error: Some(format!("Deserialize error: {e:?}")) },
    };

    let cb: [u8; 32] = match proof.commitment.as_slice().try_into() {
        Ok(b) => b,
        Err(_) => return VerifyResult { valid: false, error: Some("Invalid commitment length".into()) },
    };

    match range_proof.verify_single(&bp, &pc, &mut transcript, &CompressedRistretto(cb), proof.range_bits) {
        Ok(()) => VerifyResult { valid: true, error: None },
        Err(e) => VerifyResult { valid: false, error: Some(format!("Verification failed: {e:?}")) },
    }
}

pub fn batch_verify(proofs: &[AeosRangeProof]) -> BatchVerifyResult {
    let individual: Vec<bool> = proofs.iter().map(|p| verify_range(p).valid).collect();
    BatchVerifyResult { all_valid: individual.iter().all(|&v| v), individual_results: individual, error: None }
}

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
        "batch_verify" => {
            let proofs: Vec<AeosRangeProof> = match serde_json::from_value(cmd["proofs"].clone()) {
                Ok(p) => p,
                Err(e) => return format!(r#"{{"all_valid":false,"error":"Invalid proofs: {e}"}}"#),
            };
            serde_json::to_string(&batch_verify(&proofs)).unwrap()
        }
        other => format!(r#"{{"success":false,"error":"Unknown command: {other}"}}"#),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn prove_verify_64bit() { let r = prove_range(1_000_000, 64, "test"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn prove_verify_32bit() { let r = prove_range(42, 32, "test"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn prove_verify_8bit() { let r = prove_range(255, 8, "test"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn zero_value() { let r = prove_range(0, 64, "z"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn max_value() { let r = prove_range(u64::MAX, 64, "m"); assert!(r.success); assert!(verify_range(&r.proof).valid); }
    #[test] fn out_of_range() { let r = prove_range(256, 8, "t"); assert!(!r.success); }
    #[test] fn invalid_bits() { let r = prove_range(42, 7, "t"); assert!(!r.success); }
    #[test] fn tampered_fails() { let r = prove_range(42, 64, "t"); let mut t = r.proof.clone(); t.proof_bytes[0] ^= 0xFF; assert!(!verify_range(&t).valid); }
    #[test] fn wrong_domain_fails() { let r = prove_range(42, 64, "correct"); let mut w = r.proof.clone(); w.domain = "wrong".into(); assert!(!verify_range(&w).valid); }
    #[test] fn batch_all_valid() { let ps: Vec<_> = (0..5).map(|i| { let r = prove_range(i*1000+42, 64, "b"); r.proof }).collect(); assert!(batch_verify(&ps).all_valid); }
    #[test] fn batch_one_invalid() { let mut ps: Vec<_> = (0..3).map(|i| prove_range(i*100, 64, "b").proof).collect(); ps[1].proof_bytes[0] ^= 0xFF; let r = batch_verify(&ps); assert!(!r.all_valid); assert!(r.individual_results[0]); assert!(!r.individual_results[1]); }
    #[test] fn json_roundtrip() { let o = process_json_command(r#"{"command":"prove","value":42,"range_bits":64,"domain":"t"}"#); let r: ProveResult = serde_json::from_str(&o).unwrap(); assert!(r.success); let vi = serde_json::json!({"command":"verify","proof":r.proof}).to_string(); let vr: VerifyResult = serde_json::from_str(&process_json_command(&vi)).unwrap(); assert!(vr.valid); }
    #[test] fn hiding() { let r1 = prove_range(42, 64, "t"); let r2 = prove_range(42, 64, "t"); assert_ne!(r1.blinding, r2.blinding); }
}
