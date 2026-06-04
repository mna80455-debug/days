import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let auth;
let db;
let googleProvider;
let isMock = false;

// Check if we have at least apiKey and projectId to use actual Firebase
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'YOUR_API_KEY';
const isForceMock = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('days_force_mock') === 'true';

if (hasValidConfig && !isForceMock) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    console.log('Firebase initialized successfully.');
  } catch (error) {
    console.error('Firebase initialization failed, falling back to mock mode:', error);
    isMock = true;
  }
} else {
  console.warn(isForceMock ? 'Mock Mode forced by user session.' : 'Firebase configuration missing in .env. Falling back to Mock Mode for preview.');
  isMock = true;
}

// Simple Mock Firebase implementation for local preview
if (isMock) {
  // We'll export mock functions and objects that match the Firebase interface
  // to avoid crashes and enable instant testing of the app.
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
      const storedUser = localStorage.getItem('days_mock_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      auth.currentUser = user;
      
      const handleStorageChange = (e) => {
        if (e.key === 'days_mock_user') {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null;
          auth.currentUser = newUser;
          callback(newUser);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Delay callback to simulate async check
      const timer = setTimeout(() => callback(user), 300);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('storage', handleStorageChange);
      };
    },
    signOut: () => {
      localStorage.removeItem('days_mock_user');
      auth.currentUser = null;
      // Trigger storage event manually for same-tab updates
      window.dispatchEvent(new Event('storage'));
      return Promise.resolve();
    }
  };
  
  googleProvider = {
    customProvider: true
  };
  
  db = {
    // Simple custom store mock
    collection: (path) => ({
      doc: (id) => ({
        set: (data) => {
          localStorage.setItem(`db_${path}_${id}`, JSON.stringify(data));
          return Promise.resolve();
        },
        get: () => {
          const item = localStorage.getItem(`db_${path}_${id}`);
          return Promise.resolve({
            exists: () => !!item,
            data: () => (item ? JSON.parse(item) : null)
          });
        }
      })
    })
  };
}

export { app, auth, db, googleProvider, isMock };
