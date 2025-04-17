'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/registry/new-york-v4/ui/tabs';
import { Button } from '@/registry/new-york-v4/ui/button';
import { RefreshCw } from 'lucide-react';
import { ContentItem, UserRecommendations } from '@/types';
import { useAuth } from '@/context/auth-context';
import { ContentCard } from './content-card';
import { generateUserRecommendations, getContentByIds } from '@/lib/recommendation-engine';
import { ContentVisitData, getMultipleContentVisits } from '@/lib/firebase-utils';
import { motion } from 'framer-motion';

interface RecommendationsSectionProps {
  limit?: number;
}

export function RecommendationsSection({ limit = 5 }: RecommendationsSectionProps) {
  const { user, userData, updateRecommendations } = useAuth();
  const [recommendations, setRecommendations] = useState<UserRecommendations | null>(null);
  const [recommendedContent, setRecommendedContent] = useState<{
    contentBased: ContentItem[];
    categoryBased: ContentItem[];
    popular: ContentItem[];
  }>({
    contentBased: [],
    categoryBased: [],
    popular: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Initial load of recommendations
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Function to calculate new recommendations or use cached ones
    const loadRecommendations = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const cached = userData?.recommendations;
        
        // Use cached recommendations if they exist and are less than 1 day old
        if (cached && cached.lastUpdated) {
          const lastUpdate = new Date(cached.lastUpdated);
          const timeDiff = now.getTime() - lastUpdate.getTime();
          const hoursDiff = timeDiff / (1000 * 3600);
          
          if (hoursDiff < 24) {
            setRecommendations(cached);
            loadRecommendedContent(cached);
            return;
          }
        }
        
        // Generate new recommendations
        await refreshRecommendations();
      } catch (error) {
        console.error('Error loading recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [user, userData]);

  // Refresh recommendations
  const refreshRecommendations = async () => {
    if (!user || !userData) return;
    
    setRefreshing(true);
    try {
      // Generate new recommendations
      const newRecs = generateUserRecommendations(
        userData.viewHistory || [],
        userData.preferredCategories || [],
        limit
      );
      
      // Save to state and Firebase
      setRecommendations(newRecs);
      updateRecommendations(newRecs);
      
      // Load content items
      loadRecommendedContent(newRecs);
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load content items from recommendation IDs
  const loadRecommendedContent = async (recs: UserRecommendations) => {
    try {
      // Get content items first
      const contentBased = getContentByIds(recs.contentBasedRecs);
      const categoryBased = getContentByIds(recs.categoryBasedRecs);
      const popularItems = getContentByIds(recs.popularRecs);
      
      // For popular content, get visit counts and sort by them
      const popularIds = popularItems.map(item => 
        isVideoContent(item) ? item.name_video : item.name_blog
      );
      
      // Get visit data for popular content
      const visitData = await getMultipleContentVisits(popularIds);
      
      // Sort popular items by visit count (highest first)
      const sortedPopular = [...popularItems].sort((a, b) => {
        const aId = isVideoContent(a) ? a.name_video : a.name_blog;
        const bId = isVideoContent(b) ? b.name_video : b.name_blog;
        
        const aCount = visitData.get(aId)?.count || 0;
        const bCount = visitData.get(bId)?.count || 0;
        
        return bCount - aCount; // Descending order
      });
      
      setRecommendedContent({
        contentBased,
        categoryBased,
        popular: sortedPopular
      });
    } catch (error) {
      console.error('Error loading recommended content:', error);
      // Fall back to unsorted content
      setRecommendedContent({
        contentBased: getContentByIds(recs.contentBasedRecs),
        categoryBased: getContentByIds(recs.categoryBasedRecs),
        popular: getContentByIds(recs.popularRecs)
      });
    }
  };

  // Helper function to check if an item is a video
  const isVideoContent = (item: ContentItem): item is import('@/types').VideoContent => {
    return 'name_video' in item;
  };

  // If user is not logged in, show limited popular recommendations
  if (!user) {
    return (
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Recommended for You</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to get personalized recommendations based on your interests
            </p>
          </div>
          <div className="mt-2 sm:mt-0">
            <Button onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i} 
                className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
              />
            ))
          ) : (
            // Show popular recommendations
            recommendations?.popularRecs && recommendedContent.popular.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              >
                <ContentCard item={item} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recommended for You</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }
  
  // If no content for any recommendation type
  const noRecommendations = recommendedContent.contentBased.length === 0 
    && recommendedContent.categoryBased.length === 0 
    && recommendedContent.popular.length === 0;
    
  if (noRecommendations) {
    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Recommended for You</h2>
            <p className="text-sm text-muted-foreground">
              Browse more content to get personalized recommendations
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={refreshRecommendations}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    );
  }
  
  // Main content with tabs for different recommendation types
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Recommended for You</h2>
          <p className="text-sm text-muted-foreground">
            Content you might be interested in based on your browsing
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshRecommendations}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Tabs defaultValue="for-you" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="for-you">For You</TabsTrigger>
          <TabsTrigger value="by-category">By Category</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>
        
        <TabsContent value="for-you" className="space-y-4">
          {recommendedContent.contentBased.length === 0 ? (
            <p className="text-sm text-muted-foreground">Browse more content to get personalized recommendations</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recommendedContent.contentBased.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <ContentCard item={item} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="by-category" className="space-y-4">
          {recommendedContent.categoryBased.length === 0 ? (
            <p className="text-sm text-muted-foreground">Set your preferred categories to get tailored content recommendations</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recommendedContent.categoryBased.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <ContentCard item={item} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="popular" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recommendedContent.popular.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              >
                <ContentCard item={item} />
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 