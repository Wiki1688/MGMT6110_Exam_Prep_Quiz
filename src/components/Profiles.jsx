import React, { useMemo, useRef, useState } from 'react';
import { AVATARS, exportProfile, parseImport, loadProgress } from '../lib/storage.js';
import { download, fmtDate, fmtTime } from '../lib/utils.js';

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

export default function Profiles({ profilesData, progressCurrent, current, onSwitch, onAdd, onUpdate, onRemove, onImport, onReset }) {
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [pendingImport, setPendingImport] = useState(null);

  const leaderboard = useMemo(() => profilesData.profiles.map((p) => {
    const prog = p.id === current?.id ? progressCurrent : loadProgress(p.id);
    const bestOf = (m) => prog.best?.[m];
    return { p, mock: bestOf('mock'), quick: bestOf('quick10'), quiz4: bestOf('quiz4'), answered: prog.totals?.answered || 0, streak: prog.streak?.count || 0 };
  }).sort((a, b) => (b.mock?.pct ?? -1) - (a.mock?.pct ?? -1) || (b.quiz4?.pct ?? -1) - (a.quiz4?.pct ?? -1) || b.answered - a.answered), [profilesData, progressCurrent, current]);

  const doExport = () => {
    if (!current) return;
    download(`mgmt6110-progress-${current.name.replace(/\W+/g, '_')}.json`, exportProfile(current, progressCurrent), 'application/json');
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = parseImport(await f.text());
      setPendingImport(data);
    } catch (err) {
      setMsg('Import failed: ' + err.message);
    }
  };

  return (
    <div className="narrow">
      {msg && <div className="banner" role="status">{msg} <button className="btn sm ghost" onClick={() => setMsg('')}>OK</button></div>}
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

      <div className="card">
        <h2>Sync between phone and laptop</h2>
        <p className="muted small">Progress lives in this browser only. To carry it over: export here, send the file to yourself (WhatsApp, email, AirDrop), then import on the other device.</p>
        <div className="btn-row">
          <button className="btn" onClick={doExport} disabled={!current}>⬆️ Export {current ? current.name + "'s" : ''} progress (.json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬇️ Import a progress file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onFile} />
          <button className="btn ghost danger" onClick={() => { if (current && confirm(`Reset all progress for ${current.name}?`)) onReset(); }} disabled={!current}>Reset progress</button>
        </div>
        {pendingImport && (
          <div className="banner" style={{ marginTop: 12 }}>
            <b>Found progress for {pendingImport.profile.emoji} {pendingImport.profile.name}</b> ({Object.keys(pendingImport.progress.answers || {}).length} questions answered). What do you want to do?
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button className="btn sm primary" onClick={() => { onImport(pendingImport.profile, pendingImport.progress, 'new'); setPendingImport(null); setMsg('Imported as a new profile.'); }}>Add as new profile</button>
              {current && <button className="btn sm" onClick={() => { onImport(pendingImport.profile, pendingImport.progress, 'merge'); setPendingImport(null); setMsg(`Merged into ${current.name}.`); }}>Merge into {current.name}</button>}
              <button className="btn sm ghost" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>🏆 Leaderboard (this device)</h2>
        <div style={{ overflowX: 'auto' }}><table className="leaderboard">
          <thead><tr><th>#</th><th>Who</th><th>Mock</th><th>Quiz 4</th><th>Quick 10</th><th>Done</th><th>Streak</th></tr></thead>
          <tbody>
            {leaderboard.map((row, i) => (
              <tr key={row.p.id}>
                <td>{i === 0 && row.mock ? '🥇' : i === 1 && row.mock ? '🥈' : i === 2 && row.mock ? '🥉' : i + 1}</td>
                <td>{row.p.emoji} {row.p.name}</td>
                <td>{row.mock ? <span style={{ whiteSpace: 'nowrap' }}>{row.mock.pct}% <span className="muted small">({fmtTime(row.mock.seconds)})</span></span> : '–'}</td>
                <td>{row.quiz4 ? `${row.quiz4.pct}%` : '–'}</td>
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
