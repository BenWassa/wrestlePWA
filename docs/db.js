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
function openDB() {
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
/* --- END OF FILE db.js (Refactored for Profile Store) --- */