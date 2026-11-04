import React from 'react';
import { TIPS, BEFORE_SUBMIT } from '../lib/tips.js';

export default function Tips() {
  return (
    <div>
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--brand-soft), var(--card))' }}>
        <h1>Tips & Traps</h1>
        <p className="muted">How Prof Roh writes questions, and how to read them. The final exam is on Thu 12 Nov 2026 at 1 pm: 2 hours, closed book, MCQ plus short scenario questions.</p>
      </div>
      <div className="section-title"><h2>Exam tips</h2></div>
      <div className="tips-grid">
        {TIPS.map((t) => (
          <div key={t.title} className="card lift tip-card">
            <span className="ic" aria-hidden>{t.icon}</span>
            <div><div className="t">{t.title}</div><div className="b">{t.body}</div></div>
          </div>
        ))}
      </div>
      <div className="section-title"><h2>Thirty seconds before you click Submit</h2></div>
      <div className="card">
        <ol className="rules">{BEFORE_SUBMIT.map((r) => <li key={r}><span>{r}</span></li>)}</ol>
      </div>
    </div>
  );
}
