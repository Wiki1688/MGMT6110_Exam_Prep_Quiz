import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { loadContent } from './lib/content.js';
import {
  loadProfiles, saveProfiles, loadProgress, saveProgress, deleteProgress, loadSettings, saveSettings,
  recordAnswer, toggleFlag, recordSession, emptyProgress, uid, mergeProgress,
} from './lib/storage.js';
import { shuffle, pick } from './lib/utils.js';
import Header from './components/Header.jsx';
import Home from './components/Home.jsx';
import Session from './components/Session.jsx';
import Summary from './components/Summary.jsx';
import PrintView from './components/PrintView.jsx';
import Tips from './components/Tips.jsx';
import Profiles from './components/Profiles.jsx';
import { ProfileSheet } from './components/Profiles.jsx';

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
  const [profilesData, setProfilesData] = useState(loadProfiles);
  const [progress, setProgress] = useState(() => {
    const p = loadProfiles();
    return p.currentId ? loadProgress(p.currentId) : emptyProgress();
  });
  const [session, setSession] = useState(null);
  const [lastSummary, setLastSummary] = useState(null);
  const [sheet, setSheet] = useState(null); // 'profile'

  // ---- content ----
  useEffect(() => {
    loadContent().then(setContent).catch((e) => setError(e.message));
  }, []);

  // ---- theme ----
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    saveSettings(settings);
  }, [settings]);

  // ---- profiles / progress persistence ----
  const current = profilesData.profiles.find((p) => p.id === profilesData.currentId) || null;
  useEffect(() => saveProfiles(profilesData), [profilesData]);
  useEffect(() => {
    if (current) saveProgress(current.id, progress);
  }, [progress, current]);

  const switchProfile = useCallback((id) => {
    setProfilesData((d) => ({ ...d, currentId: id }));
    setProgress(loadProgress(id));
    setSession(null);
  }, []);

  const addProfile = useCallback((name, emoji) => {
    const p = { id: uid(), name: name.trim() || 'Student', emoji, createdAt: Date.now() };
    setProfilesData((d) => ({ profiles: [...d.profiles, p], currentId: p.id }));
    setProgress(emptyProgress());
    setSheet(null);
    return p;
  }, []);

  const updateProfile = useCallback((id, patch) => {
    setProfilesData((d) => ({ ...d, profiles: d.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);

  const removeProfile = useCallback((id) => {
    deleteProgress(id);
    setProfilesData((d) => {
      const profiles = d.profiles.filter((p) => p.id !== id);
      const currentId = d.currentId === id ? (profiles[0]?.id || null) : d.currentId;
      if (currentId !== d.currentId) setProgress(currentId ? loadProgress(currentId) : emptyProgress());
      return { profiles, currentId };
    });
  }, []);

  const importProfile = useCallback((profile, imported, mode /* 'new' | 'merge' */) => {
    if (mode === 'merge' && current) {
      setProgress((p) => mergeProgress(p, imported));
      return;
    }
    const p = { ...profile, id: uid(), createdAt: Date.now() };
    saveProgress(p.id, imported);
    setProfilesData((d) => ({ profiles: [...d.profiles, p], currentId: p.id }));
    setProgress(imported);
  }, [current]);

  const resetProgress = useCallback(() => setProgress(emptyProgress()), []);

  // ---- session building ----
  const filteredPool = useMemo(() => {
    if (!content) return [];
    return content.questions.filter((q) => settings.types[q.type] !== false && settings.difficulty[q.difficulty] !== false);
  }, [content, settings]);

  const startSession = useCallback((spec) => {
    // spec: { mode, title, topics?, count?, timerMinutes?, questions? (ids), shuffleQ?, shuffleOpts? }
    let qs;
    if (spec.questions) {
      const ids = new Set(spec.questions);
      qs = content.questions.filter((q) => ids.has(q.id));
    } else {
      qs = filteredPool;
      if (spec.mode === 'quiz4') qs = qs.filter((q) => q.quiz4);
      if (spec.topics?.length) qs = qs.filter((q) => spec.topics.includes(q.topic));
      if (spec.mode === 'wrong') qs = qs.filter((q) => progress.answers[q.id]?.last === 'wrong' || progress.answers[q.id]?.last === 'partly');
      if (spec.mode === 'flagged') qs = qs.filter((q) => progress.flags[q.id]);
    }
    const shuffleQ = spec.shuffleQ ?? settings.shuffleQ;
    if (shuffleQ) qs = shuffle(qs);
    if (spec.count) qs = qs.slice(0, spec.count);
    if (!qs.length) return false;
    const shuffleOpts = spec.shuffleOpts ?? settings.shuffleOpts;
    const optOrder = {};
    for (const q of qs) if (q.type === 'mcq') optOrder[q.id] = shuffleOpts ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i);
    const timerMinutes = spec.timerMinutes != null ? spec.timerMinutes : null;
    setSession({
      mode: spec.mode,
      title: spec.title,
      questions: qs,
      optOrder,
      timerSec: settings.timer && timerMinutes ? timerMinutes * 60 : null,
      startedAt: Date.now(),
      results: {},
      index: 0,
    });
    go('session');
    return true;
  }, [content, filteredPool, progress, settings, go]);

  const answerQuestion = useCallback((qid, result) => {
    setProgress((p) => recordAnswer(p, qid, result));
    setSession((s) => (s ? { ...s, results: { ...s.results, [qid]: result } } : s));
  }, []);

  const finishSession = useCallback((s) => {
    const answered = Object.keys(s.results).length;
    const score = Object.values(s.results).reduce((a, r) => a + (r === 'correct' ? 1 : r === 'partly' ? 0.5 : 0), 0);
    const total = s.questions.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const seconds = Math.round((Date.now() - s.startedAt) / 1000);
    const summary = { mode: s.mode, title: s.title, score, total, answered, pct, seconds, at: Date.now(), questions: s.questions, results: s.results };
    if (answered > 0 && ['mock', 'quick10', 'quiz4', 'topic'].includes(s.mode)) {
      setProgress((p) => recordSession(p, { mode: s.mode, title: s.title, score, total, pct, seconds, at: summary.at }));
    }
    setLastSummary(summary);
    setSession(null);
    go('summary');
  }, [go]);

  const flag = useCallback((qid) => setProgress((p) => toggleFlag(p, qid)), []);

  // first-run: create a profile
  useEffect(() => {
    if (!current && route !== 'profiles') setSheet('profile');
  }, [current, route]);

  const page = (() => {
    if (error) return <div className="main"><div className="banner error"><b>Could not load questions.</b> {error}<br /><span className="small muted">Check that <code>public/content/questions.json</code> exists and is valid JSON.</span></div></div>;
    if (!content) return <div className="main"><div className="loading"><div className="spinner" /><div>Loading questions…</div></div></div>;
    switch (route) {
      case 'session':
        return session ? (
          <Session session={session} setSession={setSession} progress={progress} onAnswer={answerQuestion} onFlag={flag} onFinish={finishSession} onQuit={() => { setSession(null); go('home'); }} topics={content.topics} />
        ) : (
          <Home content={content} pool={filteredPool} progress={progress} settings={settings} setSettings={setSettings} startSession={startSession} profile={current} />
        );
      case 'summary':
        return <Summary summary={lastSummary} topics={content.topics} progress={progress} startSession={startSession} go={go} />;
      case 'print':
        return <PrintView content={content} progress={progress} />;
      case 'tips':
        return <Tips />;
      case 'profiles':
        return <Profiles profilesData={profilesData} progressCurrent={progress} current={current} onSwitch={switchProfile} onAdd={() => setSheet('profile')} onUpdate={updateProfile} onRemove={removeProfile} onImport={importProfile} onReset={resetProgress} />;
      default:
        return <Home content={content} pool={filteredPool} progress={progress} settings={settings} setSettings={setSettings} startSession={startSession} profile={current} />;
    }
  })();

  return (
    <div className="app">
      <Header route={route} go={go} profile={current} profiles={profilesData.profiles} onSwitch={switchProfile} onAddProfile={() => setSheet('profile')} theme={settings.theme} setTheme={(t) => setSettings((s) => ({ ...s, theme: t }))} inSession={!!session && route === 'session'} />
      <main className="main">{page}</main>
      {sheet === 'profile' && <ProfileSheet onCreate={addProfile} onClose={current ? () => setSheet(null) : null} />}
    </div>
  );
}
