# Wrestling Journey - Deployment Guide

## Files You Need

1. **index.html** - Main app file
2. **manifest.json** - PWA configuration
3. **service-worker.js** - Offline functionality
4. **icon.svg** - App icon (SVG, recommended)
5. **icon-192.png** - App icon fallback (optional but recommended)
6. **icon-512.png** - App icon fallback (optional but recommended)

## Step-by-Step Deployment

### 1. Create the Icons

**Option A: Use Your Own SVG (Recommended)**
1. Create/export your SVG icon from Figma, Illustrator, etc.
2. Name it `icon.svg`
3. Make sure it has `viewBox="0 0 512 512"` for consistent sizing
4. Use dark background (#0a0a0a) and high contrast colors
5. Optionally create PNG versions as fallbacks (see Option B)

**Option B: Use the Icon Generator**
1. Open the "Icon Generator" artifact in a browser
2. Click "Download 192x192" - save as `icon-192.png`
3. Click "Download 512x512" - save as `icon-512.png`
4. Use the sample `icon.svg` from artifacts or create your own

**Icon Guidelines:**
- SVG works on all modern devices and scales perfectly
- Keep designs simple - they'll be displayed at 48-72px typically
- High contrast (orange #ea580c on dark #0a0a0a works well)
- PNG fallbacks help with older Android devices

### 2. Prepare index.html

1. Copy the "index.html (for GitHub Pages)" artifact
2. Open the "Wrestling Journey PWA" artifact
3. Copy ALL the React code (everything from `import React...` to `export default App;`)
4. In index.html, find the comment `// Paste the entire React component code here`
5. Replace that comment with the React code you copied
6. Save as `index.html`

### 3. Create GitHub Repository

1. Go to https://github.com
2. Click "New repository"
3. Name it: `wrestling-journey` (or whatever you want)
4. Make it **Public**
5. Do NOT initialize with README
6. Click "Create repository"

### 4. Upload Files

**Required Files:**
- index.html
- manifest.json
- service-worker.js
- icon.svg (your custom SVG icon)

**Optional but Recommended:**
- icon-192.png (fallback)
- icon-512.png (fallback)

**Option A: Via GitHub Web Interface (Easiest)**
1. Click "uploading an existing file"
2. Drag and drop all files (minimum 4, recommended 6)
3. Commit the files

**Option B: Via Git Command Line**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/wrestling-journey.git
git push -u origin main
```

### 5. Enable GitHub Pages

1. In your repo, click "Settings"
2. Click "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Select branch: **main**
5. Select folder: **/ (root)**
6. Click "Save"
7. Wait 1-2 minutes for deployment

### 6. Access Your App

Your app will be live at:
```
https://YOUR-USERNAME.github.io/wrestling-journey/
```

### 7. Install on Your Pixel 8

1. Open Chrome on your Pixel 8
2. Navigate to your GitHub Pages URL
3. Tap the three dots menu (⋮)
4. Tap "Add to Home screen"
5. Name it "Wrestling Journey"
6. Tap "Add"
7. The app icon will appear on your home screen

### 8. Test Offline Mode

1. Open the app
2. Use it once (log a practice, etc.)
3. Turn on Airplane mode
4. Close and reopen the app
5. It should work offline! ✨

## Troubleshooting

### Icons not showing?
- Make sure icon.svg is in the root directory
- If using PNGs, check they're named exactly `icon-192.png` and `icon-512.png`
- Verify manifest.json references the correct icon filenames
- Clear browser cache and reinstall PWA

### SVG icon not displaying on Android?
- Include PNG fallbacks (icon-192.png and icon-512.png)
- Some older Android versions prefer PNG for home screen icons
- The browser will automatically choose the best format

### App not working?
- Open browser DevTools (F12)
- Check Console for errors
- Make sure React code was pasted correctly in index.html

### Not installing as PWA?
- HTTPS is required (GitHub Pages provides this automatically)
- Make sure manifest.json is in the root directory
- Check that manifest.json path in index.html is correct

### Service Worker not registering?
- Check browser console for errors
- Make sure service-worker.js is in root directory
- Clear browser cache and try again

## Updating the App

To update after making changes:

1. Edit the files locally
2. Commit and push to GitHub:
```bash
git add .
git commit -m "Update: description of changes"
git push
```
3. Wait 1-2 minutes for GitHub Pages to rebuild
4. On your phone: Clear cache or uninstall/reinstall PWA for major updates
5. For minor updates, the service worker will update automatically on next visit

## File Structure

```
wrestling-journey/
├── index.html           (Main app)
├── manifest.json        (PWA config)
├── service-worker.js    (Offline mode)
├── icon.svg            (Your custom SVG icon - required)
├── icon-192.png        (Optional PNG fallback)
└── icon-512.png        (Optional PNG fallback)
```

## Notes

- **FREE**: GitHub Pages is free forever for public repos
- **HTTPS**: Automatic, no configuration needed
- **Storage**: Everything is stored locally on your device via IndexedDB
- **Privacy**: No server, no database, no tracking, no analytics
- **Backup**: Use "Export Data" regularly to save your progress
- **Icons**: SVG is preferred for sharpness, PNGs as fallback for compatibility

## Next Steps

Once deployed:
1. Log your first practice
2. Generate your first AI story
3. Earn your first badge
4. Start your journey! 💪

---

**Need help?** Check GitHub Issues or revisit the Truth Document for scope.
