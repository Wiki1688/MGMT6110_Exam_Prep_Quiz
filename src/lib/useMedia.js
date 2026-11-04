import { useEffect, useState } from 'react';

// Layout queries for the Honor Magic V3 (and other foldables).
// Cover screen ≈ 385×860 CSS px (tall, narrow). Inner screen ≈ 785×850 / 850×785 (near-square).
export const Q_COVER = '(max-width: 420px)';
export const Q_SPLIT = '(min-width: 600px) and (min-aspect-ratio: 4/5) and (max-aspect-ratio: 5/4), (min-width: 1100px)';

/** Re-evaluates on resize / fold / unfold (matchMedia change events), so layout switches without losing state. */
export function useMedia(query) {
  const get = () => {
    try { return window.matchMedia(query).matches; } catch { return false; }
  };
  const [match, setMatch] = useState(get);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(query); } catch { return undefined; }
    const on = () => setMatch(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    window.addEventListener('resize', on);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on);
      window.removeEventListener('resize', on);
    };
  }, [query]);
  return match;
}
