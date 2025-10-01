/* --- START OF FILE db.js (Refactored for Profile Store) --- */

const DB_NAME = 'WrestlingJourneyDB';
const DB_VERSION = 2; // INCREMENT VERSION TO TRIGGER ONUPGRADENEEDED
const STORE_PRACTICES = 'practices';
const STORE_PROFILE = 'profile'; // New store for global settings/badges

let db;

/**
 * Initializes the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      if (!dbInstance.objectStoreNames.contains(STORE_PRACTICES)) {
        dbInstance.createObjectStore(STORE_PRACTICES, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(STORE_PROFILE)) {
        // Simple key/value store for a single profile object (key: 'user')
        dbInstance.createObjectStore(STORE_PROFILE, { keyPath: 'key' }); 
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB Error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// --- PRACTICES STORE OPERATIONS ---

export async function getPractices() {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_PRACTICES], 'readonly');
    const store = transaction.objectStore(STORE_PRACTICES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addPractice(practice) {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_PRACTICES], 'readwrite');
    const store = transaction.objectStore(STORE_PRACTICES);
    const request = store.add(practice);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deletePractice(id) {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_PRACTICES], 'readwrite');
    const store = transaction.objectStore(STORE_PRACTICES);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- PROFILE STORE OPERATIONS (Settings, Badges, Phase) ---

const DEFAULT_PROFILE = {
    key: 'user',
    earnedBadges: [], // [{ id, earnedDate, practiceNumber }]
    currentPhase: 1,
    streaks: { days: 0, weeks: 0 }
};

export async function getProfile() {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction([STORE_PROFILE], 'readonly');
        const store = transaction.objectStore(STORE_PROFILE);
        const request = store.get('user');

        request.onsuccess = () => resolve(request.result || DEFAULT_PROFILE);
        request.onerror = () => reject(request.error);
    });
}

export async function setProfile(profile) {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction([STORE_PROFILE], 'readwrite');
        const store = transaction.objectStore(STORE_PROFILE);
        const request = store.put({ ...DEFAULT_PROFILE, ...profile, key: 'user' });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function clearAllData() {
    const dbInstance = await openDB();
    const storeNames = [STORE_PRACTICES, STORE_PROFILE];
    return Promise.all(
        storeNames.map(storeName => {
            return new Promise((resolve, reject) => {
                const transaction = dbInstance.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        })
    );
}

// Automatically open the DB on script load for readiness
openDB();

// --- BADGE SYSTEM ---

const BADGE_ID_MIGRATIONS = {
    '1': 'first_practice',
    '2': 'ten_practices',
    '3': 'fifty_practices',
    '4': 'high_intensity_focus'
};

function uniqueSortedPracticeDates(practices) {
    const uniqueDates = Array.from(new Set(practices
        .map(p => p.date)
        .filter(Boolean)));
    return uniqueDates
        .map(dateStr => new Date(dateStr))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a - b);
}

function calculateStreaks(practices) {
    const dates = uniqueSortedPracticeDates(practices);
    if (!dates.length) {
        return { current: 0, longest: 0 };
    }

    let current = 1;
    let longest = 1;

    for (let i = 1; i < dates.length; i++) {
        const diffDays = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            current += 1;
        } else {
            current = 1;
        }
        if (current > longest) {
            longest = current;
        }
    }

    const lastPractice = dates[dates.length - 1];
    const today = new Date();
    const daysSinceLastPractice = Math.round((today.setHours(0, 0, 0, 0) - lastPractice.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

    return {
        current: daysSinceLastPractice <= 1 ? current : 0,
        longest
    };
}

function countPracticesInWindow(practices, days) {
    if (!practices.length) {
        return 0;
    }

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));

    return practices.filter(p => {
        if (!p.date) return false;
        const practiceDate = new Date(p.date);
        if (isNaN(practiceDate.getTime())) return false;
        practiceDate.setHours(0, 0, 0, 0);
        return practiceDate >= cutoff;
    }).length;
}

function calculatePracticeStats(practices) {
    const practiceCount = practices.length;
    const totalMinutes = practices.reduce((sum, p) => sum + (Number(p.duration) || 0), 0);
    const totalHours = totalMinutes / 60;
    const intensitySamples = practices.slice(-5);
    const avgRecentIntensity = intensitySamples.length
        ? intensitySamples.reduce((sum, p) => sum + (Number(p.intensity) || 0), 0) / intensitySamples.length
        : 0;
    const streaks = calculateStreaks(practices);

    return {
        practiceCount,
        totalMinutes,
        totalHours,
        avgRecentIntensity,
        streaks,
        last7Days: countPracticesInWindow(practices, 7),
        last14Days: countPracticesInWindow(practices, 14),
        last30Days: countPracticesInWindow(practices, 30)
    };
}

export const ALL_BADGES = [
    // Volume milestones (frequent early wins → spaced out later)
    {
        id: 'first_practice',
        name: 'Day One',
        description: 'Log your very first practice.',
        icon: '🏅',
        category: 'volume',
        milestone: 1,
        check: (stats) => stats.practiceCount >= 1
    },
    {
        id: 'three_practices',
        name: 'Three Days In',
        description: 'Keep the spark alive with three logged practices.',
        icon: '✨',
        category: 'volume',
        milestone: 3,
        check: (stats) => stats.practiceCount >= 3
    },
    {
        id: 'five_practices',
        name: 'First Week',
        description: 'Five practices logged. You survived week one.',
        icon: '🔥',
        category: 'volume',
        milestone: 5,
        check: (stats) => stats.practiceCount >= 5
    },
    {
        id: 'ten_practices',
        name: 'Two Weeks Strong',
        description: 'Ten sessions entered. Momentum is building.',
        icon: '💪',
        category: 'volume',
        milestone: 10,
        check: (stats) => stats.practiceCount >= 10
    },
    {
        id: 'fifteen_practices',
        name: 'Three Weeks In',
        description: 'Fifteen logged practices. Showing up matters.',
        icon: '🏋️',
        category: 'volume',
        milestone: 15,
        check: (stats) => stats.practiceCount >= 15
    },
    {
        id: 'twenty_practices',
        name: 'First Month',
        description: 'Twenty honest sessions. A full month of work.',
        icon: '📆',
        category: 'volume',
        milestone: 20,
        check: (stats) => stats.practiceCount >= 20
    },
    {
        id: 'thirty_practices',
        name: 'Six Weeks Strong',
        description: 'Thirty practices logged. The habit is real.',
        icon: '🛡️',
        category: 'volume',
        milestone: 30,
        check: (stats) => stats.practiceCount >= 30
    },
    {
        id: 'forty_practices',
        name: 'Two Months Deep',
        description: 'Forty practices. You kept the promise to yourself.',
        icon: '⚙️',
        category: 'volume',
        milestone: 40,
        check: (stats) => stats.practiceCount >= 40
    },
    {
        id: 'fifty_practices',
        name: 'Quarter Season',
        description: 'Fifty sessions of grind logged.',
        icon: '🥇',
        category: 'volume',
        milestone: 50,
        check: (stats) => stats.practiceCount >= 50
    },
    {
        id: 'seventyfive_practices',
        name: 'Crucible Complete',
        description: 'Seventy-five practices. Phase one survived.',
        icon: '🔥',
        category: 'phase',
        milestone: 75,
        check: (stats) => stats.practiceCount >= 75
    },
    {
        id: 'hundred_practices',
        name: 'Century Club',
        description: 'One hundred logged practices. The grind is real.',
        icon: '💯',
        category: 'volume',
        milestone: 100,
        check: (stats) => stats.practiceCount >= 100
    },
    {
        id: 'hundredfifty_practices',
        name: 'Half Year',
        description: 'One hundred and fifty practices documented.',
        icon: '🛠️',
        category: 'volume',
        milestone: 150,
        check: (stats) => stats.practiceCount >= 150
    },
    {
        id: 'twohundred_practices',
        name: 'Grinder Complete',
        description: 'Two hundred practices. The foundation is set.',
        icon: '🏆',
        category: 'phase',
        milestone: 200,
        check: (stats) => stats.practiceCount >= 200
    },
    {
        id: 'threehundred_practices',
        name: 'Year and a Half',
        description: 'Three hundred practices. Flow is taking shape.',
        icon: '🌊',
        category: 'volume',
        milestone: 300,
        check: (stats) => stats.practiceCount >= 300
    },
    {
        id: 'fourhundred_practices',
        name: 'Two Years In',
        description: 'Four hundred entries. You live on the mat.',
        icon: '🧱',
        category: 'volume',
        milestone: 400,
        check: (stats) => stats.practiceCount >= 400
    },
    {
        id: 'fivehundred_practices',
        name: 'Technician Complete',
        description: 'Five hundred tracked practices. Flow unlocked.',
        icon: '⚡',
        category: 'phase',
        milestone: 500,
        check: (stats) => stats.practiceCount >= 500
    },
    {
        id: 'sevenfifty_practices',
        name: 'Relentless',
        description: 'Seven hundred and fifty sessions. Momentum never left.',
        icon: '🌀',
        category: 'volume',
        milestone: 750,
        check: (stats) => stats.practiceCount >= 750
    },
    {
        id: 'thousand_practices',
        name: 'Competitor Complete',
        description: 'One thousand logged practices. Advanced level engaged.',
        icon: '🥋',
        category: 'phase',
        milestone: 1000,
        check: (stats) => stats.practiceCount >= 1000
    },
    {
        id: 'fifteenhundred_practices',
        name: 'Grind Veteran',
        description: 'Fifteen hundred practices. You outlasted seasons.',
        icon: '🛡️',
        category: 'volume',
        milestone: 1500,
        check: (stats) => stats.practiceCount >= 1500
    },
    {
        id: 'two_thousand_practices',
        name: 'Advanced Complete',
        description: 'Two thousand recorded sessions. Elite territory.',
        icon: '🏔️',
        category: 'phase',
        milestone: 2000,
        check: (stats) => stats.practiceCount >= 2000
    },
    {
        id: 'veteran_status',
        name: 'Veteran Status',
        description: 'Keep logging beyond two thousand practices.',
        icon: '🧭',
        category: 'phase',
        milestone: 2500,
        check: (stats) => stats.practiceCount >= 2500
    },

    // Consistency badges
    {
        id: 'streak_three',
        name: 'Three Practice Streak',
        description: 'Three consecutive training days logged.',
        icon: '📈',
        category: 'consistency',
        check: (stats) => stats.streaks.current >= 3
    },
    {
        id: 'streak_five',
        name: 'Five Practice Streak',
        description: 'Five straight days putting in work.',
        icon: '🎯',
        category: 'consistency',
        check: (stats) => stats.streaks.current >= 5
    },
    {
        id: 'streak_ten',
        name: 'Ten Practice Streak',
        description: 'Ten consecutive training days documented.',
        icon: '🚀',
        category: 'consistency',
        check: (stats) => stats.streaks.current >= 10
    },
    {
        id: 'two_weeks_consistent',
        name: 'Two Weeks Consistent',
        description: 'Six or more practices in the last two weeks.',
        icon: '📆',
        category: 'consistency',
        check: (stats) => stats.last14Days >= 6
    },
    {
        id: 'month_of_work',
        name: 'Month of Work',
        description: 'Twelve or more practices this month.',
        icon: '🧮',
        category: 'consistency',
        check: (stats) => stats.last30Days >= 12
    },
    {
        id: 'weekly_grind',
        name: 'Weekly Grind',
        description: 'Logged four or more sessions in the last seven days.',
        icon: '🛞',
        category: 'consistency',
        check: (stats) => stats.last7Days >= 4
    },

    // Hours invested badges
    {
        id: 'hours_ten',
        name: 'Ten Hours Logged',
        description: 'More than ten hours of mat time recorded.',
        icon: '⏱️',
        category: 'hours',
        check: (stats) => stats.totalHours >= 10
    },
    {
        id: 'hours_twentyfive',
        name: 'Twenty-Five Hours',
        description: 'Twenty-five hours documented in the trenches.',
        icon: '⌛',
        category: 'hours',
        check: (stats) => stats.totalHours >= 25
    },
    {
        id: 'hours_fifty',
        name: 'Fifty Hours',
        description: 'Fifty hours of focused training tracked.',
        icon: '🕰️',
        category: 'hours',
        check: (stats) => stats.totalHours >= 50
    },
    {
        id: 'hours_one_hundred',
        name: 'One Hundred Hours',
        description: 'One hundred hours of work logged.',
        icon: '🏛️',
        category: 'hours',
        check: (stats) => stats.totalHours >= 100
    },
    {
        id: 'hours_two_fifty',
        name: 'Quarter Thousand Hours',
        description: 'Two hundred and fifty hours recorded.',
        icon: '📡',
        category: 'hours',
        check: (stats) => stats.totalHours >= 250
    },
    {
        id: 'hours_five_hundred',
        name: 'Five Hundred Hours',
        description: 'Five hundred hours of honest training time.',
        icon: '🧱',
        category: 'hours',
        check: (stats) => stats.totalHours >= 500
    },

    // Effort-focused special badge
    {
        id: 'high_intensity_focus',
        name: 'High Intensity Stretch',
        description: 'Average intensity 4+ across the last five sessions.',
        icon: '⚡',
        category: 'consistency',
        check: (stats) => stats.avgRecentIntensity >= 4 && stats.practiceCount >= 5
    }
];

export function checkBadges(practices, currentProfile) {
    const profile = currentProfile || {};
    const existingBadges = Array.isArray(profile.earnedBadges) ? profile.earnedBadges : [];

    const normalizedBadges = existingBadges.map(badge => {
        const migratedId = BADGE_ID_MIGRATIONS[String(badge.id)] || badge.id;
        return migratedId === badge.id ? badge : { ...badge, id: migratedId };
    });

    const migrationOccurred = normalizedBadges.some((badge, index) => badge !== existingBadges[index]);

    const stats = calculatePracticeStats(practices);
    const earnedBadgeIds = new Set(normalizedBadges.map(badge => String(badge.id)));
    const newlyEarned = [];

    ALL_BADGES.forEach(badge => {
        if (!earnedBadgeIds.has(badge.id) && badge.check(stats, practices)) {
            newlyEarned.push({
                id: badge.id,
                earnedDate: new Date().toISOString().split('T')[0],
                practiceNumber: stats.practiceCount,
                category: badge.category
            });
        }
    });

    if (!newlyEarned.length && !migrationOccurred) {
        return null;
    }

    return {
        ...profile,
        earnedBadges: [...normalizedBadges, ...newlyEarned]
    };
}

// --- JOURNEY PHASES ---

export const PHASES = [
    {
        id: 1,
        name: 'The Crucible',
        description: 'Survival mode. Everything hurts but you keep showing up.',
        start: 0,
        goal: 75
    },
    {
        id: 2,
        name: 'The Grinder',
        description: 'Foundation building. Technique begins to stick.',
        start: 75,
        goal: 200
    },
    {
        id: 3,
        name: 'The Technician',
        description: 'Flow develops. You see positions before they happen.',
        start: 200,
        goal: 500
    },
    {
        id: 4,
        name: 'The Competitor',
        description: 'Advanced level. You hunt openings and capitalize.',
        start: 500,
        goal: 1000
    },
    {
        id: 5,
        name: 'The Advanced',
        description: 'Elite territory. Sessions sharpen every edge.',
        start: 1000,
        goal: 2000
    },
    {
        id: 6,
        name: 'The Veteran',
        description: 'Mastery is a moving target. You live this lifestyle.',
        start: 2000,
        goal: Infinity
    }
];

export function getPhase(practiceCount) {
    const count = Math.max(0, practiceCount);

    let currentPhase = PHASES[PHASES.length - 1];
    for (const phase of PHASES) {
        if (count <= phase.goal) {
            currentPhase = phase;
            break;
        }
    }

    const currentIndex = PHASES.findIndex(phase => phase.id === currentPhase.id);
    const nextPhase = currentIndex >= 0 && currentIndex < PHASES.length - 1 ? PHASES[currentIndex + 1] : null;
    const rangeStart = currentPhase.start || 0;
    const rangeEnd = Number.isFinite(currentPhase.goal) ? currentPhase.goal : rangeStart + Math.max(50, Math.ceil(count / 100) * 25);
    const denominator = Math.max(1, rangeEnd - rangeStart);
    const progress = Number.isFinite(currentPhase.goal)
        ? Math.min(100, Math.max(0, Math.round(((count - rangeStart) / denominator) * 100)))
        : 100;

    return {
        current: currentPhase,
        next: nextPhase,
        progress
    };
}

/* --- END OF FILE db.js (Refactored for Profile Store) --- */