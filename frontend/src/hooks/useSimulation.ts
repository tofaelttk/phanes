import { useState, useCallback, useRef, useEffect } from 'react';

export function useSimulation(totalScenes = 17) {
  const [currentScene, setCurrentScene] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const nextScene = useCallback(() => {
    setCurrentScene((prev) => {
      if (prev >= totalScenes - 1) return prev;
      return prev + 1;
    });
    setSceneProgress(0);
    setCurrentStep(0);
  }, [totalScenes]);

  const prevScene = useCallback(() => {
    setCurrentScene((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
    setSceneProgress(0);
    setCurrentStep(0);
  }, []);

  const goToScene = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalScenes - 1));
    setCurrentScene(clamped);
    setSceneProgress(0);
    setCurrentStep(0);
  }, [totalScenes]);

  const advanceStep = useCallback(() => setCurrentStep((prev) => prev + 1), []);

  const reset = useCallback(() => {
    setCurrentScene(0);
    setSceneProgress(0);
    setCurrentStep(0);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const isAtEnd = sceneProgress >= 100;

  useEffect(() => {
    if (!isPlaying || isAtEnd) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSceneProgress((prev) => {
        const next = prev + 0.3;
        if (next >= 100) return 100;
        return next;
      });
    }, 60);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentScene, isAtEnd]);

  return {
    currentScene,
    sceneProgress,
    isPlaying,
    currentStep,
    play,
    pause,
    nextScene,
    prevScene,
    goToScene,
    advanceStep,
    setSceneProgress,
    setCurrentStep,
    reset,
  };
}
