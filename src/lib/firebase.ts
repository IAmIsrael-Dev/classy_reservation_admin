import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDtpbLxOG487GanuXEJKbifebGoANNIuas",
  authDomain: "classyreserveai.firebaseapp.com",
  projectId: "classyreserveai",
  storageBucket: "classyreserveai.firebasestorage.app",
  messagingSenderId: "798527729998",
  appId: "1:798527729998:web:f7bc705c4000f9134c6e1f",
  measurementId: "G-QY70QN5G2W"
};

// Suppress noisy Firestore WebChannel transport errors
// These are typically connection errors that Firestore handles automatically
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: unknown[]) => {
  const message = args.join(' ');
  // Filter out noisy Firestore transport errors
  if (
    message.includes('@firebase/firestore') && 
    (message.includes('WebChannelConnection') || 
     message.includes('transport errored') ||
     message.includes('RPC') ||
     message.includes('stream') ||
     message.includes('Failed to obtain primary lease') ||
     message.includes('Backfill Indexes'))
  ) {
    return; // Silently ignore these
  }
  originalConsoleError.apply(console, args as Parameters<typeof console.error>);
};

console.warn = (...args: unknown[]) => {
  const message = args.join(' ');
  // Filter out noisy Firestore transport errors
  if (
    message.includes('@firebase/firestore') && 
    (message.includes('WebChannelConnection') || 
     message.includes('transport errored') ||
     message.includes('RPC') ||
     message.includes('stream') ||
     message.includes('Failed to obtain primary lease') ||
     message.includes('Backfill Indexes'))
  ) {
    return; // Silently ignore these
  }
  originalConsoleWarn.apply(console, args as Parameters<typeof console.warn>);
};

// Initialize Firebase (avoid multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with modern cache settings
// This replaces the deprecated enableMultiTabIndexedDbPersistence
const db = getFirestore(app);

// Note: If you need to configure cache settings, you can do so during getFirestore initialization:
// const db = getFirestore(app, {
//   localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
// });
// However, this requires initializing before any other Firestore operations.

const auth = getAuth(app);

export { app, db, auth };