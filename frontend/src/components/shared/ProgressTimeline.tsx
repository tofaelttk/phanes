import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { COLORS } from '../../utils/constants';

interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProgressTimelineProps {
  steps: TimelineStep[];
}

export default function ProgressTimeline({ steps }: ProgressTimelineProps) {
  return (
    <div className="flex flex-col gap-8">
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          className="flex gap-4"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        >
          <div className="flex flex-col items-center">
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 28,
                height: 28,
                backgroundColor:
                  step.status === 'completed'
                    ? COLORS.sage
                    : step.status === 'active'
                      ? COLORS.accent
                      : 'transparent',
                border:
                  step.status === 'pending'
                    ? `1.5px solid ${COLORS.rule}`
                    : 'none',
              }}
            >
              {step.status === 'completed' && (
                <Check size={14} color="#fff" strokeWidth={2.5} />
              )}
              {step.status === 'active' && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#fff' }}
                />
              )}
            </div>

            {i < steps.length - 1 && (
              <div
                className="w-px flex-1 mt-2"
                style={{ backgroundColor: COLORS.rule }}
              />
            )}
          </div>

          <div className="pb-2 pt-0.5">
            <p
              className="font-semibold leading-tight"
              style={{
                fontSize: '15px',
                letterSpacing: '-0.01em',
                color:
                  step.status === 'pending' ? COLORS.inkFaint : COLORS.ink,
              }}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="body-small mt-1">{step.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
