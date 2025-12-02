import { auth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from './firebase.js';
import { watchSessions } from './storage.js';
import { initUI, renderApp, state } from './ui.js';

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
  }

  onAuthStateChanged(auth, (user) => {
    if (unsubscribeWatcher) { unsubscribeWatcher(); unsubscribeWatcher = null; }

    if (user) {
      state.currentUser = user;
      unsubscribeWatcher = watchSessions(user.uid, (data) => { state.sessions = data; renderApp(); }, (err) => console.error(err));
      document.getElementById('loading-screen').classList.add('hidden');
    } else {
      state.currentUser = null;
      state.sessions = [];
      renderApp();
      document.getElementById('loading-screen').classList.add('hidden');
    }
  });
}

// Auto-init
init();

// Friendly export for debugging
export default { init };
