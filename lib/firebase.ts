
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Robust Environment Variable Loader
const getEnv = (key: string) => {
  // 1. Process Env (Standard)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // 2. Vite / Metadata Env
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env[key]) return import.meta.env[key];
    // @ts-ignore
    if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    // @ts-ignore
    if (import.meta.env[`REACT_APP_${key}`]) return import.meta.env[`REACT_APP_${key}`];
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

let app;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let isFirebaseReady = false;

try {
  // Only attempt initialization if we have an API Key
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined') {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      isFirebaseReady = true;
      console.log("Firebase initialized successfully.");
  } else {
      console.warn("Firebase configuration missing. App entering Dev/Offline Mode.");
  }
} catch (error) {
  console.warn("Firebase initialization failed. App entering Dev/Offline Mode.", error);
}

export { auth, db, storage, isFirebaseReady };
