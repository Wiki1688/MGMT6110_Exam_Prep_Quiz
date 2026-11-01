import { mergeTopics } from './topics.js';

const BASE = '/content/';

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function normalise(q) {
  const type = (q.type || 'mcq').toLowerCase();
  const out = { ...q, type, difficulty: Number(q.difficulty) || 2, quiz4: !!q.quiz4 };
  if (type === 'mcq') {
    out.options = Array.isArray(q.options) ? q.options : [];
    out.answer = Number(q.answer);
  } else if (type === 'matching') {
    out.pairs = Array.isArray(q.pairs) ? q.pairs.filter((p) => p && p.left && p.right) : [];
  } else if (type === 'short') {
    out.keywords = Array.isArray(q.keywords) ? q.keywords : [];
    out.modelAnswer = q.modelAnswer || '';
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
  const topics = mergeTopics(all.flatMap((c) => c.topics || []));
  const qmap = new Map();
  for (const c of all) for (const q of c.questions || []) if (q && q.id) qmap.set(q.id, normalise(q));
  const topicIds = new Set(topics.map((t) => t.id));
  const questions = [...qmap.values()].filter((q) => {
    if (!topicIds.has(q.topic)) {
      warnings.push(`${q.id}: unknown topic ${q.topic}`);
      return false;
    }
    return true;
  });
  // Keep canonical topic order, then id order inside a topic.
  const order = new Map(topics.map((t, i) => [t.id, i]));
  questions.sort((a, b) => order.get(a.topic) - order.get(b.topic) || a.id.localeCompare(b.id));
  return {
    version: main.version || 'unknown',
    topics,
    questions,
    files: ['questions.json', ...files],
    warnings,
  };
}
