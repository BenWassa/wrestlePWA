// Tests for badge system and journey logic

TestRunner.describe('Badge System', () => {

    TestRunner.it('should have correct badge definitions', () => {
        TestRunner.assert.truthy(ALL_BADGES.length > 30, 'Should have comprehensive badge set (30+ badges)');

        const firstBadge = ALL_BADGES[0];
        TestRunner.assert.equal(firstBadge.id, 'first_practice', 'First badge should have correct string ID');
        TestRunner.assert.equal(firstBadge.name, 'Day One', 'First badge should have correct name');
        TestRunner.assert.hasProperty(firstBadge, 'check', 'Badge should have check function');
        TestRunner.assert.hasProperty(firstBadge, 'description', 'Badge should have description');
        TestRunner.assert.hasProperty(firstBadge, 'icon', 'Badge should have icon');
    });

    TestRunner.it('should check first practice badge', () => {
        const practices = [];
        const stats = { practiceCount: 0, totalMinutes: 0, totalHours: 0, avgRecentIntensity: 0, streaks: { current: 0, longest: 0 }, last7Days: 0, last14Days: 0, last30Days: 0 };
        TestRunner.assert.equal(ALL_BADGES[0].check(stats), false, 'Should not earn first practice badge with no practices');

        stats.practiceCount = 1;
        TestRunner.assert.equal(ALL_BADGES[0].check(stats), true, 'Should earn first practice badge with 1 practice');
    });

    TestRunner.it('should check practice count badges', () => {
        const stats = { practiceCount: 0, totalMinutes: 0, totalHours: 0, avgRecentIntensity: 0, streaks: { current: 0, longest: 0 }, last7Days: 0, last14Days: 0, last30Days: 0 };
        
        // Find 10 practices badge (index 3 in comprehensive set)
        const tenPracticesBadge = ALL_BADGES.find(b => b.id === 'ten_practices');
        TestRunner.assert.truthy(tenPracticesBadge, 'Should find ten_practices badge');
        TestRunner.assert.equal(tenPracticesBadge.check(stats), false, 'Should not earn 10 practices badge with 0 practices');

        stats.practiceCount = 9;
        TestRunner.assert.equal(tenPracticesBadge.check(stats), false, 'Should not earn 10 practices badge with 9 practices');

        stats.practiceCount = 10;
        TestRunner.assert.equal(tenPracticesBadge.check(stats), true, 'Should earn 10 practices badge with 10 practices');

        // Find 50 practices badge
        const fiftyPracticesBadge = ALL_BADGES.find(b => b.id === 'fifty_practices');
        stats.practiceCount = 50;
        TestRunner.assert.equal(fiftyPracticesBadge.check(stats), true, 'Should earn 50 practices badge with 50 practices');
    });

    TestRunner.it('should check intensity badge', () => {
        const stats = { practiceCount: 5, totalMinutes: 0, totalHours: 0, avgRecentIntensity: 3, streaks: { current: 0, longest: 0 }, last7Days: 0, last14Days: 0, last30Days: 0 };

        const intensityBadge = ALL_BADGES.find(b => b.id === 'high_intensity_focus');
        TestRunner.assert.truthy(intensityBadge, 'Should find high_intensity_focus badge');
        TestRunner.assert.equal(intensityBadge.check(stats), false, 'Should not earn 4+ rating badge with avg 3');

        stats.avgRecentIntensity = 8;
        TestRunner.assert.equal(intensityBadge.check(stats), true, 'Should earn 4+ rating badge with avg 8');
    });

    TestRunner.it('should check badge earning logic', () => {
        const currentProfile = { earnedBadges: [] };
        const practices = [{ id: 1, notes: 'First practice', duration: 60, intensity: 5 }];

        const updatedProfile = checkBadges(practices, currentProfile);

        TestRunner.assert.truthy(updatedProfile, 'Should return updated profile');
        TestRunner.assert.equal(updatedProfile.earnedBadges.length, 1, 'Should have earned 1 badge');
        TestRunner.assert.equal(updatedProfile.earnedBadges[0].id, 'first_practice', 'Should have earned first practice badge');
        TestRunner.assert.hasProperty(updatedProfile.earnedBadges[0], 'earnedDate', 'Badge should have earned date');
        TestRunner.assert.equal(updatedProfile.earnedBadges[0].practiceNumber, 1, 'Badge should have practice number');
    });

    TestRunner.it('should not earn already earned badges', () => {
        const currentProfile = {
            earnedBadges: [{ id: 'first_practice', earnedDate: '2025-01-01', practiceNumber: 1 }]
        };
        const practices = [{ id: 1, notes: 'First practice', duration: 60 }, { id: 2, notes: 'Second practice', duration: 60 }];

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