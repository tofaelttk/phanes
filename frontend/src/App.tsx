import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play, Pause, ChevronLeft, ChevronRight,
  List,
} from 'lucide-react';
import WelcomeScreen from './components/WelcomeScreen';
import Navigation from './components/Navigation';
import SceneRenderer from './components/SceneRenderer';
import { useSimulation } from './hooks/useSimulation';
import { SCENE_TITLES, COLORS } from './utils/constants';

const TOTAL_SCENES = 18;

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const scene = SCENE_TITLES[sim.currentScene];

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: COLORS.cream }}>
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(26,23,20,0.15)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 h-screen z-50"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Navigation
                currentScene={sim.currentScene}
                totalScenes={TOTAL_SCENES}
                onGoToScene={(i) => { sim.goToScene(i); setSidebarOpen(false); }}
                isPlaying={sim.isPlaying}
                onPlay={sim.play}
                onPause={sim.pause}
                onNext={sim.nextScene}
                onPrev={sim.prevScene}
                sceneProgress={sim.sceneProgress}
                collapsed={false}
                onToggleCollapse={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="w-full min-h-screen pb-20">
        <SceneRenderer
          currentScene={sim.currentScene}
          currentStep={sim.currentStep}
          onStepComplete={sim.advanceStep}
        />
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 z-30"
        style={{ backgroundColor: `rgba(254,252,249,0.92)`, backdropFilter: 'blur(12px)', borderTop: `1px solid ${COLORS.rule}` }}
      >
        <div
          className="absolute top-0 left-0 h-[2px] transition-all duration-500"
          style={{
            width: `${sim.sceneProgress}%`,
            backgroundColor: COLORS.accent,
          }}
        />

        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: COLORS.inkMuted }}
              title="Scene list"
            >
              <List size={18} />
            </button>

            <button
              onClick={sim.prevScene}
              disabled={sim.currentScene <= 0}
              className="p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
              style={{ color: COLORS.inkMuted }}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={sim.isPlaying ? sim.pause : sim.play}
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              style={{ backgroundColor: `${COLORS.accent}14`, color: COLORS.accent }}
            >
              {sim.isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 1 }} />}
            </button>

            <button
              onClick={sim.nextScene}
              disabled={sim.currentScene >= TOTAL_SCENES - 1}
              className="p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
              style={{ color: COLORS.inkMuted }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, lineHeight: 1.3 }}>
                {scene?.title}
              </p>
              <p style={{ fontSize: 11, color: COLORS.inkFaint, letterSpacing: '0.04em' }}>
                Scene {sim.currentScene + 1} of {TOTAL_SCENES}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
