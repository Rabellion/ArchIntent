import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  /** Final value to count up to. */
  end: number;
  /** Animation duration in ms. */
  duration?: number;
  /** Decimal places to keep in the animated value (e.g. 1 for "8.5"). */
  decimals?: number;
}

interface UseCountUpResult {
  /** Attach to the element that should trigger the count when scrolled into view. */
  ref: React.RefObject<HTMLElement | null>;
  /** Current animated value, already rounded to `decimals`. */
  value: number;
}

/**
 * Counts a number up from 0 to `end` once the attached element scrolls
 * into view, using requestAnimationFrame (compositor-friendly, no
 * scroll-handler churn) and an IntersectionObserver so the animation
 * only fires when a visitor actually reaches the stats section rather
 * than on page load while it's still off-screen.
 */
export function useCountUp({ end, duration = 1800, decimals = 0 }: UseCountUpOptions): UseCountUpResult {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect reduced-motion preferences: jump straight to the final
    // value instead of animating.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const runAnimation = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      if (prefersReducedMotion) {
        setValue(end);
        return;
      }

      const start = performance.now();
      const factor = Math.pow(10, decimals);

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic: fast start, gentle settle -- reads as "counting
        // up" rather than a linear, mechanical tick.
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(end * eased * factor) / factor);

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          runAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [end, duration, decimals]);

  return { ref, value };
}
