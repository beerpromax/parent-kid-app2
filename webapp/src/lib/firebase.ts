import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "parent-kid-app2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
// ignoreUndefinedProperties: optional fields (durationMinutes, energyTag, …) are
// passed as undefined throughout the repos; the localStorage shim drops them via
// JSON.stringify, and live Firestore must do the same instead of throwing.
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
const storage = getStorage(app);
const auth = getAuth(app);

// Use emulator if VITE_USE_FIREBASE_EMULATOR is 'true' or if we don't have api keys (standalone run)
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' || !import.meta.env.VITE_FIREBASE_API_KEY;

if (useEmulator) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to local Firestore emulator (localhost:8080)');
  } catch (err) {
    console.warn('Firestore emulator already connected or failed:', err);
  }
  try {
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to local Storage emulator (localhost:9199)');
  } catch (err) {
    console.warn('Storage emulator already connected or failed:', err);
  }
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Connected to local Auth emulator (localhost:9099)');
  } catch (err) {
    console.warn('Auth emulator already connected or failed:', err);
  }
}

export { db, storage, auth };
