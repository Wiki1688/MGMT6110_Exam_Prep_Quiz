import React, { useMemo } from 'react';
import { fmtTime, summaryMessage } from '../lib/utils.js';
import { shortTitle } from '../lib/topics.js';
import { Confetti } from './Ring.jsx';
import PriorityBadge from './Badge.jsx';
import { answerFraction } from '../lib/storage.js';

export default function Summary({ summary, topics, progress, startSession, go }) {
  if (!summary) return <NoSummary go={go} />;
  return <SummaryBody summary={summary} topics={topics} progress={progress} startSession={startSession} go={go} />;
}

const round2 = (x) => Math.round(x * 100) / 100;

function NoSummary({ go }) {
  {
    return (
      <div className="narrow card">
        <h2>No session yet</h2>
        <p className="muted">Finish a practice session to see your score here.</p>
        <button className="btn primary" onClick={() => go('home')}>Go home</button>
      </div>
    );
  }
}

function SummaryBody({ summary, topics, progress, startSession, go }) {
  const { score, total, answered, pct, seconds, questions, results, title, mode } = summary;
  const marks = summary.marks || {};
  const frac = (q) => (results[q.id] != null ? answerFraction(results[q.id], marks[q.id]) : 0);
  const perTopic = useMemo(() => {
    const m = new Map();
    for (const q of questions) {
      const s = m.get(q.topic) || { total: 0, score: 0 };
      s.total += 1;
      s.score += frac(q);
      m.set(q.topic, s);
    }
    return topics.filter((t) => m.has(t.id)).map((t) => ({ ...t, ...m.get(t.id), score: Math.round(m.get(t.id).score * 100) / 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, results, topics]);
  const wrong = questions.filter((q) => results[q.id] === 'wrong' || results[q.id] === 'partly');
  const skipped = questions.filter((q) => results[q.id] == null);
  const r = 64, c = 2 * Math.PI * r, dash = (pct / 100) * c;
  const perfect = total > 0 && pct === 100 && answered === total;
  const best = progress.best?.[mode];
  const isBest = best && best.at === summary.at;

  return (
    <div className="narrow">
      {perfect && <Confetti />}
      <div className="card">
        <div className="score-hero">
          <div className="score-ring">
            <svg viewBox="0 0 150 150" aria-hidden>
              <circle className="bg" cx="75" cy="75" r={r} fill="none" strokeWidth="12" />
              <circle className="fg" cx="75" cy="75" r={r} fill="none" strokeWidth="12" strokeDasharray={`${dash} ${c - dash}`} style={{ stroke: pct >= 75 ? 'var(--ok)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)' }} />
            </svg>
            <div className="lbl"><b>{pct}%</b><small>{score} / {total}</small></div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="small muted">{title}</div>
            <h1 style={{ marginBottom: 6 }}>{perfect ? 'Perfect!' : pct >= 75 ? 'Well done' : pct >= 50 ? 'Getting there' : 'Keep practising'}</h1>
            <p>{summaryMessage(pct, answered)}</p>
            {summary.parts && (
              <div className="btn-row" style={{ marginBottom: 8 }} data-testid="mock-parts">
                <span className="chip brand">Part A {round2(summary.parts.A.score)}/{summary.parts.A.total}</span>
                <span className="chip brand">Part B {round2(summary.parts.B.score)}/{summary.parts.B.total}</span>
                <span className="chip">Total {round2(score)}/{total} points</span>
              </div>
            )}
            <div className="btn-row">
              <span className="chip">⏱ {fmtTime(seconds)}</span>
              <span className="chip">{answered} answered{skipped.length ? ` · ${skipped.length} skipped` : ''}</span>
              {isBest && <span className="chip ok">🏆 New best for this mode</span>}
              {best && !isBest && <span className="chip">Best: {best.pct}%</span>}
            </div>
          </div>
        </div>
      </div>

      {perTopic.length > 0 && (
        <div className="card">
          <h2>By topic</h2>
          <div className="bars">
            {perTopic.map((t) => {
              const p = t.total ? Math.round((t.score / t.total) * 100) : 0;
              return (
                <div key={t.id} className="bar-row" title={t.title}>
                  <b style={{ color: t.color }}>{t.id}</b>
                  <div className="track"><div className="fill" style={{ width: `${p}%`, background: t.color }} /></div>
                  <span className="r">{t.score}/{t.total} · {p}%</span>
                </div>
              );
            })}
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>{perTopic.map((t) => `${t.id} = ${shortTitle(t)}`).join(' · ')}</div>
        </div>
      )}

      {wrong.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 10px' }}>
            <h2>To retry ({wrong.length})</h2>
            <button className="btn sm primary" onClick={() => startSession({ mode: 'retry', title: 'Retry wrong ones', questions: wrong.map((q) => q.id) })}>Retry these →</button>
          </div>
          <div className="wrong-list">
            {wrong.map((q) => {
              const t = topics.find((x) => x.id === q.topic);
              return (
                <div key={q.id} className="wrong-item">
                  <span className="chip topic" style={{ background: t?.color }}>{q.topic}</span>
                  <div className="stem-s">
                    <div style={{ marginBottom: 4 }}><PriorityBadge q={q} />{marks[q.id] ? <span className="chip warn" style={{ marginLeft: 6 }}>{marks[q.id].score}/{marks[q.id].of}</span> : null}</div>
                    {q.stem.length > 400 ? q.stem.slice(0, 400) + '…' : q.stem}
                    {q.type === 'mcq' && <div className="small" style={{ color: 'var(--ok)', marginTop: 4 }}>✓ {q.options[q.answer]}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="btn-row">
          <button className="btn primary" onClick={() => go('home')}>🏠 Home</button>
          {mode === 'quiz40' && <button className="btn" onClick={() => startSession({ mode: 'quiz40', title: "Prof Roh's 40 quiz questions" })}>🏅 The 40 again</button>}
          {mode === 'core' && <button className="btn" onClick={() => startSession({ mode: 'core', title: 'Exam core set' })}>🎯 Core set again</button>}
          {mode === 'partb' && <button className="btn" onClick={() => startSession({ mode: 'partb', title: 'Part B practice (short questions)' })}>✍️ Part B again</button>}
          {mode === 'mock' && <button className="btn" onClick={() => startSession({ mode: 'mock', title: 'Mock final', timerMinutes: 120 })}>📝 New mock final</button>}
          <button className="btn ghost" onClick={() => go('tips')}>💡 Exam format & tips</button>
        </div>
      </div>
    </div>
  );
}
