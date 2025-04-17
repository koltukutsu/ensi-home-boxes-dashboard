// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable better error logging for Firestore
if (process.env.NODE_ENV !== "production") {
    console.log(
        "Firebase initialized with project ID:",
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    );
}

// Use emulator in development if FIREBASE_USE_EMULATOR is set
if (
    process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "true" &&
    typeof window !== "undefined"
) {
    console.log("Using Firestore emulator");
    // Connect to emulator on port 8080
    connectFirestoreEmulator(db, "localhost", 8080);
}

// Initialize Analytics but only on the client side and if supported
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
    // We're on the client side
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export { app, auth, db, storage, analytics };
