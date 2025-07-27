import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAAKKJKnagTB6Y518v5y4o7A_LlhRcNSp0",
  authDomain: "goonrides-9d8bd.firebaseapp.com",
  projectId: "goonrides-9d8bd",
  storageBucket: "goonrides-9d8bd.firebasestorage.app",
  messagingSenderId: "1028539241290",
  appId: "1:1028539241290:web:59893e427413ac376667b3",
  measurementId: "G-M1W0KVGSXJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Configure auth settings
auth.useDeviceLanguage();

// Enable test mode for development
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - This is a valid property but TypeScript doesn't know about it
  auth.settings.appVerificationDisabledForTesting = true;
}

// Initialize Analytics lazily only in browser
let analytics: any = null;
if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export { app, auth, analytics }; 