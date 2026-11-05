import { mergeTopics, TOPIC_ORDER } from './topics.js';

const BASE = '/content/';

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const STEPS = ['Define', 'Explain', 'Apply', 'Check'];
const LABELS = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)'];

function normalise(q, fileIndex) {
  const type = (q.type || 'mcq').toLowerCase();
  const pr = Number(q.priority);
  const out = { ...q, type, difficulty: Number(q.difficulty) || 2, core: !!q.core, priority: pr === 1 || pr === 2 ? pr : 3, _i: fileIndex };
  if (out.priority === 3) delete out.official;
  delete out.quiz4; // Quiz 4 (4 Nov) is over; the field is ignored
  if (type === 'mcq') {
    out.options = Array.isArray(q.options) ? q.options : [];
    out.answer = Number(q.answer);
    out.why = Array.isArray(q.why) && q.why.length === out.options.length ? q.why.map((w) => String(w || '')) : null;
  } else if (type === 'matching') {
    out.pairs = Array.isArray(q.pairs) ? q.pairs.filter((p) => p && p.left && p.right) : [];
  } else if (type === 'short') {
    out.keywords = Array.isArray(q.keywords) ? q.keywords : [];
    // v3: four parts (a)-(d) Define / Explain / Apply / Check. Old single-modelAnswer shorts still work (parts = null).
    out.parts = Array.isArray(q.parts) && q.parts.length
      ? q.parts.filter((p) => p && (p.task || p.model)).map((p, i) => ({ label: p.label || LABELS[i] || `(${i + 1})`, step: p.step || STEPS[i] || '', task: p.task || '', model: p.model || '' }))
      : null;
    if (out.parts && !out.parts.length) out.parts = null;
    out.modelAnswer = q.modelAnswer || (out.parts ? out.parts.map((p) => `${p.label} ${p.model}`).join('\n') : '');
  }
  return out;
}

/**
 * Loads /content/questions.json and every extra file listed in /content/index.json
 * ({ "files": ["questions-week10.json"] }). Arrays are merged; later files can
 * override a question with the same id. Missing files are skipped with a warning.
 */
export async function loadContent() {
  const warnings = [];
  let main;
  try {
    main = await fetchJson(BASE + 'questions.json');
  } catch (e) {
    throw new Error('Could not load content/questions.json — ' + e.message);
  }
  const files = [];
  try {
    const idx = await fetchJson(BASE + 'index.json');
    for (const f of idx.files || []) if (typeof f === 'string' && f !== 'questions.json') files.push(f);
  } catch {
    /* index.json is optional */
  }
  const extras = [];
  for (const f of files) {
    try {
      extras.push(await fetchJson(BASE + f));
    } catch (e) {
      warnings.push(`Skipped ${f}: ${e.message}`);
    }
  }
  const all = [main, ...extras];
  const qmap = new Map();
  let fileIndex = 0;
  for (const c of all) for (const q of c.questions || []) if (q && q.id) {
    const prev = qmap.get(q.id);
    qmap.set(q.id, normalise(q, prev ? prev._i : fileIndex++)); // an override keeps the original position
  }
  // A question whose topic (e.g. T17) has no entry in "topics" still shows up, under a placeholder title.
  const declared = new Set(all.flatMap((c) => (c.topics || []).map((t) => t && t.id)));
  const autoTopics = [...new Set([...qmap.values()].map((q) => q.topic))]
    .filter((id) => id && /^T\d+$/.test(id) && !declared.has(id) && !TOPIC_ORDER.includes(id))
    .map((id) => ({ id, title: id, short: id }));
  const topics = mergeTopics([...all.flatMap((c) => c.topics || []), ...autoTopics]);
  const topicIds = new Set(topics.map((t) => t.id));
  const questions = [...qmap.values()].filter((q) => {
    if (!topicIds.has(q.topic)) {
      warnings.push(`${q.id}: unknown topic ${q.topic}`);
      return false;
    }
    return true;
  });
  // v3: priority order everywhere (1 Prof Roh's official → 2 studio checkpoints → 3 likely), then file order.
  questions.sort(byPriority);
  return {
    version: main.version || 'unknown',
    topics,
    questions,
    files: ['questions.json', ...files],
    warnings,
  };
}

/** Priority (1 → 2 → 3), then the order in the content file. */
export function byPriority(a, b) {
  return (a.priority || 3) - (b.priority || 3) || (a._i ?? 0) - (b._i ?? 0);
}

/** Quiz number and question number from an official quiz question (id OQ2-03 or label "Quiz 2 · Q3"). */
export function quizKey(q) {
  let m = /^OQ(\d+)-(\d+)$/i.exec(q.id || '');
  if (!m) m = /Quiz\s*(\d+)\s*·\s*Q\s*(\d+)/i.exec(q.official || '');
  return m ? [Number(m[1]), Number(m[2])] : null;
}
export const isQuiz40 = (q) => q.priority === 1 && q.type === 'mcq' && !!quizKey(q);
export const isPartBOfficial = (q) => q.priority === 1 && q.type === 'short';

/** Prof Roh's 40 quiz questions in quiz order: Q1.1 → Q4.10. */
export function quiz40(questions) {
  return questions.filter(isQuiz40).sort((a, b) => {
    const x = quizKey(a), y = quizKey(b);
    return x[0] - y[0] || x[1] - y[1];
  });
}

/** Badge for a question: { text, tone: 'gold' | 'silver' | 'likely' }. */
export function priorityBadge(q) {
  if (q.priority === 1) {
    if (q.type === 'short') {
      const n = /(\d+)\s*$/.exec(q.official || '') || /^PB(\d+)$/i.exec(q.id || '');
      return { text: `Prof Roh · Part B practice${n ? ' ' + n[1] : ''}`, tone: 'gold' };
    }
    const k = quizKey(q);
    return { text: k ? `Prof Roh · Quiz ${k[0]} · Q${k[1]}` : `Prof Roh · ${q.official || 'official'}`, tone: 'gold' };
  }
  if (q.priority === 2) return { text: 'Prof Roh · Studio checkpoint', tone: 'silver' };
  return { text: 'Likely', tone: 'likely' };
}

export const PRIORITY_TITLES = {
  1: "Prof Roh's official questions",
  2: "Prof Roh's studio checkpoints",
  3: 'Likely questions (written for this app)',
};
