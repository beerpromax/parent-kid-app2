import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

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
const db = getFirestore(app);

// Use emulator if VITE_USE_FIREBASE_EMULATOR is 'true' or if we don't have api keys (standalone run)
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' || !import.meta.env.VITE_FIREBASE_API_KEY;

if (useEmulator) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to local Firestore emulator (localhost:8080)');
  } catch (err) {
    console.warn('Firestore emulator already connected or failed:', err);
  }
}

export { db };
