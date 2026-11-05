// Tiny IndexedDB key-value mirror (no library). Every localStorage save is copied here,
// so if the phone clears localStorage we can restore from IndexedDB on the next start.
// All calls are best-effort: they never throw and resolve to null/undefined on failure.
// v3: new database (the old one, 'mgmt6110-quiz-backup', is deleted once and never read).
const DB_NAME = 'mgmt6110-quiz3-backup';
const STORE = 'kv3';
export const OLD_DB_NAME = 'mgmt6110-quiz-backup';
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore(STORE); } catch { /* exists */ }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function idbSet(key, value) {
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      if (value === undefined) tx.objectStore(STORE).delete(key);
      else tx.objectStore(STORE).put(value, key);
      tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
    });
  } catch { /* ignore */ }
}

export async function idbDelete(key) {
  return idbSet(key, undefined);
}

/** Returns every { key, value } pair in the mirror. */
export async function idbAll() {
  try {
    const db = await openDb();
    if (!db) return [];
    return await new Promise((resolve) => {
      const out = [];
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out.push({ key: c.key, value: c.value }); c.continue(); } else resolve(out);
      };
      req.onerror = () => resolve(out);
    });
  } catch {
    return [];
  }
}

/** Best-effort delete of a whole database (used once to remove the old v1/v2 mirror). */
export function idbDeleteDatabase(name) {
  try {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.deleteDatabase(name);
    req.onerror = req.onblocked = req.onsuccess = () => {};
  } catch { /* ignore */ }
}
