'use client';

import React from 'react';
import { useRecommendations } from '@/context/recommendation-context';
import { ContentCard } from '@/components/common/content-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Button } from '@/registry/new-york-v4/ui/button';
import { ChartBarIcon, EyeIcon, BookmarkIcon, RefreshCw } from 'lucide-react';
import { ContentItem, isVideoContent, isBlogPost } from '@/types';
import { getContentId } from '@/lib/firebase-utils';

interface ProfileRecommendationsProps {
  showTitle?: boolean;
  showHeader?: boolean;
  limit?: number;
}

/**
 * Gets a unique key for a content item
 */
function getContentKey(item: ContentItem): string {
  return isVideoContent(item) ? item.name_video : item.name_blog;
}

export function ProfileRecommendations({ 
  showTitle = true,
  showHeader = true,
  limit = 4
}: ProfileRecommendationsProps) {
  const { 
    recommendedContent,
    refreshRecommendations,
    loading
  } = useRecommendations();
  
  // Temporarily track refrelegal/privacyshing state locally until we update the context
  const [refreshing, setRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRecommendations();
    setRefreshing(false);
  };
  
  const hasHistoryRecs = recommendedContent.basedOnHistory.length > 0;
  const hasCategoryRecs = recommendedContent.basedOnCategories.length > 0;
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          {showHeader && (
            <>
              <CardTitle>Recommended For You</CardTitle>
              <CardDescription>Personalized content based on your interests</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: limit }).map((_, index) => (
              <div key={index} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        {showHeader && (
          <div>
            <CardTitle>Recommended For You</CardTitle>
            <CardDescription>Personalized content based on your interests</CardDescription>
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {(!hasHistoryRecs && !hasCategoryRecs && recommendedContent.popular.length === 0) ? (
          <div className="text-center p-6">
            <p className="text-muted-foreground">No recommendations available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Browse more content to get personalized recommendations.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Popular Content */}
            {recommendedContent.popular.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <ChartBarIcon className="h-4 w-4 text-primary" />
                  <span>Popular Content</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendedContent.popular.slice(0, limit).map((item) => (
                    <ContentCard 
                      key={`popular-${getContentKey(item)}`} 
                      item={item}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Based on History */}
            {hasHistoryRecs && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <EyeIcon className="h-4 w-4 text-primary" />
                  <span>Based on Your History</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendedContent.basedOnHistory.slice(0, limit).map((item) => (
                    <ContentCard 
                      key={`history-${getContentKey(item)}`} 
                      item={item}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Based on Categories */}
            {hasCategoryRecs && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <BookmarkIcon className="h-4 w-4 text-primary" />
                  <span>Based on Your Interests</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendedContent.basedOnCategories.slice(0, limit).map((item) => (
                    <ContentCard 
                      key={`category-${getContentKey(item)}`} 
                      item={item}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 