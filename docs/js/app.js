import { auth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from './firebase.js';
import { watchSessions } from './storage.js';
import { initUI, renderApp, state, updateSyncIndicator } from './ui.js';

// Init UI event listeners
initUI();

let unsubscribeWatcher = null;

export async function init() {
  if (!auth) {
    // No auth — boot offline UI
    state.currentUser = null;
    state.sessions = [];
    renderApp();
    document.getElementById('loading-screen').classList.add('hidden');
    return;
  }

  try {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }
  } catch (err) {
    console.error('Auth Error', err);
    // Set an auth error state visible to UI and continue in offline mode
    state.authError = (err && err.message) ? err.message : 'Auth error';
    state.currentUser = null;
    state.sessions = [];
    renderApp();
    const ls = document.getElementById('loading-screen'); if (ls) ls.classList.add('hidden');
    return; // avoid further wait on auth state change
  }

  onAuthStateChanged(auth, (user) => {
    if (unsubscribeWatcher) { unsubscribeWatcher(); unsubscribeWatcher = null; }

    if (user) {
      state.currentUser = user;
      unsubscribeWatcher = watchSessions(user.uid, (data) => { state.sessions = data; state.firestoreError = null; renderApp(); }, (err) => { console.error('watchSessions error', err); state.firestoreError = err.message || String(err); renderApp(); });
      document.getElementById('loading-screen').classList.add('hidden');
      updateSyncIndicator();
    } else {
      state.currentUser = null;
      state.sessions = [];
      state.firestoreError = null;
      renderApp();
      document.getElementById('loading-screen').classList.add('hidden');
      updateSyncIndicator();
    }
  });
}

// Auto-init
init();

// Register a service worker (PWA offline support)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../service-worker.js').then(reg => console.log('ServiceWorker registered:', reg.scope)).catch(err => console.warn('SW registration failed', err));
  });
}

// Friendly export for debugging
export default { init };
