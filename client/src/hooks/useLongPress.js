import { useRef, useCallback } from 'react';

/**
 * Hook pour long-press tactile (remplace title/tooltip)
 * Source: https://www.smashingmagazine.com/2021/02/designing-tooltips-mobile-user-interfaces/
 * @param {Function} callback - Fonction appelee apres long-press
 * @param {number} delay - Duree en ms (defaut 500)
 */
export function useLongPress(callback, delay = 500) {
  const timerRef = useRef(null);
  const targetRef = useRef(null);

  const start = useCallback((e) => {
    targetRef.current = e.currentTarget;
    timerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(15);
      callback(e);
    }, delay);
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };
}
