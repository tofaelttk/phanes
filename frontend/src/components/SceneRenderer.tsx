import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
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

function Spinner() {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-screen">
      <div
        className="w-5 h-5 rounded-full animate-spin-slow"
        style={{ border: '2px solid #EDE7DD', borderTopColor: '#B8956A' }}
      />
    </div>
  );
}

export default function SceneRenderer({ currentScene, currentStep, onStepComplete }: Props) {
  if (currentScene < 0 || currentScene >= scenes.length) return null;
  const Scene = scenes[currentScene];

  return (
    <div className="w-full min-h-screen overflow-y-auto overflow-x-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          className="w-full min-h-screen"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<Spinner />}>
            <Scene step={currentStep} currentStep={currentStep} onStepComplete={onStepComplete} />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
