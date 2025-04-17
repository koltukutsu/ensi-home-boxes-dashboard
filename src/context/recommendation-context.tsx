'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BlogPost, ContentItem, UserRecommendations, VideoContent, isVideoContent, isBlogPost } from '@/types';
import { useAuth } from './auth-context';
import { useVisits } from './visit-context';
import { videoData } from '@/data/video-data';
import { blogData } from '@/data/blog-data';
import { getContentId } from '@/lib/firebase-utils';

interface RecommendationContextType {
  recommendedContent: {
    basedOnHistory: ContentItem[];
    basedOnCategories: ContentItem[];
    popular: ContentItem[];
  };
  getRelatedContent: (contentId: string) => ContentItem[];
  refreshRecommendations: () => Promise<void>;
  loading: boolean;
  refreshing: boolean;
}

const RecommendationContext = createContext<RecommendationContextType | undefined>(undefined);

export const useRecommendations = () => {
  const context = useContext(RecommendationContext);
  if (context === undefined) {
    throw new Error('useRecommendations must be used within a RecommendationProvider');
  }
  return context;
};

export const RecommendationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, userData } = useAuth();
  const { visitData } = useVisits();  // Now uses the dummy implementation
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendedContent, setRecommendedContent] = useState<{
    basedOnHistory: ContentItem[];
    basedOnCategories: ContentItem[];
    popular: ContentItem[];
  }>({
    basedOnHistory: [],
    basedOnCategories: [],
    popular: []
  });
  
  // Combine all content data
  const allContent: ContentItem[] = [...videoData, ...blogData];
  
  // Helper function to get content item by ID
  const getContentById = (id: string): ContentItem | undefined => {
    return allContent.find(item => {
      return 'name_video' in item 
        ? item.name_video === id 
        : item.name_blog === id;
    });
  };
  
  // Function to refresh recommendations
  const refreshRecommendations = async () => {
    if (!user || !userData) return;
    
    setRefreshing(true);
    setLoading(true);
    
    try {
      // Generate recommendations based on user data
      const history = userData.viewHistory || [];
      const categories = userData.preferredCategories || [];
      
      // Get recommended content based on history
      const historyBasedContent = history.length > 0
        ? history
            .filter(id => !!id) // Filter out any undefined or null IDs
            .map(contentId => {
              // Find content with similar categories to the viewed content
              const content = getContentById(contentId);
              if (!content) return [];
              
              // Get categories from the viewed content
              const categories = 'related_categories' in content
                ? content.related_categories
                : [];
              
              // Find other content with matching categories
              return allContent
                .filter(item => {
                  const id = getContentId(item);
                  // Skip if this is the viewed content itself
                  if (id === contentId) return false;
                  
                  // Skip if already in our history
                  if (history.includes(id)) return false;
                  
                  // Get categories of this item
                  const itemCategories = 'related_categories' in item
                    ? item.related_categories
                    : [];
                  
                  // Check for category overlap
                  return itemCategories.some(cat => categories.includes(cat));
                })
                .slice(0, 2); // Take up to 2 related items per viewed content
            })
            .flat()
        : [];
      
      // Get recommended content based on preferred categories
      const categoryBasedContent = userData.preferredCategories && userData.preferredCategories.length > 0
        ? allContent.filter(item => {
            const id = getContentId(item);
            
            // Skip if already in history
            if (history.includes(id)) return false;
            
            // Skip if already added via history-based recommendations
            if (historyBasedContent.some(hItem => getContentId(hItem) === id)) {
              return false;
            }
            
            // Check if this item has any of the user's preferred categories
            const itemCategories = 'related_categories' in item
              ? item.related_categories
              : [];
            
            return itemCategories.some(cat => userData.preferredCategories?.includes(cat));
          })
          .slice(0, 5) // Limit to 5 items
        : [];
      
      // Get popular content (using randomization since we don't have visit data)
      const popularContent = allContent
        .filter(item => {
          const id = getContentId(item);
          
          // Skip if already in history
          if (history.includes(id)) return false;
          
          // Skip if already added via other recommendation methods
          if (historyBasedContent.some(hItem => getContentId(hItem) === id)) {
            return false;
          }
          if (categoryBasedContent.some(cItem => getContentId(cItem) === id)) {
            return false;
          }
          
          // Include all remaining content
          return true;
        })
        // Since we don't have visit data, randomize popular content
        .sort(() => Math.random() - 0.5)
        .slice(0, 5); // Limit to 5 items
      
      // Set the recommended content
      setRecommendedContent({
        basedOnHistory: historyBasedContent,
        basedOnCategories: categoryBasedContent,
        popular: popularContent
      });
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Function to get related content for a specific content item
  const getRelatedContent = (contentId: string): ContentItem[] => {
    const targetContent = getContentById(contentId);
    if (!targetContent) return [];
    
    const targetCategories = isVideoContent(targetContent) 
      ? targetContent.related_categories 
      : targetContent.related_categories;
    
    // Score all other content based on category overlap
    return allContent
      .filter(item => getContentId(item) !== contentId) // Exclude the current item
      .map(item => {
        const itemCategories = isVideoContent(item) ? item.related_categories : item.related_categories;
        // Count common categories
        const categoryOverlap = itemCategories.filter(category => 
          targetCategories.includes(category)
        ).length;
        
        return { item, score: categoryOverlap };
      })
      .filter(({ score }) => score > 0) // Only include items with category overlap
      .sort((a, b) => b.score - a.score) // Sort by score
      .map(({ item }) => item)
      .slice(0, 6); // Return top 6 related items
  };
  
  // Generate recommendations on load and when dependencies change
  useEffect(() => {
    setLoading(true);
    refreshRecommendations();
    setLoading(false);
  }, [user, userData]);
  
  return (
    <RecommendationContext.Provider
      value={{
        recommendedContent,
        getRelatedContent,
        refreshRecommendations,
        loading,
        refreshing
      }}
    >
      {children}
    </RecommendationContext.Provider>
  );
}; 