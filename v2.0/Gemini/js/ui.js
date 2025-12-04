import { addSession as addSessionToDb, deleteSession as deleteSessionFromDb, syncQueuedWrites, getQueuedCount } from './storage.js';
import { db } from './firebase.js';

export let state = { currentUser: null, sessions: [], authError: null, firestoreError: null };

function escapeHTML(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

// Ping helper: attempt a quick fetch to a lightweight URL to confirm network reachability
async function doPing(timeout = 2000, url = 'https://clients3.google.com/generate_204') {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        // Try to fetch; use no-cors to avoid CORS issues with 204 endpoints
        await fetch(url, { method: 'GET', cache: 'no-cache', mode: 'no-cors', signal: controller.signal });
        clearTimeout(id);
        return true;
    } catch (err) {
        return false;
    }
}
let charts = { volume: null, types: null }; // Store chart instances

// --- Navigation & View Management ---

export function switchView(viewName) {
  // Hide all views
  ['dashboard', 'log', 'journal', 'insights'].forEach(v => {
    document.getElementById(`view-${v}`)?.classList.add('hidden');
  });

  // Show target
  const target = document.getElementById(`view-${viewName}`);
  if (target) {
      target.classList.remove('hidden');
      window.scrollTo(0,0);
  }

  // Update Nav State
  document.querySelectorAll('.nav-btn').forEach(btn => {
      const isActive = btn.dataset.target === viewName;
      btn.className = `nav-btn flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors ${isActive ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`;
  });

  // FAB logic
  const fab = document.getElementById('fab');
  if (fab) viewName === 'log' ? fab.classList.add('hidden') : fab.classList.remove('hidden');

  // Specific render triggers
    if (viewName === 'insights') {
        const sel = document.getElementById('select-range');
        const range = sel ? Number(sel.value) : 7;
        renderCharts(range);
    }
}

// --- Data & Visual Formatting ---

const LEVELS = [
    { name: 'Rookie', hours: 0, color: '#94a3b8' },
    { name: 'Varsity', hours: 20, color: '#34d399' },
    { name: 'State Champ', hours: 100, color: '#60a5fa' },
    { name: 'All-American', hours: 300, color: '#f59e0b' },
    { name: 'Olympian', hours: 1000, color: '#f43f5e' }
];

function getLevelInfo(totalHours) {
    let current = LEVELS[0];
    let next = LEVELS[1];
    for (let i = 0; i < LEVELS.length - 1; i++) {
        if (totalHours >= LEVELS[i].hours) {
            current = LEVELS[i];
            next = LEVELS[i+1];
        }
    }
    return { current, next };
}

function formatDate(ts) { 
    if (!ts) return ''; 
    const d = ts.toDate ? ts.toDate() : new Date(ts); 
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); 
}

// Return a JS Date for a session preferring the user-attested 'date' field
function getSessionDateObj(s) {
    if (!s) return new Date(0);
    // Prefer s.date when present (legacy, user-attested date)
    if (s.date) return (s.date.toDate ? s.date.toDate() : new Date(s.date));
    if (s.createdAt) return (s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt));
    return new Date(0);
}

function getRelativeTime(ts) {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

// --- Component Rendering ---

function renderHeatmap(sessions) {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Generate last 60 days
    const dateMap = new Map();
    
    // Populate session counts per day using session date
    sessions.forEach(s => {
        const d = getSessionDateObj(s);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
    });

    // Weekly Streak: compute consecutive weeks (Sunday-starting) with any practice
    const weekSet = new Set();
    for (const k of dateMap.keys()) {
        const day = new Date(k);
        // normalize to week start (Sunday)
        const sunday = new Date(day);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        weekSet.add(sunday.toISOString().split('T')[0]);
    }
    let weeklyStreak = 0;
    const today = new Date();
    const thisSunday = new Date(today);
    thisSunday.setDate(thisSunday.getDate() - thisSunday.getDay());
    let checkWeek = new Date(thisSunday);
    while (true) {
        const k = checkWeek.toISOString().split('T')[0];
        if (weekSet.has(k)) weeklyStreak++;
        else break;
        checkWeek.setDate(checkWeek.getDate() - 7);
        if (weeklyStreak > 52) break; // safety
    }
    const streakEl = document.getElementById('streak-counter');
    if (streakEl) streakEl.innerText = `${weeklyStreak} Week Streak ${weeklyStreak > 3 ? '🔥' : ''}`;

    // Render Grid (Rows = weeks, Cols = days of week), last 60 days horizontally across rows
    const lastDates = [];
    for (let i = 59; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); lastDates.push(d); }
    // Count unique days in the last 60
    const daysWithSessions = lastDates.reduce((acc, d) => acc + ((dateMap.get(d.toISOString().split('T')[0]) || 0) > 0 ? 1 : 0), 0);

    // Render each date as a grid cell, colorized by session count
    lastDates.forEach((d, idx) => {
        const key = d.toISOString().split('T')[0];
        const count = dateMap.get(key) || 0;
        const el = document.createElement('div');
        el.className = 'heatmap-cell transition-all';
        const title = `${formatDate(d)} - ${count} session${count !== 1 ? 's' : ''}`;
        el.title = title;
        el.setAttribute('data-count', String(count));
        el.setAttribute('aria-label', title);

        // Color logic - presence-only (don't emphasize multiple sessions per day)
        if (count === 0) el.style.backgroundColor = '#0f172a'; // slate-900
        else el.style.backgroundColor = '#10b981'; // emerald-500 presence

        // Flag the most recent week
        if (idx >= lastDates.length - 7) el.classList.add('current-week');

        // let rows align horizontally by week via CSS grid styling on heatmap-grid
        grid.appendChild(el);
    });

    // Update consistency metric for last 60 days
    const consistencyEl = document.getElementById('consistency-60');
    if (consistencyEl) consistencyEl.innerText = `${daysWithSessions}/60 days`;
}

function createSessionCard(s, isJournal) {
    const type = s.sessionType || 'Practice';
    // Icon Mapping
    let iconName = 'dumbbell';
    let colorClass = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    
    if (type.includes('Live')) { iconName = 'swords'; colorClass = 'text-red-400 bg-red-400/10 border-red-400/20'; }
    else if (type.includes('Conditioning')) { iconName = 'heart-pulse'; colorClass = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'; }
    else if (type.includes('Practice')) { iconName = 'users'; colorClass = 'text-amber-400 bg-amber-400/10 border-amber-400/20'; }

    const dateObj = getSessionDateObj(s);
    const dateStr = formatDate(dateObj);
    const relTime = getRelativeTime(dateObj);

    return `
    <div class="relative bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center border ${colorClass}">
            <i data-lucide="${iconName}" class="w-6 h-6"></i>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
                <h4 class="font-bold text-white truncate">${escapeHTML(type)} ${s.queued ? '<span class="ml-2 text-[10px] font-bold uppercase text-amber-400">Queued</span>' : ''}</h4>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">${dateStr}</span>
            </div>
            <div class="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span class="font-mono text-amber-500">${Number(s.duration) || 0}m</span>
                <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                <span>RPE ${Number(s.intensity) || 0}/10</span>
                <span class="ml-auto text-[10px] text-slate-600">${relTime}</span>
            </div>
            ${s.notes && isJournal ? `<div class="mt-3 text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 leading-relaxed"><div class="card-notes">${escapeHTML(s.notes)}</div>${(s.notes.length > 220 ? `<div class="mt-2 text-right"><span class="read-more" data-id="${escapeHTML(s.id)}">Read more</span></div>` : '')}</div>` : ''}
        </div>
        ${isJournal ? `<button class="delete-btn absolute top-4 right-4 text-slate-600 hover:text-red-500 p-1" data-id="${s.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
    </div>`;
}

// --- Main Render Function ---

export function renderApp() {
    // Basic sorting
    const sessions = (state.sessions || []).slice().sort((a,b) => {
        const dA = getSessionDateObj(a);
        const dB = getSessionDateObj(b);
        return dB - dA;
    });

    // Calc Totals
    const totalMins = sessions.reduce((sum, s) => sum + (Number(s.duration)||0), 0);
    const totalHrs = totalMins / 60;
        // show last sync timestamp if present
        const lastSync = localStorage.getItem('last_sync_at');
        if (lastSync) { const el = document.getElementById('last-sync'); if (el) el.innerText = new Date(lastSync).toLocaleString(); }
    
    // Level System
    const level = getLevelInfo(totalHrs);
    const levelEl = document.getElementById('level-name');
    if (levelEl) {
        levelEl.innerText = level.current.name;
        levelEl.style.color = level.current.name === 'Rookie' ? '#fff' : level.current.color;
    }
    
    // Progress Bar
    const progressEl = document.getElementById('level-progress');
    const nextText = document.getElementById('hours-next');
    if (progressEl) {
        const range = level.next.hours - level.current.hours;
        const currentInLevel = totalHrs - level.current.hours;
        const pct = Math.min(100, Math.max(0, (currentInLevel / range) * 100));
        progressEl.style.width = `${pct}%`;
        nextText.innerText = `${totalHrs.toFixed(1)} / ${level.next.hours} HRS`;
    }
    document.getElementById('total-hours').innerText = totalHrs.toFixed(1);

    // Heatmap
    renderHeatmap(sessions);

    // Recent List (Top 3)
    const recentList = document.getElementById('recent-list');
    if (recentList) recentList.innerHTML = sessions.slice(0, 3).map(s => createSessionCard(s, false)).join('');

    // Journal List (All)
    const journalList = document.getElementById('journal-list');
    if (journalList) journalList.innerHTML = sessions.map(s => createSessionCard(s, true)).join('');

    // Weekly Stats
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate()-7);
    const weeklySess = sessions.filter(s => (getSessionDateObj(s)) > oneWeekAgo);
    const weeklyHrs = weeklySess.reduce((a,c) => a + (Number(c.duration)||0), 0) / 60;
    const avgInt = weeklySess.length ? (weeklySess.reduce((a,c)=>a+(Number(c.intensity)||0),0)/weeklySess.length).toFixed(1) : '0.0';
    // Weekly streak value
    const weeklyStreak = computeWeeklyStreak(sessions);
    
    document.getElementById('weekly-hours').innerHTML = `${weeklyHrs.toFixed(1)}<span class="text-sm font-medium text-slate-500 ml-1">hrs</span>`;
    const weeklyEl = document.getElementById('weekly-streak');
    if (weeklyEl) weeklyEl.innerHTML = `${weeklyStreak}<span class="text-sm font-medium text-slate-500 ml-1">weeks</span>`;

    // Re-bind Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Re-bind delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if(confirm('Delete log?')) deleteSessionFromDb(state.currentUser?.uid, btn.dataset.id).then(() => { state.sessions = (state.sessions || []).filter(s => s.id !== btn.dataset.id); renderApp(); }).catch(console.error);
        };
    });
        // Re-bind read-more toggles
        document.querySelectorAll('.read-more').forEach(lnk => {
            const card = lnk.closest('.relative') || lnk.closest('.w-full');
            lnk.onclick = (e) => {
                e.stopPropagation();
                const id = lnk.dataset.id;
                const s = (state.sessions || []).find(x => String(x.id) === String(id));
                if (s) showNoteModal(s);
            };
        });

    // Update Date in Header
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function computeWeeklyStreak(sessions) {
    const dateMap = new Map();
    sessions.forEach(s => { const d = getSessionDateObj(s); const key = d.toISOString().split('T')[0]; dateMap.set(key, (dateMap.get(key) || 0) + 1); });
    const weekSet = new Set();
    for (const k of dateMap.keys()) { const day = new Date(k); const sunday = new Date(day); sunday.setDate(sunday.getDate() - sunday.getDay()); weekSet.add(sunday.toISOString().split('T')[0]); }
    let weeklyStreak = 0; const today = new Date(); const thisSunday = new Date(today); thisSunday.setDate(thisSunday.getDate() - thisSunday.getDay()); let checkWeek = new Date(thisSunday);
    while (true) { const k = checkWeek.toISOString().split('T')[0]; if (weekSet.has(k)) weeklyStreak++; else break; checkWeek.setDate(checkWeek.getDate() - 7); if (weeklyStreak > 52) break; }
    return weeklyStreak;
}

// Modal actions
export function showNoteModal(s) {
    const modal = document.getElementById('modal-note');
    if (!modal) return;
    document.getElementById('modal-note-type').innerText = s.sessionType || s.type || 'Practice';
    document.getElementById('modal-note-date').innerText = formatDate(getSessionDateObj(s));
    document.getElementById('modal-note-content').innerText = s.notes || '';
    modal.classList.remove('hidden');
    // wire actions
    document.getElementById('modal-copy').onclick = () => { navigator.clipboard.writeText(s.notes || '').then(()=> showToast('Copied to clipboard')); };
    document.getElementById('modal-share').onclick = () => { if (navigator.share) navigator.share({ title: 'Practice note', text: s.notes || '' }).catch(err => showToast('Share failed')); else showToast('Share not supported'); };
    document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');
    // close when clicking overlay outside the content
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
}

    // no duplicate action - removed per user request

// --- Chart.js Integration ---

function renderCharts(rangeDays = 7) {
    const ctxVol = document.getElementById('chart-volume')?.getContext('2d');
    const ctxType = document.getElementById('chart-types')?.getContext('2d');
    
    if (!ctxVol || !ctxType) return;
    
    // Destroy old instances
    if (charts.volume) charts.volume.destroy();
    if (charts.types) charts.types.destroy();

        // Filter sessions using session date (getSessionDateObj)
        const allSessions = (state.sessions || []).slice().sort((a,b) => getSessionDateObj(b) - getSessionDateObj(a));
        let filtered = allSessions;
        if (rangeDays && Number(rangeDays) > 0) {
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - Number(rangeDays));
            filtered = allSessions.filter(s => getSessionDateObj(s) >= cutoff);
        }
        const data = filtered.slice(0, 10).reverse(); // Last 10 sessions in range
    
    // 1. Volume vs Intensity (Mixed Chart)
    charts.volume = new Chart(ctxVol, {
        type: 'bar',
        data: {
            labels: data.map(s => formatDate(getSessionDateObj(s))),
            datasets: [
                {
                    label: 'Duration (m)',
                    data: data.map(s => Number(s.duration) || 0),
                    backgroundColor: 'rgba(245, 158, 11, 0.5)',
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Intensity',
                    data: data.map(s => Number(s.intensity) || 0),
                    borderColor: '#38bdf8', // Sky 400
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: '#0f172a',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false },
                y1: { display: false, min: 0, max: 10 }
            }
        }
    });

    // 2. Type Distribution (Doughnut)
    const typeCounts = {};
    filtered.forEach(s => { 
        const t = s.sessionType || 'Practice';
        typeCounts[t] = (typeCounts[t] || 0) + 1; 
    });
    
    charts.types = new Chart(ctxType, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: { legend: { display: false } }
        }
    });

    // Compute top keyword (derived from notes) for the filtered range
    const fixCounts = {};
    filtered.forEach(s => { if (s.notes) s.notes.split(/[,.\n]/).forEach(p => { const key = (p || '').trim().toLowerCase(); if (key.length > 3) fixCounts[key] = (fixCounts[key] || 0) + 1; }); });
    const topFixes = Object.entries(fixCounts).sort((a,b) => b[1]-a[1]).slice(0,1);
    const topKeywordEl = document.getElementById('top-keyword');
    if (topKeywordEl) topKeywordEl.innerText = topFixes.length ? topFixes[0][0] : '--';

    // Update Mat IQ (Volume x Intensity / 100)
    const totalScore = filtered.reduce((acc, s) => acc + ((Number(s.duration) || 0) * (Number(s.intensity) || 0)), 0);
    const matIq = Math.floor(totalScore / 100);
    document.getElementById('mat-iq').innerText = matIq;
}


// --- Initialization ---

export function initUI() {
    // Type Selection Logic in Form
    const radios = document.querySelectorAll('input[name="stype"]');
    radios.forEach(r => r.addEventListener('change', (e) => {
        document.getElementById('inp-type').value = e.target.value;
    }));

    // Slider Live Updates
    const durInput = document.getElementById('inp-duration');
    durInput?.addEventListener('input', (e) => document.getElementById('val-duration').innerText = e.target.value);
    
    const intInput = document.getElementById('inp-intensity');
    intInput?.addEventListener('input', (e) => document.getElementById('val-intensity').innerText = `${e.target.value}/10`);

    // FAB
    document.getElementById('fab')?.addEventListener('click', () => switchView('log'));

    // Nav
    document.querySelectorAll('.nav-btn, .nav-link').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.target));
    });

    // Form Submit
    const form = document.getElementById('log-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uid = state.currentUser?.uid;
        if (!uid) return;
        
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i> Saving...`;
        
        try {
            await addSessionToDb(uid, {
                date: Date.now(),
                sessionType: document.getElementById('inp-type').value,
                duration: Number(document.getElementById('inp-duration').value),
                intensity: Number(document.getElementById('inp-intensity').value),
                notes: document.getElementById('inp-notes').value.trim(),
                createdAt: new Date() // handled by storage, but useful for optimistic UI
            });
            form.reset();
            switchView('dashboard');
            showToast('Session Logged!');
        } catch(err) {
            console.error(err);
            alert('Save failed');
        } finally {
            btn.innerHTML = originalText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });

    // Demo Button
    document.getElementById('btn-sample')?.addEventListener('click', () => {
        document.getElementById('inp-notes').value = "Worked on single leg entries. Felt good, but need more setup.";
        document.getElementById('inp-duration').value = 120;
        document.getElementById('val-duration').innerText = "120";
    });
    
    // Import Logic (Preserved, upgraded)
    const fileIn = document.getElementById('file-import');
    document.getElementById('btn-import')?.addEventListener('click', () => fileIn.click());
    fileIn?.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const practices = json.practices || json.practicesList || [];
            if (!practices.length) { showToast('No practices found in backup'); return; }
            const uid = state.currentUser?.uid;
            if (!uid) { showToast('Sign-in required for import'); return; }
            // Read queued local writes for dedupe
            let queuedLocal = [];
            try { queuedLocal = JSON.parse(localStorage.getItem('wrestle-queue') || '[]'); } catch (err) { queuedLocal = []; }
            let imported = 0, skipped = 0, errors = 0;
            for (const p of practices) {
                try {
                    const mapped = {
                        date: p.date ? (typeof p.date === 'number' ? p.date : Date.parse(p.date) || Date.now()) : Date.now(),
                        sessionType: p.type || p.sessionType || 'Practice',
                        duration: Number(p.duration || 0),
                        intensity: Number(p.intensity || 0),
                        physicalFeel: Number(p.physical || p.physicalFeel || 0),
                        mentalFeel: Number(p.mental || p.mentalFeel || 0),
                        notes: p.notes || '',
                        aiSummary: p.storyGenerated || p.story || p.aiSummary || '',
                        legacyId: p.id || null,
                        practiceNumber: p.practiceNumber || null
                    };
                    // dedupe by legacyId
                    if (mapped.legacyId) {
                        const existsServer = (state.sessions || []).some(s => s.legacyId && String(s.legacyId) === String(mapped.legacyId));
                        const existsQueued = queuedLocal.some(q => q.payload && q.payload.legacyId && String(q.payload.legacyId) === String(mapped.legacyId));
                        if (existsServer || existsQueued) { skipped++; continue; }
                    }
                    // dedupe fallback by date/duration/notes
                    const serverMatch = (state.sessions || []).some(s => {
                        const sDate = s.date?.toDate ? s.date.toDate().getTime() : (typeof s.date === 'number' ? s.date : (Date.parse(s.date) || 0));
                        const mDate = mapped.date;
                        return sDate === mDate && (s.duration || 0) === mapped.duration && String((s.notes || '').slice(0,40)) === String((mapped.notes || '').slice(0,40));
                    });
                    const queuedMatch = queuedLocal.some(q => {
                        const sDate = q.payload && (typeof q.payload.date === 'number' ? q.payload.date : (Date.parse(q.payload.date) || 0));
                        const mDate = mapped.date;
                        return sDate === mDate && (Number(q.payload.duration || 0) === mapped.duration) && String((q.payload.notes || '').slice(0,40)) === String((mapped.notes || '').slice(0,40));
                    });
                    if (serverMatch || queuedMatch) { skipped++; continue; }
                    await addSessionToDb(uid, mapped);
                    imported++;
                } catch (err) { console.error('Import item failed', err); errors++; }
            }
            // Attempt to flush queue if online
            if (navigator.onLine) {
                try { const r = await syncQueuedWrites(state.currentUser.uid); if (r.synced) showToast(`Synced ${r.synced} queued items`); } catch (err) { console.warn('Post-import sync failed', err); }
            }
            showToast(`Imported ${imported} / Skipped ${skipped} / Errors ${errors}`);
            updateSyncIndicator();
        } catch (err) {
            console.error('Import failed', err);
            showToast('Import failed: ' + (err.message || 'invalid file'));
        } finally {
            fileIn.value = '';
        }
    });

        // Settings UI wiring
        const btnSettings = document.getElementById('btn-settings');
        const panelSettings = document.getElementById('panel-settings');
        const settingsClose = document.getElementById('settings-close');
        const inpEnablePing = document.getElementById('inp-enable-ping');
        // Persist the setting in localStorage
            if (inpEnablePing) {
                // Default to 'true' (online by default) unless explictly changed by user
                if (localStorage.getItem('enable_ping') === null) { localStorage.setItem('enable_ping', 'true'); }
                const stored = localStorage.getItem('enable_ping') === 'true';
                inpEnablePing.checked = stored;
                inpEnablePing.addEventListener('change', e => { localStorage.setItem('enable_ping', e.target.checked ? 'true' : 'false'); updateSyncIndicator(); });
            }
        btnSettings?.addEventListener('click', () => panelSettings?.classList.remove('hidden'));
        settingsClose?.addEventListener('click', () => panelSettings?.classList.add('hidden'));
}

// Toast Helper
function showToast(msg) {
    const t = document.getElementById('toast');
    const m = document.getElementById('toast-msg');
    m.innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// Sync Indicator Logic
export async function updateSyncIndicator() {
    const ind = document.getElementById('sync-indicator');
    // Treat as online by default if Firestore/DB is available; this keeps the app 'live' by default as requested
    const firestoreAvailable = (typeof db !== 'undefined' && db);
    let networkOnline = navigator.onLine || !!firestoreAvailable;
    const queued = getQueuedCount(state.currentUser?.uid);
    // If ping is enabled, verify network reachability for a more accurate state
    try {
        const pingEnabled = localStorage.getItem('enable_ping') === 'true';
        // If ping is enabled, refine status via fetch; otherwise rely on the above default
        if (pingEnabled && networkOnline) {
            const ok = await doPing();
            networkOnline = !!ok;
        }
    } catch (err) { /* ignore ping errors */ }
    if (!networkOnline) {
        ind.innerHTML = `<div class="w-2 h-2 rounded-full bg-red-500"></div><span class="text-[10px] font-bold text-slate-300">Network: OFFLINE</span><span class="ml-2 text-[10px] text-slate-400">Queued: ${queued}</span>`;
    } else {
        // Network online
        const fireState = firestoreAvailable ? `<span class="text-emerald-400">Firestore</span>` : `<span class="text-slate-400">Local-only</span>`;
        if (queued > 0) {
            ind.innerHTML = `<div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div><span class="text-[10px] font-bold text-amber-500">${fireState} · Sync queued: ${queued} (Click to sync)</span>`;
            // Attempt a sync proactively
            const res = await syncQueuedWrites(state.currentUser?.uid).catch(err => { console.warn('Proactive sync failed', err); return { synced: 0 }; });
            if (res && res.synced) {
                showToast(`${res.synced} items synced`);
                const now = new Date().toISOString(); localStorage.setItem('last_sync_at', now); document.getElementById('last-sync').innerText = new Date(now).toLocaleString();
            }
            updateSyncIndicator();
        } else {
            ind.innerHTML = `<div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-[10px] font-bold text-slate-300">${fireState} · Live</span>`;
        }
    }
    // Attach a click handler to trigger manual sync when there are queued items
    ind.onclick = () => {
        if (getQueuedCount(state.currentUser?.uid) > 0) {
            ind.classList.add('opacity-60');
            (async () => {
                try {
                    const res = await syncQueuedWrites(state.currentUser?.uid);
                    if (res.synced) {
                        showToast(`${res.synced} items synced`);
                        const now = new Date().toISOString(); localStorage.setItem('last_sync_at', now); document.getElementById('last-sync').innerText = new Date(now).toLocaleString();
                    }
                } catch (err) {
                    console.error('Manual sync failed', err);
                    showToast('Sync failed');
                } finally {
                    updateSyncIndicator(); ind.classList.remove('opacity-60');
                }
            })();
        }
    };
}

// Global Listeners
window.addEventListener('online', updateSyncIndicator);
window.addEventListener('offline', updateSyncIndicator);
// Range selector for insights
const selRange = document.getElementById('select-range');
if (selRange) selRange.addEventListener('change', () => { const r = Number(selRange.value); renderCharts(r); });
