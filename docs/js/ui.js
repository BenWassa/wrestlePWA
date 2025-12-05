import { addSession as addSessionToDb, deleteSession as deleteSessionFromDb, syncQueuedWrites, getQueuedCount } from './storage.js';
import { db } from './firebase.js';

export let state = { currentUser: null, sessions: [], authError: null, firestoreError: null };

const PING_INTERVAL_MS = 15000;
let pingIntervalId = null;

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

function startPingLoop() {
    if (pingIntervalId) clearInterval(pingIntervalId);
    pingIntervalId = setInterval(() => updateSyncIndicator(), PING_INTERVAL_MS);
}

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
      // Special styling for center dashboard button (circle)
      if (btn.dataset.target === 'dashboard') {
          btn.className = `nav-btn w-14 h-14 -mt-8 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center transition-colors shadow-lg ${isActive ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`;
      } else {
          btn.className = `nav-btn flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors ${isActive ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`;
      }
  });

  // FAB logic
  const fab = document.getElementById('fab');
  if (fab) viewName === 'log' ? fab.classList.add('hidden') : fab.classList.remove('hidden');

  // Menu button - only show on dashboard
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) viewName === 'dashboard' ? menuBtn.classList.remove('hidden') : menuBtn.classList.add('hidden');

  // Specific render triggers
    if (viewName === 'insights') {
        const sel = document.getElementById('select-range');
        const range = sel ? Number(sel.value) : 7;
        renderCharts(range);
        renderInsightsText(state.sessions, range);
    }
}

// --- Data & Visual Formatting ---

const LEVELS = [
    // The Beginning (0 - 1 Season)
    { name: 'Fresh Fish', hours: 0, color: '#94a3b8', icon: 'footprints', desc: 'Step on the mat. Don\'t get pinned.' },
    { name: 'Mat Rat', hours: 25, color: '#cbd5e1', icon: 'cookie', desc: 'Addicted to the grind. First month down.' },
    { name: 'JV Warrior', hours: 50, color: '#64748b', icon: 'shield', desc: 'Learning the moves. Building the chin.' },
    { name: 'Drill Partner', hours: 100, color: '#34d399', icon: 'users', desc: 'You are reliable. Technique is clicking.' },

    // The Competitor (1 - 3 Seasons)
    { name: 'Varsity Starter', hours: 200, color: '#10b981', icon: 'shirt', desc: 'You made the lineup. Now score points.' },
    { name: 'Team Captain', hours: 350, color: '#059669', icon: 'award', desc: 'Leading the warmup. Setting the pace.' },
    { name: 'Sectional Champ', hours: 500, color: '#0ea5e9', icon: 'medal', desc: 'Top of the area. Eye on the state tourney.' },

    // The Elite (3+ Seasons / Year Round)
    { name: 'State Qualifier', hours: 750, color: '#3b82f6', icon: 'map-pin', desc: 'One of the best in the state. Punch your ticket.' },
    { name: 'State Placer', hours: 1000, color: '#6366f1', icon: 'podium', desc: 'Standing on the podium. All that work paid off.' },
    { name: 'State Champ', hours: 1500, color: '#8b5cf6', icon: 'trophy', desc: 'Number one. The bracket is yours.' },

    // The Legend (College / International Volume)
    { name: 'All-American', hours: 2500, color: '#f59e0b', icon: 'flag', desc: 'National elite. Best of the best.' },
    { name: 'Olympian', hours: 5000, color: '#f43f5e', icon: 'crown', desc: 'World class. A lifetime of discipline.' },
    { name: 'Dan Gable', hours: 10000, color: '#ffe4e6', icon: 'flame', desc: 'Mythical status. You live on the mat.' }
];

function getLevelInfo(totalHours) {
    let current = LEVELS[0];
    let next = LEVELS[1]; // Default to second level
    
    for (let i = 0; i < LEVELS.length; i++) {
        if (totalHours >= LEVELS[i].hours) {
            current = LEVELS[i];
            // If there is a next level, set it. Otherwise, cap it at current.
            next = LEVELS[i+1] ? LEVELS[i+1] : LEVELS[i]; 
        }
    }
    
    // Edge case: If we are at max level, avoid division by zero in progress bar
    if (current === next) {
        return { current, next: { ...current, hours: current.hours * 1.5, name: 'Max Level' } };
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

// --- Levels / Gamification Modal ---

function showLevelsModal() {
    const modal = document.getElementById('modal-levels');
    const container = document.getElementById('levels-timeline');
    const totalHoursEl = document.getElementById('modal-total-hours');
    
    if (!modal || !container) return;

    // Calculate current hours
    const sessions = state.sessions || [];
    const totalMins = sessions.reduce((sum, s) => sum + (Number(s.duration)||0), 0);
    const totalHrs = totalMins / 60;

    totalHoursEl.innerText = totalHrs.toFixed(1);

    // Build HTML
    let html = '';
    
    LEVELS.forEach((lvl, index) => {
        const isUnlocked = totalHrs >= lvl.hours;
        const isCurrent = isUnlocked && (index === LEVELS.length - 1 || totalHrs < LEVELS[index + 1].hours);
        
        let statusClass = 'locked';
        let iconHtml = `<i data-lucide="lock" class="w-3 h-3"></i>`;
        
        if (isCurrent) {
            statusClass = 'current';
            iconHtml = `<i data-lucide="${lvl.icon}" class="w-4 h-4"></i>`;
        } else if (isUnlocked) {
            statusClass = 'unlocked';
            iconHtml = `<i data-lucide="check" class="w-3 h-3"></i>`;
        }

        html += `
            <div class="level-item ${statusClass}">
                <div class="level-bullet z-10 bg-slate-900">
                    ${iconHtml}
                </div>
                <div class="level-content">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="font-bold text-white text-sm">${lvl.name}</h4>
                        <span class="text-[10px] font-mono ${isUnlocked ? 'text-emerald-400' : 'text-slate-500'}">${lvl.hours} HRS</span>
                    </div>
                    <p class="text-xs text-slate-400 leading-snug">${lvl.desc}</p>
                    ${isCurrent ? `<div class="mt-2 text-[10px] font-bold text-amber-500 uppercase tracking-wide">Current Rank</div>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    
    // Refresh icons inside the modal
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Close handlers
    const closeBtn = document.getElementById('close-levels');
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    };
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}

// --- Component Rendering ---

function renderHeatmap(sessions) {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // 1. Map Data
    const dateMap = new Map();
    sessions.forEach(s => {
        const d = getSessionDateObj(s);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
    });

    // 2. Calculate Streaks (Existing logic preserved)
    const weekSet = new Set();
    for (const k of dateMap.keys()) { 
        const day = new Date(k); 
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
        if (weeklyStreak > 52) break;
    }
    const streakEl = document.getElementById('streak-counter');
    if (streakEl) streakEl.innerText = `${weeklyStreak} Week Streak ${weeklyStreak > 3 ? '🔥' : ''}`;

    // 3. Generate Grid (Last 35 Days -> 5 weeks of 7-day rows), and align to weekday columns
    const lastDates = [];
    for (let i = 34; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); lastDates.push(d); }

    // Align start: Front-pad so the first date lands on the correct day of week
    const cells = [];
    const firstDayOfWeek = lastDates[0].getDay(); // 0 = Sunday
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    lastDates.forEach(d => cells.push(d));
    while (cells.length % 7 !== 0) cells.push(null);

    // 4. Render Rows
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) { weeks.push(cells.slice(i, i + 7)); }

    let daysWithSessions = 0; // for the x/30 counter

    weeks.forEach((week, index) => {
        // Create the row container
        const rowEl = document.createElement('div');
        rowEl.className = 'heatmap-row-grid'; // Uses the same grid as header
        // Add animation delay based on row index
        rowEl.style.animationDelay = `${index * 50}ms`;

        week.forEach(cell => {
            const el = document.createElement('div');
            el.className = 'heatmap-cell';
            if (!cell) { el.style.opacity = '0'; rowEl.appendChild(el); return; }

            const key = cell.toISOString().split('T')[0];
            const count = dateMap.get(key) || 0;

            // Only count sessions within last 30 days for the label
            const diffTime = Math.abs(today - cell);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (count > 0 && diffDays <= 30) daysWithSessions++;

            // Styling + classes
            if (count > 0) {
                el.classList.add('has-data');
                el.style.backgroundColor = '#10b981'; // emerald green
                if (count > 1) el.style.backgroundColor = '#059669'; // darker green
            } else {
                if (cell.toDateString() === today.toDateString()) el.style.border = '1px solid #94a3b8';
            }

            el.title = `${formatDate(cell)}: ${count} session${count !== 1 ? 's' : ''}`;
            rowEl.appendChild(el);
        });

        grid.appendChild(rowEl);
    });

    // Update consistency metric
    const consistencyEl = document.getElementById('consistency-30');
    if (consistencyEl) consistencyEl.innerText = `${daysWithSessions}/30`;
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
        levelEl.style.color = level.current.name === 'Fresh Fish' ? '#fff' : level.current.color;
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

    // Heatmap (Dashboard)
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

    // Ensure initial view state
    switchView('dashboard');
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
    modal.setAttribute('aria-hidden', 'false');
    // wire actions
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    };
    document.getElementById('modal-copy').onclick = () => { navigator.clipboard.writeText(s.notes || '').then(()=> showToast('Copied to clipboard')); };
    document.getElementById('modal-share').onclick = () => { if (navigator.share) navigator.share({ title: 'Practice note', text: s.notes || '' }).catch(err => showToast('Share failed')); else showToast('Share not supported'); };
    document.getElementById('modal-close').onclick = closeModal;
    // close when clicking overlay outside the content
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
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

// --- Text Insights Generation ---
function renderInsightsText(sessions, rangeDays = 7) {
    const container = document.getElementById('insights-content');
    if (!container) return;

    // Filter sessions by range
    const allSessions = (sessions || []).slice().sort((a,b) => getSessionDateObj(b) - getSessionDateObj(a));
    let filtered = allSessions;
    if (rangeDays && Number(rangeDays) > 0) {
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - Number(rangeDays));
        filtered = allSessions.filter(s => getSessionDateObj(s) >= cutoff);
    }

    if (!filtered.length) {
        container.innerHTML = `<p class="text-slate-500">No sessions in this time range. Log some training to see insights!</p>`;
        return;
    }

    // Calculate stats
    const totalSessions = filtered.length;
    const totalMinutes = filtered.reduce((a, s) => a + (Number(s.duration) || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const avgDuration = Math.round(totalMinutes / totalSessions);
    const avgIntensity = (filtered.reduce((a, s) => a + (Number(s.intensity) || 0), 0) / totalSessions).toFixed(1);

    // Type breakdown
    const typeCounts = {};
    filtered.forEach(s => {
        const t = s.sessionType || 'Practice';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    // Most active day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    filtered.forEach(s => {
        const day = getSessionDateObj(s).getDay();
        dayCounts[day]++;
    });
    const mostActiveDay = dayNames[dayCounts.indexOf(Math.max(...dayCounts))];

    // Longest session
    const longestSession = filtered.reduce((max, s) => (Number(s.duration) || 0) > (Number(max.duration) || 0) ? s : max, filtered[0]);
    const longestDuration = longestSession ? (Number(longestSession.duration) || 0) : 0;

    // High intensity sessions (7+)
    const highIntensitySessions = filtered.filter(s => (Number(s.intensity) || 0) >= 7).length;
    const highIntensityPct = Math.round((highIntensitySessions / totalSessions) * 100);

    // Build insights HTML
    const insights = [];
    
    insights.push(`<div class="flex items-start gap-3 mb-3">
        <i data-lucide="activity" class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"></i>
        <p><span class="text-white font-semibold">${totalSessions} sessions</span> totaling <span class="text-white font-semibold">${totalHours} hours</span> of mat time</p>
    </div>`);

    insights.push(`<div class="flex items-start gap-3 mb-3">
        <i data-lucide="clock" class="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"></i>
        <p>Average session: <span class="text-white font-semibold">${avgDuration} min</span> at <span class="text-white font-semibold">${avgIntensity}/10</span> intensity</p>
    </div>`);

    if (favoriteType) {
        insights.push(`<div class="flex items-start gap-3 mb-3">
            <i data-lucide="star" class="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"></i>
            <p>Most common: <span class="text-white font-semibold">${favoriteType[0]}</span> (${favoriteType[1]} sessions)</p>
        </div>`);
    }

    insights.push(`<div class="flex items-start gap-3 mb-3">
        <i data-lucide="calendar" class="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0"></i>
        <p>Most active day: <span class="text-white font-semibold">${mostActiveDay}</span></p>
    </div>`);

    if (longestDuration > 0) {
        insights.push(`<div class="flex items-start gap-3 mb-3">
            <i data-lucide="trophy" class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0"></i>
            <p>Longest session: <span class="text-white font-semibold">${longestDuration} min</span></p>
        </div>`);
    }

    if (highIntensitySessions > 0) {
        insights.push(`<div class="flex items-start gap-3">
            <i data-lucide="flame" class="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0"></i>
            <p><span class="text-white font-semibold">${highIntensityPct}%</span> of sessions were high intensity (7+)</p>
        </div>`);
    }

    container.innerHTML = `<h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Training Summary</h4>` + insights.join('');
    
    // Re-render icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
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

    // Sidebar Navigation Toggle
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarClose = document.getElementById('sidebar-close');
    
    const openSidebar = () => {
        sidebar?.classList.remove('-translate-x-full');
        sidebarOverlay?.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    
    const closeSidebar = () => {
        sidebar?.classList.add('-translate-x-full');
        sidebarOverlay?.classList.add('hidden');
    };
    
    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        openSidebar();
    });
    
    // Close sidebar when clicking overlay or close button
    sidebarOverlay?.addEventListener('click', closeSidebar);
    sidebarClose?.addEventListener('click', closeSidebar);
    
    // Menu item handlers
    const fileIn = document.getElementById('file-import');
    document.getElementById('menu-import')?.addEventListener('click', () => {
        closeSidebar();
        fileIn?.click();
    });
    document.getElementById('menu-export')?.addEventListener('click', () => {
        closeSidebar();
        exportData();
    });
    document.getElementById('menu-about')?.addEventListener('click', () => {
        closeSidebar();
        showAboutModal();
    });

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
    
    // Import Logic (file input handler - triggered via menu)
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

        // Settings: no visible UI; ensure ping default is enabled unless explicitly set
        if (localStorage.getItem('enable_ping') === null) { localStorage.setItem('enable_ping', 'true'); }
        // Ensure the sync indicator reflects initial state
        updateSyncIndicator();
        startPingLoop();
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') updateSyncIndicator();
        });

        // Rank Card Click Listener - Open Levels Modal
        const rankCard = document.getElementById('rank-card');
        if (rankCard) {
            rankCard.addEventListener('click', () => {
                showLevelsModal();
            });
        }
}

// Export Data Function
function exportData() {
    if (!state.sessions || !state.sessions.length) {
        showToast('No data to export');
        return;
    }
    const practices = state.sessions.map(s => {
        const dateVal = s.date?.toDate ? s.date.toDate().getTime() : (typeof s.date === 'number' ? s.date : Date.parse(s.date) || Date.now());
        return {
            id: s.id || null,
            date: dateVal,
            type: s.sessionType || 'Practice',
            duration: s.duration || 0,
            intensity: s.intensity || 0,
            physical: s.physicalFeel || 0,
            mental: s.mentalFeel || 0,
            notes: s.notes || '',
            aiSummary: s.aiSummary || ''
        };
    });
    const blob = new Blob([JSON.stringify({ practices, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matmind_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported!');
}

// About Modal Function
function showAboutModal() {
    // Create modal if not exists
    let modal = document.getElementById('about-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'about-modal';
        modal.className = 'fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-slate-900 rounded-3xl border border-slate-800 p-6 max-w-sm mx-4 shadow-2xl">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-xl font-black text-white">About MatMind</h2>
                    <button id="close-about" class="text-slate-500 hover:text-white">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="space-y-3 text-sm text-slate-400">
                    <p>MatMind is a training log for wrestlers to track practice sessions, monitor consistency, and level up their mat time.</p>
                    <p class="text-slate-500">Version 2.0</p>
                    <p class="text-slate-500">Built with ❤️ for the wrestling community</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        document.getElementById('close-about')?.addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    }
    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
    if (ind) delete ind.dataset.pingFailed;
    // Treat as online by default if Firestore/DB is available; this keeps the app 'live' by default as requested
    const firestoreAvailable = (typeof db !== 'undefined' && db);
    let networkOnline = navigator.onLine || !!firestoreAvailable;
    const queued = getQueuedCount(state.currentUser?.uid);
    // If ping is enabled, verify network reachability for a more accurate state
    try {
        const pingEnabled = localStorage.getItem('enable_ping') === 'true';
        // If ping is enabled, use ping to decide online/offline
        if (pingEnabled) {
            const ok = await doPing();
            networkOnline = !!ok;
            if (!ok) ind.dataset.pingFailed = 'true';
        }
    } catch (err) { /* ignore ping errors */ }
    if (!networkOnline) {
        ind.dataset.reason = 'offline';
        ind.title = 'Offline — network unreachable';
        ind.innerHTML = `<div class="w-2 h-2 rounded-full bg-slate-600"></div><span class="text-[10px] font-bold text-slate-400">Network: OFFLINE</span><span class="ml-2 text-[10px] text-slate-400">Queued: ${queued}</span>`;
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
            ind.dataset.reason = 'ok';
            ind.title = `${fireState} · Live`;
        }
    }
    // Attach a click handler to trigger manual sync when there are queued items
    ind.onclick = () => {
        if (!networkOnline) { showToast('Offline — cannot sync'); return; }
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
