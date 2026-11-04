import { LETTERS } from './utils.js';

export function questionsToMarkdown({ title, topics, questions, showAnswers }) {
  // showAnswers: true | false; short questions follow the same switch
  const lines = [`# ${title}`, '', `MGMT6110 Exam Prep Quiz · ${questions.length} questions · ${showAnswers ? 'with answers' : 'test paper (no answers)'}`, ''];
  let n = 0;
  for (const t of topics) {
    const qs = questions.filter((q) => q.topic === t.id);
    if (!qs.length) continue;
    lines.push(`## ${t.id} — ${t.title}`, '');
    for (const q of qs) {
      n += 1;
      const tag = [q.core ? 'Core' : null, `difficulty ${q.difficulty}`].filter(Boolean).join(' · ');
      lines.push(`### ${n}. ${q.stem}`, '', `_${q.id} · ${q.type} · ${tag}_`, '');
      if (q.type === 'mcq') {
        q.options.forEach((o, i) => lines.push(`- ${LETTERS[i]}. ${o}`));
        lines.push('');
        if (showAnswers) lines.push(`**Answer: ${LETTERS[q.answer]}.** ${q.options[q.answer]}`, '');
      } else if (q.type === 'matching') {
        if (showAnswers) {
          lines.push('| Left | Right |', '|---|---|');
          q.pairs.forEach((p) => lines.push(`| ${p.left} | ${p.right} |`));
        } else {
          lines.push('Left items:', ...q.pairs.map((p) => `- ${p.left} → ______`), '', 'Right items (shuffled):', ...[...q.pairs].sort((a, b) => a.right.localeCompare(b.right)).map((p) => `- ${p.right}`));
        }
        lines.push('');
      } else if (q.type === 'short') {
        if (showAnswers) {
          lines.push(`**Model answer:** ${q.modelAnswer}`, '');
          if (q.keywords?.length) lines.push(`Keywords: ${q.keywords.join(', ')}`, '');
        } else lines.push('_Write your answer (3–6 sentences):_', '', '&nbsp;', '&nbsp;', '');
      }
      if (showAnswers) {
        if (q.explanation) lines.push(`**${q.type === 'short' ? 'What the examiner looks for' : 'Why'}:** ${q.explanation}`, '');
        if (q.trap) lines.push(`**Trap:** ${q.trap}`, '');
        if (q.tip) lines.push(`**Tip:** ${q.tip}`, '');
        if (q.source) lines.push(`_Source: ${q.source}_`, '');
      }
    }
  }
  return lines.join('\n');
}
