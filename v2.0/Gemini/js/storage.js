import { db, appId, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where } from './firebase.js';

export function watchSessions(uid, onUpdate, onError) {
  if (!db) return () => {};
  // Use a flat 'logs' collection and filter by ownerId to support cross-user analytics / simple schema
  const q = query(collection(db, 'logs'), where('ownerId', '==', uid), orderBy('date', 'desc'));
  return onSnapshot(q, snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(data);
  }, onError);
}

export function addSession(uid, newSession) {
  if (!db) return Promise.reject(new Error('Firestore not configured'));
  const payload = Object.assign({}, newSession, { ownerId: uid, createdAt: Date.now() });
  return addDoc(collection(db, 'logs'), payload);
}

export function deleteSession(uid, id) {
  if (!db) return Promise.reject(new Error('Firestore not configured'));
  // For simplicity, allow deletion by doc id — Firestore security rules should protect owner-only deletes.
  return deleteDoc(doc(db, 'logs', id));
}
