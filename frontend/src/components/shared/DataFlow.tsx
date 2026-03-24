import { useId } from 'react';
import { COLORS } from '../../utils/constants';
import type { Position } from '../../types';

interface DataFlowProps {
  from: Position;
  to: Position;
  color?: string;
  label?: string;
  animated?: boolean;
  thickness?: number;
  dashed?: boolean;
}

export default function DataFlow({
  from,
  to,
  color = COLORS.inkGhost,
  label,
  animated = false,
  thickness = 1.5,
  dashed = false,
}: DataFlowProps) {
  const uid = useId();

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2;
  const curveOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.3 + 30;

  const cp1x = from.x + dx * 0.25;
  const cp1y = from.y - curveOffset;
  const cp2x = from.x + dx * 0.75;
  const cp2y = to.y - curveOffset;

  const d = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;

  const minX = Math.min(from.x, to.x, cp1x, cp2x) - 20;
  const minY = Math.min(from.y, to.y, cp1y, cp2y) - 20;
  const maxX = Math.max(from.x, to.x, cp1x, cp2x) + 20;
  const maxY = Math.max(from.y, to.y, cp1y, cp2y) + 20;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={dashed ? '6 4' : undefined}
        className={animated && dashed ? 'animate-dash' : undefined}
      />

      {animated && (
        <>
          <circle r={3} fill={color}>
            <animateMotion dur="2.5s" repeatCount="indefinite" path={d} />
          </circle>
        </>
      )}

      {label && (
        <g>
          <rect
            x={cx - 36}
            y={cy - curveOffset / 2 - 10}
            width={72}
            height={20}
            rx={10}
            fill={COLORS.creamDark}
            stroke={COLORS.rule}
            strokeWidth={0.5}
          />
          <text
            x={cx}
            y={cy - curveOffset / 2 + 4}
            textAnchor="middle"
            fill={COLORS.inkFaint}
            fontSize={10}
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight={500}
            id={uid}
          >
            {label}
          </text>
        </g>
      )}
    </svg>
  );
}
