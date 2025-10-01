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

export const ALL_BADGES = [
    {
        id: 1,
        name: 'First Practice',
        description: 'Complete your first practice session',
        check: (practices) => practices.length >= 1
    },
    {
        id: 2,
        name: '10 Practices',
        description: 'Complete 10 practice sessions',
        check: (practices) => practices.length >= 10
    },
    {
        id: 3,
        name: '50 Practices',
        description: 'Complete 50 practice sessions',
        check: (practices) => practices.length >= 50
    },
    {
        id: 4,
        name: 'High Intensity',
        description: 'Average intensity of 4+ over 5 sessions',
        check: (practices) => {
            if (practices.length < 5) return false;
            const totalIntensity = practices.reduce((sum, p) => sum + (p.intensity || 0), 0);
            const avgIntensity = totalIntensity / practices.length;
            return avgIntensity >= 4;
        }
    }
];

export function checkBadges(practices, currentProfile) {
    const earnedBadges = currentProfile.earnedBadges || [];
    const earnedBadgeIds = earnedBadges.map(b => b.id);
    
    // Check each badge to see if it should be earned
    for (const badge of ALL_BADGES) {
        if (!earnedBadgeIds.includes(badge.id) && badge.check(practices)) {
            // New badge earned!
            const newBadge = {
                id: badge.id,
                earnedDate: new Date().toISOString().split('T')[0],
                practiceNumber: practices.length
            };
            
            return {
                ...currentProfile,
                earnedBadges: [...earnedBadges, newBadge]
            };
        }
    }
    
    // No new badges earned
    return null;
}

// --- JOURNEY PHASES ---

export const PHASES = [
    { id: 1, name: 'The Baseline', goal: 10, description: 'Building consistency' },
    { id: 2, name: 'The Grind', goal: 50, description: 'Developing skills' },
    { id: 3, name: 'The Competitor', goal: 100, description: 'Mastering the craft' }
];

export function getPhase(practiceCount) {
    // Handle negative numbers
    if (practiceCount < 0) practiceCount = 0;
    
    let currentPhase = PHASES[0];
    let nextPhase = PHASES[0];
    let progress = 0;
    
    // Find current phase
    for (let i = 0; i < PHASES.length; i++) {
        if (practiceCount <= PHASES[i].goal) {
            currentPhase = PHASES[i];
            
            // If we're exactly at the goal, next is the next phase
            if (practiceCount === PHASES[i].goal && i + 1 < PHASES.length) {
                nextPhase = PHASES[i + 1];
            } else {
                nextPhase = PHASES[i];
            }
            
            // Calculate progress within current phase
            const previousGoal = i > 0 ? PHASES[i - 1].goal : 0;
            progress = Math.round(((practiceCount - previousGoal) / PHASES[i].goal) * 100);
            break;
        }
    }
    
    // If we've completed all phases
    if (practiceCount >= PHASES[PHASES.length - 1].goal) {
        currentPhase = PHASES[PHASES.length - 1];
    // No next phase once the final goal is reached
    nextPhase = null;
        progress = 100;
    }
    
    return {
        current: currentPhase,
        next: nextPhase,
        progress: progress
    };
}

/* --- END OF FILE db.js (Refactored for Profile Store) --- */