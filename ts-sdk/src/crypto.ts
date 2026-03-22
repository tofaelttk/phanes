/**
 * AEOS Protocol — Cryptographic Primitives (TypeScript)
 *
 * Production-grade cryptographic building blocks:
 *  - Ed25519 key pairs (via tweetnacl)
 *  - SHA-256 domain-separated hashing
 *  - Pedersen-style commitments
 *  - Merkle accumulator with membership proofs
 *  - Verifiable Random Function (VRF)
 *  - Authenticated encryption (XSalsa20-Poly1305)
 */

import nacl from "tweetnacl";
import { createHash, createHmac, randomBytes } from "crypto";

// =============================================================================
// HASH FUNCTIONS
// =============================================================================

export function sha256(data: Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

export function domainHash(domain: string, ...args: Buffer[]): Buffer {
  const h = createHash("sha512");
  h.update(`AEOS/${domain}`);
  for (const arg of args) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(arg.length);
    h.update(len);
    h.update(arg);
  }
  return Buffer.from(h.digest());
}

export function leafHash(data: Buffer): Buffer {
  return sha256(Buffer.concat([Buffer.from([0x00]), data]));
}

export function merkleHash(left: Buffer, right: Buffer): Buffer {
  const [a, b] = left.compare(right) > 0 ? [right, left] : [left, right];
  return sha256(Buffer.concat([Buffer.from([0x01]), a, b]));
}

// =============================================================================
// KEY PAIR
// =============================================================================

export interface SerializedKeyPair {
  publicKey: string;
  secretKey: string;
  keyId: string;
  purpose: string;
  createdAt: number;
}

export class KeyPair {
  public readonly publicKey: Uint8Array;
  private readonly secretKey: Uint8Array;
  public readonly keyId: string;
  public readonly purpose: string;
  public readonly createdAt: number;

  private constructor(
    publicKey: Uint8Array,
    secretKey: Uint8Array,
    purpose: string
  ) {
    this.publicKey = publicKey;
    this.secretKey = secretKey;
    this.purpose = purpose;
    this.createdAt = Date.now() / 1000;
    this.keyId = sha256(
      Buffer.concat([Buffer.from("AEOS/key-id/"), Buffer.from(publicKey)])
    )
      .toString("hex")
      .slice(0, 16);
  }

  static generate(purpose: string = "general"): KeyPair {
    const kp = nacl.sign.keyPair();
    return new KeyPair(kp.publicKey, kp.secretKey, purpose);
  }

  static fromSecretKey(sk: Uint8Array, purpose: string = "general"): KeyPair {
    const kp = nacl.sign.keyPair.fromSecretKey(sk);
    return new KeyPair(kp.publicKey, kp.secretKey, purpose);
  }

  sign(message: Buffer): Buffer {
    const sig = nacl.sign.detached(new Uint8Array(message), this.secretKey);
    return Buffer.from(sig);
  }

  verify(signature: Buffer, message: Buffer): boolean {
    return nacl.sign.detached.verify(
      new Uint8Array(message),
      new Uint8Array(signature),
      this.publicKey
    );
  }

  publicKeyHex(): string {
    return Buffer.from(this.publicKey).toString("hex");
  }

  serialize(): SerializedKeyPair {
    return {
      publicKey: Buffer.from(this.publicKey).toString("hex"),
      secretKey: Buffer.from(this.secretKey).toString("hex"),
      keyId: this.keyId,
      purpose: this.purpose,
      createdAt: this.createdAt,
    };
  }

  static deserialize(data: SerializedKeyPair): KeyPair {
    const sk = new Uint8Array(Buffer.from(data.secretKey, "hex"));
    return KeyPair.fromSecretKey(sk, data.purpose);
  }
}

// =============================================================================
// PEDERSEN COMMITMENT
// =============================================================================

export interface Commitment {
  hash: Buffer;
  blinding: Buffer;
}

export function createCommitment(
  value: Buffer,
  blinding?: Buffer
): Commitment {
  const blind = blinding || randomBytes(32);
  const hash = sha256(
    Buffer.concat([Buffer.from("AEOS/pedersen/"), value, blind])
  );
  return { hash, blinding: blind };
}

export function verifyCommitment(
  commitment: Commitment,
  value: Buffer
): boolean {
  const expected = sha256(
    Buffer.concat([
      Buffer.from("AEOS/pedersen/"),
      value,
      commitment.blinding,
    ])
  );
  return commitment.hash.equals(expected);
}

// =============================================================================
// MERKLE ACCUMULATOR
// =============================================================================

export interface MerkleProof {
  leaf: Buffer;
  path: Array<{ sibling: Buffer; isRight: boolean }>;
  root: Buffer;
}

export class MerkleAccumulator {
  private leaves: Buffer[] = [];
  private tree: Buffer[][] = [[]];

  add(data: Buffer): number {
    const h = leafHash(data);
    this.leaves.push(data);
    this.tree[0].push(h);
    this.rebuild();
    return this.leaves.length - 1;
  }

  private rebuild(): void {
    this.tree = [Array.from(this.tree[0])];
    let level = this.tree[0];
    while (level.length > 1) {
      const next: Buffer[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          next.push(merkleHash(level[i], level[i + 1]));
        } else {
          next.push(level[i]);
        }
      }
      this.tree.push(next);
      level = next;
    }
  }

  get root(): Buffer {
    if (!this.tree.length || !this.tree[this.tree.length - 1].length) {
      return sha256(Buffer.from("AEOS/empty-tree"));
    }
    return this.tree[this.tree.length - 1][0];
  }

  get size(): number {
    return this.leaves.length;
  }

  prove(index: number): MerkleProof {
    if (index >= this.leaves.length) {
      throw new Error(`Index ${index} out of range`);
    }
    const path: Array<{ sibling: Buffer; isRight: boolean }> = [];
    let idx = index;
    for (let level = 0; level < this.tree.length - 1; level++) {
      const siblingIdx = idx ^ 1;
      if (siblingIdx < this.tree[level].length) {
        path.push({
          sibling: this.tree[level][siblingIdx],
          isRight: idx % 2 === 0,
        });
      }
      idx = Math.floor(idx / 2);
    }
    return { leaf: this.leaves[index], path, root: this.root };
  }

  static verifyProof(proof: MerkleProof): boolean {
    let current = leafHash(proof.leaf);
    for (const { sibling, isRight } of proof.path) {
      current = isRight
        ? merkleHash(current, sibling)
        : merkleHash(sibling, current);
    }
    return current.equals(proof.root);
  }
}

// =============================================================================
// VRF (Verifiable Random Function)
// =============================================================================

export interface VRFOutput {
  output: Buffer;
  proof: Buffer;
}

export function vrfEvaluate(key: KeyPair, input: Buffer): VRFOutput {
  const payload = Buffer.concat([Buffer.from("AEOS/vrf/"), input]);
  const proof = key.sign(payload);
  const output = sha256(Buffer.concat([Buffer.from("AEOS/vrf-output/"), proof]));
  return { output, proof };
}

export function vrfVerify(
  publicKey: Uint8Array,
  input: Buffer,
  output: Buffer,
  proof: Buffer
): boolean {
  const payload = Buffer.concat([Buffer.from("AEOS/vrf/"), input]);
  const valid = nacl.sign.detached.verify(
    new Uint8Array(payload),
    new Uint8Array(proof),
    publicKey
  );
  if (!valid) return false;
  const expected = sha256(Buffer.concat([Buffer.from("AEOS/vrf-output/"), proof]));
  return expected.equals(output);
}

// =============================================================================
// ENCRYPTED ENVELOPE
// =============================================================================

export interface EncryptedEnvelope {
  ciphertext: Buffer;
  nonce: Buffer;
  senderKeyId: string;
  recipientKeyId: string;
  timestamp: number;
}

export function encryptEnvelope(
  plaintext: Buffer,
  sharedSecret: Uint8Array,
  senderId: string,
  recipientId: string
): EncryptedEnvelope {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  // Derive symmetric key from shared secret
  const key = sha256(
    Buffer.concat([Buffer.from("AEOS/envelope/"), Buffer.from(sharedSecret)])
  ).subarray(0, nacl.secretbox.keyLength);

  const ciphertext = nacl.secretbox(
    new Uint8Array(plaintext),
    nonce,
    new Uint8Array(key)
  );

  return {
    ciphertext: Buffer.from(ciphertext),
    nonce: Buffer.from(nonce),
    senderKeyId: senderId,
    recipientKeyId: recipientId,
    timestamp: Date.now() / 1000,
  };
}

export function decryptEnvelope(
  envelope: EncryptedEnvelope,
  sharedSecret: Uint8Array
): Buffer {
  const key = sha256(
    Buffer.concat([Buffer.from("AEOS/envelope/"), Buffer.from(sharedSecret)])
  ).subarray(0, nacl.secretbox.keyLength);

  const plaintext = nacl.secretbox.open(
    new Uint8Array(envelope.ciphertext),
    new Uint8Array(envelope.nonce),
    new Uint8Array(key)
  );

  if (!plaintext) throw new Error("Decryption failed");
  return Buffer.from(plaintext);
}
