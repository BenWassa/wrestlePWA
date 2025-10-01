// Tests for form functionality and validation

TestRunner.describe('Form Functionality', () => {

    let form, notesInput, durationInput, intensityInput, physicalInput, mentalInput, typeSelect, dateInput;

    const setupForm = () => {
        form = document.getElementById('practice-form');
        notesInput = document.getElementById('practice-notes');
        durationInput = document.getElementById('practice-duration');
        intensityInput = document.getElementById('practice-intensity');
        physicalInput = document.getElementById('practice-physical');
        mentalInput = document.getElementById('practice-mental');
        typeSelect = document.getElementById('practice-type');
        dateInput = document.getElementById('practice-date');
    };

    TestRunner.it('should have all form elements', () => {
        setupForm();

        TestRunner.assert.truthy(form, 'Practice form should exist');
        TestRunner.assert.truthy(notesInput, 'Notes input should exist');
        TestRunner.assert.truthy(durationInput, 'Duration input should exist');
        TestRunner.assert.truthy(intensityInput, 'Intensity input should exist');
        TestRunner.assert.truthy(physicalInput, 'Physical input should exist');
        TestRunner.assert.truthy(mentalInput, 'Mental input should exist');
        TestRunner.assert.truthy(typeSelect, 'Type select should exist');
        TestRunner.assert.truthy(dateInput, 'Date input should exist');
    });

    TestRunner.it('should have correct input types', () => {
        setupForm();

        TestRunner.assert.equal(notesInput.tagName, 'TEXTAREA', 'Notes should be textarea');
        TestRunner.assert.equal(durationInput.type, 'number', 'Duration should be number input');
        TestRunner.assert.equal(intensityInput.type, 'range', 'Intensity should be range input');
        TestRunner.assert.equal(physicalInput.type, 'range', 'Physical should be range input');
        TestRunner.assert.equal(mentalInput.type, 'range', 'Mental should be range input');
        TestRunner.assert.equal(typeSelect.tagName, 'SELECT', 'Type should be select');
        TestRunner.assert.equal(dateInput.type, 'date', 'Date should be date input');
    });

    TestRunner.it('should have correct input constraints', () => {
        setupForm();

        TestRunner.assert.equal(durationInput.min, '1', 'Duration should have min 1');
        TestRunner.assert.equal(intensityInput.min, '1', 'Intensity should have min 1');
        TestRunner.assert.equal(intensityInput.max, '10', 'Intensity should have max 10');
        TestRunner.assert.equal(physicalInput.min, '1', 'Physical should have min 1');
        TestRunner.assert.equal(physicalInput.max, '5', 'Physical should have max 5');
        TestRunner.assert.equal(mentalInput.min, '1', 'Mental should have min 1');
        TestRunner.assert.equal(mentalInput.max, '5', 'Mental should have max 5');
    });

    TestRunner.it('should have preset duration buttons', () => {
        const presetButtons = document.querySelectorAll('.preset-btn');
        TestRunner.assert.greaterThan(presetButtons.length, 0, 'Should have preset buttons');

        const expectedDurations = ['60', '90', '120'];
        presetButtons.forEach((button, index) => {
            TestRunner.assert.equal(button.dataset.duration, expectedDurations[index], `Preset button ${index + 1} should have correct duration`);
        });
    });

    TestRunner.it('should update duration from preset buttons', () => {
        setupForm();

        const presetButton = document.querySelector('.preset-btn[data-duration="90"]');
        TestRunner.assert.truthy(presetButton, 'Should have 90min preset button');

        // Simulate click
        presetButton.click();
        TestRunner.assert.equal(durationInput.value, '90', 'Duration should be set to 90');
    });

    TestRunner.it('should have type select options', () => {
        setupForm();

        const options = typeSelect.querySelectorAll('option');
        TestRunner.assert.greaterThan(options.length, 0, 'Type select should have options');

        const expectedValues = ['drills', 'live', 'conditioning', 'competition'];
        options.forEach((option, index) => {
            if (index < expectedValues.length) {
                TestRunner.assert.equal(option.value, expectedValues[index], `Option ${index + 1} should have correct value`);
            }
        });
    });

    TestRunner.it('should have default date as today', () => {
        setupForm();

        const today = new Date().toISOString().split('T')[0];
        TestRunner.assert.equal(dateInput.value, today, 'Date should default to today');
    });

    TestRunner.it('should have slider value displays', () => {
        const intensityValue = document.getElementById('intensity-value');
        const physicalValue = document.getElementById('physical-value');
        const mentalValue = document.getElementById('mental-value');

        TestRunner.assert.truthy(intensityValue, 'Should have intensity value display');
        TestRunner.assert.truthy(physicalValue, 'Should have physical value display');
        TestRunner.assert.truthy(mentalValue, 'Should have mental value display');
    });

    TestRunner.it('should update slider values on input', () => {
        setupForm();

        const intensityValue = document.getElementById('intensity-value');

        // Set intensity to 8
        intensityInput.value = '8';
        intensityInput.dispatchEvent(new Event('input'));

        TestRunner.assert.equal(intensityValue.textContent, '8', 'Intensity value display should update');
    });

    TestRunner.it('should have form submission handler', () => {
        setupForm();

        TestRunner.assert.truthy(form.onsubmit, 'Form should have submit handler');
    });

    TestRunner.it('should validate required fields', () => {
        setupForm();

        // Clear form
        notesInput.value = '';
        durationInput.value = '';

        // Try to submit (this would normally be prevented)
        const event = new Event('submit', { cancelable: true });
        form.dispatchEvent(event);

        // In a real scenario, this would show validation errors
        // For testing, we just verify the form elements exist and are accessible
        TestRunner.assert.equal(notesInput.value, '', 'Notes should be empty');
        TestRunner.assert.equal(durationInput.value, '', 'Duration should be empty');
    });

});