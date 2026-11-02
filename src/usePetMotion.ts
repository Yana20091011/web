import { useLayoutEffect, useRef } from 'react';

// Restart movement without remounting the image player and interrupting its idle blink.
export function usePetMotion(trigger: number) {
  const element = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    node.style.animation = 'none';
    void node.offsetWidth;
    node.style.animation = '';
  }, [trigger]);
  return element;
}
