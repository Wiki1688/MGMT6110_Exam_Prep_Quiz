import React, { useMemo, useState } from 'react';
import { LETTERS, download } from '../lib/utils.js';
import { questionsToMarkdown } from '../lib/markdown.js';
import { isFlagged } from '../lib/storage.js';

const SETS = [
  ['all', 'All questions'],
  ['short', 'Short questions only'],
  ['wrong', 'Only my wrong ones'],
  ['flagged', 'Only my flagged'],
  ['wrongflagged', 'My wrong + flagged'],
];

export default function PrintView({ content, progress }) {
  const [set, setSet] = useState('all');
  const [showAnswers, setShowAnswers] = useState(true);
  const [topicSel, setTopicSel] = useState([]); // empty = all topics
  const hasCore = content.questions.some((q) => q.core);

  const isWrong = (q) => ['wrong', 'partly'].includes(progress.answers[q.id]?.last);
  const questions = useMemo(() => content.questions.filter((q) => {
    if (topicSel.length && !topicSel.includes(q.topic)) return false;
    if (set === 'short') return q.type === 'short';
    if (set === 'core') return q.core;
    if (set === 'wrong') return isWrong(q);
    if (set === 'flagged') return isFlagged(progress, q.id);
    if (set === 'wrongflagged') return isWrong(q) || isFlagged(progress, q.id);
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [content, progress, set, topicSel]);

  const sets = hasCore ? [...SETS.slice(0, 2), ['core', 'Exam core set'], ...SETS.slice(2)] : SETS;
  const setLabel = (sets.find((s) => s[0] === set) || SETS[0])[1];
  const topicLabel = topicSel.length ? ` · ${topicSel.join(', ')}` : '';
  const answerLabel = set === 'short' ? (showAnswers ? ' (with model answers)' : ' (model answers hidden)') : (showAnswers ? ' (with answers)' : ' (test paper)');
  const title = `MGMT6110 Exam Prep — ${setLabel}${topicLabel}${answerLabel}`;
  const md = () => download(`MGMT6110_${set}${topicSel.length ? '_' + topicSel.join('-') : ''}_${showAnswers ? 'answers' : 'paper'}.md`, questionsToMarkdown({ title, topics: content.topics, questions, showAnswers }), 'text/markdown');
  const toggleTopic = (id) => setTopicSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const usedTopics = content.topics.filter((t) => content.questions.some((q) => q.topic === t.id));
  const printWrongFlagged = () => {
    setSet('wrongflagged');
    setTimeout(() => window.print(), 150);
  };

  let n = 0;
  return (
    <div>
      <div className="card print-controls no-print">
        <h2>Print & export</h2>
        <p className="muted small">Choose what to include. Print gives a clean black-on-white paper with a page break per topic. Download gives the same selection as a Markdown file.</p>
        <div className="options-panel">
          <div className="row">
            <span className="lab">Include</span>
            <div className="pill-group">{sets.map(([k, l]) => <button key={k} data-set={k} className={'pill' + (set === k ? ' on' : '')} onClick={() => setSet(k)} aria-pressed={set === k}>{l}</button>)}</div>
          </div>
          <div className="row">
            <span className="lab">Answers</span>
            <div className="pill-group">
              <button className={'pill' + (showAnswers ? ' on' : '')} onClick={() => setShowAnswers(true)}>{set === 'short' ? 'Show model answers' : 'Show answers & why'}</button>
              <button className={'pill' + (!showAnswers ? ' on' : '')} onClick={() => setShowAnswers(false)}>{set === 'short' ? 'Hide model answers' : 'Hide (test paper)'}</button>
            </div>
          </div>
          <fieldset className="topic-checks">
            <legend className="lab">Topics <span className="muted small">({topicSel.length ? `${topicSel.length} chosen` : 'all'})</span></legend>
            <div className="checks">
              {usedTopics.map((t) => (
                <label key={t.id} className={'check' + (topicSel.includes(t.id) ? ' on' : '')} title={t.title} style={{ '--tc': t.color }}>
                  <input type="checkbox" checked={topicSel.includes(t.id)} onChange={() => toggleTopic(t.id)} />
                  <span><b>{t.id}</b> {t.short || t.title}</span>
                </label>
              ))}
            </div>
            {topicSel.length > 0 && <button className="btn sm ghost" onClick={() => setTopicSel([])}>Clear topics (print all)</button>}
          </fieldset>
          <div className="btn-row">
            <button className="btn primary" onClick={() => window.print()} disabled={!questions.length}>🖨️ Print / Save as PDF</button>
            <button className="btn" onClick={printWrongFlagged}>🖨️ Print my wrong + flagged</button>
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
                    <div className="pmeta">{q.id} · {q.type} · difficulty {q.difficulty}{q.core ? ' · core' : ''}</div>
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
                        {q.explanation && <div><b>{q.type === 'short' ? 'What the examiner looks for:' : 'Why:'}</b> {q.explanation}</div>}
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
