import { useState, type KeyboardEvent } from 'react';

/** One focusable element, arrow keys move an active index through `count` items. */
export function useRovingIndex(count: number) {
  const [index, setIndex] = useState<number | null>(null);
  const move = (to: number) => setIndex(((to % count) + count) % count);
  const onKeyDown = (event: KeyboardEvent) => {
    const current = index ?? -1;
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(current + 1),
      ArrowDown: () => move(current + 1),
      ArrowLeft: () => move(current < 0 ? count - 1 : current - 1),
      ArrowUp: () => move(current < 0 ? count - 1 : current - 1),
      Home: () => move(0),
      End: () => move(count - 1),
      Escape: () => setIndex(null),
    };
    const action = keys[event.key];
    if (action && count > 0) {
      event.preventDefault();
      action();
    }
  };
  return { index, setIndex, onKeyDown };
}
