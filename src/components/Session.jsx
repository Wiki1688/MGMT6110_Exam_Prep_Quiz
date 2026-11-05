import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LETTERS, fmtTime, encouragementFor, gradeShort, shuffle, highlightModelAnswer, cleanWhy } from '../lib/utils.js';
import { Burst } from './Ring.jsx';
import { isFlagged } from '../lib/storage.js';
import { useMedia, Q_SPLIT } from '../lib/useMedia.js';
import CaseText from './CaseText.jsx';
import PriorityBadge from './Badge.jsx';
import { PartsWork, PartsReveal, partScore } from './Parts.jsx';

export default function Session({ session, setSession, progress, onAnswer, onFlag, onFinish, onQuit, topics }) {
  const { questions, index, results, timerSec, startedAt } = session;
  const q = questions[index];
  const total = questions.length;
  const topic = topics.find((t) => t.id === q.topic);
  const answered = results[q.id] != null;
  const split = useMedia(Q_SPLIT); // unfolded inner screen: question left, answer right
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
  const flagged = isFlagged(progress, q.id);

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

  const flagBtn = (cls) => (
    <button className={cls + (flagged ? ' on' : '')} onClick={() => onFlag(q.id)} aria-pressed={flagged} title="Flag to revise" data-testid={cls.includes('nav-flag') ? 'nav-flag' : 'flag'}>
      <span className="star">{flagged ? '★' : '☆'}</span> <span className="flag-l">{flagged ? 'Flagged' : 'Flag'}</span>
    </button>
  );

  return (
    <div className={'session' + (split ? ' split' : ' narrow')} data-qid={q.id} data-index={index}>
      <div className="session-top">
        <button className="btn sm ghost" onClick={() => { if (Object.keys(results).length === 0 || confirm('Finish this session now? Your answers so far are kept.')) onFinish(session); }}>✕ Finish</button>
        <div className="progress" aria-label="Progress"><div style={{ width: `${pct}%` }} /></div>
        <span className="small" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Q {index + 1} / {total}</span>
        {timerSec != null && <span className={'timer' + (left != null && left <= 60 ? ' low' : '')} aria-live="polite">⏱ {fmtTime(left ?? timerSec)}</span>}
      </div>

      <div className="session-grid">
      <div className="pane-q">
      <div className="card qcard" key={q.id}>
        <div className="qhead">
          <PriorityBadge q={q} />
          <span className="chip topic" style={{ background: topic?.color || '#64748B' }}>{q.topic}</span>
          <span className="chip">{q.type === 'mcq' ? (session.mode === 'mock' ? 'Part A · 1 point' : 'MCQ') : q.type === 'matching' ? 'Matching' : q.parts ? (session.mode === 'mock' ? 'Part B · 4 points' : 'Short · 4 parts') : 'Short answer'}</span>
          <span className="chip" title="difficulty">{'●'.repeat(q.difficulty)}{'○'.repeat(3 - q.difficulty)}</span>
          {q.core && <span className="chip brand">Core</span>}
          {flagBtn('flag-btn')}
        </div>
        <CaseText text={q.stem} />

        {q.type === 'mcq' && <Mcq q={q} order={session.optOrder[q.id]} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
        {q.type === 'matching' && <Matching q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
        {q.type === 'short' && q.parts && <PartsWork q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} inline={!split} />}
        {q.type === 'short' && q.parts && !split && Object.keys(qstate.prev || {}).length > 0 && <PartsTotal q={q} qstate={qstate} />}
        {q.type === 'short' && !q.parts && <Short q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} split={split} />}

      </div>
      </div>
      <aside className="pane-a" aria-label="Answer and why">
        {split && q.type === 'short' && !q.parts && qstate.revealed && <ShortReveal q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
        {split && q.type === 'short' && q.parts && <PartsReveal q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
        {answered ? (
          <AnswerPanel q={q} result={results[q.id]} order={session.optOrder[q.id]} mark={(session.marks || {})[q.id]} picked={qstate.picked} />
        ) : split && !(q.type === 'short' && (qstate.revealed || Object.keys(qstate.prev || {}).length)) ? (
          <div className="answer-wait">
            <div className="aw-ic" aria-hidden>💡</div>
            <b>Answer & why</b>
            <p className="muted">{q.type === 'short' && q.parts ? 'Write (a)–(d) on the left if you like, then reveal each part. Its model answer appears here: mark it 0 or 1. Your score out of 4 is saved when all four are marked.' : q.type === 'short' ? 'Write your answer, reveal the model answer, then grade yourself. The verdict, trap and tip appear here.' : 'Pick an option. The correct answer, why each option is right or wrong, the trap and a tip appear here.'}</p>
          </div>
        ) : null}
      </aside>
      </div>

      <div className="session-nav">
        <button className="btn" onClick={prev} disabled={index === 0} aria-label="Previous question">← <span className="nl">Prev</span></button>
        {flagBtn('btn nav-flag')}
        <button className={'btn next' + (answered ? ' primary' : '')} onClick={next} data-testid="next">{index + 1 >= total ? 'Finish ✓' : answered ? 'Next →' : 'Skip →'}</button>
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

function Short({ q, qstate, setQState, onAnswer, split }) {
  const text = qstate.text || '';
  const revealed = !!qstate.revealed;
  const graded = qstate.grade;
  return (
    <div>
      <textarea className="short" placeholder="Write your own answer first (3–6 sentences). Then reveal the model answer and grade yourself." value={text} onChange={(e) => setQState({ text: e.target.value })} disabled={!!graded} />
      {!revealed && (
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => setQState({ revealed: true })}>Reveal model answer</button>
          <span className="small muted" style={{ alignSelf: 'center' }}>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      )}
      {revealed && !split && <ShortReveal q={q} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
      {revealed && split && !graded && <p className="small muted" style={{ marginTop: 10 }}>The model answer is on the right. Compare, then grade yourself there.</p>}
    </div>
  );
}

/** Model answer (keywords highlighted) + "What the examiner looks for" + self-grade.
 *  Under the answer on the cover screen; in the right-hand pane on the unfolded screen. */
function ShortReveal({ q, qstate, setQState, onAnswer }) {
  const text = qstate.text || '';
  const graded = qstate.grade;
  const { hit, missed } = gradeShort(text, q.keywords);
  const highlighted = useMemo(() => highlightModelAnswer(q.modelAnswer, q.keywords), [q]);
  const grade = (g) => {
    setQState({ grade: g });
    onAnswer(q.id, g);
  };
  return (
        <div className="model-answer">
          <h3 style={{ marginBottom: 6 }}>Model answer <span className="small muted" style={{ fontWeight: 500 }}>· keywords highlighted</span></h3>
          <p className="ma-text" dangerouslySetInnerHTML={{ __html: highlighted }} />
          {q.explanation && (
            <div className="examiner" data-testid="examiner">
              <div className="ex-h">🧑‍🏫 What the examiner looks for</div>
              <div>{q.explanation}</div>
            </div>
          )}
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
  );
}

function PartsTotal({ q, qstate }) {
  const { score, done } = partScore(qstate, q.parts.length);
  return <div className="pm-total" data-testid="parts-score">{done}/{q.parts.length} parts marked · {score}/{q.parts.length} points so far</div>;
}

function AnswerPanel({ q, result, order, mark, picked }) {
  // Letter as the student saw it (options may be shuffled)
  const shownIdx = order ? order.indexOf(q.answer) : q.answer;
  const ok = result === 'correct';
  const parts = q.type === 'short' && q.parts;
  const verdict = parts && mark ? `${mark.score}/${mark.of} points` : ok ? '✓ Correct' : result === 'partly' ? '½ Partly right' : '✗ Not quite';
  const seen = order || (q.options || []).map((_, i) => i);
  return (
    <div className="answer-panel" aria-live="polite">
      <h3>
        <span className={'verdict ' + (ok ? 'ok' : result === 'partly' ? '' : 'bad')} data-testid="verdict">{parts && mark ? (ok ? '✓ ' : result === 'partly' ? '◑ ' : '✗ ') + verdict : verdict}</span>
        <span className="muted" style={{ fontWeight: 500 }}>· {parts ? 'Your Part B mark' : 'Answer & why'}</span>
      </h3>
      {q.type === 'mcq' && !ok && <div className="ap-row"><span className="ic">✅</span><div><span className="lab">Correct answer:</span>{LETTERS[shownIdx]}. {q.options[q.answer]}</div></div>}
      {q.type === 'mcq' && q.why && (
        <div className="why-each" data-testid="why-each">
          <div className="we-h">Why each option</div>
          <ol className="we-list">
            {seen.map((orig, s) => {
              const right = orig === q.answer;
              return (
                <li key={orig} className={'we-row' + (right ? ' right' : ' wrong') + (picked === orig ? ' picked' : '')} data-right={right ? '1' : '0'}>
                  <span className="we-k">{LETTERS[s]}</span>
                  <span className="we-mark" aria-label={right ? 'right' : 'wrong'}>{right ? '✓' : '✗'}</span>
                  <span className="we-txt">{cleanWhy(q.why[orig])}{picked === orig && <em className="we-you"> · your pick</em>}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {q.explanation && q.type !== 'short' && <div className="ap-row"><span className="ic">💡</span><div><span className="lab">{q.why ? 'In short:' : 'Why:'}</span>{q.explanation}</div></div>}
      {q.type === 'short' && !parts && q.keywords?.length > 0 && <div className="ap-row"><span className="ic">🔑</span><div><span className="lab">Keywords to use:</span>{q.keywords.join(' · ')}</div></div>}
      {!parts && q.trap && <div className="ap-row trap"><span className="ic">⚠️</span><div><span className="lab">Trap:</span>{q.trap}</div></div>}
      {!parts && q.tip && <div className="ap-row"><span className="ic">🎯</span><div><span className="lab">Tip:</span>{q.tip}</div></div>}
      {q.source && <div className="ap-row source"><span className="ic">📎</span><div><span className="lab">{q.priority === 1 || q.priority === 2 ? 'Where we met it:' : 'Source:'}</span>{q.source}</div></div>}
    </div>
  );
}
