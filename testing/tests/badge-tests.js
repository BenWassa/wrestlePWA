// Tests for badge system and journey logic

TestRunner.describe('Badge System', () => {

    TestRunner.it('should have correct badge definitions', () => {
        TestRunner.assert.equal(ALL_BADGES.length, 4, 'Should have 4 badges defined');

        const firstBadge = ALL_BADGES[0];
        TestRunner.assert.equal(firstBadge.id, 1, 'First badge should have ID 1');
        TestRunner.assert.equal(firstBadge.name, 'First Practice', 'First badge should have correct name');
        TestRunner.assert.hasProperty(firstBadge, 'check', 'Badge should have check function');
    });

    TestRunner.it('should check first practice badge', () => {
        const practices = [];
        TestRunner.assert.equal(ALL_BADGES[0].check(practices), false, 'Should not earn first practice badge with no practices');

        practices.push({ id: 1, notes: 'Test practice' });
        TestRunner.assert.equal(ALL_BADGES[0].check(practices), true, 'Should earn first practice badge with 1 practice');
    });

    TestRunner.it('should check practice count badges', () => {
        let practices = [];
        TestRunner.assert.equal(ALL_BADGES[1].check(practices), false, 'Should not earn 10 practices badge with 0 practices');

        // Add 9 practices
        for (let i = 0; i < 9; i++) {
            practices.push({ id: i, notes: `Practice ${i}` });
        }
        TestRunner.assert.equal(ALL_BADGES[1].check(practices), false, 'Should not earn 10 practices badge with 9 practices');

        // Add 10th practice
        practices.push({ id: 10, notes: 'Practice 10' });
        TestRunner.assert.equal(ALL_BADGES[1].check(practices), true, 'Should earn 10 practices badge with 10 practices');

        // Add 49 more for 50 total
        for (let i = 11; i <= 50; i++) {
            practices.push({ id: i, notes: `Practice ${i}` });
        }
        TestRunner.assert.equal(ALL_BADGES[2].check(practices), true, 'Should earn 50 practices badge with 50 practices');
    });

    TestRunner.it('should check intensity badge', () => {
        let practices = [];

        // Add practices with low intensity
        for (let i = 0; i < 5; i++) {
            practices.push({ id: i, notes: `Practice ${i}`, intensity: 3 });
        }
        TestRunner.assert.equal(ALL_BADGES[3].check(practices), false, 'Should not earn 4+ rating badge with avg 3');

        // Replace with high intensity
        practices = [];
        for (let i = 0; i < 5; i++) {
            practices.push({ id: i, notes: `Practice ${i}`, intensity: 8 });
        }
        TestRunner.assert.equal(ALL_BADGES[3].check(practices), true, 'Should earn 4+ rating badge with avg 8');
    });

    TestRunner.it('should check badge earning logic', () => {
        const currentProfile = { earnedBadges: [] };
        const practices = [{ id: 1, notes: 'First practice' }];

        const updatedProfile = checkBadges(practices, currentProfile);

        TestRunner.assert.truthy(updatedProfile, 'Should return updated profile');
        TestRunner.assert.equal(updatedProfile.earnedBadges.length, 1, 'Should have earned 1 badge');
        TestRunner.assert.equal(updatedProfile.earnedBadges[0].id, 1, 'Should have earned first practice badge');
        TestRunner.assert.hasProperty(updatedProfile.earnedBadges[0], 'earnedDate', 'Badge should have earned date');
        TestRunner.assert.equal(updatedProfile.earnedBadges[0].practiceNumber, 1, 'Badge should have practice number');
    });

    TestRunner.it('should not earn already earned badges', () => {
        const currentProfile = {
            earnedBadges: [{ id: 1, earnedDate: '2025-01-01', practiceNumber: 1 }]
        };
        const practices = [{ id: 1, notes: 'First practice' }, { id: 2, notes: 'Second practice' }];

        const updatedProfile = checkBadges(practices, currentProfile);

        TestRunner.assert.falsy(updatedProfile, 'Should not return updated profile for already earned badge');
    });

});

TestRunner.describe('Journey Phases', () => {

    TestRunner.it('should have correct phase definitions', () => {
        TestRunner.assert.equal(PHASES.length, 3, 'Should have 3 phases defined');

        TestRunner.assert.equal(PHASES[0].name, 'The Baseline', 'First phase should be Baseline');
        TestRunner.assert.equal(PHASES[0].goal, 10, 'First phase goal should be 10');
        TestRunner.assert.equal(PHASES[1].name, 'The Grind', 'Second phase should be Grind');
        TestRunner.assert.equal(PHASES[1].goal, 50, 'Second phase goal should be 50');
        TestRunner.assert.equal(PHASES[2].name, 'The Competitor', 'Third phase should be Competitor');
        TestRunner.assert.equal(PHASES[2].goal, 100, 'Third phase goal should be 100');
    });

    TestRunner.it('should calculate current phase correctly', () => {
        let result = getPhase(0);
        TestRunner.assert.equal(result.current.name, 'The Baseline', '0 practices should be Baseline phase');
        TestRunner.assert.equal(result.next.name, 'The Baseline', 'Next should be Baseline for 0 practices');
        TestRunner.assert.equal(result.progress, 0, 'Progress should be 0 for 0 practices');

        result = getPhase(5);
        TestRunner.assert.equal(result.current.name, 'The Baseline', '5 practices should be Baseline phase');
        TestRunner.assert.equal(result.next.name, 'The Baseline', 'Next should be Baseline for 5 practices');
        TestRunner.assert.equal(result.progress, 50, 'Progress should be 50 for 5/10 practices');

        result = getPhase(10);
        TestRunner.assert.equal(result.current.name, 'The Baseline', '10 practices should be Baseline phase');
        TestRunner.assert.equal(result.next.name, 'The Grind', 'Next should be Grind for 10 practices');
        TestRunner.assert.equal(result.progress, 100, 'Progress should be 100 for 10/10 practices');

        result = getPhase(25);
        TestRunner.assert.equal(result.current.name, 'The Grind', '25 practices should be Grind phase');
        TestRunner.assert.equal(result.next.name, 'The Grind', 'Next should be Grind for 25 practices');
        TestRunner.assert.equal(result.progress, 30, 'Progress should be 30 for 25/50 practices');

        result = getPhase(100);
        TestRunner.assert.equal(result.current.name, 'The Competitor', '100 practices should be Competitor phase');
        TestRunner.assert.falsy(result.next, 'Should have no next phase at 100 practices');
        TestRunner.assert.equal(result.progress, 100, 'Progress should be 100 for completed journey');
    });

    TestRunner.it('should handle edge cases', () => {
        let result = getPhase(-1);
        TestRunner.assert.equal(result.current.name, 'The Baseline', 'Negative practices should default to Baseline');

        result = getPhase(1000);
        TestRunner.assert.equal(result.current.name, 'The Competitor', 'High practice count should be Competitor');
        TestRunner.assert.equal(result.progress, 100, 'Progress should cap at 100');
    });

});