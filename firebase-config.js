// ══════════════════════════════════════════════════
//  firebase-config.js
//  Fill in YOUR Firebase project credentials here.
//
//  HOW TO GET THESE:
//  1. Go to https://console.firebase.google.com
//  2. Create a new project (e.g. "our-little-journal")
//  3. Click the </> Web icon to add a web app
//  4. Copy the firebaseConfig object and paste below
//  5. In Firebase console → Realtime Database → Create database (test mode)
//  6. In Firebase console → Storage → Get started (test mode)
// ══════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyAC0HKyxeVtMJyDrRD80sJ5daxB9Wki034",
  authDomain:        "journal-3ab2e.firebaseapp.com",
  databaseURL:       "https://journal-3ab2e-default-rtdb.firebaseio.com",
  projectId:         "journal-3ab2e",
  storageBucket:     "journal-3ab2e.firebasestorage.app",
  messagingSenderId: "730082324401",
  appId:             "1:730082324401:web:bc4e1efd11d73fd064d790"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();
// No Storage needed — photos are stored as base64 in the Realtime Database!
