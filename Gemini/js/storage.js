import { db, appId, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where, serverTimestamp } from './firebase.js';

export function watchSessions(uid, onUpdate, onError) {
  if (!db || !uid) { if (onUpdate) onUpdate([]); return () => {}; }
  // Use a per-user subcollection at users/{uid}/logs to avoid composite index requirements
  // and simplify security rules (only allow owner access to their logs).
  const logsCol = collection(db, 'users', uid, 'logs');
  const q = query(logsCol, orderBy('date', 'desc'));
  return onSnapshot(q, snapshot => {
    // Map Firestore docs to session objects
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Include any queued writes stored in localStorage so UI shows them prior to sync
    let queued = [];
    try {
      const q = JSON.parse(localStorage.getItem('wrestle-queue') || '[]');
      queued = q.filter(s => s.uid === uid).map((s) => ({ id: `queued-${s.qid}`, ...s.payload, qid: s.qid, queued: true }));
    } catch (err) { queued = []; }
    onUpdate([...data, ...queued]);
  }, onError);
}

export function addSession(uid, newSession) {
  if (!db || !navigator.onLine) {
    // Queue write locally (localStorage) for offline support.
    // We'll return a resolved promise to maintain UX; use syncQueuedWrites to flush later.
    try {
      const qKey = 'wrestle-queue';
      const stored = JSON.parse(localStorage.getItem(qKey) || '[]');
      const qid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random()*100000)}`;
      stored.push({ uid, qid, payload: Object.assign({}, newSession, { ownerId: uid, createdAt: Date.now() }) });
      localStorage.setItem(qKey, JSON.stringify(stored));
      return Promise.resolve({ queued: true });
    } catch (err) {
      return Promise.reject(new Error('Failed to queue session locally'));
    }
  }
  // Add to users/{uid}/logs — we keep ownerId for traceability but secure via rules
  const payload = Object.assign({}, newSession, { ownerId: uid, createdAt: serverTimestamp() });
  return addDoc(collection(db, 'users', uid, 'logs'), payload);
}

export function deleteSession(uid, id) {
  // If this is a queued item, remove it from the local queue
  if (String(id || '').startsWith('queued-')) {
    try {
      const qKey = 'wrestle-queue';
      const stored = JSON.parse(localStorage.getItem(qKey) || '[]');
      const qid = String(id).slice('queued-'.length);
      const filtered = stored.filter(s => s.qid !== qid);
      localStorage.setItem(qKey, JSON.stringify(filtered));
      return Promise.resolve({ deleted: true });
    } catch (err) { return Promise.reject(new Error('Failed to delete queued session')); }
  }
  if (!db) return Promise.reject(new Error('Firestore not configured'));
  // Delete by document id under users/{uid}/logs — Firestore security rules should protect owner-only deletes.
  return deleteDoc(doc(db, 'users', uid, 'logs', id));
}

// Sync queued writes that were stored while offline
export async function syncQueuedWrites(uid) {
  if (!db) return Promise.reject(new Error('Firestore not configured'));
  const qKey = 'wrestle-queue';
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(qKey) || '[]'); } catch (err) { stored = []; }
  // Filter writes for uid and for all if uid is undefined
  const toSync = stored.filter(s => !uid || s.uid === uid);
  if (!toSync.length) return Promise.resolve({ synced: 0 });
  let synced = 0;
  const removalQids = new Set();
  for (const item of toSync) {
    try {
      const payload = Object.assign({}, item.payload, { createdAt: serverTimestamp() });
      await addDoc(collection(db, 'users', item.uid, 'logs'), payload);
      synced++;
      if (item.qid) removalQids.add(item.qid);
    } catch (err) {
      console.warn('Failed to sync queued write', err);
      // Keep remaining queued writes for next attempt
    }
  }
  // Remove synced items
  if (synced > 0) {
    stored = stored.filter(s => !removalQids.has(s.qid));
    localStorage.setItem(qKey, JSON.stringify(stored));
  }
  return { synced };
}

export function getQueuedCount(uid) {
  try {
    const q = JSON.parse(localStorage.getItem('wrestle-queue') || '[]');
    return q.filter(s => !uid || s.uid === uid).length;
  } catch (err) { return 0; }
}
