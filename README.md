# MatMind 🤼‍♂️

**MatMind** is an offline-first, Progressive Web App (PWA) designed for wrestlers to track training volume, intensity, and technique. It features a robust gamification system, consistency heatmaps, and analytics to visualize progress over seasons.

Built with **Vanilla JavaScript (ES Modules)**, **Tailwind CSS**, and **Firebase (v11)**. No build step required.

## 🌟 Key Features

### 📊 Dashboard & Analytics

  * **Rank System:** Gamified progression based on total mat hours (From "Fresh Fish" to "Dan Gable").
  * **Consistency Heatmap:** A GitHub-style, 30-day visualization of training frequency.
  * **Charts:** Volume vs. Intensity analysis and Session Type distribution (Live, Drilling, Cardio, Practice) using Chart.js.
  * **Mat IQ:** A calculated score based on volume multiplied by intensity.

### 📝 Training Log

  * **Detailed Entry:** Log duration, intensity (RPE 1-10), session type, and technical notes.
  * **Journal View:** Scrollable history of all past sessions with expanding notes.
  * **Search/Filter:** Filter analytics by time range (7, 30, 90, 365 days).

### ⚡ PWA & Offline-First Architecture

  * **Offline Support:** Fully functional without an internet connection.
  * **Sync Queue:** Writes made while offline are stored in `localStorage` and automatically synced to Firestore when connectivity is restored.
  * **Installable:** Manifest included for installation on iOS (Add to Home Screen) and Android.

-----

## 🛠 Tech Stack

  * **Frontend:** HTML5, JavaScript (ES6 Modules).
  * **Styling:** Tailwind CSS (via CDN).
  * **Database & Auth:** Firebase Firestore & Firebase Auth (v11 Modular SDK).
  * **Visualization:** Chart.js, Lucide Icons.
  * **Architecture:** Service Worker for asset caching; LocalStorage for offline data queuing.

-----

## 🚀 Quick Start

Because this project uses ES Modules and CDNs, **no build process (npm install/build)** is required. However, due to CORS policies with ES modules, you must serve it via a local server.

### 1\. Clone the Repository

```bash
git clone https://github.com/yourusername/matmind.git
cd matmind
```

### 2\. Run Locally

You can use Python or an extension like VS Code's "Live Server".

**Using Python:**

```bash
# Python 3
python -m http.server 8000
```

**Using Node (http-server):**

```bash
npx http-server .
```

### 3\. Access

Open your browser to `http://localhost:8000` (or the port specified by your server).

-----

## ☁️ Firebase Configuration

The application is set up to use Firebase for cloud storage. To connect your own backend:

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  **Enable Authentication:** Turn on "Anonymous" sign-in provider.
4.  **Enable Firestore:** Create a database in production mode.
5.  **Copy Config:**
      * Open `js/firebase.js`.
      * Replace the `firebaseConfig` object with your project's credentials.

<!-- end list -->

```javascript
// js/firebase.js
firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

*(Note: The repository contains a fallback demo config, but it is recommended to use your own for data persistence).*

-----

## 📂 Project Structure

```text
/
├── index.html          # Main application entry point (Single Page App structure)
├── style.css           # Custom CSS overrides and animations
├── manifest.json       # PWA configuration
├── service-worker.js   # Caching strategies for offline asset support
├── js/
│   ├── app.js          # App initialization and auth logic
│   ├── firebase.js     # Firebase SDK imports and configuration
│   ├── storage.js      # Data logic: Firestore interactions + Offline Queue
│   └── ui.js           # DOM manipulation, rendering, and Chart.js logic
└── assets/             # Icons and images
```

-----

## 🏆 Ranking System

MatMind gamifies the grind. Ranks are unlocked automatically as you log hours.

| Rank | Hours Required | Description |
| :--- | :--- | :--- |
| **Fresh Fish** | 0 | Step on the mat. Don't get pinned. |
| **Mat Rat** | 25 | Addicted to the grind. |
| **JV Warrior** | 50 | Learning the moves. Building the chin. |
| **Drill Partner** | 100 | Technique is clicking. Reliable. |
| **Varsity Starter** | 200 | You made the lineup. Now score points. |
| **Team Captain** | 350 | Leading the warmup. Setting the pace. |
| **Sectional Champ** | 500 | Top of the area. Eye on the state tourney. |
| **State Qualifier** | 750 | One of the best. Punch your ticket. |
| **State Placer** | 1000 | Standing on the podium. Work paid off. |
| **State Champ** | 1500 | Number one. The bracket is yours. |
| **All-American** | 2500 | National elite. Best of the best. |
| **Olympian** | 5000 | World class discipline. |
| **Dan Gable** | 10000 | Mythical status. You live on the mat. |

-----

## 💾 Offline & Sync Logic

1.  **Detection:** The app checks `navigator.onLine` and attempts to ping Google's `generate_204` endpoint to verify actual connectivity.
2.  **Writing:**
      * **Online:** Data is sent directly to Firestore (`users/{uid}/logs`).
      * **Offline:** Data is saved to `localStorage` under key `wrestle-queue`.
3.  **Syncing:**
      * When the app loads or regains connection, `syncQueuedWrites()` iterates through the local queue and pushes them to Firestore.
      * The UI displays a sync indicator (Amber dot) if items are waiting to upload.

-----

## 📄 License

This project is open-source. Feel free to fork and modify for your own training needs.