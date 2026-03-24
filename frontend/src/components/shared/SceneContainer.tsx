import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../../utils/constants';

interface SceneContainerProps {
  sceneNumber: number;
  title: string;
  subtitle: string;
  description: string;
  stepIndex: number;
  totalSteps: number;
  children: ReactNode;
  onNextStep?: () => void;
  className?: string;
}

export default function SceneContainer({
  sceneNumber,
  title,
  subtitle,
  description,
  stepIndex,
  totalSteps,
  children,
  onNextStep,
  className = '',
}: SceneContainerProps) {
  const progress = totalSteps > 0 ? (stepIndex / totalSteps) * 100 : 0;

  return (
    <motion.div
      className={`scene-bg flex flex-col min-h-screen ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="py-16 px-12 max-w-5xl mx-auto w-full">
        <motion.span
          className="section-label block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          SCENE {String(sceneNumber).padStart(2, '0')}
        </motion.span>

        <motion.h1
          className="heading-display mt-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {title}
        </motion.h1>

        <motion.p
          className="body-text mt-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {subtitle}
        </motion.p>

        <motion.p
          className="body-small mt-4 max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {description}
        </motion.p>

        <motion.div
          className="mt-6 w-full h-[2px] rounded-full overflow-hidden"
          style={{ backgroundColor: COLORS.creamDark }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: COLORS.accent }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>
      </div>

      <div className={`px-12 max-w-6xl mx-auto w-full flex-1`}>
        {children}
      </div>

      {onNextStep && (
        <div className="px-12 pb-12 max-w-6xl mx-auto w-full flex justify-end">
          <motion.button
            onClick={onNextStep}
            className="text-base font-medium cursor-pointer"
            style={{ color: COLORS.accent }}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.2 }}
          >
            <span className="hover:underline underline-offset-4 decoration-1">
              Continue →
            </span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
