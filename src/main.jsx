import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { restoreFromMirror } from './lib/storage.js';
import './styles.css';

// If the phone cleared localStorage but the IndexedDB mirror survived, copy it back before the app reads anything.
restoreFromMirror().finally(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// PWA: register the service worker in production only.
// The worker calls skipWaiting + clients.claim, so a new deploy takes over at once; when that
// happens (and this page was already controlled by an older worker) we show a refresh toast.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      window.__mgmt6110UpdateReady = true;
      window.dispatchEvent(new Event('mgmt6110:update'));
    });
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
}
