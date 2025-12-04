# Import Backup (Wrestle PWA)

This guide explains how to import a JSON backup file exported from the previous Wrestling Journey app.

Quick steps

1. Open the app and sign-in (anonymous sign-in if enabled).
2. Open the Dashboard (Home).
3. Click `Import Backup` and select your JSON file (e.g. `wrestling_journey_backup-2025-12-02T04-00-10.591Z.json`).
4. The app will parse the file and import each practice into your account, deduplicating by the original `id` where possible.
5. Success/skip counts are shown as a toast and the sync indicator updates automatically. If offline, records are queued and synced when you go online.

Notes

- The importer expects a JSON structure containing a `practices` array as in the example backup file.
- Each imported practice is saved under the Firestore path `users/{uid}/logs` with `ownerId` and a `legacyId` field (where present) so duplicates are detected.
- If you are not signed-in, please sign-in before importing to ensure the data is saved under your account.

If you want a migration script to move a top-level `logs` collection to the new `users/{uid}/logs` per-user subcollections, ask me and I can add a migration script that runs with your Firebase Admin credentials.
