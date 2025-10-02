# Installing Wrestle Journey PWA on Google Pixel 8

This guide walks you through installing the Wrestling Journey Progressive Web App (PWA) on a Google Pixel 8 running Android 14 or later.

## Prerequisites

- A secure (HTTPS) deployment of the app. GitHub Pages or any HTTPS-enabled static host works well.
- Chrome 121+ or Edge 121+ for Android (Pixel 8 ships with Chrome by default).
- A stable internet connection the first time you load the app so that the service worker can cache assets for offline use.

## Install Steps

1. **Open the site in Chrome.**
   - Navigate to your deployed URL (for example, `https://<your-user>.github.io/wrestlePWA/`).
   - Allow the page to fully load. You should see the standalone experience once the IndexedDB data initializes.
2. **Verify install readiness.**
   - Tap the three-dot overflow menu in Chrome.
   - Look for the `Install app` option (it may appear as `Add to Home screen` on some builds).
   - If you do not see the option, refresh once more to allow the service worker to finish caching.
3. **Install the app.**
   - Tap `Install app`.
   - Confirm the install dialog by tapping `Install`.
4. **Launch from the home screen.**
   - Chrome will add a new icon named **Wrestling**.
   - Open it to experience the app in standalone mode with its custom splash screen and theming.

## Managing the PWA

- **Uninstall:** Long-press the icon on your home screen and drag it to `Uninstall`.
- **Clear saved data:** Open the app, tap the overflow menu (`⋮`) inside Chrome's top bar, choose `App info`, then `Storage & cache` → `Clear storage`. This removes all cached data and wrestling logs stored in IndexedDB.
- **Update:** Revisit the deployed site while online. The updated service worker automatically refreshes cached files in the background and will activate on the next launch.

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| `Install app` option missing | Confirm the site is served over HTTPS and reload once to let the service worker register. |
| Old icon or content appears | Force-close the app and relaunch, or clear the app storage from Android settings to remove stale caches. |
| Offline mode not working | Ensure you opened the site at least once while connected; the service worker pre-caches the shell during the first visit. |

Following these steps ensures the Wrestle Journey PWA behaves like a native application on your Pixel 8, including offline support and a full-screen experience.
