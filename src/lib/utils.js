export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

export const EXAMS = [
  { key: 'quiz4', label: 'Quiz 4', when: 'Wed 4 Nov 2026', iso: '2026-11-04T00:00:00+08:00', sub: '10 MCQs · 15 min' },
  { key: 'final', label: 'Final', when: 'Thu 12 Nov 2026 1 pm', iso: '2026-11-12T13:00:00+08:00', sub: '2 h · closed book · 30%' },
];

/** Whole days left until the exam day, counted in Asia/Singapore calendar days. */
export function daysLeft(iso) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = fmt.format(new Date());
  const target = fmt.format(new Date(iso));
  const d1 = Date.UTC(...today.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  const d2 = Date.UTC(...target.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  return Math.round((d2 - d1) / 86400000);
}

export function daysLabel(n) {
  if (n < 0) return 'done';
  if (n === 0) return 'today!';
  if (n === 1) return 'tomorrow';
  return `${n} days left`;
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDate(ts) {
  try {
    return new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  } catch {
    return '';
  }
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const ENCOURAGEMENT = [
  'Nice rhythm. Keep reading every option before you choose.',
  'Five done. Remember: the slide sentence is usually the right one.',
  'You are building the habit that the closed-book exam rewards.',
  'Good. If a word sounds like marketing, look for the mechanism instead.',
  'Steady. Each question you get wrong now is one you will not get wrong on the day.',
  'Keep going. Place the product by the job you hand it, not by who is accountable.',
  'Halfway feeling? That is normal. Breathe, then read the next stem slowly.',
  'A good sign: you are still here. Most of the marks are in the last few weeks of material.',
  'Numbers on slides are there on purpose. Say them out loud once.',
  'When two options look alike, one is usually a swap. Find what was swapped.',
];

export function encouragementFor(i) {
  return ENCOURAGEMENT[i % ENCOURAGEMENT.length];
}

export function summaryMessage(pct, total) {
  if (total === 0) return 'Nothing answered yet. Try a Quick 10 when you are ready.';
  if (pct === 100) return 'Perfect set. That is exactly what unaided recall looks like. Rest a bit, then try a harder mix.';
  if (pct >= 90) return 'Excellent. You are exam-ready on this set. Review the one or two you missed and move on.';
  if (pct >= 75) return 'Solid. You know the material; the misses are mostly about reading the options carefully. Retry the wrong ones once.';
  if (pct >= 60) return 'Good progress. The ideas are there but a few traps are still catching you. Read each explanation slowly, then retry.';
  if (pct >= 40) return 'You are learning the hard way, which works. Open the Tips page, then do this set again tomorrow.';
  return 'Rough set, and that is fine; it is practice, not the exam. Pick one topic, read the explanations, and come back.';
}

const STOP = new Set(['the', 'and', 'for', 'not', 'with', 'what', 'when', 'who', 'that', 'this', 'from', 'into', 'than', 'only', 'just', 'does', 'must', 'every', 'one', 'two', 'any', 'are', 'its', 'off', 'per']);
const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'");
const words = (s) => norm(s).split(/[^a-z0-9.%|−-]+/).map((w) => w.replace(/^[.\-]+|[.\-]+$/g, '')).filter((w) => w.length >= 3 && !STOP.has(w));

/** Keywords in the bank are short concept labels ("sampling / stochastic", "prompt vs harness").
 *  A keyword counts as found if the exact phrase is there, or any "/"-alternative is there,
 *  or at least half of its meaningful words appear in the student's text. */
export function keywordHit(text, k) {
  const t = norm(text);
  if (!t.trim()) return false;
  const kw = norm(k);
  if (t.includes(kw)) return true;
  const alts = kw.split(/\s+\/\s+|\s+or\s+/).map((x) => x.trim()).filter((x) => x.length >= 3);
  if (alts.length > 1 && alts.some((x) => t.includes(x))) return true;
  const ws = words(kw);
  if (!ws.length) return false;
  const tw = new Set(words(t));
  const n = ws.filter((w) => tw.has(w) || (w.length >= 5 && t.includes(w.slice(0, -1)))).length;
  return n >= Math.ceil(ws.length / 2);
}

/** Phrases to highlight inside the model answer for a keyword label. */
export function highlightTerms(keywords) {
  const out = new Set();
  for (const k of keywords || []) {
    const s = String(k);
    out.add(s);
    for (const part of s.split(/\s+\/\s+|\s+vs\.?\s+|\s*[=+≈→>]\s*|,\s*|:\s*/)) {
      const p = part.trim();
      if (p.length >= 4 && !STOP.has(p.toLowerCase())) out.add(p);
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

export function gradeShort(text, keywords) {
  const hit = (keywords || []).filter((k) => keywordHit(text, k));
  return { hit, missed: (keywords || []).filter((k) => !hit.includes(k)) };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
