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

// One countdown only (Quiz 4 on 4 Nov is over).
export const FINAL_EXAM = { key: 'final', label: 'Final exam', when: 'Thu 12 Nov 2026 · 1 pm', iso: '2026-11-12T13:00:00+08:00', sub: '15 questions · 30 points · closed book, no AI · 30%' };
export const EXAMS = [FINAL_EXAM];

/** Message for the countdown card; special wording on exam day (Asia/Singapore). */
export function examMessage(n) {
  if (n > 1) return `${n} days left. One topic a day, then a full mock.`;
  if (n === 1) return 'Tomorrow. Light review only: your flagged and wrong questions, then sleep early.';
  if (n === 0) return 'Exam day! 1 pm, closed book. Skim your flagged questions, eat, breathe. You have done the work.';
  return 'The final is done. Well done.';
}

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
  'Five done. In Part B, a definition alone earns one point of four: apply it and name the check.',
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

const reEsc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function markAll(src, terms) {
  if (!terms.length) return { html: escapeHtml(src), n: 0 };
  const re = new RegExp(terms.map(reEsc).join('|'), 'gi');
  let html = '', last = 0, m, n = 0;
  while ((m = re.exec(src))) {
    if (!m[0]) { re.lastIndex += 1; continue; }
    html += escapeHtml(src.slice(last, m.index)) + '<mark>' + escapeHtml(m[0]) + '</mark>';
    last = m.index + m[0].length;
    n += 1;
  }
  return { html: html + escapeHtml(src.slice(last)), n };
}

/** Model answer as HTML with the keywords highlighted. One combined pattern (longest first) so marks never nest.
 *  Keywords are concept labels, so when the exact phrases are rarely in the text we also mark their key words. */
export function highlightModelAnswer(modelAnswer, keywords) {
  const src = String(modelAnswer || '');
  const phrases = highlightTerms(keywords);
  const first = markAll(src, phrases);
  if (first.n >= Math.min(2, (keywords || []).length)) return first.html;
  const extra = new Set(phrases);
  for (const k of keywords || []) for (const w of words(k)) if (w.length >= 5) extra.add(w);
  return markAll(src, [...extra].sort((a, b) => b.length - a.length)).html;
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

/** Strip a leading "Right." / "Wrong:" / "RIGHT:" and wrapping quotes from a why[] line: the ✓ / ✗ already says it. */
export function cleanWhy(w) {
  return String(w || '').replace(/^\s*[✓✗✔✘×]\s*/, '').replace(/^\s*(right|wrong|correct|incorrect)\s*[.:\-–—]\s*/i, '').replace(/^['‘"“](.*)['’"”]$/s, '$1').trim();
}
