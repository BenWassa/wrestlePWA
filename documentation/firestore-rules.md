# Firestore Security Rules (Recommended)

When using Firestore with the Wrestle PWA, store session logs under the per-user subcollection `users/{uid}/logs` to simplify rules and avoid composite indexes. Below is a recommended minimal ruleset that ensures users can only access their own logs.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/logs/{logId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Add other rules or application collections below, e.g. public data that doesn't require authentication
  }
}
```

Notes:
- These rules assume your app uses Firebase Auth and the user's UID is the same as the `userId` path parameter.
- Using per-user subcollections removes the need for `where('ownerId', '==', uid)` queries and minimizes index requirements.
- For other collections, add rules with least privilege and test using the Firebase emulator before deploying to production.
