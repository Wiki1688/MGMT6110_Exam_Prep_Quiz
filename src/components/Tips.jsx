import React from 'react';
import { FORMAT, RUBRIC, WORKED, LOSE_POINTS, TIPS, BEFORE_SUBMIT, REVISE } from '../lib/tips.js';

export default function Tips() {
  return (
    <div className="tips-page">
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--brand-soft), var(--card))' }}>
        <h1>The final exam: how it is marked</h1>
        <p className="muted">From Prof Roh's revision pack (pp. 3, 4, 152, 153). Final exam: Thu 12 Nov 2026, 1 pm — please check the date and venue on eLearn.</p>
      </div>

      <div className="section-title"><h2>Format</h2></div>
      <div className="card" data-testid="format">
        <div className="table-scroll">
          <table className="rubric-table">
            <thead><tr>{FORMAT.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
            <tbody>{FORMAT.rows.map((r) => <tr key={r[0]}><th>{r[0]}</th><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
          </table>
        </div>
        <ul style={{ marginTop: 10 }}>{FORMAT.facts.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>

      <div className="section-title"><h2>Part B: the 4-point answer</h2></div>
      <div className="card" data-testid="rubric">
        <div className="table-scroll">
          <table className="rubric-table">
            <thead><tr><th>Point</th><th>Step</th><th>What a full answer does</th></tr></thead>
            <tbody>{RUBRIC.map((r) => <tr key={r.pt}><td><b>{r.pt}</b> 1 point</td><td><span className={'step-chip step-' + r.step.toLowerCase()}>{r.step}</span></td><td>{r.what}</td></tr>)}</tbody>
          </table>
        </div>
        <h3 style={{ marginTop: 14 }}>Worked example (Quiz 1, Question 5)</h3>
        <div className="worked">
          <p><b>Question.</b> {WORKED.q}</p>
          {WORKED.parts.map(([step, text]) => <p key={step}><span className={'step-chip step-' + step.toLowerCase()}>{step}</span> {text}</p>)}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>{WORKED.note}</p>
      </div>

      <div className="section-title"><h2>Where Part B answers lose points</h2></div>
      <div className="card" data-testid="lose-points">
        <div className="table-scroll">
          <table className="rubric-table">
            <thead><tr><th>What the answer did</th><th>Why it loses a point</th><th>What to write instead</th></tr></thead>
            <tbody>{LOSE_POINTS.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>"Write in full sentences, and show your working where there is a number or a placement. A short answer that does all four parts earns more than a long one that only defines." (p.152)</p>
      </div>

      <div className="section-title"><h2>Exam-room tips</h2></div>
      <div className="tips-grid">
        {TIPS.map((t) => (
          <div key={t.title} className="card lift tip-card">
            <span className="ic" aria-hidden>{t.icon}</span>
            <div><div className="t">{t.title}</div><div className="b">{t.body}</div></div>
          </div>
        ))}
      </div>

      <div className="section-title"><h2>How to revise this week (p.153)</h2></div>
      <div className="card"><ol className="rules">{REVISE.map((r) => <li key={r}><span>{r}</span></li>)}</ol></div>

      <div className="section-title"><h2>Thirty seconds before you hand in</h2></div>
      <div className="card"><ol className="rules">{BEFORE_SUBMIT.map((r) => <li key={r}><span>{r}</span></li>)}</ol></div>
    </div>
  );
}
