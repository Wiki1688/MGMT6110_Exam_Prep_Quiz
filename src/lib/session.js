// Turning the in-memory session/summary into small JSON (question ids only) and back.

/** In-memory session -> storable JSON. */
export function serialiseSession(s) {
  if (!s) return null;
  const elapsed = Math.max(0, Math.round((Date.now() - s.startedAt) / 1000));
  return {
    v: 1,
    mode: s.mode,
    title: s.title,
    qids: s.questions.map((q) => q.id),
    optOrder: s.optOrder,
    index: s.index,
    results: s.results,
    qstate: s.qstate || {},
    shown: s.shown || {},
    timerSec: s.timerSec ?? null,
    elapsed, // seconds of active time so far (the timer pauses while the app is closed)
    timerLeft: s.timerSec != null ? Math.max(0, s.timerSec - elapsed) : null,
    createdAt: s.createdAt || s.startedAt,
    savedAt: Date.now(),
  };
}

/** Stored JSON + loaded content -> in-memory session (or null if nothing usable is left). */
export function hydrateSession(saved, content) {
  if (!saved || !content) return null;
  const byId = new Map(content.questions.map((q) => [q.id, q]));
  const questions = (saved.qids || []).map((id) => byId.get(id)).filter(Boolean);
  if (!questions.length) return null;
  const optOrder = {};
  for (const q of questions) {
    if (q.type !== 'mcq') continue;
    const o = saved.optOrder?.[q.id];
    const valid = Array.isArray(o) && o.length === q.options.length && o.every((i) => i >= 0 && i < q.options.length);
    optOrder[q.id] = valid ? o : q.options.map((_, i) => i);
  }
  const ids = new Set(questions.map((q) => q.id));
  const results = Object.fromEntries(Object.entries(saved.results || {}).filter(([k]) => ids.has(k)));
  const elapsed = Number(saved.elapsed) || 0;
  return {
    mode: saved.mode,
    title: saved.title,
    questions,
    optOrder,
    index: Math.max(0, Math.min(questions.length - 1, Number(saved.index) || 0)),
    results,
    qstate: saved.qstate || {},
    shown: saved.shown || {},
    timerSec: saved.timerSec ?? null,
    startedAt: Date.now() - elapsed * 1000,
    createdAt: saved.createdAt || Date.now(),
  };
}

export function serialiseSummary(sum) {
  if (!sum) return null;
  return { ...sum, questions: undefined, qids: sum.questions.map((q) => q.id) };
}
export function hydrateSummary(saved, content) {
  if (!saved || !content || !Array.isArray(saved.qids)) return null;
  const byId = new Map(content.questions.map((q) => [q.id, q]));
  const questions = saved.qids.map((id) => byId.get(id)).filter(Boolean);
  return { ...saved, questions };
}
