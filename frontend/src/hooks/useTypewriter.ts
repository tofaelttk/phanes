import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  speed?: number;
  startDelay?: number;
  enabled?: boolean;
  cursor?: boolean;
}

const CURSOR_CHAR = '\u258C';

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {},
) {
  const { speed = 50, startDelay = 0, enabled = true, cursor = false } = options;

  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
  }, []);

  useEffect(() => {
    cleanup();
    setDisplayed('');
    setIsComplete(false);
    indexRef.current = 0;

    if (!enabled) return;

    delayRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (indexRef.current < text.length) {
          indexRef.current++;
          setDisplayed(text.slice(0, indexRef.current));
        } else {
          setIsComplete(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, speed);
    }, startDelay);

    return cleanup;
  }, [text, speed, startDelay, enabled, cleanup]);

  useEffect(() => {
    if (!cursor) return;

    const blink = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);

    return () => clearInterval(blink);
  }, [cursor]);

  const displayedWithCursor = cursor
    ? displayed + (cursorVisible && !isComplete ? CURSOR_CHAR : '')
    : displayed;

  return { displayed: displayedWithCursor, raw: displayed, isComplete };
}
