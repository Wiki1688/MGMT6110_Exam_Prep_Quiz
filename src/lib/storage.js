// localStorage helpers. Every read/write is wrapped in try/catch so the app still
// works in private windows or when storage is blocked.
const NS = 'mgmt6110quiz:';
const K_PROFILES = NS + 'profiles';
const K_SETTINGS = NS + 'settings';
const K_PROGRESS = (id) => NS + 'progress:' + id;

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export const AVATARS = ['🦊', '🐼', '🦉', '🐯', '🐸', '🦄', '🐙', '🐧', '🦁', '🐨', '🐝', '🦋', '🌟', '🚀', '🍀', '🔥'];

export function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export const emptyProgress = () => ({
  answers: {}, // qid -> { attempts, correct, wrong, last, lastAt }
  flags: {}, // qid -> true
  streak: { count: 0, lastDay: null, best: 0 },
  best: {}, // mode -> { pct, score, total, at, seconds }
  sessions: [], // last 30 sessions
  totals: { answered: 0, correct: 0 },
});

export function loadProfiles() {
  const data = readJson(K_PROFILES, null);
  if (data && Array.isArray(data.profiles)) return data;
  return { profiles: [], currentId: null };
}
export function saveProfiles(data) {
  writeJson(K_PROFILES, data);
}
export function loadProgress(id) {
  const p = readJson(K_PROGRESS(id), null);
  return { ...emptyProgress(), ...(p || {}) };
}
export function saveProgress(id, progress) {
  writeJson(K_PROGRESS(id), progress);
}
export function deleteProgress(id) {
  try {
    localStorage.removeItem(K_PROGRESS(id));
  } catch {
    /* ignore */
  }
}

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
  const a = { ...(progress.answers[qid] || { attempts: 0, correct: 0, wrong: 0 }) };
  a.attempts += 1;
  if (result === 'correct') a.correct += 1;
  else if (result === 'wrong') a.wrong += 1;
  else a.correct += 0.5;
  a.last = result;
  a.lastAt = Date.now();
  const totals = {
    answered: (progress.totals?.answered || 0) + 1,
    correct: (progress.totals?.correct || 0) + (result === 'correct' ? 1 : result === 'partly' ? 0.5 : 0),
  };
  // streak: consecutive Singapore days with at least one answer
  const streak = { ...(progress.streak || { count: 0, lastDay: null, best: 0 }) };
  const today = todayKey();
  if (streak.lastDay !== today) {
    const y = todayKey(new Date(Date.now() - 86400000));
    streak.count = streak.lastDay === y ? streak.count + 1 : 1;
    streak.lastDay = today;
    streak.best = Math.max(streak.best || 0, streak.count);
  }
  return { ...progress, answers: { ...progress.answers, [qid]: a }, totals, streak };
}

export function toggleFlag(progress, qid) {
  const flags = { ...progress.flags };
  if (flags[qid]) delete flags[qid];
  else flags[qid] = true;
  return { ...progress, flags };
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

export function exportProfile(profile, progress) {
  return JSON.stringify({ app: 'MGMT6110 Exam Prep Quiz', format: 1, exportedAt: new Date().toISOString(), profile, progress }, null, 2);
}

export function parseImport(text) {
  const data = JSON.parse(text);
  if (!data || data.app !== 'MGMT6110 Exam Prep Quiz' || !data.profile || !data.progress) throw new Error('Not a quiz-app export file');
  return { profile: data.profile, progress: { ...emptyProgress(), ...data.progress } };
}

/** Merge imported progress into existing: keeps the higher counts, union of flags, newer sessions. */
export function mergeProgress(a, b) {
  const answers = { ...a.answers };
  for (const [qid, v] of Object.entries(b.answers || {})) {
    const cur = answers[qid];
    if (!cur) answers[qid] = v;
    else {
      answers[qid] = {
        attempts: cur.attempts + v.attempts,
        correct: cur.correct + v.correct,
        wrong: cur.wrong + v.wrong,
        last: (v.lastAt || 0) > (cur.lastAt || 0) ? v.last : cur.last,
        lastAt: Math.max(v.lastAt || 0, cur.lastAt || 0),
      };
    }
  }
  const sessions = [...(a.sessions || []), ...(b.sessions || [])]
    .filter((s, i, arr) => arr.findIndex((x) => x.at === s.at && x.mode === s.mode) === i)
    .sort((x, y) => y.at - x.at)
    .slice(0, 30);
  const best = { ...(a.best || {}) };
  for (const [mode, v] of Object.entries(b.best || {})) if (!best[mode] || v.pct > best[mode].pct) best[mode] = v;
  const streakA = a.streak || {}, streakB = b.streak || {};
  const streak = (streakB.lastDay || '') > (streakA.lastDay || '') ? { ...streakB } : { ...streakA };
  streak.best = Math.max(streakA.best || 0, streakB.best || 0);
  return {
    answers,
    flags: { ...a.flags, ...b.flags },
    streak,
    best,
    sessions,
    totals: {
      answered: (a.totals?.answered || 0) + (b.totals?.answered || 0),
      correct: (a.totals?.correct || 0) + (b.totals?.correct || 0),
    },
  };
}
