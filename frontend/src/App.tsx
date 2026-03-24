import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WelcomeScreen from './components/WelcomeScreen';
import Navigation from './components/Navigation';
import SceneRenderer from './components/SceneRenderer';
import { useSimulation } from './hooks/useSimulation';

const TOTAL_SCENES = 18;

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sim = useSimulation(TOTAL_SCENES);

  const handleStart = useCallback(() => {
    setShowWelcome(false);
    sim.goToScene(0);
    sim.play();
  }, [sim]);

  useEffect(() => {
    if (showWelcome) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); sim.nextScene(); break;
        case 'ArrowLeft': e.preventDefault(); sim.prevScene(); break;
        case ' ': e.preventDefault(); sim.isPlaying ? sim.pause() : sim.play(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showWelcome, sim]);

  useEffect(() => {
    if (showWelcome || !sim.isPlaying || sim.sceneProgress < 100) return;
    const t = setTimeout(() => {
      if (sim.currentScene < TOTAL_SCENES - 1) sim.nextScene();
      else sim.pause();
    }, 2000);
    return () => clearTimeout(t);
  }, [showWelcome, sim.isPlaying, sim.sceneProgress, sim.currentScene, sim]);

  if (showWelcome) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="welcome" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          <WelcomeScreen onStart={handleStart} />
        </motion.div>
      </AnimatePresence>
    );
  }

  const sidebarW = sidebarCollapsed ? 56 : 280;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      <Navigation
        currentScene={sim.currentScene}
        totalScenes={TOTAL_SCENES}
        onGoToScene={sim.goToScene}
        isPlaying={sim.isPlaying}
        onPlay={sim.play}
        onPause={sim.pause}
        onNext={sim.nextScene}
        onPrev={sim.prevScene}
        sceneProgress={sim.sceneProgress}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />
      <main
        className="flex-1 min-h-screen transition-[margin] duration-300"
        style={{ marginLeft: sidebarW, willChange: 'margin-left' }}
      >
        <SceneRenderer
          currentScene={sim.currentScene}
          currentStep={sim.currentStep}
          onStepComplete={sim.advanceStep}
        />
      </main>
    </div>
  );
}
