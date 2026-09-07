import { useEffect } from 'react';
import { Platform } from 'react-native';

interface Options {
  itemCount: number;
  columns: number;
  focusedIdx: number;
  setFocusedIdx: (idx: number) => void;
  onActivate?: (idx: number) => void;
  enabled?: boolean;
}

/**
 * Web-only grid keyboard navigation.
 *
 * Arrow keys move focus respecting the column count; Home/End jump to first/last;
 * Enter or Space activates `onActivate`. No-op on native (touch-driven).
 */
export function useKeyboardGridNav({
  itemCount,
  columns,
  focusedIdx,
  setFocusedIdx,
  onActivate,
  enabled = true,
}: Options) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || itemCount === 0) return;
    if (typeof window === 'undefined') return;

    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const cur = focusedIdx < 0 ? 0 : focusedIdx;
      let next = cur;

      switch (e.key) {
        case 'ArrowRight':
          next = Math.min(itemCount - 1, cur + 1);
          break;
        case 'ArrowLeft':
          next = Math.max(0, cur - 1);
          break;
        case 'ArrowDown':
          next = Math.min(itemCount - 1, cur + columns);
          break;
        case 'ArrowUp':
          next = Math.max(0, cur - columns);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = itemCount - 1;
          break;
        case 'Enter':
        case ' ':
          if (onActivate && cur >= 0 && cur < itemCount) {
            e.preventDefault();
            onActivate(cur);
          }
          return;
        default:
          return;
      }

      if (next !== cur) {
        e.preventDefault();
        setFocusedIdx(next);
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [itemCount, columns, focusedIdx, setFocusedIdx, onActivate, enabled]);
}
