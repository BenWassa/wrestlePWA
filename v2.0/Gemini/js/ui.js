import { addSession as addSessionToDb, deleteSession as deleteSessionFromDb, syncQueuedWrites, getQueuedCount } from './storage.js';

export let state = { currentUser: null, sessions: [], authError: null, firestoreError: null };

function escapeHTML(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
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
  if (viewName === 'insights') renderCharts();
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
    const today = new Date();
    const dateMap = new Map();
    
    // Populate session counts per day
    sessions.forEach(s => {
        const d = getSessionDateObj(s);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
    });

    let streak = 0;
    let checkDate = new Date();
    // Calculate Streak
    while (true) {
        const k = checkDate.toISOString().split('T')[0];
        if (dateMap.has(k)) streak++;
        else if (checkDate.toDateString() !== new Date().toDateString()) break; 
        checkDate.setDate(checkDate.getDate() - 1);
        if (streak > 365) break; // safety
    }
    const streakEl = document.getElementById('streak-counter');
    if (streakEl) streakEl.innerText = `${streak} Day Streak ${streak > 3 ? '🔥' : ''}`;

    // Render Grid (Cols = weeks, Rows = days)
    // Simplified: Just render 60 squares backwards
    for (let i = 59; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = d.toISOString().split('T')[0];
        const count = dateMap.get(k) || 0;
        
        const el = document.createElement('div');
        el.className = 'heatmap-cell transition-all';
        
        // Color logic
        if (count === 0) el.style.backgroundColor = '#1e293b'; // slate-800
        else if (count === 1) el.style.backgroundColor = '#0d9488'; // teal-600
        else el.style.backgroundColor = '#f59e0b'; // amber-500
        
        grid.appendChild(el);
    }
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
    
    document.getElementById('weekly-hours').innerHTML = `${weeklyHrs.toFixed(1)}<span class="text-sm font-medium text-slate-500 ml-1">hrs</span>`;
    document.getElementById('avg-intensity').innerHTML = `${avgInt}<span class="text-sm font-medium text-slate-500 ml-1">/10</span>`;

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
                const parent = lnk.closest('.relative') || lnk.closest('.w-full');
                if (!parent) return;
                parent.classList.toggle('card-expanded');
                const node = parent.querySelector('.card-notes');
                if (node) node.classList.toggle('line-clamp-none');
                lnk.textContent = parent.classList.contains('card-expanded') ? 'Show less' : 'Read more';
            };
        });

    // Update Date in Header
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// --- Chart.js Integration ---

function renderCharts() {
    const ctxVol = document.getElementById('chart-volume')?.getContext('2d');
    const ctxType = document.getElementById('chart-types')?.getContext('2d');
    
    if (!ctxVol || !ctxType) return;
    
    // Destroy old instances
    if (charts.volume) charts.volume.destroy();
    if (charts.types) charts.types.destroy();

    const data = (state.sessions || []).slice(0, 10).reverse(); // Last 10 sessions
    
    // 1. Volume vs Intensity (Mixed Chart)
    charts.volume = new Chart(ctxVol, {
        type: 'bar',
        data: {
            labels: data.map(s => formatDate(s.date || s.createdAt)),
            datasets: [
                {
                    label: 'Duration (m)',
                    data: data.map(s => s.duration),
                    backgroundColor: 'rgba(245, 158, 11, 0.5)',
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Intensity',
                    data: data.map(s => s.intensity),
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
    state.sessions.forEach(s => { 
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

    // Update Mat IQ (Volume x Intensity / 100)
    const totalScore = state.sessions.reduce((acc, s) => acc + ((s.duration || 0) * (s.intensity || 0)), 0);
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
export function updateSyncIndicator() {
    const ind = document.getElementById('sync-indicator');
    const networkOnline = navigator.onLine;
    const queued = getQueuedCount(state.currentUser?.uid);
    const firestoreAvailable = (typeof db !== 'undefined' && db);
    if (!networkOnline) {
        ind.innerHTML = `<div class="w-2 h-2 rounded-full bg-red-500"></div><span class="text-[10px] font-bold text-slate-300">Network: OFFLINE</span><span class="ml-2 text-[10px] text-slate-400">Queued: ${queued}</span>`;
    } else {
        // Network online
        const fireState = firestoreAvailable ? `<span class="text-emerald-400">Firestore</span>` : `<span class="text-slate-400">Local-only</span>`;
        if (queued > 0) {
            ind.innerHTML = `<div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div><span class="text-[10px] font-bold text-amber-500">${fireState} · Sync queued: ${queued} (Click to sync)</span>`;
            // Attempt a sync proactively
            syncQueuedWrites(state.currentUser?.uid).then(res => {
                if (res.synced) showToast(`${res.synced} items synced`);
                updateSyncIndicator();
            }).catch(err => { console.warn('Proactive sync failed', err); });
        } else {
            ind.innerHTML = `<div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-[10px] font-bold text-slate-300">${fireState} · Live</span>`;
        }
    }
    // Attach a click handler to trigger manual sync when there are queued items
    ind.onclick = () => {
        if (getQueuedCount(state.currentUser?.uid) > 0) {
            ind.classList.add('opacity-60');
            syncQueuedWrites(state.currentUser?.uid).then(res => { if (res.synced) showToast(`${res.synced} items synced`); updateSyncIndicator(); ind.classList.remove('opacity-60'); }).catch(err => { console.error('Manual sync failed', err); ind.classList.remove('opacity-60'); showToast('Sync failed'); });
        }
    };
}

// Global Listeners
window.addEventListener('online', updateSyncIndicator);
window.addEventListener('offline', updateSyncIndicator);