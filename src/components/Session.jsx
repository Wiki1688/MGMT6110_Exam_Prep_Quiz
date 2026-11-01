import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LETTERS, fmtTime, encouragementFor, gradeShort, escapeHtml, shuffle, highlightTerms } from '../lib/utils.js';
import { Burst } from './Ring.jsx';

export default function Session({ session, setSession, progress, onAnswer, onFlag, onFinish, onQuit, topics }) {
  const { questions, index, results, timerSec, startedAt } = session;
  const q = questions[index];
  const total = questions.length;
  const topic = topics.find((t) => t.id === q.topic);
  const answered = results[q.id] != null;
  const [inter, setInter] = useState(null); // encouragement text
  const [left, setLeft] = useState(timerSec);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const sessionRef = useRef(session);
  sessionRef.current = session; // latest answers, so a timeout keeps them

  // timer
  useEffect(() => {
    if (timerSec == null) return;
    const tick = () => {
      const l = timerSec - Math.floor((Date.now() - startedAt) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(id); finishRef.current(sessionRef.current); }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSec, startedAt]);

  const setQState = (patch) => setSession((s) => ({ ...s, qstate: { ...(s.qstate || {}), [q.id]: { ...((s.qstate || {})[q.id] || {}), ...patch } } }));
  const qstate = (session.qstate || {})[q.id] || {};

  const goTo = (i) => {
    setSession((s) => ({ ...s, index: Math.max(0, Math.min(total - 1, i)) }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => {
    const n = index + 1;
    if (n >= total) return onFinish(session);
    const done = Object.keys(results).length;
    if (answered && n % 5 === 0 && !(session.shown || {})[n]) {
      setSession((s) => ({ ...s, shown: { ...(s.shown || {}), [n]: true } }));
      setInter(encouragementFor(Math.floor(n / 5) - 1 + (done % 3)));
      return;
    }
    goTo(n);
  };
  const prev = () => goTo(index - 1);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (inter) { if (e.key === 'Enter' || e.key === 'ArrowRight') { setInter(null); goTo(index + 1); } return; }
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && answered)) { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') prev();
      else if (q.type === 'mcq' && !answered) {
        const k = e.key.toUpperCase();
        let i = -1;
        if (/^[1-9]$/.test(k)) i = Number(k) - 1;
        else if (/^[A-H]$/.test(k)) i = LETTERS.indexOf(k);
        if (i >= 0 && i < q.options.length) document.getElementById(`opt-${i}`)?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pct = (Object.keys(results).length / total) * 100;
  const flagged = !!progress.flags[q.id];

  if (inter) {
    return (
      <div className="narrow">
        <div className="card interstitial">
          <div className="big">{['🌱', '💪', '🧠', '🚀', '✨'][Math.floor(index / 5) % 5]}</div>
          <h2>{index + 1} of {total} done</h2>
          <p>{inter}</p>
          <button className="btn primary" autoFocus onClick={() => { setInter(null); goTo(index + 1); }}>Continue →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="narrow">
      <div className="session-top">
        <button className="btn sm ghost" onClick={() => { if (Object.keys(results).length === 0 || confirm('Finish this session now? Your answers so far are kept.')) onFinish(session); }}>✕ Finish</button>
        <div className="progress" aria-label="Progress"><div style={{ width: `${pct}%` }} /></div>
        <span className="small" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Q {index + 1} / {total}</span>
        {timerSec != null && <span className={'timer' + (left != null && left <= 60 ? ' low' : '')} aria-live="polite">⏱ {fmtTime(left ?? timerSec)}</span>}
      </div>

      <div className="card qcard" key={q.id}>
        <div className="qhead">
          <span className="chip topic" style={{ background: topic?.color || '#64748B' }}>{q.topic}</span>
          <span className="chip">{q.type === 'mcq' ? 'MCQ' : q.type === 'matching' ? 'Matching' : 'Short answer'}</span>
          <span className="chip" title="difficulty">{'●'.repeat(q.difficulty)}{'○'.repeat(3 - q.difficulty)}</span>
          {q.quiz4 && <span className="chip brand">Quiz 4</span>}
          <button className={'flag-btn' + (flagged ? ' on' : '')} onClick={() => onFlag(q.id)} aria-pressed={flagged} title="Flag to revise">
            <span className="star">{flagged ? '★' : '☆'}</span> {flagged ? 'Flagged' : 'Flag to revise'}
          </button>
        </div>
        <div className="stem">{q.stem}</div>

        {q.type === 'mcq' && <Mcq q={q} order={session.optOrder[q.id]} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
        {q.type === 'matching' && <Matching q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
        {q.type === 'short' && <Short q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}

        {answered && <AnswerPanel q={q} result={results[q.id]} order={session.optOrder[q.id]} />}
      </div>

      <div className="session-nav">
        <button className="btn" onClick={prev} disabled={index === 0}>← Previous</button>
        <button className={'btn' + (answered ? ' primary' : '')} onClick={next}>{index + 1 >= total ? 'Finish ✓' : answered ? 'Next →' : 'Skip →'}</button>
      </div>
      <div className="kbd no-print">Keys: <kbd>1</kbd>–<kbd>4</kbd> or <kbd>A</kbd>–<kbd>D</kbd> to answer · <kbd>←</kbd> <kbd>→</kbd> to move</div>
    </div>
  );
}

function Mcq({ q, order, qstate, setQState, onAnswer }) {
  const picked = qstate.picked; // original option index
  const [ripple, setRipple] = useState(null);
  const choose = (origIdx, e) => {
    if (picked != null) return;
    if (e) {
      const r = e.currentTarget.getBoundingClientRect();
      setRipple({ i: origIdx, x: e.clientX - r.left, y: e.clientY - r.top });
    }
    setQState({ picked: origIdx });
    onAnswer(q.id, origIdx === q.answer ? 'correct' : 'wrong');
  };
  return (
    <div className="options" role="group" aria-label="Options">
      {order.map((origIdx, shown) => {
        const isAns = origIdx === q.answer;
        const cls = ['opt'];
        if (picked != null) {
          if (isAns) cls.push('correct');
          else if (origIdx === picked) cls.push('wrong');
          else cls.push('dim');
        }
        return (
          <button key={origIdx} id={`opt-${shown}`} className={cls.join(' ')} onClick={(e) => choose(origIdx, e)} disabled={picked != null} aria-pressed={picked === origIdx}>
            {ripple && ripple.i === origIdx && <span className="ripple" style={{ left: ripple.x - 20, top: ripple.y - 20, width: 40, height: 40 }} />}
            <span className="k">{picked != null && isAns ? '✓' : picked === origIdx ? '✗' : LETTERS[shown]}</span>
            <span className="txt">{q.options[origIdx]}</span>
            {picked != null && isAns && picked === origIdx && <Burst />}
          </button>
        );
      })}
    </div>
  );
}

function Matching({ q, qstate, setQState, onAnswer }) {
  const rights = useMemo(() => {
    const list = [...new Set(q.pairs.map((p) => p.right))];
    return qstate.rightOrder || shuffle(list);
  }, [q, qstate.rightOrder]);
  useEffect(() => {
    if (!qstate.rightOrder) setQState({ rightOrder: rights });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choices = qstate.choices || {};
  const checked = !!qstate.checked;
  const allChosen = q.pairs.every((_, i) => choices[i] != null && choices[i] !== '');
  const check = () => {
    const correct = q.pairs.filter((p, i) => choices[i] === p.right).length;
    setQState({ checked: true, correct });
    onAnswer(q.id, correct === q.pairs.length ? 'correct' : correct === 0 ? 'wrong' : 'partly');
  };
  return (
    <div>
      <div className="match-grid">
        {q.pairs.map((p, i) => {
          const ok = checked ? choices[i] === p.right : null;
          return (
            <div key={i} className={'match-row' + (checked ? (ok ? ' ok' : ' bad') : '')}>
              <div className="left">{p.left}</div>
              <div className="pick">
              <select value={choices[i] || ''} disabled={checked} onChange={(e) => setQState({ choices: { ...choices, [i]: e.target.value } })} aria-label={`Match for ${p.left}`}>
                <option value="">— choose —</option>
                {rights.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {choices[i] && <div className="chosen-full">{choices[i]}</div>}
              </div>
              <div>
                {checked && <span className="mark" style={{ color: ok ? 'var(--ok)' : 'var(--bad)' }}>{ok ? '✓' : '✗'}</span>}
                {checked && !ok && <div className="fix">→ {p.right}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {!checked && (
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={check} disabled={!allChosen}>Check matches</button>
          <span className="small muted" style={{ alignSelf: 'center' }}>{Object.values(choices).filter(Boolean).length}/{q.pairs.length} chosen</span>
        </div>
      )}
      {checked && <div style={{ marginTop: 10, fontWeight: 700 }}>{qstate.correct} of {q.pairs.length} pairs correct</div>}
    </div>
  );
}

function Short({ q, qstate, setQState, onAnswer }) {
  const text = qstate.text || '';
  const revealed = !!qstate.revealed;
  const graded = qstate.grade;
  const { hit, missed } = gradeShort(text, q.keywords);
  const highlighted = useMemo(() => {
    // One combined pattern (longest first) so marks never nest or match inside a tag.
    const kws = highlightTerms(q.keywords);
    if (!kws.length) return escapeHtml(q.modelAnswer || '');
    const re = new RegExp(kws.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
    const src = String(q.modelAnswer || '');
    let html = '', last = 0, m;
    while ((m = re.exec(src))) {
      if (!m[0]) { re.lastIndex += 1; continue; }
      html += escapeHtml(src.slice(last, m.index)) + '<mark>' + escapeHtml(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return html + escapeHtml(src.slice(last));
  }, [q]);
  const grade = (g) => {
    setQState({ grade: g });
    onAnswer(q.id, g);
  };
  return (
    <div>
      <textarea className="short" placeholder="Write your own answer first (3–6 sentences). Then reveal the model answer and grade yourself." value={text} onChange={(e) => setQState({ text: e.target.value })} disabled={!!graded} />
      {!revealed && (
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => setQState({ revealed: true })}>Reveal model answer</button>
          <span className="small muted" style={{ alignSelf: 'center' }}>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      )}
      {revealed && (
        <div className="model-answer">
          <h3 style={{ marginBottom: 6 }}>Model answer</h3>
          <p dangerouslySetInnerHTML={{ __html: highlighted }} />
          {q.keywords.length > 0 && (
            <div>
              <div className="small muted" style={{ marginBottom: 4 }}>Keywords found in your answer: {hit.length}/{q.keywords.length}</div>
              {q.keywords.map((k) => <span key={k} className={'kw' + (hit.includes(k) ? ' hit' : '')}>{hit.includes(k) ? '✓ ' : ''}{k}</span>)}
              {missed.length > 0 && <div className="small muted" style={{ marginTop: 4 }}>Missing keywords are hints, not a verdict. Grade yourself honestly below.</div>}
            </div>
          )}
          {!graded ? (
            <div className="self-grade">
              <span style={{ alignSelf: 'center', fontWeight: 700 }}>Self-grade:</span>
              <button className="btn sm" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }} onClick={() => grade('correct')}>✓ Got it</button>
              <button className="btn sm" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }} onClick={() => grade('partly')}>½ Partly</button>
              <button className="btn sm" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={() => grade('wrong')}>✗ Missed</button>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontWeight: 700 }}>You graded this: {graded === 'correct' ? '✓ Got it' : graded === 'partly' ? '½ Partly' : '✗ Missed'}</div>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerPanel({ q, result, order }) {
  // Letter as the student saw it (options may be shuffled)
  const shownIdx = order ? order.indexOf(q.answer) : q.answer;
  const ok = result === 'correct';
  return (
    <div className="answer-panel" aria-live="polite">
      <h3>
        <span className={'verdict ' + (ok ? 'ok' : result === 'partly' ? '' : 'bad')}>{ok ? '✓ Correct' : result === 'partly' ? '½ Partly right' : '✗ Not quite'}</span>
        <span className="muted" style={{ fontWeight: 500 }}>· Answer & why</span>
      </h3>
      {q.type === 'mcq' && !ok && <div className="ap-row"><span className="ic">✅</span><div><span className="lab">Correct answer:</span>{LETTERS[shownIdx]}. {q.options[q.answer]}</div></div>}
      {q.explanation && <div className="ap-row"><span className="ic">💡</span><div><span className="lab">Why:</span>{q.explanation}</div></div>}
      {q.trap && <div className="ap-row trap"><span className="ic">⚠️</span><div><span className="lab">Trap:</span>{q.trap}</div></div>}
      {q.tip && <div className="ap-row"><span className="ic">🎯</span><div><span className="lab">Tip:</span>{q.tip}</div></div>}
      {q.source && <div className="ap-row source"><span className="ic">📎</span><div><span className="lab">Source:</span>{q.source}</div></div>}
    </div>
  );
}
