import React from 'react';

const STEP_HINT = {
  Define: 'State the concept in course terms and name its parts',
  Explain: 'Say how it works or why — the mechanism',
  Apply: 'Use it on the case and show the step',
  Check: 'What a person checks or does before relying on it, and why',
};

export const partScore = (qstate, n) => {
  const m = qstate.pmarks || {};
  let s = 0, done = 0;
  for (let i = 0; i < n; i++) if (m[i] === 0 || m[i] === 1) { done += 1; s += m[i]; }
  return { score: s, done };
};

/** Left side (or whole column on the cover screen): the four parts, each with its step chip, task and a textarea.
 *  inline = true shows each part's model answer and 0/1 marking right under it (cover screen). */
export function PartsWork({ q, qstate, setQState, onAnswer, inline }) {
  const texts = qstate.ptexts || {};
  const rev = qstate.prev || {};
  const locked = qstate.grade != null;
  const allRev = q.parts.every((_, i) => rev[i]);
  const revealAll = () => setQState({ prev: Object.fromEntries(q.parts.map((_, i) => [i, true])) });
  return (
    <div className="parts" data-testid="parts">
      {q.parts.map((p, i) => (
        <div key={i} className={'part' + (rev[i] ? ' revealed' : '')} data-part={i}>
          <div className="part-head">
            <span className="part-label">{p.label}</span>
            <span className={'step-chip step-' + (p.step || '').toLowerCase()} title={STEP_HINT[p.step] || ''}>{p.step}</span>
            <span className="part-pt small muted">1 point</span>
          </div>
          <div className="part-task">{p.task}</div>
          <textarea className="short part-text" rows={3} placeholder={`Your answer to ${p.label} (optional)${STEP_HINT[p.step] ? ' — ' + STEP_HINT[p.step].toLowerCase() : ''}`} value={texts[i] || ''} onChange={(e) => setQState({ ptexts: { ...texts, [i]: e.target.value } })} disabled={locked} aria-label={`Your answer to part ${p.label}`} />
          {!rev[i] && <button className="btn sm reveal-part" onClick={() => setQState({ prev: { ...rev, [i]: true } })} data-testid={`reveal-${i}`}>Reveal {p.label}</button>}
          {inline && rev[i] && <PartModel q={q} i={i} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />}
        </div>
      ))}
      {!allRev && <div className="btn-row" style={{ marginTop: 10 }}><button className="btn primary" onClick={revealAll} data-testid="reveal-all">Reveal all</button></div>}
      {inline && allRev && <PartsExaminer q={q} />}
    </div>
  );
}

/** Model answer for one part + "0 / 1 point" self-marking. When every part is marked the score (x/4) is recorded. */
export function PartModel({ q, i, qstate, setQState, onAnswer }) {
  const p = q.parts[i];
  const marks = qstate.pmarks || {};
  const locked = qstate.grade != null;
  const mark = (v) => {
    if (locked) return;
    const next = { ...marks, [i]: v };
    const n = q.parts.length;
    const { score, done } = partScore({ pmarks: next }, n);
    if (done === n) {
      const result = score === n ? 'correct' : score === 0 ? 'wrong' : 'partly';
      setQState({ pmarks: next, grade: result, score });
      onAnswer(q.id, result, { score, of: n });
    } else setQState({ pmarks: next });
  };
  return (
    <div className="part-model" data-testid={`model-${i}`}>
      <div className="pm-h"><b>{p.label} Model answer</b> <span className="small muted">· {p.step}</span></div>
      <div className="pm-text">{p.model}</div>
      <div className="pm-mark" role="group" aria-label={`Mark part ${p.label}`}>
        <span className="small" style={{ fontWeight: 700 }}>My point:</span>
        <button className={'btn sm mk0' + (marks[i] === 0 ? ' on' : '')} onClick={() => mark(0)} disabled={locked} aria-pressed={marks[i] === 0} data-testid={`mark-${i}-0`}>0 · missed</button>
        <button className={'btn sm mk1' + (marks[i] === 1 ? ' on' : '')} onClick={() => mark(1)} disabled={locked} aria-pressed={marks[i] === 1} data-testid={`mark-${i}-1`}>1 · got it</button>
      </div>
    </div>
  );
}

/** "What earns each point" / "Where points are lost" / tip. */
export function PartsExaminer({ q }) {
  return (
    <div className="parts-examiner" data-testid="examiner">
      {q.explanation && <div className="examiner"><div className="ex-h">🧑‍🏫 What earns each point</div><div>{q.explanation}</div></div>}
      {q.trap && <div className="examiner lost"><div className="ex-h">⚠️ Where points are lost</div><div>{q.trap}</div></div>}
      {q.tip && <div className="examiner tipbox"><div className="ex-h">🎯 Tip</div><div>{q.tip}</div></div>}
    </div>
  );
}

/** Right pane on the unfolded screen: the revealed model answers with their marking, then the examiner boxes. */
export function PartsReveal({ q, qstate, setQState, onAnswer }) {
  const rev = qstate.prev || {};
  const shown = q.parts.map((_, i) => i).filter((i) => rev[i]);
  const { score, done } = partScore(qstate, q.parts.length);
  if (!shown.length) return null;
  return (
    <div className="parts-reveal model-answer">
      <h3 style={{ marginBottom: 6 }}>Model answers <span className="small muted" style={{ fontWeight: 500 }}>· mark each part 0 or 1</span></h3>
      {shown.map((i) => <PartModel key={i} q={q} i={i} qstate={qstate} setQState={setQState} onAnswer={onAnswer} />)}
      <div className="pm-total" data-testid="parts-score">{done}/{q.parts.length} parts marked · {score}/{q.parts.length} points so far</div>
      {shown.length === q.parts.length && <PartsExaminer q={q} />}
    </div>
  );
}
