'use client';

/**
 * Visit counting implementation
 * 
 * This context provides visit counting functionality for content items.
 * It loads and caches visit data, and provides methods to increment visits.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ContentVisitData, getMultipleContentVisits, incrementContentVisit, logContentVisit } from '@/lib/firebase-utils';
import { useAuth } from '@/context/auth-context';
import { collection, doc, onSnapshot, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VisitContextType {
  visitData: Map<string, ContentVisitData>;
  incrementVisit: (contentId: string, contentType: 'blog' | 'video', categories?: string[]) => Promise<number>;
  loading: boolean;
  isIncrementingVisit: Record<string, boolean>;
  preloadVisitData: (contentIds: string[]) => Promise<void>;
  subscribeToVisitUpdates: (contentIds: string[]) => () => void;
}

// Create context with default values
const VisitContext = createContext<VisitContextType>({
  visitData: new Map(),
  incrementVisit: async () => 0,
  loading: false,
  isIncrementingVisit: {},
  preloadVisitData: async () => {},
  subscribeToVisitUpdates: () => () => {}
});

export const useVisits = () => {
  const context = useContext(VisitContext);
  return context;
};

export function VisitProvider({ children }: { children: React.ReactNode }) {
  const [visitData, setVisitData] = useState<Map<string, ContentVisitData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [isIncrementingVisit, setIsIncrementingVisit] = useState<Record<string, boolean>>({});
  const [trackedContentIds, setTrackedContentIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  
  // Keep track of active subscriptions
  const activeSubscriptions = useRef<Map<string, () => void>>(new Map());
  
  // Function to subscribe to real-time updates for specific content IDs
  const subscribeToVisitUpdates = useCallback((contentIds: string[]) => {
    if (!contentIds.length) return () => {};
    
    // Limit the number of subscriptions to prevent performance issues
    const MAX_SUBSCRIPTIONS = 10;
    const limitedContentIds = contentIds.slice(0, MAX_SUBSCRIPTIONS);
    
    // Filter out contentIds that already have active subscriptions
    const newContentIds = limitedContentIds.filter(id => !activeSubscriptions.current.has(id));
    
    if (newContentIds.length === 0) {
      // If all content IDs already have subscriptions, return a no-op unsubscribe
      return () => {};
    }
    
    // For new content IDs, set up individual document listeners for more precise updates
    const unsubscribers: Array<() => void> = [];
    
    newContentIds.forEach(contentId => {
      try {
        const docRef = doc(db, 'content_visits', contentId);
        const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            
            // Update the state with the new data
            setVisitData(prev => {
              const newVisitData = new Map(prev);
              newVisitData.set(contentId, {
                id: contentId,
                count: data.count || 0,
                lastUpdated: data.lastUpdated?.toDate() || new Date()
              });
              return newVisitData;
            });
          }
        }, error => {
          console.error(`Error listening to document updates for ${contentId}:`, error);
        });
        
        // Store the unsubscribe function
        unsubscribers.push(unsubscribe);
        activeSubscriptions.current.set(contentId, unsubscribe);
      } catch (error) {
        console.error(`Error setting up visit subscription for ${contentId}:`, error);
      }
    });
    
    // Return a function to unsubscribe from all new listeners
    return () => {
      newContentIds.forEach(contentId => {
        const unsubscribe = activeSubscriptions.current.get(contentId);
        if (unsubscribe) {
          try {
            unsubscribe();
            activeSubscriptions.current.delete(contentId);
          } catch (e) {
            console.error(`Error unsubscribing from visits for ${contentId}:`, e);
          }
        }
      });
    };
  }, []);
  
  // Clean up all subscriptions on unmount
  useEffect(() => {
    return () => {
      activeSubscriptions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (e) {
          console.error("Error cleaning up visit subscriptions:", e);
        }
      });
    };
  }, []);
  
  // Optimized function to preload visit data for multiple content IDs
  const preloadVisitData = useCallback(async (contentIds: string[]) => {
    if (!contentIds.length) return;
    
    // Filter out IDs that are already being tracked
    const newContentIds = contentIds.filter(id => !trackedContentIds.has(id));
    if (!newContentIds.length) return;
    
    setLoading(true);
    try {
      // Add all new IDs to tracked set immediately to prevent duplicate fetches
      setTrackedContentIds(prev => new Set([...prev, ...newContentIds]));
      
      // Fetch visit data for all new IDs
      const newVisitData = await getMultipleContentVisits(newContentIds);
      
      // Merge with existing data
      setVisitData(prev => {
        const merged = new Map(prev);
        newVisitData.forEach((data, id) => {
          merged.set(id, data);
        });
        return merged;
      });
      
      // Set up subscriptions for these new IDs
      subscribeToVisitUpdates(newContentIds);
    } catch (error) {
      console.error('Error preloading visit data:', error);
    } finally {
      setLoading(false);
    }
  }, [trackedContentIds, subscribeToVisitUpdates]);

  // Function to increment visit count
  const incrementVisit = async (contentId: string, contentType: 'blog' | 'video', categories: string[] = []): Promise<number> => {
    if (!contentId) return 0;
    
    // Add content ID to tracked IDs set
    if (!trackedContentIds.has(contentId)) {
      setTrackedContentIds(prev => new Set([...prev, contentId]));
      
      // Set up a subscription for this content ID
      subscribeToVisitUpdates([contentId]);
      
      // If this is a new content ID, preload its visit data first
      if (!visitData.has(contentId)) {
        try {
          const singleVisitData = await getMultipleContentVisits([contentId]);
          setVisitData(prev => {
            const newMap = new Map(prev);
            const data = singleVisitData.get(contentId);
            if (data) newMap.set(contentId, data);
            return newMap;
          });
        } catch (error) {
          console.error('Error loading visit data for new content:', error);
        }
      }
    }
    
    // Prevent duplicate increments
    if (isIncrementingVisit[contentId]) return visitData.get(contentId)?.count || 0;
    
    // Set increment flag
    setIsIncrementingVisit(prev => ({ ...prev, [contentId]: true }));
    
    try {
      // Increment visit in Firebase
      const newCount = await incrementContentVisit(contentId);
      
      // Log this visit with categories
      await logContentVisit(contentId, contentType, user?.uid || null, categories);
      
      // Update local state - even though we have a listener, this makes the UI update faster
      setVisitData(prev => {
        const newMap = new Map(prev);
        newMap.set(contentId, {
          id: contentId,
          count: newCount,
          lastUpdated: new Date()
        });
        return newMap;
      });
      
      return newCount;
    } catch (error) {
      console.error('Error incrementing visit count:', error);
      return visitData.get(contentId)?.count || 0;
    } finally {
      // Give the listener time to update before clearing the increment flag
      setTimeout(() => {
        setIsIncrementingVisit(prev => ({ ...prev, [contentId]: false }));
      }, 500);
    }
  };

  return (
    <VisitContext.Provider
      value={{
        visitData,
        incrementVisit,
        loading,
        isIncrementingVisit,
        preloadVisitData,
        subscribeToVisitUpdates
      }}
    >
      {children}
    </VisitContext.Provider>
  );
} 