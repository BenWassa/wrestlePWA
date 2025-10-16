(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const DB_NAME = 'wrestling-journey-auto-backup-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'backups';
  const METADATA_KEY = '__metadata__';
  const BACKUP_KEYS = ['current', 'previous', 'oldest'];
  const DEFAULT_DELAY_MS = 5000;

  const defaultMetadata = {
    lastBackupISO: '',
    lastBackupReason: '',
    lastBackupHash: '',
    lastManualDownloadISO: '',
    lastManualDownloadFileName: '',
    lastRestoreISO: '',
    lastRestoreKey: '',
    currentBackupDate: '',
    previousBackupDate: '',
    oldestBackupDate: '',
    currentBackupSize: 0,
    previousBackupSize: 0,
    oldestBackupSize: 0,
    backupCount: 0
  };

  const textEncoder = new TextEncoder();

  function openDB() {
    if (!('indexedDB' in GLOBAL)) {
      return Promise.reject(new Error('IndexedDB not supported'));
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error || new Error('Failed to open IndexedDB'));
      };
    });
  }

  async function getEntry(dbPromise, key) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function putEntry(dbPromise, entry) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllEntries(dbPromise) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function computeSHA256(buffer) {
    if (!GLOBAL.crypto || !GLOBAL.crypto.subtle) {
      return null;
    }
    try {
      const digest = await GLOBAL.crypto.subtle.digest('SHA-256', buffer);
      const view = new Uint8Array(digest);
      return Array.from(view).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('AutoBackup: Unable to compute hash', error);
      return null;
    }
  }

  function formatDate(dateString) {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.valueOf())) {
      return '';
    }
    return date.toLocaleString();
  }

  const AutoBackup = {
    enabled: true,
    pendingTimer: null,
    lastQueuedReason: '',
    lastQueuedUserInitiated: false,
    backupInProgress: false,
    queueImmediate: false,
    dbPromise: null,
    metadata: { ...defaultMetadata },
    cachedBackups: [],
    supported: typeof indexedDB !== 'undefined',
    config: {
      delayMs: DEFAULT_DELAY_MS,
      getPayload: null,
      applySnapshot: null,
      onStatusChange: null
    },

    init(options = {}) {
      if (!this.supported) {
        console.warn('AutoBackup: IndexedDB not supported in this environment');
        this.enabled = false;
        this.config = { ...this.config, ...options };
        return Promise.resolve(false);
      }
      this.config = { ...this.config, ...options };
      if (typeof options.enabled === 'boolean') {
        this.enabled = options.enabled;
      }
      this.dbPromise = openDB();
      this.ready = (async () => {
        try {
          await this.loadMetadata();
          await this.refreshCachedBackups();
        } catch (error) {
          console.error('AutoBackup: Failed to initialize', error);
        }
      })();
      return this.ready;
    },

    async loadMetadata() {
      if (!this.supported) {
        return;
      }
      try {
        const stored = await getEntry(this.dbPromise, METADATA_KEY);
        this.metadata = { ...defaultMetadata, ...(stored || {}) };
        if (typeof stored?.enabled === 'boolean') {
          this.enabled = stored.enabled;
        }
      } catch (error) {
        console.warn('AutoBackup: Could not load metadata', error);
        this.metadata = { ...defaultMetadata };
      }
    },

    async saveMetadata() {
      if (!this.supported) {
        return;
      }
      const payload = {
        key: METADATA_KEY,
        ...this.metadata,
        enabled: this.enabled
      };
      try {
        await putEntry(this.dbPromise, payload);
      } catch (error) {
        console.warn('AutoBackup: Could not save metadata', error);
      }
    },

    async refreshCachedBackups() {
      if (!this.supported) {
        return;
      }
      try {
        const entries = await Promise.all(
          BACKUP_KEYS.map((key) => getEntry(this.dbPromise, key))
        );
        const available = [];
        entries.forEach((entry, index) => {
          const key = BACKUP_KEYS[index];
          if (entry && typeof entry === 'object') {
            available.push({
              key,
              timestamp: entry.timestamp || '',
              reason: entry.reason || '',
              hash: entry.hash || '',
              size: entry.size || 0
            });
          }
        });
        this.cachedBackups = available;
        const [current, previous, oldest] = entries;
        this.metadata.currentBackupDate = current?.timestamp || '';
        this.metadata.previousBackupDate = previous?.timestamp || '';
        this.metadata.oldestBackupDate = oldest?.timestamp || '';
        this.metadata.currentBackupSize = current?.size || 0;
        this.metadata.previousBackupSize = previous?.size || 0;
        this.metadata.oldestBackupSize = oldest?.size || 0;
        this.metadata.backupCount = available.length;
      } catch (error) {
        console.warn('AutoBackup: Could not refresh cached backups', error);
        this.cachedBackups = [];
        this.metadata.currentBackupDate = '';
        this.metadata.previousBackupDate = '';
        this.metadata.oldestBackupDate = '';
        this.metadata.currentBackupSize = 0;
        this.metadata.previousBackupSize = 0;
        this.metadata.oldestBackupSize = 0;
        this.metadata.backupCount = 0;
      }
    },

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.saveMetadata();
      this.notifyStatusChange();
      if (this.enabled) {
        this.handleStoreSave({ reason: 'enabled', immediate: true });
      }
    },

    handleStoreSave({ reason = 'auto', immediate = false, userInitiated = false } = {}) {
      if (!this.supported || !this.enabled) {
        return;
      }
      this.lastQueuedReason = reason;
      this.lastQueuedUserInitiated = this.lastQueuedUserInitiated || userInitiated;
      if (this.pendingTimer) {
        clearTimeout(this.pendingTimer);
        this.pendingTimer = null;
      }
      if (immediate) {
        this.runBackup(reason);
        return;
      }
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null;
        this.runBackup(reason);
      }, this.config.delayMs || DEFAULT_DELAY_MS);
    },

    async runBackup(reason) {
      if (!this.supported || !this.enabled) {
        return;
      }
      if (this.backupInProgress) {
        this.queueImmediate = true;
        this.lastQueuedReason = reason || this.lastQueuedReason;
        return;
      }
      this.backupInProgress = true;
      this.lastQueuedUserInitiated = false;
      try {
        const result = await this.performBackup(reason);
        if (result?.skipped) {
          return;
        }
      } catch (error) {
        console.error('AutoBackup: Backup failed', error);
      } finally {
        this.backupInProgress = false;
        if (this.queueImmediate) {
          this.queueImmediate = false;
          const queuedReason = this.lastQueuedReason || 'auto';
          this.runBackup(queuedReason);
        }
      }
    },

    async performBackup(reason, { payload: providedPayload } = {}) {
      if (!this.supported || !this.enabled) {
        return null;
      }
      await this.ready;
      if (typeof (this.config.getPayload) !== 'function') {
        throw new Error('AutoBackup: getPayload handler is missing');
      }
      const payload = providedPayload || await this.config.getPayload({ reason, automatic: true });
      const json = JSON.stringify(payload, null, 2);
      const buffer = textEncoder.encode(json);
      const hash = await computeSHA256(buffer);
      const generatedAt = payload?.backup?.generatedAt || new Date().toISOString();
      this.metadata.lastBackupISO = generatedAt;
      this.metadata.lastBackupReason = reason || 'auto';
      if (hash && this.metadata.lastBackupHash && this.metadata.lastBackupHash === hash) {
        await this.saveMetadata();
        this.notifyStatusChange();
        return { skipped: true, hash, timestamp: generatedAt };
      }
      const entry = {
        key: 'current',
        timestamp: generatedAt,
        reason: reason || 'auto',
        hash: hash || '',
        size: buffer.byteLength,
        payload
      };
      const current = await getEntry(this.dbPromise, 'current');
      const previous = await getEntry(this.dbPromise, 'previous');
      const db = await this.dbPromise;
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        if (previous) {
          store.put({ ...previous, key: 'oldest' });
        } else {
          store.delete('oldest');
        }
        if (current) {
          store.put({ ...current, key: 'previous' });
        } else {
          store.delete('previous');
        }
        store.put(entry);
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error || transaction.error);
      });
      await this.refreshCachedBackups();
      this.metadata.lastBackupHash = hash || '';
      await this.saveMetadata();
      this.notifyStatusChange();
      return { skipped: false, hash, timestamp: generatedAt };
    },

    async manualBackup() {
      if (!this.supported) {
        throw new Error('Automatic backups are not supported in this browser.');
      }
      await this.ready;
      if (typeof this.config.getPayload !== 'function') {
        throw new Error('AutoBackup: getPayload handler is missing');
      }
      const payload = await this.config.getPayload({ reason: 'manual-download', manual: true });
      const json = JSON.stringify(payload, null, 2);
      const nowIso = payload?.backup?.generatedAt || new Date().toISOString();
      const safeStamp = nowIso.replace(/[:]/g, '-');
      const fileName = `wrestling_journey_backup-${safeStamp}.json`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      this.metadata.lastManualDownloadISO = nowIso;
      this.metadata.lastManualDownloadFileName = fileName;
      await this.saveMetadata();
      this.notifyStatusChange();
      if (this.enabled) {
        await this.performBackup('manual-download', { payload });
      }
    },

    async restoreFromBackup(key) {
      if (!this.supported) {
        throw new Error('Automatic backups are not supported in this browser.');
      }
      await this.ready;
      if (!BACKUP_KEYS.includes(key)) {
        throw new Error('Invalid backup key');
      }
      const entry = await getEntry(this.dbPromise, key);
      if (!entry || !entry.payload) {
        throw new Error('No backup available for the selected version.');
      }
      if (typeof this.config.applySnapshot !== 'function') {
        throw new Error('AutoBackup: applySnapshot handler is missing');
      }
      await this.config.applySnapshot(entry.payload);
      this.metadata.lastRestoreKey = key;
      this.metadata.lastRestoreISO = new Date().toISOString();
      await this.saveMetadata();
      this.notifyStatusChange();
    },

    async clearBackups() {
      if (!this.supported) {
        return;
      }
      await this.ready;
      try {
        const entries = await getAllEntries(this.dbPromise);
        const db = await this.dbPromise;
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          entries.forEach((entry) => {
            store.delete(entry.key);
          });
          transaction.oncomplete = () => resolve();
          transaction.onerror = (event) => reject(event.target.error || transaction.error);
        });
        await this.refreshCachedBackups();
        this.metadata.lastBackupHash = '';
        this.metadata.lastBackupISO = '';
        this.metadata.lastBackupReason = '';
        await this.saveMetadata();
        this.notifyStatusChange();
      } catch (error) {
        console.warn('AutoBackup: Unable to clear backups', error);
      }
    },

    getAvailableBackups() {
      return this.cachedBackups.slice();
    },

    getStatus() {
      const status = {
        supported: this.supported,
        enabled: this.enabled,
        metadata: { ...this.metadata },
        availableBackups: this.getAvailableBackups(),
        statusText: ''
      };
      if (!this.supported) {
        status.statusText = 'Automatic backups are unavailable in this browser.';
        return status;
      }
      if (!this.enabled) {
        status.statusText = 'Automatic backups are paused. Enable them to continue protecting your data.';
        return status;
      }
      if (!this.metadata.currentBackupDate) {
        status.statusText = 'No backups yet. A snapshot will be created after your next change.';
        return status;
      }
      const lastBackup = formatDate(this.metadata.currentBackupDate);
      status.statusText = `Latest backup saved ${lastBackup}.`;
      return status;
    },

    notifyStatusChange() {
      if (typeof this.config.onStatusChange === 'function') {
        try {
          this.config.onStatusChange(this.getStatus());
        } catch (error) {
          console.warn('AutoBackup: onStatusChange handler threw', error);
        }
      }
    }
  };

  GLOBAL.AutoBackup = AutoBackup;
})();
