import React, { useMemo, useState } from 'react';
import { LETTERS, download, cleanWhy } from '../lib/utils.js';
import { questionsToMarkdown } from '../lib/markdown.js';
import { isFlagged } from '../lib/storage.js';
import { quiz40, priorityBadge, PRIORITY_TITLES } from '../lib/content.js';
import { parseCase } from './CaseText.jsx';

const SETS = [
  ['short', 'Short questions only (Part B)'],
  ['quiz40', "Prof Roh's 40 quiz questions (with answers & why)"],
  ['all', 'All questions'],
  ['core', 'Exam core set'],
  ['wrong', 'Only my wrong ones'],
  ['flagged', 'Only my flagged'],
  ['wrongflagged', 'My wrong + flagged'],
];

function PrintCase({ text }) {
  return parseCase(text).map((b, i) => (b.kind === 'p' ? (
    <div key={i} className="pcase">{b.text}</div>
  ) : (
    <table key={i} className="case-table">
      {b.head && <thead><tr>{b.head.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>}
      <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  )));
}

export default function PrintView({ content, progress }) {
  const [set, setSet] = useState('short');
  const [showAnswers, setShowAnswers] = useState(true);
  const [topicSel, setTopicSel] = useState([]); // empty = all topics
  const hasCore = content.questions.some((q) => q.core);

  const isWrong = (q) => ['wrong', 'partly'].includes(progress.answers[q.id]?.last);
  const questions = useMemo(() => {
    const base = set === 'quiz40' ? quiz40(content.questions) : content.questions; // content is already in priority order
    return base.filter((q) => {
      if (topicSel.length && !topicSel.includes(q.topic)) return false;
      if (set === 'short') return q.type === 'short';
      if (set === 'core') return q.core;
      if (set === 'wrong') return isWrong(q);
      if (set === 'flagged') return isFlagged(progress, q.id);
      if (set === 'wrongflagged') return isWrong(q) || isFlagged(progress, q.id);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, progress, set, topicSel]);

  const sets = hasCore ? SETS : SETS.filter((s) => s[0] !== 'core');
  const setLabel = (sets.find((s) => s[0] === set) || SETS[0])[1].replace(' (with answers & why)', '');
  const topicLabel = topicSel.length ? ` · ${topicSel.join(', ')}` : '';
  const answerLabel = showAnswers ? (set === 'short' ? ' (with model answers)' : ' (with answers & why)') : (set === 'short' ? ' (answers hidden: write your own)' : ' (test paper)');
  const title = `MGMT6110 Exam Prep — ${setLabel}${topicLabel}${answerLabel}`;
  const md = () => download(`MGMT6110_${set}${topicSel.length ? '_' + topicSel.join('-') : ''}_${showAnswers ? 'answers' : 'paper'}.md`, questionsToMarkdown({ title, topics: content.topics, questions, showAnswers }), 'text/markdown');
  const toggleTopic = (id) => setTopicSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const usedTopics = content.topics.filter((t) => content.questions.some((q) => q.topic === t.id));
  const topicById = new Map(content.topics.map((t) => [t.id, t]));
  const printWrongFlagged = () => {
    setSet('wrongflagged');
    setTimeout(() => window.print(), 150);
  };

  // Sections by priority (1 official → 2 checkpoints → 3 likely); the 40 quiz questions are one section in quiz order.
  const sections = set === 'quiz40'
    ? [{ key: 'q40', title: "Prof Roh's 40 quiz questions (Quiz 1 Q1 → Quiz 4 Q10)", qs: questions }]
    : [1, 2, 3].map((p) => ({ key: 'p' + p, title: PRIORITY_TITLES[p], qs: questions.filter((q) => q.priority === p) })).filter((s) => s.qs.length);

  let n = 0;
  return (
    <div>
      <div className="card print-controls no-print">
        <h2>Print & export</h2>
        <p className="muted small">Everything prints in priority order: Prof Roh's official questions first, then his studio checkpoints, then the likely ones. Short questions print as a four-part table (part | task | model answer). Download gives the same selection as a Markdown file.</p>
        <div className="options-panel">
          <div className="row">
            <span className="lab">Include</span>
            <div className="pill-group">{sets.map(([k, l]) => <button key={k} data-set={k} className={'pill' + (set === k ? ' on' : '')} onClick={() => setSet(k)} aria-pressed={set === k}>{l}</button>)}</div>
          </div>
          <div className="row">
            <span className="lab">Answers</span>
            <div className="pill-group">
              <button className={'pill' + (showAnswers ? ' on' : '')} onClick={() => setShowAnswers(true)} data-testid="show-answers">{set === 'short' ? 'Show model answers' : 'Show answers & why'}</button>
              <button className={'pill' + (!showAnswers ? ' on' : '')} onClick={() => setShowAnswers(false)} data-testid="hide-answers">{set === 'short' ? 'Hide answers (blank lines to write on)' : 'Hide (test paper)'}</button>
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
            <span className="chip" style={{ alignSelf: 'center' }} data-testid="print-count">{questions.length} questions</span>
          </div>
        </div>
      </div>

      <div className="print-sheet">
        <h1>{title}</h1>
        <div className="pmeta">MGMT6110 Human-AI Collaboration · {questions.length} questions · content {content.version} · Final exam: Part A 10 MCQs × 1 point, Part B 5 questions × 4 points ((a) Define · (b) Explain · (c) Apply · (d) Check)</div>
        {sections.map((sec) => (
          <section key={sec.key} className="psec" data-sec={sec.key}>
            <h2>{sec.title}</h2>
            {sec.qs.map((q) => {
              n += 1;
              const t = topicById.get(q.topic);
              const badge = priorityBadge(q);
              return (
                <div key={q.id} className={'pq' + (q.type === 'short' && q.parts ? ' pq-short' : '')} data-qid={q.id} data-type={q.type}>
                  <div className="pcase-block">
                    <div className="pmeta"><span className="pbadge-p">{badge.text}</span>{q.id} · {q.topic}{t ? ' ' + (t.short || t.title) : ''} · {q.type === 'short' && q.parts ? 'short · 4 points' : q.type}{q.core ? ' · core' : ''}</div>
                    <div className="ps">{n}. <PrintCase text={q.stem} /></div>
                    {q.type === 'mcq' && <ol type="A">{q.options.map((o, i) => <li key={i}>{o}</li>)}</ol>}
                  </div>
                  {q.type === 'matching' && (showAnswers ? (
                    <table><tbody>{q.pairs.map((p, i) => <tr key={i}><td>{p.left}</td><td>{p.right}</td></tr>)}</tbody></table>
                  ) : (
                    <table><tbody>{q.pairs.map((p, i) => <tr key={i}><td>{p.left}</td><td style={{ minWidth: 160 }}>______</td></tr>)}<tr><td colSpan={2}><i>Options: {[...q.pairs].map((p) => p.right).sort().join(' · ')}</i></td></tr></tbody></table>
                  ))}
                  {q.type === 'short' && q.parts && (
                    <table className="pparts" data-testid="pparts">
                      <thead><tr><th style={{ width: '18%' }}>Part</th><th style={{ width: '32%' }}>Task</th><th>{showAnswers ? 'Model answer' : 'Your answer'}</th></tr></thead>
                      <tbody>
                        {q.parts.map((p, i) => (
                          <tr key={i}>
                            <td className="pl">{p.label} {p.step}<div className="pmeta">1 point</div></td>
                            <td className="pt">{p.task}</td>
                            <td className="pm">{showAnswers ? p.model : <div className="lines" />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {q.type === 'short' && !q.parts && !showAnswers && <div className="blank" />}
                  {showAnswers && (
                    <div className="pans">
                      {q.type === 'mcq' && <div><b>Answer: {LETTERS[q.answer]}.</b> {q.options[q.answer]}</div>}
                      {q.type === 'mcq' && q.why && (
                        <ul className="pwhy">{q.why.map((w, i) => <li key={i}><b>{LETTERS[i]} {i === q.answer ? '✓' : '✗'}</b> {cleanWhy(w)}</li>)}</ul>
                      )}
                      {q.type === 'short' && !q.parts && <div><b>Model answer:</b> {q.modelAnswer}{q.keywords?.length ? <div className="pmeta">Keywords: {q.keywords.join(', ')}</div> : null}</div>}
                      {q.explanation && <div><b>{q.type === 'short' ? (q.parts ? 'What earns each point:' : 'What the examiner looks for:') : (q.why ? 'In short:' : 'Why:')}</b> {q.explanation}</div>}
                      {q.trap && <div><b>{q.type === 'short' && q.parts ? 'Where points are lost:' : 'Trap:'}</b> {q.trap}</div>}
                      {q.tip && <div><b>Tip:</b> {q.tip}</div>}
                      {q.source && <div className="pmeta">{q.priority < 3 ? 'Where we met it' : 'Source'}: {q.source}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
        {!questions.length && <p>Nothing to print for this selection yet.</p>}
      </div>
    </div>
  );
}

