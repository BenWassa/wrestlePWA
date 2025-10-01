// Tests for PWA functionality - Service Worker, Manifest, etc.

TestRunner.describe('PWA Functionality', () => {

    TestRunner.it('should have service worker support', () => {
        TestRunner.assert.truthy('serviceWorker' in navigator, 'Browser should support service workers');
    });

    TestRunner.it('should have IndexedDB support', () => {
        TestRunner.assert.truthy('indexedDB' in window, 'Browser should support IndexedDB');
    });

    TestRunner.it('should have manifest link', () => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        TestRunner.assert.truthy(manifestLink, 'Page should have manifest link');
        TestRunner.assert.equal(manifestLink.getAttribute('href'), 'manifest.json', 'Manifest href should be correct');
    });

    TestRunner.it('should have proper meta tags', () => {
        const viewport = document.querySelector('meta[name="viewport"]');
        const themeColor = document.querySelector('meta[name="theme-color"]');
        const mobileWebAppCapable = document.querySelector('meta[name="mobile-web-app-capable"]');

        TestRunner.assert.truthy(viewport, 'Should have viewport meta tag');
        TestRunner.assert.truthy(themeColor, 'Should have theme-color meta tag');
        TestRunner.assert.equal(themeColor.getAttribute('content'), '#ea580c', 'Theme color should match');
        TestRunner.assert.truthy(mobileWebAppCapable, 'Should have mobile-web-app-capable meta tag');
    });

    TestRunner.it('should have app icon links', () => {
        const iconLink = document.querySelector('link[rel="icon"]');
        const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');

        TestRunner.assert.truthy(iconLink, 'Should have favicon link');
        TestRunner.assert.equal(iconLink.getAttribute('href'), 'icon.svg', 'Icon href should be correct');
        TestRunner.assert.truthy(appleTouchIcon, 'Should have apple-touch-icon');
    });

    TestRunner.it('should load manifest.json', async () => {
        try {
            const response = await fetch('../docs/manifest.json');
            TestRunner.assert.equal(response.status, 200, 'Manifest should load successfully');

            const manifest = await response.json();
            TestRunner.assert.equal(manifest.name, 'Wrestling Journey', 'Manifest name should match');
            TestRunner.assert.equal(manifest.short_name, 'Wrestling', 'Manifest short_name should match');
            TestRunner.assert.equal(manifest.start_url, '/', 'Manifest start_url should be root');
            TestRunner.assert.equal(manifest.display, 'standalone', 'Manifest display should be standalone');
            TestRunner.assert.hasProperty(manifest, 'icons', 'Manifest should have icons');
        } catch (error) {
            throw new Error(`Failed to load manifest: ${error.message}`);
        }
    });

    TestRunner.it('should load service worker', async () => {
        try {
            const response = await fetch('../docs/service-worker.js');
            TestRunner.assert.equal(response.status, 200, 'Service worker should load successfully');

            const content = await response.text();
            TestRunner.assert.includes(content, 'wrestling-journey-v7', 'Service worker should have correct cache name');
            TestRunner.assert.includes(content, 'db.js', 'Service worker should cache db.js');
        } catch (error) {
            throw new Error(`Failed to load service worker: ${error.message}`);
        }
    });

    TestRunner.it('should load CSS file', async () => {
        try {
            const response = await fetch('../docs/style.css');
            TestRunner.assert.equal(response.status, 200, 'CSS should load successfully');

            const content = await response.text();
            TestRunner.assert.greaterThan(content.length, 1000, 'CSS should have substantial content');
            TestRunner.assert.includes(content, ':root', 'CSS should have CSS variables');
        } catch (error) {
            throw new Error(`Failed to load CSS: ${error.message}`);
        }
    });

    TestRunner.it('should load db.js module', async () => {
        try {
            const response = await fetch('../docs/db.js');
            TestRunner.assert.equal(response.status, 200, 'db.js should load successfully');

            const content = await response.text();
            TestRunner.assert.includes(content, 'openDB', 'db.js should export openDB');
            TestRunner.assert.includes(content, 'getPractices', 'db.js should export getPractices');
            TestRunner.assert.includes(content, 'addPractice', 'db.js should export addPractice');
        } catch (error) {
            throw new Error(`Failed to load db.js: ${error.message}`);
        }
    });

});