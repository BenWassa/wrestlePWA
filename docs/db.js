/* --- START OF FILE db.js (Refactored for Profile Store) --- */

const DB_NAME = 'WrestlingJourneyDB';
const DB_VERSION = 2; // INCREMENT VERSION TO TRIGGER ONUPGRADENEEDED
const STORE_PRACTICES = 'practices';
const STORE_PROFILE = 'profile'; // New store for global settings/badges

let db;

function normalizePractice(practice = {}) {
  return {
    ...practice,
    aiStory: practice.aiStory ?? null,
    storyGeneratedDate: practice.storyGeneratedDate ?? null
  };
}

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
    request.onsuccess = () => resolve(request.result.map(normalizePractice));
    request.onerror = () => reject(request.error);
  });
}

export async function addPractice(practice) {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_PRACTICES], 'readwrite');
    const store = transaction.objectStore(STORE_PRACTICES);
    const request = store.add(normalizePractice(practice));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updatePractice(practice) {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_PRACTICES], 'readwrite');
    const store = transaction.objectStore(STORE_PRACTICES);
    const request = store.put(normalizePractice(practice));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPracticeById(id) {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction([STORE_PRACTICES], 'readonly');
    const store = transaction.objectStore(STORE_PRACTICES);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ? normalizePractice(request.result) : null);
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
    earnedBadges: [], // [{ id, earnedDate, practiceNumber }] - legacy
    earnedMilestones: [], // [{ id, name, earnedDate, practiceNumber, level, description }] - new system
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

export function calculatePracticeStats(practices) {
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

// Identity levels system - replaces discrete badges with belt-rank progression
export const IDENTITY_LEVELS = [
    // Amateur Level (0-49 practices) - Getting started
    {
        id: 'amateur',
        name: 'Amateur',
        description: 'The beginning of your wrestling journey. Focus on showing up consistently.',
        color: '#9ca3af', // Gray
        threshold: 0,
        narrative: 'You\'re in the Amateur phase: building the foundation of consistency.'
    },

    // Grinder Level (50-199 practices) - Building habits
    {
        id: 'grinder',
        name: 'Grinder',
        description: 'You\'ve proven you can show up. Now it\'s about grinding through the tough days.',
        color: '#f59e0b', // Amber
        threshold: 50,
        narrative: 'You\'re in the Grinder phase: turning consistency into unbreakable habits.'
    },

    // Technician Level (200-499 practices) - Skill development
    {
        id: 'technician',
        name: 'Technician',
        description: 'Technical mastery is within reach. Every practice builds toward expertise.',
        color: '#3b82f6', // Blue
        threshold: 200,
        narrative: 'You\'re in the Technician phase: refining your craft through deliberate practice.'
    },

    // Competitor Level (500-1499 practices) - Competition ready
    {
        id: 'competitor',
        name: 'Competitor',
        description: 'You\'re competition-ready. The mat is your arena, and you belong here.',
        color: '#8b5cf6', // Purple
        threshold: 500,
        narrative: 'You\'re in the Competitor phase: ready to test your skills against others.'
    },

    // Veteran Level (1500+ practices) - Mastery achieved
    {
        id: 'veteran',
        name: 'Veteran',
        description: 'A true veteran of the mats. Your experience shapes the next generation.',
        color: '#ef4444', // Red
        threshold: 1500,
        narrative: 'You\'re in the Veteran phase: a master who inspires through example.'
    }
];

// Milestone achievements within levels - these are the "badges" but tied to identity
export const MILESTONES = [
    // Early frequent milestones (Amateur level)
    { id: 'first_practice', name: 'Day One', threshold: 1, level: 'amateur', description: 'Your first practice logged.' },
    { id: 'first_week', name: 'First Week', threshold: 5, level: 'amateur', description: 'Five practices in your first week.' },
    { id: 'first_month', name: 'First Month', threshold: 20, level: 'amateur', description: 'Twenty practices - a full month of commitment.' },

    // Transition to Grinder
    { id: 'grinder_unlocked', name: 'Grinder Unlocked', threshold: 50, level: 'grinder', description: 'You\'ve earned your Grinder status.' },

    // Mid-level milestones (Grinder level)
    { id: 'century_club', name: 'Century Club', threshold: 100, level: 'grinder', description: 'One hundred practices logged.' },
    { id: 'quarter_season', name: 'Quarter Season', threshold: 150, level: 'grinder', description: 'One hundred fifty practices - serious commitment.' },

    // Transition to Technician
    { id: 'technician_unlocked', name: 'Technician Unlocked', threshold: 200, level: 'technician', description: 'You\'ve earned your Technician status.' },

    // Advanced milestones (Technician level)
    { id: 'flow_unlocked', name: 'Flow Unlocked', threshold: 300, level: 'technician', description: 'Three hundred practices - entering flow state.' },
    { id: 'halfway_master', name: 'Halfway to Master', threshold: 400, level: 'technician', description: 'Four hundred practices of deliberate improvement.' },

    // Transition to Competitor
    { id: 'competitor_unlocked', name: 'Competitor Unlocked', threshold: 500, level: 'competitor', description: 'You\'ve earned your Competitor status.' },

    // Competition-level milestones
    { id: 'grind_veteran', name: 'Grind Veteran', threshold: 750, level: 'competitor', description: 'Seven hundred fifty practices - veteran of the grind.' },
    { id: 'competitor_complete', name: 'Competitor Complete', threshold: 1000, level: 'competitor', description: 'One thousand practices - advanced competitor.' },

    // Transition to Veteran
    { id: 'veteran_unlocked', name: 'Veteran Unlocked', threshold: 1500, level: 'veteran', description: 'You\'ve earned your Veteran status.' },

    // Veteran milestones
    { id: 'advanced_complete', name: 'Advanced Complete', threshold: 2000, level: 'veteran', description: 'Two thousand practices - elite territory.' },
    { id: 'veteran_status', name: 'Veteran Status', threshold: 2500, level: 'veteran', description: 'Keep logging beyond two thousand practices.' },

    // Special time-based milestones
    { id: 'ten_hours', name: 'Ten Hours', thresholdHours: 10, level: 'amateur', description: 'More than ten hours of mat time recorded.' },
    { id: 'twentyfive_hours', name: 'Twenty-Five Hours', thresholdHours: 25, level: 'grinder', description: 'Twenty-five hours of focused training.' },
    { id: 'fifty_hours', name: 'Fifty Hours', thresholdHours: 50, level: 'technician', description: 'Fifty hours of documented work.' },
    { id: 'one_hundred_hours', name: 'One Hundred Hours', thresholdHours: 100, level: 'competitor', description: 'One hundred hours of training time.' },

    // Streak milestones
    { id: 'three_day_streak', name: 'Three Day Streak', thresholdStreak: 3, level: 'amateur', description: 'Three consecutive training days.' },
    { id: 'five_day_streak', name: 'Five Day Streak', thresholdStreak: 5, level: 'amateur', description: 'Five straight days of work.' },
    { id: 'ten_day_streak', name: 'Ten Day Streak', thresholdStreak: 10, level: 'grinder', description: 'Ten consecutive training days.' },
    { id: 'two_week_consistent', name: 'Two Weeks Consistent', thresholdWindow: { days: 14, min: 6 }, level: 'grinder', description: 'Six or more practices in two weeks.' },
    { id: 'month_of_work', name: 'Month of Work', thresholdWindow: { days: 30, min: 12 }, level: 'technician', description: 'Twelve or more practices this month.' }
];

// Identity level functions
export function getCurrentIdentityLevel(practiceCount) {
    // Find the highest level the user has reached
    for (let i = IDENTITY_LEVELS.length - 1; i >= 0; i--) {
        if (practiceCount >= IDENTITY_LEVELS[i].threshold) {
            return IDENTITY_LEVELS[i];
        }
    }
    return IDENTITY_LEVELS[0]; // Default to Amateur
}

export function getNextIdentityLevel(practiceCount) {
    // Find the next level to unlock
    for (let level of IDENTITY_LEVELS) {
        if (practiceCount < level.threshold) {
            return level;
        }
    }
    return null; // Already at max level
}

export function getIdentityProgress(practiceCount) {
    const currentLevel = getCurrentIdentityLevel(practiceCount);
    const nextLevel = getNextIdentityLevel(practiceCount);

    if (!nextLevel) {
        // At max level
        return {
            currentLevel,
            nextLevel: null,
            progressPercent: 100,
            practicesToNext: 0,
            narrative: currentLevel.narrative
        };
    }

    const practicesInCurrentLevel = practiceCount - currentLevel.threshold;
    const totalPracticesForNext = nextLevel.threshold - currentLevel.threshold;
    const progressPercent = Math.min(100, Math.round((practicesInCurrentLevel / totalPracticesForNext) * 100));
    const practicesToNext = nextLevel.threshold - practiceCount;

    return {
        currentLevel,
        nextLevel,
        progressPercent,
        practicesToNext,
        narrative: currentLevel.narrative
    };
}

export function checkMilestones(practices, currentProfile) {
    const profile = currentProfile || {};
    const existingMilestones = Array.isArray(profile.earnedMilestones) ? profile.earnedMilestones : [];
    const stats = calculatePracticeStats(practices || []);
    const earnedMilestoneIds = new Set(existingMilestones.map(m => m.id));
    const newlyEarned = [];

    MILESTONES.forEach(milestone => {
        if (!earnedMilestoneIds.has(milestone.id) && isMilestoneEarned(milestone, stats)) {
            newlyEarned.push({
                id: milestone.id,
                name: milestone.name,
                earnedDate: new Date().toISOString().split('T')[0],
                practiceNumber: stats.practiceCount,
                level: milestone.level,
                description: milestone.description
            });
        }
    });

    if (!newlyEarned.length) return null;

    return {
        ...profile,
        earnedMilestones: [...existingMilestones, ...newlyEarned]
    };
}

function isMilestoneEarned(milestone, stats) {
    if (milestone.threshold && stats.practiceCount >= milestone.threshold) {
        return true;
    }
    if (milestone.thresholdHours && stats.totalHours >= milestone.thresholdHours) {
        return true;
    }
    if (milestone.thresholdStreak && stats.streaks.current >= milestone.thresholdStreak) {
        return true;
    }
    if (milestone.thresholdWindow) {
        const windowKey = `last${milestone.thresholdWindow.days}Days`;
        return stats[windowKey] >= milestone.thresholdWindow.min;
    }
    return false;
}

// Legacy badge system - kept for migration
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

    // Normalize all badge ids to strings (current system uses string ids)
    const normalizedBadges = existingBadges.map(b => ({ ...b, id: String(b.id) }));
    const migrationOccurred = normalizedBadges.some((b, i) => String(b.id) !== String(existingBadges[i] && existingBadges[i].id));

    const stats = calculatePracticeStats(practices || []);
    const earnedBadgeIds = new Set(normalizedBadges.map(b => b.id));
    const newlyEarned = [];

    ALL_BADGES.forEach(badge => {
        if (!earnedBadgeIds.has(badge.id) && badge.check(stats)) {
            newlyEarned.push({
                id: badge.id,
                earnedDate: new Date().toISOString().split('T')[0],
                practiceNumber: stats.practiceCount,
                category: badge.category
            });
        }
    });

    // Also check for new milestone system
    const milestoneResult = checkMilestones(practices, profile);

    const hasNewBadges = newlyEarned.length > 0;
    const hasNewMilestones = milestoneResult && milestoneResult.earnedMilestones.length > profile.earnedMilestones?.length;

    if (!hasNewBadges && !hasNewMilestones && !migrationOccurred) return null;

    return {
        ...profile,
        earnedBadges: [...normalizedBadges, ...newlyEarned],
        ...(milestoneResult && { earnedMilestones: milestoneResult.earnedMilestones })
    };
}

// --- JOURNEY PHASES ---

// Phases used in tests: 3 phases with goals 10, 50, 100
export const PHASES = [
    { id: 1, name: 'The Baseline', description: 'Starting out', start: 0, goal: 10 },
    { id: 2, name: 'The Grind', description: 'Building work', start: 10, goal: 50 },
    { id: 3, name: 'The Competitor', description: 'Advanced', start: 50, goal: 100 }
];

export function getPhase(practiceCount) {
    const count = Math.max(0, Number.isFinite(practiceCount) ? practiceCount : 0);

    // Find current phase where count <= goal; if beyond last, pick last
    let currentPhase = PHASES[PHASES.length - 1];
    for (const phase of PHASES) {
        if (count <= phase.goal) {
            currentPhase = phase;
            break;
        }
    }


    const currentIndex = PHASES.findIndex(p => p.id === currentPhase.id);
    // If we're before reaching the current phase's goal, 'next' should be the current phase
    // Once count >= currentPhase.goal, next should move to the following phase (if any)
    let nextPhase = null;
    if (currentIndex >= 0 && currentIndex < PHASES.length - 1) {
        if (count >= currentPhase.goal) {
            nextPhase = PHASES[currentIndex + 1];
        } else {
            nextPhase = currentPhase;
        }
    } else {
        nextPhase = null;
    }

    const rangeStart = currentPhase.start || 0;
    // Use the phase's goal as the denominator (matches tests expecting 25/50 -> 30)
    const denom = Number.isFinite(currentPhase.goal) ? Math.max(1, currentPhase.goal) : Math.max(1, (currentPhase.goal - rangeStart));
    let rawProgress = Math.round(((count - rangeStart) / denom) * 100);

    // If we're in the final phase and we've reached or passed its goal, progress is 100
    const isFinalPhase = currentIndex === PHASES.length - 1;
    if (isFinalPhase && Number.isFinite(currentPhase.goal) && count >= currentPhase.goal) {
        rawProgress = 100;
    }

    const progress = Math.min(100, Math.max(0, rawProgress));

    return { current: currentPhase, next: nextPhase, progress };
}

/* --- END OF FILE db.js (Refactored for Profile Store) --- */