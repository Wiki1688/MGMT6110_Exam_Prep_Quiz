import React, { useMemo, useState } from 'react';
import { LETTERS, download } from '../lib/utils.js';
import { questionsToMarkdown } from '../lib/markdown.js';

const SETS = [
  ['all', 'All questions'],
  ['quiz4', 'Quiz 4 set only'],
  ['wrong', 'Only my wrong ones'],
  ['flagged', 'Only my flagged'],
];

export default function PrintView({ content, progress }) {
  const [set, setSet] = useState('all');
  const [showAnswers, setShowAnswers] = useState(true);

  const questions = useMemo(() => content.questions.filter((q) => {
    if (set === 'quiz4') return q.quiz4;
    if (set === 'wrong') return ['wrong', 'partly'].includes(progress.answers[q.id]?.last);
    if (set === 'flagged') return !!progress.flags[q.id];
    return true;
  }), [content, progress, set]);

  const title = `MGMT6110 Exam Prep — ${SETS.find((s) => s[0] === set)[1]}${showAnswers ? ' (with answers)' : ' (test paper)'}`;
  const md = () => download(`MGMT6110_${set}_${showAnswers ? 'answers' : 'paper'}.md`, questionsToMarkdown({ title, topics: content.topics, questions, showAnswers }), 'text/markdown');

  let n = 0;
  return (
    <div>
      <div className="card print-controls no-print">
        <h2>Print & export</h2>
        <p className="muted small">Choose what to include. Print gives a clean black-on-white paper with a page break per topic. Download gives the same selection as a Markdown file.</p>
        <div className="options-panel">
          <div className="row">
            <span className="lab">Include</span>
            <div className="pill-group">{SETS.map(([k, l]) => <button key={k} className={'pill' + (set === k ? ' on' : '')} onClick={() => setSet(k)}>{l}</button>)}</div>
          </div>
          <div className="row">
            <span className="lab">Answers</span>
            <div className="pill-group">
              <button className={'pill' + (showAnswers ? ' on' : '')} onClick={() => setShowAnswers(true)}>Show answers & why</button>
              <button className={'pill' + (!showAnswers ? ' on' : '')} onClick={() => setShowAnswers(false)}>Hide (test paper)</button>
            </div>
          </div>
          <div className="btn-row">
            <button className="btn primary" onClick={() => window.print()} disabled={!questions.length}>🖨️ Print / Save as PDF</button>
            <button className="btn" onClick={md} disabled={!questions.length}>⬇️ Download as .md</button>
            <span className="chip" style={{ alignSelf: 'center' }}>{questions.length} questions</span>
          </div>
        </div>
      </div>

      <div className="print-sheet">
        <h1>{title}</h1>
        <div className="pmeta">MGMT6110 Human-AI Collaboration · {questions.length} questions · content {content.version}</div>
        {content.topics.map((t) => {
          const qs = questions.filter((q) => q.topic === t.id);
          if (!qs.length) return null;
          return (
            <section key={t.id} className="ptopic">
              <h2>{t.id} — {t.title}</h2>
              {qs.map((q) => {
                n += 1;
                return (
                  <div key={q.id} className="pq">
                    <div className="ps">{n}. {q.stem}</div>
                    <div className="pmeta">{q.id} · {q.type} · difficulty {q.difficulty}{q.quiz4 ? ' · Quiz 4' : ''}</div>
                    {q.type === 'mcq' && <ol type="A">{q.options.map((o, i) => <li key={i}>{o}</li>)}</ol>}
                    {q.type === 'matching' && (showAnswers ? (
                      <table><tbody>{q.pairs.map((p, i) => <tr key={i}><td>{p.left}</td><td>{p.right}</td></tr>)}</tbody></table>
                    ) : (
                      <table><tbody>{q.pairs.map((p, i) => <tr key={i}><td>{p.left}</td><td style={{ minWidth: 160 }}>______</td></tr>)}<tr><td colSpan={2}><i>Options: {[...q.pairs].map((p) => p.right).sort().join(' · ')}</i></td></tr></tbody></table>
                    ))}
                    {q.type === 'short' && !showAnswers && <div className="blank" />}
                    {showAnswers && (
                      <div className="pans">
                        {q.type === 'mcq' && <div><b>Answer: {LETTERS[q.answer]}.</b> {q.options[q.answer]}</div>}
                        {q.type === 'short' && <div><b>Model answer:</b> {q.modelAnswer}{q.keywords?.length ? <div className="pmeta">Keywords: {q.keywords.join(', ')}</div> : null}</div>}
                        {q.explanation && <div><b>Why:</b> {q.explanation}</div>}
                        {q.trap && <div><b>Trap:</b> {q.trap}</div>}
                        {q.tip && <div><b>Tip:</b> {q.tip}</div>}
                        {q.source && <div className="pmeta">Source: {q.source}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
        {!questions.length && <p>Nothing to print for this selection yet.</p>}
      </div>
    </div>
  );
}
