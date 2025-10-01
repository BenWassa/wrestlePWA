// Tests for db.js - IndexedDB operations
// Note: These tests run in browser and may require user interaction for IndexedDB permissions

TestRunner.describe('Database Operations', () => {

    // Clean up before each test
    const cleanup = async () => {
        try {
            // Clear all data to ensure clean state
            const dbInstance = await openDB();
            const storeNames = ['practices', 'profile'];
            for (const storeName of storeNames) {
                const transaction = dbInstance.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                await new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
        } catch (error) {
            console.warn('Cleanup failed:', error);
        }
    };

    TestRunner.it('should initialize database successfully', async () => {
        await cleanup();
        const db = await openDB();
        TestRunner.assert.truthy(db, 'Database should be initialized');
        TestRunner.assert.equal(db.name, 'WrestlingJourneyDB', 'Database name should match');
    });

    TestRunner.it('should add and retrieve a practice', async () => {
        await cleanup();

        const testPractice = {
            id: 123,
            notes: 'Test practice',
            duration: 60,
            type: 'drills',
            intensity: 7,
            date: '2025-10-01'
        };

        await addPractice(testPractice);
        const practices = await getPractices();

        TestRunner.assert.equal(practices.length, 1, 'Should have one practice');
        TestRunner.assert.equal(practices[0].notes, 'Test practice', 'Practice notes should match');
        TestRunner.assert.equal(practices[0].duration, 60, 'Practice duration should match');
    });

    TestRunner.it('should delete a practice', async () => {
        await cleanup();

        const testPractice = {
            id: 456,
            notes: 'Practice to delete',
            duration: 45,
            date: '2025-10-01'
        };

        await addPractice(testPractice);
        let practices = await getPractices();
        TestRunner.assert.equal(practices.length, 1, 'Should have practice before delete');

        await deletePractice(456);
        practices = await getPractices();
        TestRunner.assert.equal(practices.length, 0, 'Should have no practices after delete');
    });

    TestRunner.it('should handle multiple practices', async () => {
        await cleanup();

        const practices = [
            { id: 1, notes: 'Practice 1', duration: 30, date: '2025-10-01' },
            { id: 2, notes: 'Practice 2', duration: 45, date: '2025-10-02' },
            { id: 3, notes: 'Practice 3', duration: 60, date: '2025-10-03' }
        ];

        for (const practice of practices) {
            await addPractice(practice);
        }

        const retrieved = await getPractices();
        TestRunner.assert.equal(retrieved.length, 3, 'Should retrieve all practices');
        TestRunner.assert.equal(retrieved[0].notes, 'Practice 1', 'First practice should match');
        TestRunner.assert.equal(retrieved[2].notes, 'Practice 3', 'Last practice should match');
    });

    TestRunner.it('should initialize profile with defaults', async () => {
        await cleanup();

        const profile = await getProfile();
        TestRunner.assert.truthy(profile, 'Profile should exist');
        TestRunner.assert.hasProperty(profile, 'earnedBadges', 'Profile should have earnedBadges');
        TestRunner.assert.hasProperty(profile, 'key', 'Profile should have key');
        TestRunner.assert.equal(profile.key, 'user', 'Profile key should be user');
    });

    TestRunner.it('should update profile', async () => {
        await cleanup();

        const updatedProfile = {
            earnedBadges: [{ id: 1, earnedDate: '2025-10-01', practiceNumber: 5 }],
            currentPhase: 2
        };

        await setProfile(updatedProfile);
        const retrieved = await getProfile();

        TestRunner.assert.equal(retrieved.earnedBadges.length, 1, 'Should have earned badge');
        TestRunner.assert.equal(retrieved.earnedBadges[0].id, 1, 'Badge ID should match');
        TestRunner.assert.equal(retrieved.currentPhase, 2, 'Phase should be updated');
    });

    TestRunner.it('should clear all data', async () => {
        await cleanup();

        // Add some test data
        await addPractice({ id: 1, notes: 'Test', duration: 30, date: '2025-10-01' });
        await setProfile({ earnedBadges: [{ id: 1, earnedDate: '2025-10-01', practiceNumber: 1 }] });

        // Verify data exists
        let practices = await getPractices();
        let profile = await getProfile();
        TestRunner.assert.greaterThan(practices.length, 0, 'Should have practices before clear');
        TestRunner.assert.greaterThan(profile.earnedBadges.length, 0, 'Should have badges before clear');

        // Clear all data
        await clearAllData();

        // Verify data is cleared
        practices = await getPractices();
        profile = await getProfile();
        TestRunner.assert.equal(practices.length, 0, 'Should have no practices after clear');
        TestRunner.assert.equal(profile.earnedBadges.length, 0, 'Should have no badges after clear');
    });

});