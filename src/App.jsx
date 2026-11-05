import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadContent } from './lib/content.js';
import {
  loadProfiles, saveProfiles, mergeProfiles, loadProgress, saveProgress, writeProgress, deleteProgress, loadSettings, saveSettings,
  recordAnswer, toggleFlag, recordSession, emptyProgress, uid, mergeProgress, normaliseProgress, freshEpoch, answerFraction,
  loadSession, saveSession, loadSummary, saveSummary, exportProfile, isFlagged, requestPersistentStorage, getPersistState,
  K_PROGRESS, K_PROFILES,
} from './lib/storage.js';
import { serialiseSession, hydrateSession, serialiseSummary, hydrateSummary } from './lib/session.js';
import { shuffle, download } from './lib/utils.js';
import { quiz40, byPriority } from './lib/content.js';
import Header from './components/Header.jsx';
import Home from './components/Home.jsx';
import Session from './components/Session.jsx';
import Summary from './components/Summary.jsx';
import PrintView from './components/PrintView.jsx';
import Tips from './components/Tips.jsx';
import Profiles from './components/Profiles.jsx';
import { ProfileSheet } from './components/Profiles.jsx';
import UpdateToast from './components/UpdateToast.jsx';

const SCORED_MODES = ['mock', 'quiz40', 'partb', 'core', 'topic'];

/** Exam weights: in the mock final a short (Part B) question is worth 4 points, an MCQ 1. Elsewhere every question counts 1. */
const weightOf = (mode, q) => (mode === 'mock' && q.type === 'short' ? 4 : 1);

/** Weighted random pick without replacement: priority 1 weight 3, priority 2 weight 2, priority 3 weight 1. */
function weightedPick(list, n) {
  const pool = [...list];
  const out = [];
  while (out.length < n && pool.length) {
    const w = pool.map((q) => (q.priority === 1 ? 3 : q.priority === 2 ? 2 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < pool.length - 1 && (r -= w[i]) > 0) i += 1;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Mock final = Part A 10 MCQs (at least 4 of Prof Roh's official ones) + Part B 5 short questions (at least 1 official Part B). */
export function buildMockFinal(questions) {
  const mcq = questions.filter((q) => q.type === 'mcq');
  const off = mcq.filter((q) => q.priority === 1);
  const a1 = shuffle(off).slice(0, Math.min(4, off.length));
  const a = [...a1, ...weightedPick(mcq.filter((q) => !a1.includes(q)), 10 - a1.length)];
  const shorts = questions.filter((q) => q.type === 'short');
  const pb = shorts.filter((q) => q.priority === 1);
  const b1 = shuffle(pb).slice(0, Math.min(1, pb.length));
  const b = [...b1, ...weightedPick(shorts.filter((q) => !b1.includes(q)), 5 - b1.length)];
  return [...shuffle(a), ...shuffle(b)];
}

function useHashRoute() {
  const get = () => (window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home');
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r) => {
    window.location.hash = r === 'home' ? '/' : '/' + r;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, go];
}

export default function App() {
  const [route, go] = useHashRoute();
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [sheet, setSheet] = useState(null); // 'profile'
  const [persist, setPersist] = useState(getPersistState());

  // ---- profiles: React state + a ref that is always the latest copy ----
  const [profilesData, setProfilesState] = useState(loadProfiles);
  const profilesRef = useRef(profilesData);
  const commitProfiles = useCallback((fn) => {
    const next = typeof fn === 'function' ? fn(profilesRef.current) : fn;
    const merged = saveProfiles(next); // merge-safe write, right now
    profilesRef.current = merged;
    setProfilesState(merged);
    return merged;
  }, []);
  const current = profilesData.profiles.find((p) => p.id === profilesData.currentId) || null;
  const currentId = current?.id || null;

  // ---- progress: saved synchronously on every change, merged with what other tabs wrote ----
  const [progress, setProgressState] = useState(() => {
    const p = profilesRef.current;
    return p.currentId ? loadProgress(p.currentId) : emptyProgress();
  });
  const progressRef = useRef(progress);
  const setProgressLocal = useCallback((p) => { progressRef.current = p; setProgressState(p); }, []);
  const commitProgress = useCallback((fn) => {
    const id = profilesRef.current.currentId;
    const next = fn(progressRef.current);
    const saved = id ? saveProgress(id, next) : normaliseProgress(next);
    setProgressLocal(saved);
    return saved;
  }, [setProgressLocal]);

  // ---- active session (persisted per profile, restored on reload) ----
  const [session, setSessionState] = useState(null);
  const sessionRef = useRef(null);
  const updateSession = useCallback((fn) => {
    const next = typeof fn === 'function' ? fn(sessionRef.current) : fn;
    sessionRef.current = next;
    setSessionState(next);
    saveSession(profilesRef.current.currentId, next ? serialiseSession(next) : null);
  }, []);
  const dropSessionFromMemory = useCallback(() => { sessionRef.current = null; setSessionState(null); }, []);

  const [lastSummary, setLastSummary] = useState(null);
  const [savedSessionInfo, setSavedSessionInfo] = useState(null); // for the Home "Resume" card
  const refreshSavedInfo = useCallback(() => {
    const id = profilesRef.current.currentId;
    const s = id ? loadSession(id, { tabFirst: false }) : null;
    setSavedSessionInfo(s ? { title: s.title, index: s.index, total: s.qids.length, answered: Object.keys(s.results || {}).length, timerLeft: s.timerLeft, savedAt: s.savedAt } : null);
  }, []);

  // ---- content ----
  useEffect(() => {
    loadContent().then(setContent).catch((e) => setError(e.message));
  }, []);

  // ---- ask the browser not to evict our data (Android under storage pressure) ----
  useEffect(() => {
    requestPersistentStorage().then(setPersist);
  }, []);

  // ---- theme / settings ----
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);
  const updateSettings = useCallback((fn) => {
    setSettings((s) => {
      const next = typeof fn === 'function' ? fn(s) : fn;
      saveSettings(next);
      return next;
    });
  }, []);

  // ---- once content is here: restore this tab's session (same question) and the last summary ----
  useEffect(() => {
    if (!content || !currentId) return;
    if (!sessionRef.current) {
      const saved = loadSession(currentId);
      const s = hydrateSession(saved, content);
      if (s && route === 'session') {
        sessionRef.current = s;
        setSessionState(s);
      }
    }
    setLastSummary((cur) => cur || hydrateSummary(loadSummary(currentId), content));
    refreshSavedInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, currentId]);

  useEffect(() => { if (route === 'home') refreshSavedInfo(); }, [route, refreshSavedInfo]);

  // ---- multi-tab / multi-window: pick up what another window wrote ----
  const reloadFromStorage = useCallback(() => {
    const storedProfiles = loadProfiles();
    const mergedProfiles = mergeProfiles(storedProfiles, profilesRef.current);
    profilesRef.current = mergedProfiles;
    setProfilesState(mergedProfiles);
    const id = mergedProfiles.currentId;
    if (id) setProgressLocal(mergeProgress(loadProgress(id), progressRef.current));
    refreshSavedInfo();
  }, [setProgressLocal, refreshSavedInfo]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key == null) return;
      const id = profilesRef.current.currentId;
      if (e.key === K_PROFILES || (id && e.key === K_PROGRESS(id))) reloadFromStorage();
    };
    const flush = () => {
      const id = profilesRef.current.currentId;
      if (!id) return;
      try {
        if (sessionRef.current) saveSession(id, serialiseSession(sessionRef.current));
        progressRef.current = saveProgress(id, progressRef.current);
      } catch { /* ignore */ }
    };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); else reloadFromStorage(); };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    window.addEventListener('mgmt6110:flush', flush);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('mgmt6110:flush', flush);
    };
  }, [reloadFromStorage]);

  // ---- profiles ----
  const switchProfile = useCallback((id) => {
    if (sessionRef.current) saveSession(profilesRef.current.currentId, serialiseSession(sessionRef.current));
    dropSessionFromMemory();
    commitProfiles((d) => ({ ...d, currentId: id }));
    setProgressLocal(loadProgress(id));
    setLastSummary(null);
  }, [commitProfiles, setProgressLocal, dropSessionFromMemory]);

  const addProfile = useCallback((name, emoji) => {
    const p = { id: uid(), name: name.trim() || 'Student', emoji, createdAt: Date.now(), updatedAt: Date.now() };
    if (sessionRef.current) saveSession(profilesRef.current.currentId, serialiseSession(sessionRef.current));
    dropSessionFromMemory();
    commitProfiles((d) => ({ ...d, profiles: [...d.profiles, p], currentId: p.id }));
    setProgressLocal(loadProgress(p.id));
    setLastSummary(null);
    setSheet(null);
    return p;
  }, [commitProfiles, setProgressLocal, dropSessionFromMemory]);

  const updateProfile = useCallback((id, patch) => {
    commitProfiles((d) => ({ ...d, profiles: d.profiles.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)) }));
  }, [commitProfiles]);

  const removeProfile = useCallback((id) => {
    deleteProgress(id);
    const wasCurrent = profilesRef.current.currentId === id;
    const merged = commitProfiles((d) => {
      const profiles = d.profiles.filter((p) => p.id !== id);
      const cid = d.currentId === id ? (profiles[0]?.id || null) : d.currentId;
      return { profiles, currentId: cid, removed: { ...(d.removed || {}), [id]: Date.now() } };
    });
    if (wasCurrent) {
      dropSessionFromMemory();
      setProgressLocal(merged.currentId ? loadProgress(merged.currentId) : emptyProgress());
      setLastSummary(null);
    }
  }, [commitProfiles, setProgressLocal, dropSessionFromMemory]);

  /** mode: 'merge' (default; per-question latest wins, flags by latest timestamp) | 'new' | 'replace' */
  const importProfile = useCallback((profile, imported, mode = 'merge') => {
    const id = profilesRef.current.currentId;
    if (mode === 'merge' && id) {
      commitProgress((p) => mergeProgress(p, imported, { ignoreEpoch: true }));
      return;
    }
    if (mode === 'replace' && id) {
      setProgressLocal(writeProgress(id, freshEpoch(imported)));
      return;
    }
    const p = { ...profile, id: uid(), createdAt: Date.now(), updatedAt: Date.now() };
    writeProgress(p.id, imported);
    dropSessionFromMemory();
    commitProfiles((d) => ({ ...d, profiles: [...d.profiles, p], currentId: p.id }));
    setProgressLocal(loadProgress(p.id));
    setLastSummary(null);
  }, [commitProgress, commitProfiles, setProgressLocal, dropSessionFromMemory]);

  const resetProgress = useCallback(() => {
    const id = profilesRef.current.currentId;
    if (!id) return;
    updateSession(null);
    saveSummary(id, null);
    setLastSummary(null);
    setProgressLocal(writeProgress(id, freshEpoch(emptyProgress())));
  }, [setProgressLocal, updateSession]);

  const backupNow = useCallback(() => {
    const cur = profilesRef.current.profiles.find((p) => p.id === profilesRef.current.currentId);
    if (!cur) return;
    const stamp = new Date().toISOString().slice(0, 10);
    download(`mgmt6110-progress-${cur.name.replace(/\W+/g, '_')}-${stamp}.json`, exportProfile(cur, progressRef.current), 'application/json');
    commitProgress((p) => ({ ...p, backupAt: Date.now() }));
  }, [commitProgress]);

  // ---- session building ----
  const filteredPool = useMemo(() => {
    if (!content) return [];
    return content.questions.filter((q) => settings.types[q.type] !== false && settings.difficulty[q.difficulty] !== false);
  }, [content, settings]);

  const startSession = useCallback((spec) => {
    // spec: { mode, title, topics?, count?, timerMinutes?, questions? (ids), shuffleQ?, shuffleOpts? }
    const prog = progressRef.current;
    let qs;
    let fixedOrder = false; // the mock final and the 40 quiz questions build their own order
    if (spec.questions) {
      const ids = new Set(spec.questions);
      qs = content.questions.filter((q) => ids.has(q.id)); // already in priority order
    } else if (spec.mode === 'quiz40') {
      qs = quiz40(content.questions); // Q1.1 → Q4.10, ignores filters on purpose
    } else if (spec.mode === 'mock') {
      qs = buildMockFinal(content.questions);
      fixedOrder = true;
    } else {
      // Part B practice ignores the type filter on purpose: the student asked for short ones.
      qs = spec.mode === 'partb' ? content.questions.filter((q) => q.type === 'short') : filteredPool;
      if (spec.mode === 'core') qs = qs.filter((q) => q.core);
      if (spec.topics?.length) qs = qs.filter((q) => spec.topics.includes(q.topic));
      if (spec.mode === 'wrong') qs = qs.filter((q) => prog.answers[q.id]?.last === 'wrong' || prog.answers[q.id]?.last === 'partly');
      if (spec.mode === 'flagged') qs = qs.filter((q) => isFlagged(prog, q.id));
      qs = [...qs].sort(byPriority);
    }
    const shuffleQ = !fixedOrder && (spec.shuffleQ ?? settings.shuffleQ);
    if (shuffleQ) qs = shuffle(qs);
    if (spec.count) qs = qs.slice(0, spec.count);
    if (!qs.length) return false;
    const shuffleOpts = spec.shuffleOpts ?? settings.shuffleOpts;
    const optOrder = {};
    for (const q of qs) if (q.type === 'mcq') optOrder[q.id] = shuffleOpts ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i);
    const timerMinutes = spec.timerMinutes != null ? spec.timerMinutes : null;
    const now = Date.now();
    updateSession({
      mode: spec.mode,
      title: spec.title,
      questions: qs,
      optOrder,
      timerSec: settings.timer && timerMinutes ? timerMinutes * 60 : null,
      startedAt: now,
      createdAt: now,
      results: {},
      marks: {},
      qstate: {},
      index: 0,
    });
    go('session');
    return true;
  }, [content, filteredPool, settings, go, updateSession]);

  const resumeSession = useCallback(() => {
    const id = profilesRef.current.currentId;
    const s = hydrateSession(loadSession(id, { tabFirst: false }), content);
    if (!s) { refreshSavedInfo(); return false; }
    sessionRef.current = s;
    setSessionState(s);
    saveSession(id, serialiseSession(s));
    go('session');
    return true;
  }, [content, go, refreshSavedInfo]);

  const discardSaved = useCallback(() => {
    saveSession(profilesRef.current.currentId, null);
    refreshSavedInfo();
  }, [refreshSavedInfo]);

  /** mark (optional): { score, of } for a four-part short question, e.g. { score: 3, of: 4 }. */
  const answerQuestion = useCallback((qid, result, mark = null) => {
    commitProgress((p) => recordAnswer(p, qid, result, mark));
    updateSession((s) => (s ? { ...s, results: { ...s.results, [qid]: result }, marks: mark ? { ...(s.marks || {}), [qid]: mark } : (s.marks || {}) } : s));
  }, [commitProgress, updateSession]);

  const finishSession = useCallback((s) => {
    const answered = Object.keys(s.results).length;
    const marks = s.marks || {};
    let score = 0, total = 0;
    const parts = { A: { score: 0, total: 0 }, B: { score: 0, total: 0 } };
    for (const q of s.questions) {
      const w = weightOf(s.mode, q);
      const got = s.results[q.id] != null ? w * answerFraction(s.results[q.id], marks[q.id]) : 0;
      score += got; total += w;
      const part = q.type === 'short' ? parts.B : parts.A;
      part.score += got; part.total += w;
    }
    score = Math.round(score * 100) / 100;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const seconds = Math.round((Date.now() - s.startedAt) / 1000);
    const summary = { mode: s.mode, title: s.title, score, total, answered, pct, seconds, at: Date.now(), questions: s.questions, results: s.results, marks, parts: s.mode === 'mock' ? parts : null };
    if (answered > 0 && SCORED_MODES.includes(s.mode)) {
      commitProgress((p) => recordSession(p, { mode: s.mode, title: s.title, score, total, pct, seconds, at: summary.at }));
    }
    setLastSummary(summary);
    saveSummary(profilesRef.current.currentId, serialiseSummary(summary));
    updateSession(null);
    go('summary');
  }, [go, commitProgress, updateSession]);

  const quitSession = useCallback(() => { updateSession(null); go('home'); }, [updateSession, go]);

  const flag = useCallback((qid) => commitProgress((p) => toggleFlag(p, qid)), [commitProgress]);

  // first-run: create a profile
  useEffect(() => {
    if (!current && route !== 'profiles') setSheet('profile');
  }, [current, route]);

  const homeProps = { content, pool: filteredPool, progress, settings, setSettings: updateSettings, startSession, profile: current, savedSession: savedSessionInfo, onResume: resumeSession, onDiscardSaved: discardSaved, onBackup: backupNow, go };

  const page = (() => {
    if (error) return <div className="banner error"><b>Could not load questions.</b> {error}<br /><span className="small muted">Check that <code>public/content/questions.json</code> exists and is valid JSON.</span></div>;
    if (!content) return <div className="loading"><div className="spinner" /><div>Loading questions…</div></div>;
    switch (route) {
      case 'session':
        return session ? (
          <Session session={session} setSession={updateSession} progress={progress} onAnswer={answerQuestion} onFlag={flag} onFinish={finishSession} onQuit={quitSession} topics={content.topics} />
        ) : (
          <Home {...homeProps} />
        );
      case 'summary':
        return <Summary summary={lastSummary} topics={content.topics} progress={progress} startSession={startSession} go={go} />;
      case 'print':
        return <PrintView content={content} progress={progress} />;
      case 'tips':
        return <Tips />;
      case 'profiles':
        return <Profiles profilesData={profilesData} progressCurrent={progress} current={current} onSwitch={switchProfile} onAdd={() => setSheet('profile')} onUpdate={updateProfile} onRemove={removeProfile} onImport={importProfile} onReset={resetProgress} onBackup={backupNow} persist={persist} questionIds={content.questions.map((q) => q.id)} />;
      default:
        return <Home {...homeProps} />;
    }
  })();

  const inSession = !!session && route === 'session';
  return (
    <div className={'app' + (inSession ? ' in-session' : '')}>
      <Header route={route} go={go} profile={current} profiles={profilesData.profiles} onSwitch={switchProfile} onAddProfile={() => setSheet('profile')} theme={settings.theme} setTheme={(t) => updateSettings((s) => ({ ...s, theme: t }))} inSession={inSession} />
      <main className="main">{page}</main>
      {sheet === 'profile' && <ProfileSheet onCreate={addProfile} onClose={current ? () => setSheet(null) : null} />}
      <UpdateToast />
    </div>
  );
}
