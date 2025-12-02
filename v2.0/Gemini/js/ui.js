import { addSession as addSessionToDb, deleteSession as deleteSessionFromDb } from './storage.js';
import { serverTimestamp } from './firebase.js';

// Centralized state
export let state = {
  currentUser: null,
  sessions: []
};

export function switchView(viewName) {
  ['dashboard','log','journal','insights'].forEach(v => document.getElementById(`view-${v}`).classList.add('hidden'));
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = btn.dataset.target === viewName;
    btn.className = `nav-btn group flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`;
  });

  const fab = document.getElementById('fab');
  if (viewName === 'log') fab.classList.add('hidden'); else fab.classList.remove('hidden');
  document.getElementById('app-container').scrollTop = 0;
}

export function formatDate(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

export function getLevel(hours) {
  if (hours < 10) return { name: 'Rookie', color: 'text-slate-400', next: 10 };
  if (hours < 50) return { name: 'Prospect', color: 'text-emerald-400', next: 50 };
  if (hours < 150) return { name: 'Contender', color: 'text-blue-400', next: 150 };
  if (hours < 500) return { name: 'State Champ', color: 'text-amber-400', next: 500 };
  return { name: 'All-American', color: 'text-rose-500', next: 1000 };
}

function escapeHTML(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function createSessionCard(s, isJournal) {
  const intensityColor = s.intensity >= 4 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500';
  const icon = s.intensity >= 4 ? 'activity' : 'dumbbell';
  const tagsHtml = s.tags && s.tags.length ? `<div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/50">${s.tags.map(t => `<span class="text-[10px] bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-700">#${escapeHTML(t)}</span>`).join('')}</div>` : '';

  const deleteBtn = isJournal ? `<button data-id="${s.id}" class="delete-btn absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : '';

  const content = isJournal ? `<div class="grid grid-cols-1 gap-2 mt-2">${s.wins ? `<div><h4 class="text-emerald-400 text-xs font-bold uppercase">Wins</h4><p class="text-slate-300 text-sm">${escapeHTML(s.wins)}</p></div>` : ''}${s.fixes ? `<div><h4 class="text-rose-400 text-xs font-bold uppercase">Fixes</h4><p class="text-slate-300 text-sm">${escapeHTML(s.fixes)}</p></div>` : ''}</div>` : `<div class="text-slate-400 text-sm truncate w-48">${escapeHTML(s.fixes || s.wins || 'No notes')}</div>`;

  return `
    <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 relative ${isJournal ? '' : 'bg-slate-800/50'}">
      ${deleteBtn}
      <div class="flex items-center gap-4 mb-2">
        <div class="w-10 h-10 rounded-full flex items-center justify-center ${intensityColor}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
        <div class="flex-1">
          <div class="flex justify-between items-baseline pr-6"><span class="text-white font-semibold">${escapeHTML(s.type)}</span><span class="text-slate-500 text-xs">${formatDate(s.createdAt)}</span></div>
          ${!isJournal ? content : ''}
        </div>
      </div>
      ${isJournal ? content : ''}
      ${tagsHtml}
    </div>`;
}

export function renderApp() {
  const sessions = state.sessions;
  // Sort by date desc
  sessions.sort((a,b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0);
    return bDate - aDate;
  });

  const totalMins = sessions.reduce((acc,s) => acc + (s.duration || 0),0);
  const totalHrs = totalMins/60;
  const level = getLevel(totalHrs);

  document.getElementById('level-name').innerText = level.name;
  document.getElementById('level-name').className = `text-3xl font-black mb-2 ${level.color}`;
  document.getElementById('total-hours').innerText = totalHrs.toFixed(1);

  const progress = Math.min(100, (totalHrs/level.next)*100);
  document.getElementById('level-progress').style.width = `${progress}%`;
  document.getElementById('hours-current').innerText = `${Math.floor(totalHrs)} hrs`;
  document.getElementById('hours-next').innerText = `Next Rank: ${level.next} hrs`;

  document.getElementById('recent-list').innerHTML = sessions.slice(0,3).map(s=>createSessionCard(s,false)).join('');
  document.getElementById('journal-list').innerHTML = sessions.length ? sessions.map(s=>createSessionCard(s,true)).join('') : '<div class="text-center text-slate-500 py-10">No sessions logged yet.</div>';

  const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate()-7);
  const weeklySessions = sessions.filter(s => {
    const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.date);
    return d > oneWeekAgo;
  });
  document.getElementById('weekly-count').innerText = weeklySessions.length;
  const weeklyHrs = weeklySessions.reduce((acc,s) => acc + (s.duration || 0), 0) / 60;

  updateInsights(weeklyHrs);

  // re-render icons and attach delete handlers
  lucide.createIcons();
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('Delete this session?')) {
        const uid = state.currentUser?.uid;
        if (uid) deleteSessionFromDb(uid, id).catch(console.error);
      }
    });
  });
}

export function updateInsights(weeklyHrs) {
  const fixCounts = {};
  state.sessions.forEach(s => {
    if (s.fixes) {
      s.fixes.split(/[,\.\n]/).forEach(phrase => {
        const p = phrase.trim().toLowerCase();
        if (p.length > 3) fixCounts[p] = (fixCounts[p] || 0) + 1;
      });
    }
  });
  const topFixes = Object.entries(fixCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  document.getElementById('insight-count').innerText = topFixes.length;
  const container = document.getElementById('insights-content');
  if (topFixes.length > 0) {
    container.innerHTML = `...`; // small placeholder — content generated in renderApp flow if needed
  } else {
    container.innerHTML = `<p class="text-indigo-200 text-sm italic">Log more "Fixes" to get technical feedback.</p>`;
  }

  const recent5 = state.sessions.slice(0,5);
  const avgInt = recent5.length ? (recent5.reduce((a,c) => a + c.intensity, 0) / recent5.length).toFixed(1) : 0;
  document.getElementById('avg-intensity').innerText = `${avgInt} / 5`;
  document.getElementById('weekly-hours').innerText = `${weeklyHrs.toFixed(1)} hrs`;

  const msgEl = document.getElementById('volume-msg');
  if (weeklyHrs > 5) msgEl.innerText = "🔥 High volume week! Prioritize recovery and sleep.";
  else if (weeklyHrs > 0) msgEl.innerText = "Consistency is key. Good work this week.";
  else msgEl.innerText = "Time to get back on the mat.";
}

export function initUI(onSubmit) {
  // Nav buttons are inline, but ensure fab toggling
  document.getElementById('fab').addEventListener('click', () => switchView('log'));

  const logForm = document.getElementById('log-form');
  logForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = state.currentUser?.uid;
    if (!uid) return alert('You must be signed-in to log sessions');

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML; btn.innerText = 'Saving...'; btn.disabled = true;

    const newData = {
      createdAt: serverTimestamp(),
      date: new Date().toISOString(),
      duration: Number(document.getElementById('inp-duration').value),
      type: document.getElementById('inp-type').value,
      intensity: Number(document.getElementById('inp-intensity').value),
      wins: document.getElementById('inp-wins').value,
      fixes: document.getElementById('inp-fixes').value,
      tags: document.getElementById('inp-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
    };

    try {
      await addSessionToDb(uid, newData);
      e.target.reset();
      document.getElementById('inp-duration').value = 90;
      document.getElementById('val-intensity').innerText = '3/5';
      switchView('dashboard');
    } catch (err) {
      alert('Error saving session');
      console.error(err);
    } finally {
      btn.innerHTML = originalText; btn.disabled = false;
    }
  });

  document.getElementById('inp-intensity').addEventListener('input', (e) => {
    const val = e.target.value;
    const label = document.getElementById('val-intensity');
    label.innerText = `${val}/5`;
    label.className = `text-xs font-bold ${val <= 2 ? 'text-emerald-400' : val <= 4 ? 'text-amber-400' : 'text-red-500'}`;
  });

  // Tab buttons are already inline `onclick`, but we can bind if needed
}
