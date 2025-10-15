# wrestlePWA

A free, offline-first Progressive Web App (PWA) for wrestlers to log practices, track progress, earn badges, and generate motivational AI prompts. Built with pure HTML/CSS/JS, IndexedDB storage, and service workers. No accounts, no costs, just honest support for your training journey.

## Features

- **Offline-First**: Works without internet connection using service workers and IndexedDB.
- **Practice Logging**: Record and track wrestling practices.
- **Progress Tracking**: Monitor improvements over time.
- **Badge System**: Earn badges for milestones.
- **AI Prompts**: Generate motivational prompts for training.
- **Minimal Dependencies**: Pure web technologies, no frameworks.

## Backup & Versioning Quick Reference

- **Smart Backups**: Choose a folder once and the app writes debounced snapshots after data changes.
  - Uses the File System Access API with permission validation and hashed payloads to avoid redundant writes.
  - Maintains a rotating set of daily JSON files plus a `latest` snapshot; limits are configurable in the UI.
  - Stores handles securely in IndexedDB and surfaces status, errors, and manual backup controls in Settings.
- **Version Awareness**: `manifest.json`, the service worker, and the UI all read from a single `version` string.
  - The service worker checks for updates in the background and shows an in-app banner prompting users to refresh.
  - A persistent version badge appears in Settings so you know what build is running after an update.

## Best Practices for Minimal PWA

This PWA follows best practices for minimal, personal-use applications:

### Manifest and Installation
- Ensure `manifest.json` includes:
  - App name, short name, and description.
  - Icons in multiple sizes (192x192, 512x512).
  - Theme and background colors.
  - Start URL and display mode ("standalone").
- Test installation on supported browsers (Chrome, Edge, Safari).

### Service Worker
- Cache essential resources (HTML, CSS, JS, icons) for offline access.
- Use a simple caching strategy: cache on install, serve from cache first.
- Handle fetch events to provide offline fallbacks.
- Update cache versions to force refresh on updates.

### Performance
- Minimize file sizes: Compress images, minify CSS/JS if possible.
- Load resources efficiently: Use async/defer for scripts.
- Optimize for mobile: Responsive design, touch-friendly UI.
- Keep IndexedDB operations lightweight to avoid blocking the UI.

### Security
- Serve over HTTPS in production (use local server for development).
- Avoid inline scripts/styles; use external files.
- Sanitize user inputs to prevent XSS.

### Accessibility
- Use semantic HTML elements.
- Provide alt text for images.
- Ensure keyboard navigation works.
- Maintain sufficient color contrast.

### Development
- Test on multiple devices and browsers.
- Use browser dev tools for PWA auditing (Lighthouse).
- Validate manifest and service worker functionality.
- Keep code modular and commented for personal maintenance.

## Installation

1. Clone the repository.
2. Open `index.html` in a modern browser.
3. Add to home screen for PWA installation.

## Usage

- Log practices by entering details in the app.
- View progress charts and earned badges.
- Generate AI prompts for motivation.

## Development

- Edit HTML/CSS/JS files directly.
- Test service worker by going offline in dev tools.
- Use IndexedDB dev tools to inspect stored data.

## License

Personal use only.
