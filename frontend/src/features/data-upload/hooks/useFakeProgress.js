import { useCallback, useEffect, useState } from "react";

export function useFakeProgress(active) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!active) {
      setPct(0);
      return undefined;
    }

    let mounted = true;

    setPct(0);

    const timer = window.setInterval(() => {
      if (!mounted) return;

      setPct((previous) => {
        const cap = 95;

        if (previous >= cap) return cap;

        const remaining = cap - previous;
        const step = Math.max(1, Math.round(remaining * 0.12));

        return Math.min(cap, previous + step);
      });
    }, 220);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [active]);

  const finish = useCallback(() => {
    setPct(100);
  }, []);

  return { pct, finish };
}