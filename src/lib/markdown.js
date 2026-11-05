import { LETTERS, cleanWhy } from './utils.js';
import { priorityBadge, PRIORITY_TITLES } from './content.js';

const md = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');

/** Same selection as the print view, in priority order, short questions as four-part tables. */
export function questionsToMarkdown({ title, topics, questions, showAnswers }) {
  const lines = [`# ${title}`, '', `MGMT6110 Exam Prep Quiz · ${questions.length} questions · ${showAnswers ? 'with answers' : 'test paper (no answers)'}`, ''];
  const topicById = new Map(topics.map((t) => [t.id, t]));
  let n = 0;
  let lastP = null;
  for (const q of questions) {
    if (q.priority !== lastP) { lines.push(`## ${PRIORITY_TITLES[q.priority] || 'Questions'}`, ''); lastP = q.priority; }
    n += 1;
    const t = topicById.get(q.topic);
    lines.push(`### ${n}. ${priorityBadge(q).text}`, '', `_${q.id} · ${q.topic}${t ? ' ' + (t.short || t.title) : ''} · ${q.type}${q.core ? ' · core' : ''}_`, '', q.stem, '');
    if (q.type === 'mcq') {
      q.options.forEach((o, i) => lines.push(`- ${LETTERS[i]}. ${o}`));
      lines.push('');
      if (showAnswers) {
        lines.push(`**Answer: ${LETTERS[q.answer]}.** ${q.options[q.answer]}`, '');
        if (q.why) { lines.push('**Why each option:**', ''); q.why.forEach((w, i) => lines.push(`- ${LETTERS[i]} ${i === q.answer ? '✓' : '✗'} ${cleanWhy(w)}`)); lines.push(''); }
      }
    } else if (q.type === 'matching') {
      if (showAnswers) {
        lines.push('| Left | Right |', '|---|---|');
        q.pairs.forEach((p) => lines.push(`| ${md(p.left)} | ${md(p.right)} |`));
      } else {
        lines.push('Left items:', ...q.pairs.map((p) => `- ${p.left} → ______`), '', 'Right items (shuffled):', ...[...q.pairs].sort((a, b) => a.right.localeCompare(b.right)).map((p) => `- ${p.right}`));
      }
      lines.push('');
    } else if (q.type === 'short' && q.parts) {
      lines.push(`| Part | Task | ${showAnswers ? 'Model answer' : 'Your answer'} |`, '|---|---|---|');
      q.parts.forEach((p) => lines.push(`| ${p.label} ${p.step} | ${md(p.task)} | ${showAnswers ? md(p.model) : '&nbsp;'} |`));
      lines.push('');
    } else if (q.type === 'short') {
      if (showAnswers) {
        lines.push(`**Model answer:** ${q.modelAnswer}`, '');
        if (q.keywords?.length) lines.push(`Keywords: ${q.keywords.join(', ')}`, '');
      } else lines.push('_Write your answer (3–6 sentences):_', '', '&nbsp;', '&nbsp;', '');
    }
    if (showAnswers) {
      if (q.explanation) lines.push(`**${q.type === 'short' ? (q.parts ? 'What earns each point' : 'What the examiner looks for') : q.why ? 'In short' : 'Why'}:** ${q.explanation}`, '');
      if (q.trap) lines.push(`**${q.type === 'short' && q.parts ? 'Where points are lost' : 'Trap'}:** ${q.trap}`, '');
      if (q.tip) lines.push(`**Tip:** ${q.tip}`, '');
      if (q.source) lines.push(`_${q.priority < 3 ? 'Where we met it' : 'Source'}: ${q.source}_`, '');
    }
  }
  return lines.join('\n');
}
