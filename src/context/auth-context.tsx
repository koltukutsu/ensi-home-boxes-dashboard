'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserRecommendations } from '@/types';

// Define the shape of the user data
interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
  createdAt?: any;
  lastLogin?: any;
  bookmarks?: string[];
  viewHistory?: string[];
  recommendations?: UserRecommendations;
  preferredCategories?: string[];
  openaiApiKey?: string;
  isSubscribed?: boolean;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  subscriptionExpiresAt?: any;
}

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  addToBookmarks: (contentId: string) => Promise<void>;
  removeFromBookmarks: (contentId: string) => Promise<void>;
  addToViewHistory: (contentId: string) => Promise<void>;
  updateRecommendations: (recommendations: UserRecommendations) => Promise<void>;
  updatePreferredCategories: (categories: string[]) => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData(userSnap.data() as UserData);
          // Update last login
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        } else {
          // Create new user document if it doesn't exist
          const newUserData: UserData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAdmin: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            bookmarks: [],
            viewHistory: [],
            recommendations: {
              contentBasedRecs: [],
              categoryBasedRecs: [],
              popularRecs: [],
              lastUpdated: new Date()
            },
            preferredCategories: [],
            openaiApiKey: '',
            isSubscribed: false,
            subscriptionTier: 'free',
            subscriptionExpiresAt: null
          };
          
          await setDoc(userRef, newUserData);
          setUserData(newUserData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      const newUserData: UserData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName,
        photoURL: result.user.photoURL,
        isAdmin: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        bookmarks: [],
        viewHistory: [],
        recommendations: {
          contentBasedRecs: [],
          categoryBasedRecs: [],
          popularRecs: [],
          lastUpdated: new Date()
        },
        preferredCategories: [],
        openaiApiKey: '',
        isSubscribed: false,
        subscriptionTier: 'free',
        subscriptionExpiresAt: null
      };
      
      await setDoc(doc(db, 'users', result.user.uid), newUserData);
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Add to bookmarks
  const addToBookmarks = async (contentId: string) => {
    if (!user || !userData) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const bookmarks = [...(userData.bookmarks || [])];
      
      if (!bookmarks.includes(contentId)) {
        bookmarks.push(contentId);
        await setDoc(userRef, { bookmarks }, { merge: true });
        setUserData({ ...userData, bookmarks });
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  };

  // Remove from bookmarks
  const removeFromBookmarks = async (contentId: string) => {
    if (!user || !userData) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const bookmarks = (userData.bookmarks || []).filter(id => id !== contentId);
      
      await setDoc(userRef, { bookmarks }, { merge: true });
      setUserData({ ...userData, bookmarks });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  };

  // Add to view history
  const addToViewHistory = async (contentId: string) => {
    if (!user || !userData) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const viewHistory = [...(userData.viewHistory || [])];
      
      // Remove content if it already exists to avoid duplicates
      const filteredHistory = viewHistory.filter(id => id !== contentId);
      
      // Add content to beginning of array (most recent)
      filteredHistory.unshift(contentId);
      
      // Limit history to last 50 items
      const limitedHistory = filteredHistory.slice(0, 50);
      
      await setDoc(userRef, { viewHistory: limitedHistory }, { merge: true });
      setUserData({ ...userData, viewHistory: limitedHistory });
    } catch (error) {
      console.error('Error updating view history:', error);
      throw error;
    }
  };

  // Update user recommendations
  const updateRecommendations = async (recommendations: UserRecommendations) => {
    if (!user || !userData) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { recommendations }, { merge: true });
      setUserData({ ...userData, recommendations });
    } catch (error) {
      console.error('Error updating recommendations:', error);
      throw error;
    }
  };

  // Update preferred categories
  const updatePreferredCategories = async (categories: string[]) => {
    if (!user || !userData) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { preferredCategories: categories }, { merge: true });
      setUserData({ ...userData, preferredCategories: categories });
    } catch (error) {
      console.error('Error updating preferred categories:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    addToBookmarks,
    removeFromBookmarks,
    addToViewHistory,
    updateRecommendations,
    updatePreferredCategories
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 