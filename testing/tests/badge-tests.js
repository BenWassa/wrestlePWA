// Tests for badge system and journey logic

TestRunner.describe('Identity Level System', () => {

    TestRunner.it('should have correct identity levels', () => {
        TestRunner.assert.truthy(IDENTITY_LEVELS.length >= 5, 'Should have at least 5 identity levels');
        TestRunner.assert.equal(IDENTITY_LEVELS[0].id, 'amateur', 'First level should be amateur');
        TestRunner.assert.equal(IDENTITY_LEVELS[IDENTITY_LEVELS.length - 1].id, 'veteran', 'Last level should be veteran');
    });

    TestRunner.it('should get current identity level', () => {
        const amateurLevel = getCurrentIdentityLevel(10);
        TestRunner.assert.equal(amateurLevel.id, 'amateur', '10 practices should be amateur level');

        const grinderLevel = getCurrentIdentityLevel(75);
        TestRunner.assert.equal(grinderLevel.id, 'grinder', '75 practices should be grinder level');

        const veteranLevel = getCurrentIdentityLevel(2000);
        TestRunner.assert.equal(veteranLevel.id, 'veteran', '2000 practices should be veteran level');
    });

    TestRunner.it('should calculate identity progress', () => {
        const progress = getIdentityProgress(25);
        TestRunner.assert.equal(progress.currentLevel.id, 'amateur', '25 practices should be in amateur level');
        TestRunner.assert.equal(progress.nextLevel.id, 'grinder', 'Next level should be grinder');
        TestRunner.assert.equal(progress.practicesToNext, 25, 'Should need 25 more practices for grinder');
    });

    TestRunner.it('should handle max level', () => {
        const progress = getIdentityProgress(3000);
        TestRunner.assert.equal(progress.currentLevel.id, 'veteran', '3000 practices should be veteran level');
        TestRunner.assert.falsy(progress.nextLevel, 'Should have no next level at max');
        TestRunner.assert.equal(progress.progressPercent, 100, 'Should show 100% progress');
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