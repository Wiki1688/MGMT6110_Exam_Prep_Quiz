import React from 'react';

/** Small circular progress ring. pct 0..100 */
export function Ring({ pct = 0, label, color, size = 54, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="ring" style={{ width: size, height: size, '--tc': color }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} aria-hidden>
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        {dash > 0 && <circle className="fg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeDasharray={`${dash} ${c - dash}`} />}
      </svg>
      <div className="lbl">{label ?? `${Math.round(pct)}%`}</div>
    </div>
  );
}

export function Confetti({ count = 120 }) {
  const colors = ['#6366f1', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899', '#ef4444'];
  const pieces = Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 1.6 + Math.random() * 1.2,
    color: colors[i % colors.length],
    rot: Math.random() * 360,
  }));
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

export function Burst() {
  const colors = ['#16a34a', '#4ade80', '#0ea5e9', '#f59e0b'];
  const dots = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const d = 46 + Math.random() * 30;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, c: colors[i % colors.length] };
  });
  return (
    <span className="burst" aria-hidden>
      {dots.map((d, i) => (
        <i key={i} style={{ '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, background: d.c }} />
      ))}
    </span>
  );
}
