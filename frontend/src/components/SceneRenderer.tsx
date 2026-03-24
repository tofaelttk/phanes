import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { COLORS } from '../utils/constants';

interface SceneRendererProps {
  currentScene: number;
  currentStep: number;
  onStepComplete: () => void;
}

const scenes = [
  lazy(() => import('./scenes/Scene00_TheProblem')),
  lazy(() => import('./scenes/Scene01_TheSolution')),
  lazy(() => import('./scenes/Scene02_AgentGenesis')),
  lazy(() => import('./scenes/Scene03_DelegationChain')),
  lazy(() => import('./scenes/Scene04_ContractFormation')),
  lazy(() => import('./scenes/Scene05_MultiSigActivation')),
  lazy(() => import('./scenes/Scene06_RiskAssessment')),
  lazy(() => import('./scenes/Scene07_WorkExecution')),
  lazy(() => import('./scenes/Scene08_ProofVerification')),
  lazy(() => import('./scenes/Scene09_EscrowRelease')),
  lazy(() => import('./scenes/Scene10_BFTConsensus')),
  lazy(() => import('./scenes/Scene11_DisputeResolution')),
  lazy(() => import('./scenes/Scene12_AnomalyDetection')),
  lazy(() => import('./scenes/Scene13_GraphIntelligence')),
  lazy(() => import('./scenes/Scene14_SettlementFlow')),
  lazy(() => import('./scenes/Scene15_ThresholdCrypto')),
  lazy(() => import('./scenes/Scene16_FullLifecycle')),
  lazy(() => import('./scenes/Scene17_TheFuture')),
];

function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        className="w-6 h-6 rounded-full"
        style={{
          border: `2px solid ${COLORS.creamDark}`,
          borderTopColor: COLORS.accent,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export default function SceneRenderer({
  currentScene,
  currentStep,
  onStepComplete,
}: SceneRendererProps) {
  if (currentScene < 0 || currentScene >= scenes.length) return null;
  const SceneComponent = scenes[currentScene];

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          className="w-full h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <SceneComponent
              step={currentStep}
              currentStep={currentStep}
              onStepComplete={onStepComplete}
            />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
