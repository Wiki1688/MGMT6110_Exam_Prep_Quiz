import React, { useMemo, useState } from 'react';
import { FINAL_EXAM, daysLeft, examMessage, fmtTime, fmtDate } from '../lib/utils.js';
import { shortTitle } from '../lib/topics.js';
import { isFlagged, progressStats } from '../lib/storage.js';
import { Ring } from './Ring.jsx';

const BACKUP_EVERY_MS = 3 * 86400000;

function backupDismissed() {
  try { return sessionStorage.getItem('mgmt6110quiz:backupLater') === '1'; } catch { return false; }
}

export default function Home({ content, pool, progress, settings, setSettings, startSession, profile, savedSession, onResume, onDiscardSaved, onBackup }) {
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState('');
  const [later, setLater] = useState(backupDismissed);

  const perTopic = useMemo(() => {
    const m = {};
    for (const t of content.topics) m[t.id] = { total: 0, answered: 0, correct: 0, core: 0 };
    for (const q of content.questions) {
      const s = m[q.topic];
      if (!s) continue;
      s.total += 1;
      if (q.core) s.core += 1;
      const a = progress.answers[q.id];
      if (a) {
        s.answered += 1;
        if (a.last === 'correct') s.correct += 1;
        else if (a.last === 'partly') s.correct += 0.5;
      }
    }
    return m;
  }, [content, progress]);

  const allShort = useMemo(() => content.questions.filter((q) => q.type === 'short'), [content]);
  const counts = useMemo(() => ({
    all: pool.length,
    core: pool.filter((q) => q.core).length,
    anyCore: content.questions.some((q) => q.core),
    short: allShort.filter((q) => !selected.length || selected.includes(q.topic)).length,
    wrong: pool.filter((q) => ['wrong', 'partly'].includes(progress.answers[q.id]?.last)).length,
    flagged: pool.filter((q) => isFlagged(progress, q.id)).length,
  }), [pool, progress, content, allShort, selected]);

  const stats = useMemo(() => progressStats(progress, content.questions.map((q) => q.id)), [progress, content]);
  const n = daysLeft(FINAL_EXAM.iso);
  const needBackup = stats.answered > 20 && Date.now() - (progress.backupAt || 0) > BACKUP_EVERY_MS && !later;

  const start = (spec) => {
    const ok = startSession(spec);
    if (!ok) setMsg('No questions match that choice yet. Try different filters or a different mode.');
  };

  const topicTitle = !selected.length || selected.length === content.topics.length ? 'Topic practice (all topics)' : selected.length > 4 ? `Topic practice (${selected.length} topics)` : `Topic practice (${selected.join(', ')})`;
  const shortTitleText = selected.length ? `Short questions (${selected.length > 4 ? selected.length + ' topics' : selected.join(', ')})` : 'Short questions (all topics)';
  const toggleTopic = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const sel = settings;
  const setType = (t) => setSettings((s) => ({ ...s, types: { ...s.types, [t]: !s.types[t] } }));
  const setDiff = (d) => setSettings((s) => ({ ...s, difficulty: { ...s.difficulty, [d]: !s.difficulty[d] } }));

  return (
    <div className="hero">
      {/* Countdown: the final only (Quiz 4 is over) */}
      <div className={'countdown-card' + (n >= 0 && n <= 3 ? ' soon' : '') + (n === 0 ? ' exam-day' : '')} data-testid="countdown">
        <div className="cd-days">{n < 0 ? '✓' : n === 0 ? '🎯' : n}<small>{n < 0 ? 'done' : n === 0 ? 'today' : n === 1 ? 'day left' : 'days left'}</small></div>
        <div>
          <div className="cd-label">{FINAL_EXAM.label} · {FINAL_EXAM.when}</div>
          <div className="cd-sub">{FINAL_EXAM.sub}</div>
          <div className="cd-msg">{examMessage(n)}</div>
        </div>
      </div>

      {savedSession && (
        <div className="resume-card" data-testid="resume-card">
          <span className="ic" aria-hidden>▶️</span>
          <div className="rc-body">
            <div className="rc-title">Resume your session (Q {savedSession.index + 1} of {savedSession.total})</div>
            <div className="rc-sub">{savedSession.title} · {savedSession.answered} answered{savedSession.timerLeft != null ? ` · ${fmtTime(savedSession.timerLeft)} left on the timer` : ''}{savedSession.savedAt ? ` · ${fmtDate(savedSession.savedAt)}` : ''}</div>
          </div>
          <div className="btn-row">
            <button className="btn primary" onClick={onResume}>Resume →</button>
            <button className="btn ghost sm" onClick={() => { if (confirm('Discard the saved session? Your answers stay in your progress.')) onDiscardSaved(); }}>Discard</button>
          </div>
        </div>
      )}

      {needBackup && (
        <div className="banner backup" role="status" data-testid="backup-banner">
          <b>💾 Back up your progress.</b> {progress.backupAt ? `Last backup ${fmtDate(progress.backupAt)}.` : 'You have not made a backup yet.'} One tap saves a small file you can import on any device.
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn sm primary" onClick={onBackup}>Back up now</button>
            <button className="btn sm ghost" onClick={() => { try { sessionStorage.setItem('mgmt6110quiz:backupLater', '1'); } catch { /* ignore */ } setLater(true); }}>Later</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-row">
        <div className="stat"><span className="si">{profile?.emoji || '👤'}</span><div><div className="n sm">{profile?.name || 'No profile'}</div><div className="l">{progress.streak?.count ? `🔥 ${progress.streak.count}-day streak` : 'studying now'}</div></div></div>
        <div className="stat"><span className="si">✅</span><div><div className="n" data-stat="answered">{stats.answered}<span className="of"> / {content.questions.length}</span></div><div className="l">answered</div></div></div>
        <div className="stat"><span className="si">🎯</span><div><div className="n" data-stat="correct">{stats.correct}</div><div className="l">correct last time{stats.accuracy != null ? ` · ${stats.accuracy}% overall` : ''}</div></div></div>
        <div className="stat"><span className="si">⭐</span><div><div className="n" data-stat="flagged">{stats.flagged}</div><div className="l">flagged</div></div></div>
      </div>

      {msg && <div className="banner" role="status">{msg} <button className="btn sm ghost" onClick={() => setMsg('')}>OK</button></div>}

      {/* Modes */}
      <div className="section-title"><h2>Practice modes</h2><span className="small muted">{counts.all} questions in pool</span></div>
      <div className="modes">
        {counts.anyCore && (
          <button className="mode hero-mode" onClick={() => start({ mode: 'core', title: 'Exam core set', topics: selected })} disabled={!counts.core}>
            <span className="ic">🎯</span>
            <span><div className="t">Exam core set</div><div className="d">{counts.core} questions most likely to be examined on 12 Nov{selected.length ? ' · in your selected topics' : ''}</div></span>
          </button>
        )}
        <button className="mode" onClick={() => start({ mode: 'quick10', title: 'Quick 10', count: 10, timerMinutes: 15, shuffleQ: true })} disabled={counts.all < 1}>
          <span className="ic">⚡</span>
          <span><div className="t">Quick 10</div><div className="d">10 random questions, 15-minute timer</div></span>
        </button>
        <button className="mode" onClick={() => start({ mode: 'mock', title: 'Full mock exam', count: 30, timerMinutes: 45, shuffleQ: true })} disabled={counts.all < 1}>
          <span className="ic">📝</span>
          <span><div className="t">Full mock exam</div><div className="d">30 random questions across all topics, 45 min</div></span>
        </button>
        <button className="mode" data-testid="mode-short" onClick={() => start({ mode: 'short', title: shortTitleText, topics: selected })} disabled={!counts.short}>
          <span className="ic">✍️</span>
          <span><div className="t">Short questions</div><div className="d">{counts.short} short-answer questions{selected.length ? ' in your selected topics' : ' · tap topics below to filter'}. Write, reveal, self-grade.</div></span>
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
          const s = perTopic[t.id] || { total: 0, answered: 0, correct: 0 };
          const pct = s.total ? (s.correct / s.total) * 100 : 0;
          const on = selected.includes(t.id);
          return (
            <button key={t.id} className={'topic-card' + (on ? ' selected' : '')} style={{ '--tc': t.color }} onClick={() => toggleTopic(t.id)} aria-pressed={on} disabled={!s.total} title={t.title}>
              <div className="body">
                <div className="id">{t.id}{t.week ? ' · ' + t.week : ''}{s.core ? ' · core ×' + s.core : ''}</div>
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
