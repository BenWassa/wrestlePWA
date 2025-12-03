import { addSession as addSessionToDb, deleteSession as deleteSessionFromDb } from './storage.js';

export let state = { currentUser: null, sessions: [] };

export function switchView(viewName) {
  ['dashboard', 'log', 'journal', 'insights'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.className = `nav-btn group flex flex-col items-center justify-center w-full h-full ${btn.dataset.target === viewName ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`);
  const fab = document.getElementById('fab'); if (fab) viewName === 'log' ? fab.classList.add('hidden') : fab.classList.remove('hidden');
  const app = document.getElementById('app-container'); if (app) app.scrollTop = 0;
}

window.switchView = switchView;

export function formatDate(ts) { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

export function getLevel(hours) { if (hours < 10) return { name: 'Rookie', color: 'text-slate-400', next: 10 }; if (hours < 50) return { name: 'Prospect', color: 'text-emerald-400', next: 50 }; if (hours < 150) return { name: 'Contender', color: 'text-blue-400', next: 150 }; if (hours < 500) return { name: 'State Champ', color: 'text-amber-400', next: 500 }; return { name: 'All-American', color: 'text-rose-500', next: 1000 }; }

function escapeHTML(s) { if (!s) return ''; return s.replace(/[&<>"]'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export function createSessionCard(s, isJournal) {
  const intensityColor = (s.intensity || 0) >= 8 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500';
  const icon = (s.intensity || 0) >= 8 ? 'activity' : 'dumbbell';
  const deleteBtn = isJournal ? `<button data-id="${s.id}" class="delete-btn absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : '';
  const notesHtml = s.notes ? `<div class="mt-2 text-slate-300 text-sm">${escapeHTML(s.notes)}</div>` : '';
  const aiHtml = s.aiSummary ? `<div class="mt-2 text-slate-400 italic text-sm">AI: ${escapeHTML(s.aiSummary)}</div>` : '';
  const feelHtml = `<div class="mt-2 text-xs text-slate-400">Physical: ${s.physicalFeel || '-'} • Mental: ${s.mentalFeel || '-'}</div>`;
  const summary = isJournal ? `${notesHtml}` : `<div class="text-slate-400 text-sm truncate w-48">${escapeHTML(s.notes || 'No notes')}</div>`;
  return `
    <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 relative ${isJournal ? '' : 'bg-slate-800/50'}">
      ${deleteBtn}
      <div class="flex items-center gap-4 mb-2">
        <div class="w-10 h-10 rounded-full flex items-center justify-center ${intensityColor}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
        <div class="flex-1">
          <div class="flex justify-between items-baseline pr-6"><span class="text-white font-semibold">${escapeHTML(s.sessionType || s.type || 'Session')}</span><span class="text-slate-500 text-xs">${formatDate(s.date || s.createdAt)}</span></div>
          <div class="flex items-center gap-2 text-xs text-slate-400 mt-1"><span>${(s.duration || 0)}m</span><span>•</span><span>RPE ${s.intensity || '-'}/10</span></div>
          ${!isJournal ? content : ''}
        </div>
      </div>
      ${isJournal ? content : ''}
      ${feelHtml}
      ${aiHtml}
    </div>`;
}

export function renderApp() {
  const sessionsArr = (state.sessions || []).slice();
  sessionsArr.sort((a,b) => { const aDt = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0); const bDt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0); return bDt - aDt; });
  const totalMins = sessionsArr.reduce((acc,s) => acc + (s.duration || 0), 0); const totalHrs = totalMins / 60; const level = getLevel(totalHrs);
  const elLevelName = document.getElementById('level-name'); if (elLevelName) { elLevelName.innerText = level.name; elLevelName.className = `text-3xl font-black mb-2 ${level.color}`; }
  const elTotalHours = document.getElementById('total-hours'); if (elTotalHours) elTotalHours.innerText = totalHrs.toFixed(1);
  const elLevelProgress = document.getElementById('level-progress'); if (elLevelProgress) elLevelProgress.style.width = `${Math.min(100,(totalHrs/level.next)*100)}%`;
  const elHoursCurrent = document.getElementById('hours-current'); if (elHoursCurrent) elHoursCurrent.innerText = `${Math.floor(totalHrs)} hrs`;
  const elHoursNext = document.getElementById('hours-next'); if (elHoursNext) elHoursNext.innerText = `Next Rank: ${level.next} hrs`;
  const elRecent = document.getElementById('recent-list'); if (elRecent) elRecent.innerHTML = sessionsArr.slice(0,3).map(s => createSessionCard(s,false)).join('');
  const elJournal = document.getElementById('journal-list'); if (elJournal) elJournal.innerHTML = sessionsArr.length ? sessionsArr.map(s => createSessionCard(s,true)).join('') : '<div class="text-center text-slate-500 py-10">No sessions logged yet.</div>';
  const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate()-7); const weeklySessions = sessionsArr.filter(s => { const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.date); return d > oneWeekAgo; });
  const weeklyCountEl = document.getElementById('weekly-count'); if (weeklyCountEl) weeklyCountEl.innerText = weeklySessions.length; const weeklyHrs = weeklySessions.reduce((acc,s) => acc + (s.duration || 0), 0) / 60;
  updateInsights(weeklyHrs);
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  document.querySelectorAll('.delete-btn').forEach(btn => { const clone = btn.cloneNode(true); btn.parentNode.replaceChild(clone, btn); });
  document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => { const id = btn.dataset.id; if (confirm('Delete this session?')) { const uid = state.currentUser?.uid; if (uid) deleteSessionFromDb(uid, id).catch(console.error); } }));
}

export function updateInsights(weeklyHrs) {
  const fixCounts = {}; state.sessions.forEach(s => { if (s.notes) s.notes.split(/[,\.\n]/).forEach(p => { const key = p.trim().toLowerCase(); if (key.length > 3) fixCounts[key] = (fixCounts[key] || 0) + 1; }); });
  const topFixes = Object.entries(fixCounts).sort((a,b) => b[1]-a[1]).slice(0,3);
  const insightCountEl = document.getElementById('insight-count'); if (insightCountEl) insightCountEl.innerText = topFixes.length;
  const container = document.getElementById('insights-content'); if (container) container.innerHTML = topFixes.length ? `<p class="text-indigo-100 text-sm mb-3">Pattern found in your "Notes". Focus on these:</p><ul class="space-y-3">${topFixes.map(([t,c]) => `<li class="bg-indigo-950/50 p-3 rounded-lg flex justify-between items-center border border-indigo-500/20"><span class="text-indigo-200 font-medium capitalize">${escapeHTML(t)}</span><span class="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full">Reported ${c}x</span></li>`).join('')}</ul>` : `<p class="text-indigo-200 text-sm italic">Add more notes to get better insights.</p>`;
  const avgEl = document.getElementById('avg-intensity'); if (avgEl) avgEl.innerText = `${(state.sessions.slice(0,5).reduce((a,c)=>a+(c.intensity||0),0) / Math.min(5, Math.max(1, state.sessions.length))).toFixed(1)} / 10`;
  const weeklyHoursEl = document.getElementById('weekly-hours'); if (weeklyHoursEl) weeklyHoursEl.innerText = `${weeklyHrs.toFixed(1)} hrs`;
  const msgEl = document.getElementById('volume-msg'); if (msgEl) { if (weeklyHrs > 5) msgEl.innerText = '🔥 High volume week! Prioritize recovery and sleep.'; else if (weeklyHrs > 0) msgEl.innerText = 'Consistency is key. Good work this week.'; else msgEl.innerText = 'Time to get back on the mat.'; }
}

export function initUI() {
  const fab = document.getElementById('fab'); if (fab) fab.addEventListener('click', () => switchView('log'));
  // Wire navigation buttons programmatically to remove inline onclick handlers
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { const target = btn.dataset.target; if (target) switchView(target); }));
  // Wire any nav links (e.g., 'View All') which use data-target attributes
  document.querySelectorAll('.nav-link').forEach(lnk => lnk.addEventListener('click', () => { const target = lnk.dataset.target; if (target) switchView(target); }));
  const logForm = document.getElementById('log-form'); if (logForm) { logForm.addEventListener('submit', async e => { e.preventDefault(); const uid = state.currentUser?.uid; if (!uid) return alert('You must be signed-in to log sessions'); const btn = e.target.querySelector('button'); const original = btn.innerHTML; btn.innerText = 'Saving...'; btn.disabled = true; const newData = { date: Date.now(), sessionType: document.getElementById('inp-type').value, duration: Number(document.getElementById('inp-duration').value), intensity: Number(document.getElementById('inp-intensity').value), physicalFeel: Number(document.getElementById('inp-physical').value), mentalFeel: Number(document.getElementById('inp-mental').value), notes: document.getElementById('inp-notes').value.trim(), aiSummary: '' }; try { await addSessionToDb(uid, newData); e.target.reset(); const dur = document.getElementById('inp-duration'); if (dur) dur.value = 90; const val = document.getElementById('val-intensity'); if (val) val.innerText = '5/10'; const pv = document.getElementById('val-physical'); if (pv) pv.innerText = '5/10'; const mv = document.getElementById('val-mental'); if (mv) mv.innerText = '7/10'; switchView('dashboard'); } catch (err) { alert('Error saving session'); console.error(err); } finally { btn.innerHTML = original; btn.disabled = false; } }); }
  const intensityInput = document.getElementById('inp-intensity'); if (intensityInput) intensityInput.addEventListener('input', e => { const val = e.target.value; const label = document.getElementById('val-intensity'); if (label) { label.innerText = `${val}/10`; label.className = `text-xs font-bold ${val <= 3 ? 'text-emerald-400' : val <= 7 ? 'text-amber-400' : 'text-red-500'}`; } });
  const physicalInput = document.getElementById('inp-physical'); if (physicalInput) physicalInput.addEventListener('input', e => { const val = e.target.value; const label = document.getElementById('val-physical'); if (label) label.innerText = `${val}/10`; });
  const mentalInput = document.getElementById('inp-mental'); if (mentalInput) mentalInput.addEventListener('input', e => { const val = e.target.value; const label = document.getElementById('val-mental'); if (label) label.innerText = `${val}/10`; });
}

window._GeminiState = state;
