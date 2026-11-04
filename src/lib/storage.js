// Storage layer for the quiz app.
//
// Rules (v2, Nov 2026):
//  * Every change is saved synchronously at the moment it happens (no "save in an effect").
//  * Writes are merge-safe: before writing we read what is stored (maybe written by another
//    tab/window) and merge per item using timestamps, so two open windows never wipe each
//    other's answers. Totals are always recomputed from the answers, never summed.
//  * Every localStorage write is mirrored to IndexedDB; on start-up a missing or corrupt
//    localStorage key is restored from the mirror.
//  * Every read/write is wrapped in try/catch so the app still works in private windows.
import { idbSet, idbDelete, idbAll } from './idb.js';

export const NS = 'mgmt6110quiz:';
export const K_PROFILES = NS + 'profiles';
export const K_SETTINGS = NS + 'settings';
export const K_PROGRESS = (id) => NS + 'progress:' + id;
export const K_SESSION = (id) => NS + 'session:' + id;
export const K_SUMMARY = (id) => NS + 'summary:' + id;
export const EXPORT_FORMAT = 2;

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJson(key, value) {
  let text;
  try {
    text = JSON.stringify(value);
  } catch {
    return false;
  }
  let ok = true;
  try {
    localStorage.setItem(key, text);
  } catch {
    ok = false; // quota / blocked: the IndexedDB mirror still gets it
  }
  idbSet(key, text);
  return ok;
}
export function removeKey(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
  idbDelete(key);
}

/** On start-up: copy back any key that is missing or corrupt in localStorage but present in IndexedDB. */
export async function restoreFromMirror(timeoutMs = 1500) {
  const work = (async () => {
    const pairs = await idbAll();
    let restored = 0;
    for (const { key, value } of pairs) {
      if (typeof key !== 'string' || !key.startsWith(NS) || typeof value !== 'string') continue;
      let good = false;
      try {
        const cur = localStorage.getItem(key);
        if (cur) { JSON.parse(cur); good = true; }
      } catch { good = false; }
      if (good) continue;
      try {
        JSON.parse(value);
        localStorage.setItem(key, value);
        restored += 1;
      } catch { /* ignore */ }
    }
    return restored;
  })();
  const timeout = new Promise((r) => setTimeout(() => r(0), timeoutMs));
  try {
    return await Promise.race([work, timeout]);
  } catch {
    return 0;
  }
}

// ---- persistent storage (Android may otherwise evict site data under storage pressure) ----
let persistState = 'unknown';
export function getPersistState() { return persistState; }
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) { persistState = 'unsupported'; return persistState; }
    let ok = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (!ok) ok = await navigator.storage.persist();
    persistState = ok ? 'protected' : 'not-protected';
  } catch {
    persistState = 'unsupported';
  }
  return persistState;
}

export const AVATARS = ['🦊', '🐼', '🦉', '🐯', '🐸', '🦄', '🐙', '🐧', '🦁', '🐨', '🐝', '🦋', '🌟', '🚀', '🍀', '🔥'];

export function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export const emptyProgress = () => ({
  v: 2,
  epoch: null, // changes on Reset / Replace; a newer epoch wins over an older one when merging
  epochAt: 0,
  answers: {}, // qid -> { attempts, correct, wrong, last, lastAt }
  flags: {}, // qid -> { on: true|false, at }   (old files: qid -> true)
  streak: { count: 0, lastDay: null, best: 0 },
  best: {}, // mode -> { pct, score, total, at, seconds }
  sessions: [], // last 30 sessions
  totals: { answered: 0, correct: 0 }, // always recomputed from answers
  backupAt: 0, // last time "Back up now" was used
});

// ---------- flags ----------
export function isFlagged(progress, qid) {
  const f = progress?.flags?.[qid];
  return f === true || !!(f && f.on);
}
export function flaggedIds(progress) {
  return Object.keys(progress?.flags || {}).filter((k) => isFlagged(progress, k));
}
function normFlags(flags) {
  const out = {};
  for (const [k, v] of Object.entries(flags || {})) {
    if (v === true) out[k] = { on: true, at: 0 };
    else if (v && typeof v === 'object') out[k] = { on: !!v.on, at: Number(v.at) || 0 };
  }
  return out;
}

export function recomputeTotals(answers) {
  let answered = 0, correct = 0;
  for (const a of Object.values(answers || {})) {
    answered += Number(a.attempts) || 0;
    correct += Number(a.correct) || 0;
  }
  return { answered, correct };
}

/** Fill defaults, upgrade old (format 1) shapes, recompute totals. Pure. */
export function normaliseProgress(p) {
  const base = emptyProgress();
  if (!p || typeof p !== 'object') return base;
  const answers = {};
  for (const [k, a] of Object.entries(p.answers || {})) {
    if (!a || typeof a !== 'object') continue;
    answers[k] = {
      attempts: Number(a.attempts) || 0,
      correct: Number(a.correct) || 0,
      wrong: Number(a.wrong) || 0,
      last: a.last || null,
      lastAt: Number(a.lastAt) || 0,
    };
  }
  return {
    ...base,
    ...p,
    v: 2,
    epoch: p.epoch || null,
    epochAt: Number(p.epochAt) || 0,
    answers,
    flags: normFlags(p.flags),
    streak: { ...base.streak, ...(p.streak || {}) },
    best: { ...(p.best || {}) },
    sessions: Array.isArray(p.sessions) ? p.sessions : [],
    totals: recomputeTotals(answers),
    backupAt: Number(p.backupAt) || 0,
  };
}

// ---------- profiles ----------
export function loadProfiles() {
  const data = readJson(K_PROFILES, null);
  if (data && Array.isArray(data.profiles)) return { removed: {}, ...data };
  return { profiles: [], currentId: null, removed: {} };
}
/** Merge with what is stored (another tab may have added a profile), then write. Returns the merged copy. */
export function saveProfiles(data) {
  const merged = mergeProfiles(loadProfiles(), data);
  writeJson(K_PROFILES, merged);
  return merged;
}
/** Pure merge of two profile lists: union by id, newer edit wins, deleted ids stay deleted. currentId comes from `data`. */
export function mergeProfiles(stored, data) {
  const removed = { ...(stored.removed || {}), ...(data.removed || {}) };
  const byId = new Map();
  for (const p of [...stored.profiles, ...data.profiles]) {
    if (!p || !p.id || removed[p.id]) continue;
    const prev = byId.get(p.id);
    if (!prev || (p.updatedAt || 0) >= (prev.updatedAt || 0)) byId.set(p.id, p);
  }
  // keep the order of `data`, then any profiles only the other tab knows
  const order = [...data.profiles.map((p) => p.id), ...stored.profiles.map((p) => p.id)];
  const profiles = [...new Set(order)].filter((id) => byId.has(id)).map((id) => byId.get(id));
  const currentId = data.currentId && byId.has(data.currentId) ? data.currentId : profiles[0]?.id || null;
  return { profiles, currentId, removed };
}

// ---------- progress ----------
export function loadProgress(id) {
  return normaliseProgress(readJson(K_PROGRESS(id), null));
}
/** Merge-safe save: reads the stored copy, merges per item, writes, and returns the merged progress. */
export function saveProgress(id, progress) {
  const raw = readJson(K_PROGRESS(id), null);
  const merged = raw ? mergeProgress(normaliseProgress(raw), progress) : normaliseProgress(progress);
  writeJson(K_PROGRESS(id), merged);
  return merged;
}
/** Overwrite without merging (used by Reset and Replace, which start a new epoch anyway). */
export function writeProgress(id, progress) {
  const p = normaliseProgress(progress);
  writeJson(K_PROGRESS(id), p);
  return p;
}
export function deleteProgress(id) {
  removeKey(K_PROGRESS(id));
  removeKey(K_SESSION(id));
  removeKey(K_SUMMARY(id));
}

// ---------- active session + last summary (per profile) ----------
// The session is saved twice: in sessionStorage (this tab only, so two open windows each reload
// into their own session) and in localStorage + IndexedDB (so "Resume" works after the app is closed).
const K_TAB_SESSION = (id) => NS + 'tabsession:' + id;
export function loadSession(id, { tabFirst = true } = {}) {
  let s = null;
  if (tabFirst) {
    try {
      const raw = sessionStorage.getItem(K_TAB_SESSION(id));
      s = raw ? JSON.parse(raw) : null;
    } catch { s = null; }
  }
  if (!s) s = readJson(K_SESSION(id), null);
  return s && Array.isArray(s.qids) && s.qids.length ? s : null;
}
export function saveSession(id, s) {
  if (!id) return;
  try {
    if (s) sessionStorage.setItem(K_TAB_SESSION(id), JSON.stringify(s));
    else sessionStorage.removeItem(K_TAB_SESSION(id));
  } catch { /* ignore */ }
  if (s) writeJson(K_SESSION(id), s);
  else removeKey(K_SESSION(id));
}
export function loadSummary(id) {
  return readJson(K_SUMMARY(id), null);
}
export function saveSummary(id, s) {
  if (!id) return;
  if (s) writeJson(K_SUMMARY(id), s);
  else removeKey(K_SUMMARY(id));
}

// ---------- settings ----------
export const defaultSettings = () => ({
  theme: 'auto', // auto | light | dark
  shuffleQ: true,
  shuffleOpts: false,
  timer: true,
  types: { mcq: true, matching: true, short: true },
  difficulty: { 1: true, 2: true, 3: true },
});
export function loadSettings() {
  const s = readJson(K_SETTINGS, null);
  const d = defaultSettings();
  return s ? { ...d, ...s, types: { ...d.types, ...(s.types || {}) }, difficulty: { ...d.difficulty, ...(s.difficulty || {}) } } : d;
}
export function saveSettings(s) {
  writeJson(K_SETTINGS, s);
}

// ---- progress mutations (pure; return a new object) ----
export function todayKey(d = new Date()) {
  // Singapore day boundary
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function recordAnswer(progress, qid, result /* 'correct' | 'wrong' | 'partly' */) {
  const now = Date.now();
  const a = { ...(progress.answers[qid] || { attempts: 0, correct: 0, wrong: 0 }) };
  a.attempts += 1;
  if (result === 'correct') a.correct += 1;
  else if (result === 'wrong') a.wrong += 1;
  else a.correct += 0.5;
  a.last = result;
  a.lastAt = now;
  const answers = { ...progress.answers, [qid]: a };
  // streak: consecutive Singapore days with at least one answer
  const streak = { ...(progress.streak || { count: 0, lastDay: null, best: 0 }) };
  const today = todayKey();
  if (streak.lastDay !== today) {
    const y = todayKey(new Date(now - 86400000));
    streak.count = streak.lastDay === y ? streak.count + 1 : 1;
    streak.lastDay = today;
    streak.best = Math.max(streak.best || 0, streak.count);
  }
  return { ...progress, answers, totals: recomputeTotals(answers), streak };
}

export function toggleFlag(progress, qid) {
  return { ...progress, flags: { ...progress.flags, [qid]: { on: !isFlagged(progress, qid), at: Date.now() } } };
}

export function recordSession(progress, session /* {mode, title, score, total, pct, seconds, at} */) {
  const sessions = [session, ...(progress.sessions || [])].slice(0, 30);
  const best = { ...(progress.best || {}) };
  const prev = best[session.mode];
  if (session.total > 0 && (!prev || session.pct > prev.pct || (session.pct === prev.pct && session.seconds < prev.seconds))) {
    best[session.mode] = { pct: session.pct, score: session.score, total: session.total, seconds: session.seconds, at: session.at };
  }
  return { ...progress, sessions, best };
}

export function freshEpoch(progress = emptyProgress()) {
  return { ...normaliseProgress(progress), epoch: uid(), epochAt: Date.now() };
}

// ---------- export / import ----------
export function exportProfile(profile, progress) {
  return JSON.stringify({ app: 'MGMT6110 Exam Prep Quiz', format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), profile, progress: normaliseProgress(progress) }, null, 2);
}

/** Accepts format 1 (flags: {qid: true}) and format 2 files. */
export function parseImport(text) {
  const data = JSON.parse(text);
  if (!data || data.app !== 'MGMT6110 Exam Prep Quiz' || !data.profile || !data.progress) throw new Error('Not a quiz-app export file');
  const format = Number(data.format) || 1;
  if (format > EXPORT_FORMAT) throw new Error(`This file was made by a newer app version (format ${format}). Update the app first.`);
  return { format, profile: data.profile, progress: normaliseProgress(data.progress) };
}

function mergeAnswers(a = {}, b = {}) {
  const out = { ...a };
  for (const [qid, v] of Object.entries(b)) {
    const cur = out[qid];
    // per-question latest wins; same record twice = same result (never summed)
    if (!cur || (v.lastAt || 0) > (cur.lastAt || 0) || ((v.lastAt || 0) === (cur.lastAt || 0) && (v.attempts || 0) > (cur.attempts || 0))) out[qid] = v;
  }
  return out;
}
function mergeFlags(a = {}, b = {}) {
  const A = normFlags(a), B = normFlags(b);
  const out = { ...A };
  for (const [qid, v] of Object.entries(B)) {
    const cur = out[qid];
    if (!cur || v.at > cur.at || (v.at === cur.at && v.on && !cur.on)) out[qid] = v;
  }
  return out;
}

/**
 * Merge two progress objects. Idempotent and order-independent per item:
 * answers: latest lastAt wins; flags: latest timestamp wins; sessions: union (deduped);
 * best: higher pct; streak: later day; totals: recomputed from answers.
 * If the two copies belong to different epochs (one side was Reset/Replaced), the newer epoch wins whole,
 * unless ignoreEpoch is set (used by "Merge" import).
 */
export function mergeProgress(a, b, { ignoreEpoch = false } = {}) {
  a = normaliseProgress(a);
  b = normaliseProgress(b);
  if (!ignoreEpoch && (a.epoch || null) !== (b.epoch || null)) return (b.epochAt || 0) >= (a.epochAt || 0) ? b : a;
  const answers = mergeAnswers(a.answers, b.answers);
  const sessions = [...(a.sessions || []), ...(b.sessions || [])]
    .filter((s, i, arr) => s && arr.findIndex((x) => x.at === s.at && x.mode === s.mode) === i)
    .sort((x, y) => y.at - x.at)
    .slice(0, 30);
  const best = { ...(a.best || {}) };
  for (const [mode, v] of Object.entries(b.best || {})) {
    const cur = best[mode];
    if (!cur || v.pct > cur.pct || (v.pct === cur.pct && (v.seconds || 0) < (cur.seconds || 0))) best[mode] = v;
  }
  const streakA = a.streak || {}, streakB = b.streak || {};
  const streak = (streakB.lastDay || '') > (streakA.lastDay || '') ? { ...streakB } : { ...streakA };
  streak.best = Math.max(streakA.best || 0, streakB.best || 0, streak.count || 0);
  return {
    ...a,
    answers,
    flags: mergeFlags(a.flags, b.flags),
    streak,
    best,
    sessions,
    totals: recomputeTotals(answers),
    backupAt: Math.max(a.backupAt || 0, b.backupAt || 0),
  };
}

/** Home-screen numbers, computed the same way everywhere. */
export function progressStats(progress, questionIds) {
  const ids = questionIds ? new Set(questionIds) : null;
  let answered = 0, correct = 0;
  for (const [qid, a] of Object.entries(progress.answers || {})) {
    if (ids && !ids.has(qid)) continue;
    answered += 1;
    if (a.last === 'correct') correct += 1;
  }
  const flagged = flaggedIds(progress).filter((q) => !ids || ids.has(q)).length;
  // accuracy counts only questions still in the bank (retired questions are ignored, but kept in storage)
  const kept = ids ? Object.fromEntries(Object.entries(progress.answers || {}).filter(([q]) => ids.has(q))) : progress.answers;
  const t = recomputeTotals(kept || {});
  return { answered, correct, flagged, attempts: t.answered, accuracy: t.answered ? Math.round((t.correct / t.answered) * 100) : null };
}
