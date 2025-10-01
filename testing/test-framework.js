// Simple vanilla JS testing framework for browser-based testing
// No external dependencies - runs entirely in the browser

class TestRunner {
    static testGroups = [];
    static currentGroup = null;

    static describe(name, fn) {
        this.currentGroup = { name, tests: [], passed: 0, failed: 0 };
        this.testGroups.push(this.currentGroup);
        fn();
        this.currentGroup = null;
    }

    static it(name, fn) {
        if (!this.currentGroup) {
            throw new Error('it() must be called inside describe()');
        }

        this.currentGroup.tests.push({
            name,
            fn,
            status: 'pending',
            error: null
        });
    }

    static async runAll() {
        for (const group of this.testGroups) {
            await this.runGroup(group);
        }
        return this.testGroups;
    }

    static async runGroup(group) {
        console.log(`Running test group: ${group.name}`);

        for (const test of group.tests) {
            try {
                await test.fn();
                test.status = 'pass';
                group.passed++;
                console.log(`✓ ${test.name}`);
            } catch (error) {
                test.status = 'fail';
                test.error = error.message;
                group.failed++;
                console.error(`✗ ${test.name}: ${error.message}`);
            }
        }
    }

    // Assertion helpers
    static assert = {
        equal: (actual, expected, message = '') => {
            if (actual !== expected) {
                throw new Error(`${message} Expected ${expected}, but got ${actual}`);
            }
        },

        notEqual: (actual, expected, message = '') => {
            if (actual === expected) {
                throw new Error(`${message} Expected ${actual} to not equal ${expected}`);
            }
        },

        truthy: (value, message = '') => {
            if (!value) {
                throw new Error(`${message} Expected truthy value, but got ${value}`);
            }
        },

        falsy: (value, message = '') => {
            if (value) {
                throw new Error(`${message} Expected falsy value, but got ${value}`);
            }
        },

        throws: (fn, message = '') => {
            try {
                fn();
                throw new Error(`${message} Expected function to throw, but it didn't`);
            } catch (error) {
                if (error.message.includes('Expected function to throw')) {
                    throw error;
                }
                // Expected throw occurred
            }
        },

        greaterThan: (actual, expected, message = '') => {
            if (!(actual > expected)) {
                throw new Error(`${message} Expected ${actual} to be greater than ${expected}`);
            }
        },

        includes: (array, item, message = '') => {
            if (!array.includes(item)) {
                throw new Error(`${message} Expected array to include ${item}`);
            }
        },

        hasProperty: (obj, prop, message = '') => {
            if (!(prop in obj)) {
                throw new Error(`${message} Expected object to have property ${prop}`);
            }
        }
    };

    // Async helpers
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async nextTick() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }
}

// Make TestRunner globally available
window.TestRunner = TestRunner;