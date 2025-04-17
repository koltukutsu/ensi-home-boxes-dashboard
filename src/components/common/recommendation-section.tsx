'use client';

import React from 'react';
import { useRecommendations } from '@/context/recommendation-context';
import { ContentCard } from '@/components/common/content-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/registry/new-york-v4/ui/tabs';
import { ChartBarIcon, EyeIcon, BookmarkIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ContentCardSkeleton } from './content-card';
import { ContentItem, isVideoContent, isBlogPost } from '@/types';
import { getContentId } from '@/lib/firebase-utils';

interface RecommendationSectionProps {
  contentId?: string; // Optional contentId to show related content for a specific item
  showTitle?: boolean;
  tabStyle?: boolean; // If true, display as tabs. If false, display as separate sections
}

// Function to get a unique key for a content item
function getContentKey(item: ContentItem): string {
  return isVideoContent(item) ? item.name_video : item.name_blog;
}

export function RecommendationSection({ 
  contentId, 
  showTitle = true,
  tabStyle = true
}: RecommendationSectionProps) {
  const { recommendedContent, getRelatedContent, loading } = useRecommendations();
  const { user } = useAuth();
  
  // If contentId is provided, show related content instead of recommendations
  const content = contentId 
    ? getRelatedContent(contentId) 
    : null;
  
  const hasHistoryRecs = recommendedContent.basedOnHistory.length > 0;
  const hasCategoryRecs = recommendedContent.basedOnCategories.length > 0;
  
  if (loading) {
    return (
      <div className="space-y-4">
        {showTitle && <h3 className="text-xl font-semibold">Recommendations</h3>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ContentCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }
  
  // If showing related content for a specific item
  if (contentId && content) {
    return (
      <div className="space-y-4 mt-8">
        {showTitle && <h3 className="text-xl font-semibold">Related Content</h3>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {content.length > 0 ? (
            content.map((item) => (
              <ContentCard 
                key={`related-${contentId}-${getContentKey(item)}`} 
                item={item} 
              />
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-4">No related content found</p>
          )}
        </div>
      </div>
    );
  }
  
  // If using tabbed style for recommendations
  if (tabStyle) {
    return (
      <div className="space-y-4">
        {showTitle && <h3 className="text-xl font-semibold">Recommendations</h3>}
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="popular" className="flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4" />
              <span>Popular</span>
            </TabsTrigger>
            
            {hasHistoryRecs && user && (
              <TabsTrigger value="history" className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4" />
                <span>Based on History</span>
              </TabsTrigger>
            )}
            
            {hasCategoryRecs && user && (
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4" />
                <span>Your Categories</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="popular">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recommendedContent.popular.length > 0 ? (
                recommendedContent.popular.map((item) => (
                  <ContentCard 
                    key={`popular-${getContentKey(item)}`} 
                    item={item} 
                  />
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center py-4">No popular content found</p>
              )}
            </div>
          </TabsContent>
          
          {hasHistoryRecs && (
            <TabsContent value="history">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recommendedContent.basedOnHistory.map((item) => (
                  <ContentCard 
                    key={`history-${getContentKey(item)}`} 
                    item={item} 
                  />
                ))}
              </div>
            </TabsContent>
          )}
          
          {hasCategoryRecs && (
            <TabsContent value="categories">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recommendedContent.basedOnCategories.map((item) => (
                  <ContentCard 
                    key={`category-${getContentKey(item)}`} 
                    item={item} 
                  />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }
  
  // If using separate sections style (no tabs)
  return (
    <div className="space-y-8">
      {showTitle && <h3 className="text-xl font-semibold">Recommendations</h3>}
      
      {/* Popular Content */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-primary" />
              Popular Content
            </CardTitle>
            <CardDescription>Content that other users are engaging with</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedContent.popular.length > 0 ? (
                recommendedContent.popular.slice(0, 3).map((item) => (
                  <ContentCard 
                    key={`popular-${getContentKey(item)}`} 
                    item={item} 
                  />
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center py-4">No popular content found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
      
      {/* History-based Recommendations */}
      {hasHistoryRecs && user && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeIcon className="h-5 w-5 text-primary" />
                Based on Your History
              </CardTitle>
              <CardDescription>Content similar to what you've viewed recently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedContent.basedOnHistory.slice(0, 3).map((item) => (
                  <ContentCard 
                    key={`history-${getContentKey(item)}`} 
                    item={item} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      
      {/* Category-based Recommendations */}
      {hasCategoryRecs && user && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookmarkIcon className="h-5 w-5 text-primary" />
                Based on Your Categories
              </CardTitle>
              <CardDescription>Content matching your preferred categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedContent.basedOnCategories.slice(0, 3).map((item) => (
                  <ContentCard 
                    key={`category-${getContentKey(item)}`} 
                    item={item} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
} 