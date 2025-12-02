import { db, appId, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from './firebase.js';

export function watchSessions(uid, onUpdate, onError) {
  if (!db) return () => {};
  const q = query(collection(db, 'artifacts', appId, 'users', uid, 'sessions'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(data);
  }, onError);
}

export function addSession(uid, newSession) {
  if (!db) return Promise.reject(new Error('Firestore not configured'));
  return addDoc(collection(db, 'artifacts', appId, 'users', uid, 'sessions'), newSession);
}

export function deleteSession(uid, id) {
  if (!db) return Promise.reject(new Error('Firestore not configured'));
  return deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'sessions', id));
}
