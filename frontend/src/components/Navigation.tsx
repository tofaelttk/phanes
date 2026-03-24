import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  PanelLeftClose,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SCENE_TITLES, COLORS } from '../utils/constants';

interface NavigationProps {
  currentScene: number;
  totalScenes: number;
  onGoToScene: (index: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  sceneProgress: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const SIDEBAR_EXPANDED = 280;
const SIDEBAR_COLLAPSED = 56;
const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function StepDot({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'active') {
    return (
      <motion.div
        className="rounded-full shrink-0"
        style={{
          width: 20,
          height: 6,
          backgroundColor: COLORS.accent,
        }}
        layoutId="scene-dot-active"
        transition={{ duration: 0.3 }}
      />
    );
  }

  return (
    <div
      className="rounded-full shrink-0"
      style={{
        width: 6,
        height: 6,
        backgroundColor: state === 'done' ? COLORS.sage : COLORS.rule,
      }}
    />
  );
}

function SceneItem({
  scene,
  index,
  currentScene,
  sceneProgress,
  collapsed,
  onGoToScene,
}: {
  scene: (typeof SCENE_TITLES)[number];
  index: number;
  currentScene: number;
  sceneProgress: number;
  collapsed: boolean;
  onGoToScene: (i: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isPast = index < currentScene;
  const isCurrent = index === currentScene;
  const isFuture = index > currentScene;

  return (
    <button
      onClick={() => onGoToScene(index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer relative"
      style={{
        backgroundColor: isCurrent
          ? COLORS.creamDark
          : hovered
            ? `${COLORS.cream}99`
            : 'transparent',
      }}
    >
      {/* Active indicator bar */}
      {isCurrent && (
        <motion.div
          className="absolute left-0 top-1/2 rounded-full"
          style={{
            width: 2,
            height: 20,
            backgroundColor: COLORS.accent,
            translateY: '-50%',
          }}
          layoutId="nav-active-bar"
          transition={{ duration: 0.3, ease: EASE }}
        />
      )}

      {/* Step dot */}
      <div className="shrink-0 flex items-center justify-center" style={{ width: 20 }}>
        <StepDot state={isPast ? 'done' : isCurrent ? 'active' : 'pending'} />
      </div>

      {/* Title + subtitle */}
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <p
              className="text-sm truncate leading-tight"
              style={{
                fontSize: 14,
                color: isCurrent
                  ? COLORS.ink
                  : isFuture
                    ? COLORS.inkFaint
                    : COLORS.inkMuted,
                fontWeight: isCurrent ? 500 : 400,
              }}
            >
              {scene.title}
            </p>
            {isCurrent && (
              <motion.p
                className="truncate mt-0.5"
                style={{ fontSize: 12, color: COLORS.inkFaint, lineHeight: 1.3 }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
              >
                {scene.subtitle}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar under current */}
      {isCurrent && !collapsed && (
        <motion.div
          className="absolute bottom-0 left-3 right-3 rounded-full"
          style={{
            height: 2,
            backgroundColor: COLORS.accent,
            transformOrigin: 'left',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: sceneProgress / 100 }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      )}
    </button>
  );
}

export default function Navigation({
  currentScene,
  totalScenes,
  onGoToScene,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  sceneProgress,
  collapsed,
  onToggleCollapse,
}: NavigationProps) {
  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <motion.nav
      className="fixed left-0 top-0 h-screen flex flex-col z-50 overflow-hidden"
      style={{
        backgroundColor: COLORS.warmWhite,
        borderRight: `1px solid ${COLORS.rule}`,
      }}
      animate={{ width }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: COLORS.ink,
                }}
              >
                Phanes
              </p>
              <span className="section-label">Protocol Simulation</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md transition-colors cursor-pointer shrink-0"
          style={{ color: COLORS.inkFaint }}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Scene list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {SCENE_TITLES.slice(0, totalScenes).map((scene, i) => (
          <SceneItem
            key={scene.id}
            scene={scene}
            index={i}
            currentScene={currentScene}
            sceneProgress={sceneProgress}
            collapsed={collapsed}
            onGoToScene={onGoToScene}
          />
        ))}
      </div>

      {/* Bottom controls */}
      <div
        className="shrink-0 px-4 py-4 flex flex-col gap-3"
        style={{ borderTop: `1px solid ${COLORS.rule}` }}
      >
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="controls-expanded"
              className="flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={onPrev}
                disabled={currentScene <= 0}
                className="flex items-center gap-0.5 text-xs font-medium disabled:opacity-30 cursor-pointer transition-opacity"
                style={{ color: COLORS.inkMuted }}
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              <button
                onClick={isPlaying ? onPause : onPlay}
                className="flex items-center justify-center rounded-full cursor-pointer transition-colors"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: `${COLORS.accent}14`,
                  color: COLORS.accent,
                }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>

              <button
                onClick={onNext}
                disabled={currentScene >= totalScenes - 1}
                className="flex items-center gap-0.5 text-xs font-medium disabled:opacity-30 cursor-pointer transition-opacity"
                style={{ color: COLORS.inkMuted }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="controls-collapsed"
              className="flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={isPlaying ? onPause : onPlay}
                className="flex items-center justify-center rounded-full cursor-pointer transition-colors"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: `${COLORS.accent}14`,
                  color: COLORS.accent,
                }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene counter */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.p
              className="text-center section-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              Scene {currentScene + 1} of {totalScenes}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Step progress dots */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              className="flex items-center justify-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const filled = sceneProgress >= (i + 1) * 20;
                const active = sceneProgress >= i * 20 && sceneProgress < (i + 1) * 20;
                return (
                  <div
                    key={i}
                    className="rounded-full transition-colors"
                    style={{
                      width: active ? 10 : 5,
                      height: 5,
                      backgroundColor: filled
                        ? COLORS.sage
                        : active
                          ? COLORS.accent
                          : COLORS.rule,
                      borderRadius: 999,
                      transition: 'all 0.3s ease',
                    }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
