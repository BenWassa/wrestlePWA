// Storage helpers

const STORAGE_KEY = "matmind_logs";

function loadLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load logs", e);
    return [];
  }
}

function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

// Rendering

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function computeStats(logs) {
  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((sum, l) => sum + (Number(l.duration) || 0), 0);

  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 6);

  let weekSessions = 0;
  let weekMinutes = 0;
  const weekDetails = [];

  logs.forEach((log) => {
    if (!log.date) return;
    const d = new Date(log.date + "T00:00:00");
    if (Number.isNaN(d.getTime())) return;

    if (d >= oneWeekAgo && d <= now) {
      weekSessions += 1;
      weekMinutes += Number(log.duration) || 0;
      weekDetails.push(log);
    }
  });

  return {
    totalSessions,
    totalMinutes,
    weekSessions,
    weekMinutes,
    weekDetails
  };
}

function getJourneyStage(totalMinutes, totalSessions) {
  if (totalSessions === 0) {
    return "You have not logged yet. The journey starts with the first note you leave yourself.";
  }
  if (totalSessions < 15) {
    return "You are in the startup phase. Focus on showing up and noticing how sessions feel, not judging them.";
  }
  if (totalSessions < 50) {
    return "You are building a real base. The big win is consistency plus one clear lesson per practice.";
  }
  if (totalSessions < 120) {
    return "You are in the grind. Patterns are forming. Use them to choose what to narrow in on.";
  }
  return "You are a volume veteran. The work now is very specific: sharpen positions that keep showing up in your notes.";
}

function updateJourneyView(logs) {
  const stats = computeStats(logs);
  const stageEl = document.getElementById("journeyStage");
  const totalSessionsEl = document.getElementById("totalSessions");
  const totalMinutesEl = document.getElementById("totalMinutes");
  const progressFill = document.getElementById("seasonProgressFill");
  const progressLabel = document.getElementById("seasonProgressLabel");
  const weekSummaryEl = document.getElementById("weekSummary");
  const weekSessionsEl = document.getElementById("weekSessions");
  const recentSessionsEl = document.getElementById("recentSessions");
  const noSessionsMessage = document.getElementById("noSessionsMessage");
  const footerSessions = document.getElementById("footerSessions");

  stageEl.textContent = getJourneyStage(stats.totalMinutes, stats.totalSessions);
  totalSessionsEl.textContent = stats.totalSessions;
  totalMinutesEl.textContent = `${stats.totalMinutes} min`;
  footerSessions.textContent = `${stats.totalSessions} session${stats.totalSessions === 1 ? "" : "s"} logged`;

  // Weekly target
  const targetPerWeek = 4;
  const ratio = targetPerWeek === 0 ? 0 : Math.min(1, stats.weekSessions / targetPerWeek);
  progressFill.style.width = `${Math.round(ratio * 100)}%`;

  if (stats.weekSessions === 0) {
    progressLabel.textContent = "No sessions yet this week";
  } else if (stats.weekSessions < targetPerWeek) {
    progressLabel.textContent = `${stats.weekSessions} of ${targetPerWeek} sessions this week`;
  } else {
    progressLabel.textContent = `Target hit this week`;
  }

  if (stats.weekSessions === 0) {
    weekSummaryEl.textContent = "No entries in the last 7 days.";
  } else {
    weekSummaryEl.textContent = `${stats.weekSessions} sessions, ${stats.weekMinutes} minutes logged in the last 7 days.`;
  }

  // Week details
  weekSessionsEl.innerHTML = "";
  stats.weekDetails
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .forEach((log) => {
      const li = document.createElement("li");
      const moodLabel = (() => {
        const p = Number(log.physical);
        const m = Number(log.mental);
        const avg = (p + m) / 2 || 0;
        if (avg >= 4.2) return "sharp";
        if (avg >= 3.2) return "ok";
        if (avg >= 2.2) return "heavy";
        return "rough";
      })();
      li.textContent = `${formatDate(log.date)} • ${log.type} • ${log.duration} min • felt ${moodLabel}`;
      weekSessionsEl.appendChild(li);
    });

  // Recent sessions list (max 5)
  recentSessionsEl.innerHTML = "";
  if (logs.length === 0) {
    noSessionsMessage.classList.remove("hidden");
    return;
  }
  noSessionsMessage.classList.add("hidden");

  logs
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)
    .forEach((log) => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `
        <div class="log-item-header">
          <span>${formatDate(log.date)} · ${log.type}</span>
          <span>${log.duration} min</span>
        </div>
        <div class="log-item-meta">
          Focus: ${log.focus} · Physical ${log.physical}/5 · Mental ${log.mental}/5
        </div>
        ${
          log.lesson
            ? `<div class="log-item-lesson"><strong>Lesson:</strong> ${log.lesson}</div>`
            : ""
        }
      `;
      recentSessionsEl.appendChild(li);
    });
}

function updateRecentLogsList(logs) {
  const listEl = document.getElementById("recentLogs");
  listEl.innerHTML = "";
  logs
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)
    .forEach((log) => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `
        <div class="log-item-header">
          <span>${formatDate(log.date)} · ${log.type}</span>
          <span>${log.duration} min</span>
        </div>
        ${
          log.highlights
            ? `<div class="log-item-meta">${log.highlights}</div>`
            : `<div class="log-item-meta">No notes that day.</div>`
        }
      `;
      listEl.appendChild(li);
    });
}

function analyzePatterns(logs) {
  if (!logs.length) {
    return {
      focusCounts: {},
      avgPhysical: null,
      avgMental: null,
      story: "Once you log a few weeks of sessions, this space will pull patterns together for you."
    };
  }

  const focusCounts = {};
  let physicalSum = 0;
  let mentalSum = 0;

  logs.forEach((log) => {
    const f = log.focus || "unspecified";
    focusCounts[f] = (focusCounts[f] || 0) + 1;
    physicalSum += Number(log.physical) || 0;
    mentalSum += Number(log.mental) || 0;
  });

  const avgPhysical = physicalSum / logs.length;
  const avgMental = mentalSum / logs.length;

  const stats = computeStats(logs);

  const storyParts = [];
  storyParts.push(
    `You have logged ${stats.totalSessions} sessions so far, for about ${stats.totalMinutes} minutes on the mat.`
  );

  const sortedFocus = Object.entries(focusCounts).sort((a, b) => b[1] - a[1]);
  if (sortedFocus.length) {
    const topFocus = sortedFocus[0][0];
    storyParts.push(`Most of your recorded work has focused on ${topFocus}.`);
  }

  if (avgPhysical && avgMental) {
    const moodDescriptor =
      avgPhysical + avgMental >= 8.4
        ? "generally sharp and ready"
        : avgPhysical + avgMental >= 6.4
        ? "working through regular training fatigue"
        : "often pushing through heavy days";
    storyParts.push(`Across the log, you have been ${moodDescriptor}.`);
  }

  storyParts.push(
    "Use this as context, not a verdict. The point is to notice reality and choose one small adjustment at a time."
  );

  return {
    focusCounts,
    avgPhysical,
    avgMental,
    story: storyParts.join(" ")
  };
}

function generateSuggestions(logs, analysis) {
  if (!logs.length) {
    return `
      <p>Nothing to suggest yet. After a handful of sessions, this space will give you one or two simple next steps.</p>
    `;
  }

  const blocks = [];
  const sortedFocus = Object.entries(analysis.focusCounts).sort((a, b) => b[1] - a[1]);
  const mainFocus = sortedFocus[0]?.[0];

  if (mainFocus) {
    blocks.push(
      `<p><strong>Technical focus</strong></p>
       <ul>
         <li>You keep gravitating to <strong>${mainFocus}</strong>. For the next 3 to 5 sessions, choose one position in that area to sharpen on purpose.</li>
       </ul>`
    );
  }

  if (analysis.avgPhysical && analysis.avgMental) {
    const avg = (analysis.avgPhysical + analysis.avgMental) / 2;
    if (avg < 2.6) {
      blocks.push(
        `<p><strong>Recovery</strong></p>
         <ul>
           <li>Your average day feels heavy. Protect sleep, warmups, and cool downs for a week and notice if the sliders change.</li>
         </ul>`
      );
    } else if (avg > 4.2) {
      blocks.push(
        `<p><strong>Push edge days</strong></p>
         <ul>
           <li>You often feel good. Pick one or two sessions in the next week to deliberately push pace and see how your game holds up.</li>
         </ul>`
      );
    } else {
      blocks.push(
        `<p><strong>Steady build</strong></p>
         <ul>
           <li>You are in a normal training groove. Choose a small, boring habit to stack on top, like always writing one lesson line after practice.</li>
         </ul>`
      );
    }
  }

  const last3 = logs
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  const lessonCount = last3.filter((l) => l.lesson && l.lesson.trim().length > 0).length;
  if (lessonCount < last3.length) {
    blocks.push(
      `<p><strong>Reflection habit</strong></p>
       <ul>
         <li>Not every session needs a long journal, but a single clear lesson per practice compounds quickly. Aim for 1 line every time.</li>
       </ul>`
    );
  }

  if (!blocks.length) {
    blocks.push("<p>You are logging consistently. Keep going. The next layer is drilling your most common situations on purpose.</p>");
  }

  return blocks.join("");
}

function updateReviewView(logs) {
  const analysis = analyzePatterns(logs);
  const patternSummaryEl = document.getElementById("patternSummary");
  const focusSuggestionsEl = document.getElementById("focusSuggestions");
  const storySummaryEl = document.getElementById("storySummary");

  patternSummaryEl.innerHTML = "";

  if (!logs.length) {
    patternSummaryEl.innerHTML = `<li>Log a few sessions and this space will highlight your most common focuses and moods.</li>`;
    focusSuggestionsEl.innerHTML = generateSuggestions(logs, analysis);
    storySummaryEl.textContent = analysis.story;
    return;
  }

  const stats = computeStats(logs);
  const li1 = document.createElement("li");
  li1.textContent = `Total sessions: ${stats.totalSessions} · Total minutes: ${stats.totalMinutes}`;
  patternSummaryEl.appendChild(li1);

  const sortedFocus = Object.entries(analysis.focusCounts).sort((a, b) => b[1] - a[1]);
  if (sortedFocus.length) {
    const topThree = sortedFocus.slice(0, 3).map(([focus, count]) => `${focus} (${count})`);
    const li2 = document.createElement("li");
    li2.textContent = `Focus areas: ${topThree.join(", ")}`;
    patternSummaryEl.appendChild(li2);
  }

  if (analysis.avgPhysical && analysis.avgMental) {
    const li3 = document.createElement("li");
    li3.textContent = `Average sliders · Physical ${analysis.avgPhysical.toFixed(
      1
    )}/5 · Mental ${analysis.avgMental.toFixed(1)}/5`;
    patternSummaryEl.appendChild(li3);
  }

  focusSuggestionsEl.innerHTML = generateSuggestions(logs, analysis);
  storySummaryEl.textContent = analysis.story;
}

// Tabs

function initTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-button"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === tabId);
      });
    });
  });
}

// Form

function initForm(logs) {
  const form = document.getElementById("logForm");
  const dateInput = document.getElementById("logDate");

  if (!dateInput.value) {
    dateInput.value = todayISO();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newLog = {
      id: Date.now().toString(),
      date: document.getElementById("logDate").value,
      duration: Number(document.getElementById("logDuration").value) || 0,
      type: document.getElementById("logType").value,
      focus: document.getElementById("logFocus").value,
      physical: Number(document.getElementById("logPhysical").value),
      mental: Number(document.getElementById("logMental").value),
      highlights: document.getElementById("logHighlights").value.trim(),
      lesson: document.getElementById("logLesson").value.trim()
    };

    if (!newLog.date || !newLog.duration) {
      alert("Please add a date and duration.");
      return;
    }

    logs.push(newLog);
    saveLogs(logs);

    updateJourneyView(logs);
    updateRecentLogsList(logs);
    updateReviewView(logs);

    form.reset();
    dateInput.value = todayISO();

    const logTabBtn = document.querySelector('.tab-button[data-tab="journey"]');
    if (logTabBtn) {
      logTabBtn.click();
    }
  });
}

// Export

function initExport(logs) {
  const btn = document.getElementById("exportJsonBtn");
  btn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "matmind_log.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Menu

function initMenu() {
  const toggle = document.getElementById("menuToggle");
  const sheet = document.getElementById("appMenu");
  const modal = document.getElementById("menuModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const closeModalBtn = document.getElementById("closeModalBtn");

  if (!toggle || !sheet || !modal || !modalTitle || !modalBody || !closeModalBtn) return;

  const modalContent = {
    settings: {
      title: "Settings",
      body: `
        <p>Quick controls for the app experience.</p>
        <ul>
          <li>Offline first: everything is stored locally in your browser.</li>
          <li>Export raw log any time from the Review tab.</li>
          <li>Weekly target is set to 4 sessions; adjust it in code if you prefer a different cadence.</li>
        </ul>
      `
    },
    about: {
      title: "About MatMind",
      body: `
        <p>MatMind is a lightweight, offline-first journal built for wrestlers to capture sessions quickly and spot patterns without clutter.</p>
        <p>No accounts or sync required. Log after practice, review trends, and adjust one habit at a time.</p>
      `
    },
    support: {
      title: "Feedback",
      body: `
        <p>Spotted a bug or have an idea?</p>
        <ul>
          <li>Jot notes in your log so they stay with your data.</li>
          <li>Use the JSON export to share details or move logs elsewhere.</li>
          <li>For a clean slate, clear this site's storage in your browser settings.</li>
        </ul>
      `
    }
  };

  const closeMenu = () => {
    sheet.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    sheet.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
    const firstItem = sheet.querySelector(".menu-item");
    if (firstItem) {
      setTimeout(() => firstItem.focus(), 0);
    }
  };

  const closeModal = () => {
    modal.classList.add("hidden");
  };

  const openModal = (key) => {
    const content = modalContent[key];
    if (!content) return;
    modalTitle.textContent = content.title;
    modalBody.innerHTML = content.body;
    modal.classList.remove("hidden");
    setTimeout(() => closeModalBtn.focus(), 0);
  };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (sheet.classList.contains("hidden")) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  sheet.addEventListener("click", (e) => {
    const btn = e.target.closest(".menu-item");
    if (!btn) return;
    const action = btn.dataset.action;
    closeMenu();
    openModal(action);
  });

  closeModalBtn.addEventListener("click", () => {
    closeModal();
  });

  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });

  document.addEventListener("click", (e) => {
    if (!sheet.classList.contains("hidden")) {
      const isClickInsideMenu = sheet.contains(e.target) || toggle.contains(e.target);
      if (!isClickInsideMenu) {
        closeMenu();
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      closeModal();
    }
  });
}

// PWA install prompt

let deferredPrompt = null;

function initInstallPrompt() {
  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove("hidden");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    installBtn.disabled = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add("hidden");
    installBtn.disabled = false;
  });
}

// Service worker

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.error("Service worker registration failed", err);
      });
    });
  }
}

// Bootstrap

document.addEventListener("DOMContentLoaded", () => {
  const logs = loadLogs();

  initTabs();
  initForm(logs);
  initExport(logs);
  initMenu();
  initInstallPrompt();
  initServiceWorker();

  updateJourneyView(logs);
  updateRecentLogsList(logs);
  updateReviewView(logs);
});
