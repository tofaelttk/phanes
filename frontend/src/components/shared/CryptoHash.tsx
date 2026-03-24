import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../../utils/constants';

interface CryptoHashProps {
  value: string;
  label?: string;
  color?: string;
  isGenerating?: boolean;
  className?: string;
}

const HEX_CHARS = '0123456789abcdef';

export default function CryptoHash({
  value,
  label,
  color = COLORS.bronze,
  isGenerating = false,
  className = '',
}: CryptoHashProps) {
  const [displayed, setDisplayed] = useState(value);
  const frameRef = useRef<number>(0);
  const settledRef = useRef(0);

  useEffect(() => {
    if (!isGenerating) {
      setDisplayed(value);
      settledRef.current = value.length;
      return;
    }

    settledRef.current = 0;
    const startTime = Date.now();
    const charDuration = 40;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const settled = Math.min(
        Math.floor(elapsed / charDuration),
        value.length,
      );
      settledRef.current = settled;

      const chars = value.split('').map((ch, i) => {
        if (i < settled) return ch;
        return HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
      });

      setDisplayed(chars.join(''));

      if (settled < value.length) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, isGenerating]);

  return (
    <motion.div
      className={`flex flex-col gap-1 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {label && <span className="section-label">{label}</span>}
      <span
        className="font-mono text-xs tracking-wide break-all"
        style={{
          fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
          fontSize: '12px',
          letterSpacing: '0.02em',
          color,
        }}
      >
        {displayed}
      </span>
    </motion.div>
  );
}
