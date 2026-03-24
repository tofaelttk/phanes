import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Check,
  PanelLeftClose, PanelLeft,
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
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.nav
      className="fixed left-0 top-0 h-screen flex flex-col z-50 overflow-hidden"
      style={{
        backgroundColor: COLORS.warmWhite,
        borderRight: `1px solid ${COLORS.rule}`,
      }}
      animate={{ width: collapsed ? 60 : 300 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="px-5 pt-6 pb-4 flex items-center justify-between shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p
                className="font-semibold"
                style={{
                  fontSize: '17px',
                  letterSpacing: '-0.01em',
                  color: COLORS.ink,
                }}
              >
                Phanes
              </p>
              <span className="section-label">Simulation</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-cream-dark/40 transition-colors cursor-pointer shrink-0"
          style={{ color: COLORS.inkFaint }}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {SCENE_TITLES.slice(0, totalScenes).map((scene, i) => {
          const isPast = i < currentScene;
          const isCurrent = i === currentScene;
          const isFuture = i > currentScene;

          return (
            <button
              key={scene.id}
              onClick={() => onGoToScene(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left cursor-pointer relative"
              style={{
                backgroundColor:
                  isCurrent
                    ? `${COLORS.accent}0A`
                    : hovered === i
                      ? `${COLORS.cream}`
                      : 'transparent',
              }}
            >
              {isCurrent && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full"
                  style={{
                    backgroundColor: COLORS.accent,
                    height: 24,
                  }}
                  layoutId="nav-indicator"
                  transition={{ duration: 0.3 }}
                />
              )}

              <div className="shrink-0 flex items-center justify-center" style={{ width: 20 }}>
                {isPast ? (
                  <Check size={14} style={{ color: COLORS.sage }} strokeWidth={2.5} />
                ) : isCurrent ? (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS.accent }}
                  />
                ) : (
                  <div
                    className="w-2 h-2 rounded-full border"
                    style={{ borderColor: COLORS.rule }}
                  />
                )}
              </div>

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
                        color: isCurrent
                          ? COLORS.ink
                          : isFuture
                            ? COLORS.inkFaint
                            : COLORS.inkMuted,
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      {scene.title}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {isCurrent && !collapsed && (
                <motion.div
                  className="h-[2px] absolute bottom-0 left-3 right-3 rounded-full"
                  style={{ backgroundColor: COLORS.accent }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: sceneProgress / 100 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        className="shrink-0 px-4 py-4 flex flex-col gap-3"
        style={{ borderTop: `1px solid ${COLORS.rule}` }}
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={onPrev}
                disabled={currentScene <= 0}
                className="text-xs font-medium disabled:opacity-30 cursor-pointer transition-colors hover:underline underline-offset-2"
                style={{ color: COLORS.inkMuted }}
              >
                Prev
              </button>

              <button
                onClick={isPlaying ? onPause : onPlay}
                className="p-2 rounded-full cursor-pointer transition-colors"
                style={{
                  backgroundColor: `${COLORS.accent}14`,
                  color: COLORS.accent,
                }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>

              <button
                onClick={onNext}
                disabled={currentScene >= totalScenes - 1}
                className="text-xs font-medium disabled:opacity-30 cursor-pointer transition-colors hover:underline underline-offset-2"
                style={{ color: COLORS.inkMuted }}
              >
                Next
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-2 rounded-full cursor-pointer transition-colors mx-auto"
            style={{
              backgroundColor: `${COLORS.accent}14`,
              color: COLORS.accent,
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}

        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.p
              className="text-center section-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {currentScene + 1} of {totalScenes}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
