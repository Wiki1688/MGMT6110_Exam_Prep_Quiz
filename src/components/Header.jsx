import React, { useState } from 'react';

const NAV = [
  ['home', '🏠', 'Home', 'Home'],
  ['tips', '💡', 'Exam format & tips', 'Exam'],
  ['print', '🖨️', 'Print & export', 'Print'],
  ['profiles', '👥', 'Profiles', 'Profiles'],
];

export default function Header({ route, go, profile, profiles, onSwitch, onAddProfile, theme, setTheme, inSession }) {
  const [open, setOpen] = useState(false);
  const nextTheme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto';
  const themeIcon = theme === 'auto' ? '🌓' : theme === 'light' ? '☀️' : '🌙';
  return (
    <header className="header">
      <div className="header-row">
        <button className="brand" onClick={() => go('home')} aria-label="MGMT6110 Exam Prep Quiz — home">
          <span className="brand-logo">?</span>
          <span>
            <div className="brand-title"><span className="bt-long">MGMT6110 Exam Prep Quiz</span><span className="bt-short">MGMT6110 Quiz</span></div>
            <div className="brand-sub">Human-AI Collaboration · Final 12 Nov</div>
          </span>
        </button>
        <div className="header-spacer" />
        <button className="hbtn" onClick={() => setTheme(nextTheme)} title={`Theme: ${theme} (tap to change)`} aria-label="Change theme">
          {themeIcon}
        </button>
        <div style={{ position: 'relative' }}>
          <button className="hbtn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
            <span>{profile ? profile.emoji : '👤'}</span>
            <span className="pname" style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile ? profile.name : 'Profile'}</span>
            <span aria-hidden>▾</span>
          </button>
          {open && (
            <div className="card" role="menu" style={{ position: 'absolute', right: 0, top: 46, minWidth: 220, padding: 8, zIndex: 30, color: 'var(--text)' }}>
              {profiles.map((p) => (
                <button key={p.id} role="menuitem" className="btn ghost block" style={{ justifyContent: 'flex-start', borderColor: p.id === profile?.id ? 'var(--brand)' : 'transparent' }} onClick={() => { onSwitch(p.id); setOpen(false); }}>
                  <span>{p.emoji}</span> {p.name}
                </button>
              ))}
              <button role="menuitem" className="btn ghost block" style={{ justifyContent: 'flex-start' }} onClick={() => { onAddProfile(); setOpen(false); }}>
                ➕ New profile
              </button>
              <button role="menuitem" className="btn ghost block" style={{ justifyContent: 'flex-start' }} onClick={() => { go('profiles'); setOpen(false); }}>
                ⚙️ Manage / sync
              </button>
            </div>
          )}
        </div>
      </div>
      {!inSession && (
        <nav className="nav" aria-label="Main">
          {NAV.map(([r, icon, label, short]) => (
            <button key={r} className={'hbtn' + (route === r || (r === 'home' && route === 'summary') ? ' active' : '')} onClick={() => go(r)}>
              <span aria-hidden>{icon}</span> <span className="nl-long">{label}</span><span className="nl-short">{short}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
