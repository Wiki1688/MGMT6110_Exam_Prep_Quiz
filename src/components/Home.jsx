import React, { useMemo, useState } from 'react';
import { EXAMS, daysLeft, daysLabel } from '../lib/utils.js';
import { shortTitle } from '../lib/topics.js';
import { Ring } from './Ring.jsx';

export default function Home({ content, pool, progress, settings, setSettings, startSession, profile }) {
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState('');

  const perTopic = useMemo(() => {
    const m = {};
    for (const t of content.topics) m[t.id] = { total: 0, answered: 0, correct: 0, quiz4: 0 };
    for (const q of content.questions) {
      const s = m[q.topic];
      s.total += 1;
      if (q.quiz4) s.quiz4 += 1;
      const a = progress.answers[q.id];
      if (a) {
        s.answered += 1;
        if (a.last === 'correct') s.correct += 1;
        else if (a.last === 'partly') s.correct += 0.5;
      }
    }
    return m;
  }, [content, progress]);

  const counts = useMemo(() => ({
    all: pool.length,
    quiz4: pool.filter((q) => q.quiz4).length,
    wrong: pool.filter((q) => ['wrong', 'partly'].includes(progress.answers[q.id]?.last)).length,
    flagged: pool.filter((q) => progress.flags[q.id]).length,
  }), [pool, progress]);

  const answeredAll = Object.keys(progress.answers).length;
  const accuracy = progress.totals?.answered ? Math.round((progress.totals.correct / progress.totals.answered) * 100) : null;

  const start = (spec) => {
    const ok = startSession(spec);
    if (!ok) setMsg('No questions match that choice yet. Try different filters or a different mode.');
  };

  const topicTitle = !selected.length || selected.length === content.topics.length ? 'Topic practice (all topics)' : selected.length > 4 ? `Topic practice (${selected.length} topics)` : `Topic practice (${selected.join(', ')})`;
  const toggleTopic = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const sel = settings;
  const setType = (t) => setSettings((s) => ({ ...s, types: { ...s.types, [t]: !s.types[t] } }));
  const setDiff = (d) => setSettings((s) => ({ ...s, difficulty: { ...s.difficulty, [d]: !s.difficulty[d] } }));

  return (
    <div className="hero">
      {/* Countdown */}
      <div className="countdown">
        {EXAMS.map((e) => {
          const n = daysLeft(e.iso);
          return (
            <div key={e.key} className={'cd-chip' + (n >= 0 && n <= 3 ? ' soon' : '')}>
              <div className="cd-days">{n < 0 ? '✓' : n}<small>{n < 0 ? 'done' : n === 1 ? 'day' : 'days'}</small></div>
              <div>
                <div className="cd-label">{e.label} · {e.when}</div>
                <div className="cd-sub">{e.sub} · {daysLabel(n)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="stat-row">
        <div className="stat"><span style={{ fontSize: '1.5rem' }}>{profile?.emoji || '👤'}</span><div><div className="n" style={{ fontSize: '1.05rem' }}>{profile?.name || 'No profile'}</div><div className="l">studying now</div></div></div>
        <div className="stat"><span className={progress.streak?.count ? 'flame' : ''} style={{ fontSize: '1.5rem' }}>🔥</span><div><div className="n">{progress.streak?.count || 0}</div><div className="l">day streak (best {progress.streak?.best || 0})</div></div></div>
        <div className="stat"><span style={{ fontSize: '1.5rem' }}>✅</span><div><div className="n">{answeredAll}<span className="muted" style={{ fontSize: '0.9rem', fontWeight: 600 }}> / {content.questions.length}</span></div><div className="l">questions seen</div></div></div>
        <div className="stat"><span style={{ fontSize: '1.5rem' }}>🎯</span><div><div className="n">{accuracy == null ? '–' : accuracy + '%'}</div><div className="l">accuracy so far</div></div></div>
      </div>

      {msg && <div className="banner" role="status">{msg} <button className="btn sm ghost" onClick={() => setMsg('')}>OK</button></div>}

      {/* Modes */}
      <div className="section-title"><h2>Practice modes</h2><span className="small muted">{counts.all} questions in pool</span></div>
      <div className="modes">
        <button className="mode hero-mode" onClick={() => start({ mode: 'quiz4', title: 'Quiz 4 set (4 Nov)', timerMinutes: null })} disabled={!counts.quiz4}>
          <span className="ic">🎯</span>
          <span><div className="t">Quiz 4 set (4 Nov)</div><div className="d">{counts.quiz4} questions most likely on Wednesday, heavy on Weeks 8–9</div></span>
        </button>
        <button className="mode" onClick={() => start({ mode: 'quick10', title: 'Quick 10', count: 10, timerMinutes: 15, shuffleQ: true })} disabled={counts.all < 1}>
          <span className="ic">⚡</span>
          <span><div className="t">Quick 10</div><div className="d">10 random questions, 15-minute timer, like the real quiz</div></span>
        </button>
        <button className="mode" onClick={() => start({ mode: 'mock', title: 'Full mock exam', count: 30, timerMinutes: 45, shuffleQ: true })} disabled={counts.all < 1}>
          <span className="ic">📝</span>
          <span><div className="t">Full mock exam</div><div className="d">30 random questions across all topics, 45 min</div></span>
        </button>
        <button className="mode" onClick={() => start({ mode: 'topic', title: topicTitle, topics: selected })} disabled={!counts.all}>
          <span className="ic">📚</span>
          <span><div className="t">Topic practice</div><div className="d">{selected.length ? `${selected.length} topic${selected.length > 1 ? 's' : ''} selected: ${selected.join(', ')}` : 'Tap topic cards below to choose one or many, then start'}</div></span>
        </button>
        <button className="mode" onClick={() => start({ mode: 'wrong', title: 'Review wrong' })} disabled={!counts.wrong}>
          <span className="ic">🔁</span>
          <span><div className="t">Review wrong</div><div className="d">{counts.wrong ? `${counts.wrong} to retry` : 'Nothing wrong yet'}</div></span>
        </button>
        <button className="mode" onClick={() => start({ mode: 'flagged', title: 'Review flagged' })} disabled={!counts.flagged}>
          <span className="ic">⭐</span>
          <span><div className="t">Review flagged</div><div className="d">{counts.flagged ? `${counts.flagged} flagged to revise` : 'Star a question to flag it'}</div></span>
        </button>
      </div>

      {/* Options */}
      <details className="card" style={{ marginTop: 4 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, minHeight: 28 }}>⚙️ Options — order, question types, difficulty, timer</summary>
        <div className="options-panel" style={{ marginTop: 12 }}>
          <div className="row">
            <label className="toggle"><input type="checkbox" checked={sel.shuffleQ} onChange={() => setSettings((s) => ({ ...s, shuffleQ: !s.shuffleQ }))} /><span className="track" /><span>Randomise question order</span></label>
            <label className="toggle"><input type="checkbox" checked={sel.shuffleOpts} onChange={() => setSettings((s) => ({ ...s, shuffleOpts: !s.shuffleOpts }))} /><span className="track" /><span>Randomise option order</span></label>
            <label className="toggle"><input type="checkbox" checked={sel.timer} onChange={() => setSettings((s) => ({ ...s, timer: !s.timer }))} /><span className="track" /><span>Timer (Quick 10 and mock)</span></label>
          </div>
          <div className="row">
            <span className="lab">Question types</span>
            <div className="pill-group">
              {[['mcq', 'MCQ'], ['matching', 'Matching'], ['short', 'Short answer']].map(([k, l]) => (
                <button key={k} className={'pill' + (sel.types[k] ? ' on' : '')} onClick={() => setType(k)} aria-pressed={!!sel.types[k]}>{l}</button>
              ))}
            </div>
          </div>
          <div className="row">
            <span className="lab">Difficulty</span>
            <div className="pill-group">
              {[[1, '● Easy'], [2, '●● Medium'], [3, '●●● Hard']].map(([k, l]) => (
                <button key={k} className={'pill' + (sel.difficulty[k] ? ' on' : '')} onClick={() => setDiff(k)} aria-pressed={!!sel.difficulty[k]}>{l}</button>
              ))}
            </div>
          </div>
          <div className="small muted">Mock exams always shuffle question order. Content version: {content.version}{content.warnings.length ? ` · ${content.warnings.length} content warning(s), see console` : ''}</div>
        </div>
      </details>

      {/* Topics */}
      <div className="section-title">
        <h2>Topics</h2>
        {selected.length > 0 ? (
          <span className="btn-row">
            <button className="btn sm ghost" onClick={() => setSelected([])}>Clear</button>
            <button className="btn sm primary" onClick={() => start({ mode: 'topic', title: topicTitle, topics: selected })}>Start {selected.length} topic{selected.length > 1 ? 's' : ''} →</button>
          </span>
        ) : (
          <span className="small muted">tap to select for practice</span>
        )}
      </div>
      <div className="topics">
        {content.topics.map((t) => {
          const s = perTopic[t.id];
          const pct = s.total ? (s.correct / s.total) * 100 : 0;
          const on = selected.includes(t.id);
          return (
            <button key={t.id} className={'topic-card' + (on ? ' selected' : '')} style={{ '--tc': t.color }} onClick={() => toggleTopic(t.id)} aria-pressed={on} disabled={!s.total} title={t.title}>
              <div className="body">
                <div className="id">{t.id} · {t.week}{s.quiz4 ? ' · Q4 ×' + s.quiz4 : ''}</div>
                <div className="tt">{shortTitle(t)}</div>
                <div className="meta">{s.total ? `${s.answered}/${s.total} answered · ${Math.round(s.correct)} correct` : 'no questions yet'}</div>
              </div>
              <Ring pct={pct} color={t.color} label={s.total ? `${Math.round(pct)}%` : '–'} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
