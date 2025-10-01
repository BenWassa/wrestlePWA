# Wrestling PWA Testing Harness

A lightweight, browser-based testing framework for the Wrestling Journey PWA. All tests run entirely in the browser with no external dependencies.

## Tech Stack Compliance ✅
- ✅ **Vanilla JavaScript** - No frameworks, libraries, or build tools
- ✅ **Browser APIs Only** - Uses standard web APIs (DOM, Fetch, etc.)
- ✅ **No Node.js** - Everything runs client-side
- ✅ **No npm** - Zero package dependencies

## Test Structure

```
testing/
├── test-runner.html      # Main test interface
├── test-framework.js     # Simple testing framework
└── tests/
    ├── db-tests.js       # IndexedDB operations
    ├── pwa-tests.js      # PWA functionality
    ├── form-tests.js     # Form validation & UI
    └── badge-tests.js    # Badge system & journey logic
```

## How to Run Tests

1. **Open in Browser**: Navigate to `testing/test-runner.html` in your browser
2. **Allow Permissions**: Grant IndexedDB permissions when prompted
3. **Click "Run All Tests"**: Tests will execute automatically
4. **Review Results**: See pass/fail status and detailed error messages

## Test Categories

### Database Tests (`db-tests.js`)
- Database initialization
- CRUD operations (Create, Read, Update, Delete)
- Profile management
- Data persistence
- Bulk operations

### PWA Tests (`pwa-tests.js`)
- Service Worker support
- IndexedDB availability
- Manifest loading
- Asset loading (CSS, JS, icons)
- Web App Manifest validation

### Form Tests (`form-tests.js`)
- Form element presence and types
- Input validation and constraints
- Preset button functionality
- Slider value updates
- Form submission handling

### Badge Tests (`badge-tests.js`)
- Badge earning logic
- Journey phase calculations
- Progress tracking
- Achievement conditions

## Test Framework Features

- **Async Support**: Handles promises and async/await
- **Assertion Library**: Common assertions (equal, truthy, includes, etc.)
- **Visual Results**: Color-coded pass/fail with progress bar
- **Console Logging**: Detailed output in browser console
- **Error Reporting**: Clear error messages for failed tests

## Writing New Tests

```javascript
TestRunner.describe('My Feature', () => {
    TestRunner.it('should do something', async () => {
        // Test code here
        TestRunner.assert.equal(actual, expected, 'Optional message');
    });
});
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (IndexedDB may require user interaction)
- **Mobile Browsers**: Supported with touch interfaces

## Test Data Management

Tests automatically clean up after themselves to ensure isolation:
- Database is cleared between test runs
- No persistent test data remains
- Safe to run multiple times

## Troubleshooting

**Tests not running?**
- Ensure you're opening `test-runner.html` directly in the browser
- Check browser console for JavaScript errors
- Grant IndexedDB permissions when prompted

**Database errors?**
- Some browsers require user interaction to enable IndexedDB
- Try refreshing the page and re-running tests

**Form tests failing?**
- Form elements are mocked in the test runner
- Ensure the test runner HTML hasn't been modified

## Integration with Main App

The testing harness is completely separate from the main PWA:
- Tests run in isolation
- No interference with user data
- Can be safely deleted after development
- Uses same database functions as main app