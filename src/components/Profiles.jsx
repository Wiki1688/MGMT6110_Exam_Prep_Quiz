import React, { useMemo, useRef, useState } from 'react';
import { AVATARS, parseImport, loadProgress, progressStats } from '../lib/storage.js';
import { fmtDate, fmtTime } from '../lib/utils.js';

export function ProfileSheet({ onCreate, onClose, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const submit = (e) => {
    e.preventDefault();
    onCreate(name, emoji);
  };
  return (
    <div className="sheet-bg" onClick={onClose || undefined}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial ? 'Edit profile' : 'Who is studying?'}</h2>
        <p className="muted small">Each profile keeps its own progress on this device. Add one per person if you share a laptop.</p>
        <label className="small muted" htmlFor="pname">Name</label>
        <input id="pname" className="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wee Khee" autoFocus maxLength={30} />
        <div className="small muted" style={{ margin: '12px 0 6px' }}>Pick an avatar</div>
        <div className="avatar-grid">
          {AVATARS.map((a) => <button type="button" key={a} className={a === emoji ? 'on' : ''} onClick={() => setEmoji(a)} aria-label={`avatar ${a}`} aria-pressed={a === emoji}>{a}</button>)}
        </div>
        <div className="btn-row end" style={{ marginTop: 16 }}>
          {onClose && <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>}
          <button type="submit" className="btn primary" disabled={!name.trim()}>{initial ? 'Save' : 'Start studying'} →</button>
        </div>
      </form>
    </div>
  );
}

export default function Profiles({ profilesData, progressCurrent, current, onSwitch, onAdd, onUpdate, onRemove, onImport, onReset, onBackup, persist, questionIds }) {
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [pendingImport, setPendingImport] = useState(null);

  const leaderboard = useMemo(() => profilesData.profiles.map((p) => {
    const prog = p.id === current?.id ? progressCurrent : loadProgress(p.id);
    const bestOf = (m) => prog.best?.[m];
    return { p, mock: bestOf('mock'), quick: bestOf('quiz40'), core: bestOf('core'), answered: prog.totals?.answered || 0, streak: prog.streak?.count || 0 };
  }).sort((a, b) => (b.mock?.pct ?? -1) - (a.mock?.pct ?? -1) || (b.core?.pct ?? -1) - (a.core?.pct ?? -1) || b.answered - a.answered), [profilesData, progressCurrent, current]);

  const stats = progressStats(progressCurrent, questionIds);
  const persistText = persist === 'protected' ? 'Storage: protected' : persist === 'unknown' ? 'Storage: checking…' : 'Storage: may be cleared by the phone';
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = parseImport(await f.text());
      setPendingImport(data);
    } catch (err) {
      setMsg(err.oldFormat ? err.message : 'Import failed: ' + err.message);
    }
  };

  return (
    <div className="narrow">
      {msg && <div className="banner" role="status" data-testid="import-msg">{msg} <button className="btn sm ghost" onClick={() => setMsg('')}>OK</button></div>}
      <div className="card">
        <div className="section-title" style={{ margin: '0 0 10px' }}><h2>Profiles on this device</h2><button className="btn sm primary" onClick={onAdd}>➕ New</button></div>
        <div className="profile-list">
          {profilesData.profiles.map((p) => (
            <div key={p.id} className={'profile-row' + (p.id === current?.id ? ' current' : '')}>
              <span className="avatar">{p.emoji}</span>
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                <b>{p.name}</b>{p.id === current?.id && <span className="chip brand" style={{ marginLeft: 8 }}>active</span>}
                <div className="small muted">since {fmtDate(p.createdAt)}</div>
              </div>
              <div className="btn-row" style={{ marginLeft: 'auto' }}>
              {p.id !== current?.id && <button className="btn sm" onClick={() => onSwitch(p.id)}>Switch</button>}
              <button className="btn sm ghost" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>✏️</button>
              <button className="btn sm ghost danger" onClick={() => { if (confirm(`Delete profile "${p.name}" and all its progress on this device?`)) onRemove(p.id); }} aria-label={`Delete ${p.name}`}>🗑</button>
              </div>
            </div>
          ))}
          {!profilesData.profiles.length && <p className="muted">No profiles yet.</p>}
        </div>
      </div>

      <div className="card" data-testid="backup-card">
        <h2>Back up, restore and sync</h2>
        <div className="btn-row" style={{ marginBottom: 8 }}>
          <span className={'chip ' + (persist === 'protected' ? 'ok' : 'warn')} data-testid="persist-status">{persist === 'protected' ? '🔒' : '⚠️'} {persistText}</span>
          {current && <span className="chip">Last backup: {progressCurrent.backupAt ? fmtDate(progressCurrent.backupAt) : 'never'}</span>}
        </div>
        <p className="muted small">Progress is saved on this device the moment you answer (and copied to a second store in the browser). {persist === 'protected' ? 'The browser has agreed not to clear it.' : 'The phone may still clear it when storage runs low, so back up now and then.'} A backup is a small file: send it to yourself (WhatsApp, email) and import it on another device.</p>
        <p className="small muted">New question bank (5 Nov): progress started fresh for everyone. Backup files from the old bank cannot be imported; files made by this version can.</p>
        {msg && <div className="banner" role="status" data-testid="import-msg-inline">{msg}</div>}
        {current && <p className="small">{current.emoji} <b>{current.name}</b>: {stats.answered} answered · {stats.correct} correct last time · {stats.flagged} flagged</p>}
        <div className="btn-row">
          <button className="btn primary" onClick={onBackup} disabled={!current}>💾 Back up now (.json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()} data-testid="import-btn">📥 Import a backup file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onFile} data-testid="import-input" />
          <button className="btn ghost danger" onClick={() => { if (current && confirm(`Reset all progress for ${current.name}?`)) onReset(); }} disabled={!current}>Reset progress</button>
        </div>
        {pendingImport && (
          <div className="banner" style={{ marginTop: 12 }} data-testid="import-choice">
            <b>Found progress for {pendingImport.profile.emoji} {pendingImport.profile.name}</b> ({Object.keys(pendingImport.progress.answers || {}).length} questions answered, {Object.values(pendingImport.progress.flags || {}).filter((f) => f.on).length} flagged · file format {pendingImport.format}). What do you want to do?
            <div className="btn-row" style={{ marginTop: 8 }}>
              {current && <button className="btn sm primary" data-testid="import-merge" onClick={() => { onImport(pendingImport.profile, pendingImport.progress, 'merge'); setPendingImport(null); setMsg(`Merged into ${current.name}. For each question the latest answer was kept; flags were combined.`); }}>Merge into {current.name} (recommended)</button>}
              <button className={'btn sm' + (current ? '' : ' primary')} data-testid="import-new" onClick={() => { onImport(pendingImport.profile, pendingImport.progress, 'new'); setPendingImport(null); setMsg('Imported as a new profile.'); }}>Add as new profile</button>
              {current && <button className="btn sm ghost danger" data-testid="import-replace" onClick={() => { if (confirm(`Replace ALL of ${current.name}'s progress on this device with the file?`)) { onImport(pendingImport.profile, pendingImport.progress, 'replace'); setPendingImport(null); setMsg(`Replaced ${current.name}'s progress with the file.`); } }}>Replace {current.name}'s progress</button>}
              <button className="btn sm ghost" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>🏆 Leaderboard (this device)</h2>
        <div style={{ overflowX: 'auto' }}><table className="leaderboard">
          <thead><tr><th>#</th><th>Who</th><th>Mock</th><th>Core</th><th>40 quiz</th><th>Done</th><th>Streak</th></tr></thead>
          <tbody>
            {leaderboard.map((row, i) => (
              <tr key={row.p.id}>
                <td>{i === 0 && row.mock ? '🥇' : i === 1 && row.mock ? '🥈' : i === 2 && row.mock ? '🥉' : i + 1}</td>
                <td>{row.p.emoji} {row.p.name}</td>
                <td>{row.mock ? <span style={{ whiteSpace: 'nowrap' }}>{row.mock.pct}% <span className="muted small">({fmtTime(row.mock.seconds)})</span></span> : '–'}</td>
                <td>{row.core ? `${row.core.pct}%` : '–'}</td>
                <td>{row.quick ? `${row.quick.pct}%` : '–'}</td>
                <td>{row.answered}</td>
                <td>{row.streak ? `🔥 ${row.streak}` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {current && (progressCurrent.sessions || []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <h3>Recent sessions ({current.name})</h3>
            <div className="small">
              {(progressCurrent.sessions || []).slice(0, 8).map((s) => (
                <div key={s.at} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  <span>{s.title}</span><span className="muted">{s.score}/{s.total} · {s.pct}% · {fmtDate(s.at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editing && <ProfileSheet initial={editing} onClose={() => setEditing(null)} onCreate={(name, emoji) => { onUpdate(editing.id, { name: name.trim() || editing.name, emoji }); setEditing(null); }} />}
    </div>
  );
}
