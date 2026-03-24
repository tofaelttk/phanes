export function generateDID(): string {
  const chars = 'abcdef0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `did:aeos:${id}`;
}

export function generateHash(length = 24): string {
  const chars = 'abcdef0123456789';
  let hash = '';
  for (let i = 0; i < length; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function generateEd25519PubKey(): string {
  return generateHash(64);
}

export function typewriterText(
  text: string,
  onUpdate: (displayed: string) => void,
  speed = 30,
): () => void {
  let index = 0;
  const interval = setInterval(() => {
    if (index < text.length) {
      index++;
      onUpdate(text.slice(0, index));
    } else {
      clearInterval(interval);
    }
  }, speed);
  return () => clearInterval(interval);
}

export function countUp(
  from: number,
  to: number,
  duration: number,
  onUpdate: (current: number) => void,
): () => void {
  const startTime = performance.now();
  let raf: number;

  const tick = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    const current = Math.round(from + (to - from) * eased);
    onUpdate(current);
    if (progress < 1) {
      raf = requestAnimationFrame(tick);
    }
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export function staggerDelay(index: number, base = 80): number {
  return index * base;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function percentageBar(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max((value / max) * 100, 0), 100);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return '$' + dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function truncateDID(did: string, chars = 12): string {
  if (did.length <= chars + 8) return did;
  return did.slice(0, chars) + '...' + did.slice(-4);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateKeyId(): string {
  return generateHash(16);
}

export function particlePositions(
  count: number,
  width: number,
  height: number,
): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, () => ({
    x: randomBetween(0, width),
    y: randomBetween(0, height),
  }));
}

export function generateSignatureHex(): string {
  return generateHash(64);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

export function distributeOnCircle(
  count: number,
  cx: number,
  cy: number,
  radius: number,
): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i;
    return polarToCartesian(cx, cy, radius, angle);
  });
}

export function generateMerkleHash(left: string, right: string): string {
  const combined = left + right;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + generateHash(16);
}

export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

export function shortId(length = 8): string {
  return generateHash(length);
}
