import { VideoContent, BlogPost, ContentItem, RelatedContent, UserRecommendations } from '@/types';
import { videoData } from '@/data/video-data';
import { blogData } from '@/data/blog-data';

// Combine all content
const allContent: ContentItem[] = [...videoData, ...blogData];

// Weight factors for recommendation scoring
const WEIGHTS = {
  CATEGORY_MATCH: 2.5,
  RECENT_VIEW: 3,
  POPULAR: 1,
  BOOKMARK: 2
};

/**
 * Generate content-based recommendations based on viewed content
 * @param viewHistory List of content IDs the user has viewed
 * @param limit Maximum number of recommendations to return
 * @returns Array of content IDs recommended for the user
 */
export function getContentBasedRecommendations(
  viewHistory: string[],
  limit: number = 5
): string[] {
  if (!viewHistory.length) return [];
  
  // Get recently viewed content items (up to 10 most recent)
  const recentlyViewed = viewHistory.slice(0, 10);
  
  // Find all content items the user has viewed
  const viewedItems = recentlyViewed
    .map(id => findContentById(id))
    .filter(Boolean) as ContentItem[];
  
  // Extract categories from viewed content
  const viewedCategories = new Set<string>();
  viewedItems.forEach(item => {
    const categories = 'related_categories' in item 
      ? item.related_categories 
      : [];
    categories.forEach(category => viewedCategories.add(category));
  });
  
  // Calculate similarity scores for all content
  const scoredContent: RelatedContent[] = allContent
    .filter(item => !viewHistory.includes(getContentId(item))) // Filter out already viewed content
    .map(item => {
      const id = getContentId(item);
      const itemCategories = 'related_categories' in item 
        ? item.related_categories 
        : [];
      
      // Calculate category overlap
      const categoryOverlap = itemCategories.filter(
        category => viewedCategories.has(category)
      ).length;
      
      // Calculate similarity score
      const score = categoryOverlap * WEIGHTS.CATEGORY_MATCH;
      
      return {
        contentId: id,
        similarityScore: score
      };
    })
    .filter(item => item.similarityScore > 0) // Only keep items with some similarity
    .sort((a, b) => b.similarityScore - a.similarityScore); // Sort by score descending
  
  // Return top N recommendations
  return scoredContent.slice(0, limit).map(item => item.contentId);
}

/**
 * Generate category-based recommendations based on user's preferred categories
 * @param preferredCategories List of categories the user prefers
 * @param viewHistory List of content IDs the user has already viewed
 * @param limit Maximum number of recommendations to return
 * @returns Array of content IDs recommended for the user
 */
export function getCategoryBasedRecommendations(
  preferredCategories: string[],
  viewHistory: string[] = [],
  limit: number = 5
): string[] {
  if (!preferredCategories.length) return [];
  
  // Find content that matches preferred categories but hasn't been viewed
  const recommendations = allContent
    .filter(item => {
      const id = getContentId(item);
      const itemCategories = 'related_categories' in item 
        ? item.related_categories 
        : [];
      
      // Check if this item has any preferred categories
      const hasPreferredCategory = itemCategories.some(
        category => preferredCategories.includes(category)
      );
      
      // Only include if it has a preferred category and hasn't been viewed
      return hasPreferredCategory && !viewHistory.includes(id);
    })
    .map(item => ({
      contentId: getContentId(item),
      // Count how many preferred categories this item has
      similarityScore: ('related_categories' in item 
        ? item.related_categories 
        : []
      ).filter(cat => preferredCategories.includes(cat)).length
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);
  
  // Return top N recommendations
  return recommendations.slice(0, limit).map(item => item.contentId);
}

/**
 * Get a list of most popular content based on categories
 * @param limit Maximum number of recommendations to return
 * @returns Array of content IDs of popular content
 */
export function getPopularRecommendations(limit: number = 5): string[] {
  // In a real application, this would query for most viewed/liked content
  // For this demo, we'll just return some content from common categories
  
  const popularCategories = [
    "Artificial Intelligence",
    "Building Product",
    "Founder Stories",
    "Growth",
    "Product Market Fit"
  ];
  
  // Find content in popular categories
  const popularContent = allContent
    .filter(item => {
      const itemCategories = 'related_categories' in item 
        ? item.related_categories 
        : [];
      
      return itemCategories.some(
        category => popularCategories.includes(category)
      );
    })
    .slice(0, limit * 2); // Get more than we need so we can shuffle
  
  // Shuffle to get different recommendations each time
  const shuffled = [...popularContent].sort(() => 0.5 - Math.random());
  
  // Return IDs of top N
  return shuffled.slice(0, limit).map(item => getContentId(item));
}

/**
 * Generate comprehensive recommendations for a user
 * @param viewHistory User's view history
 * @param preferredCategories User's preferred categories
 * @param limit Number of items to recommend
 * @returns UserRecommendations object with different recommendation types
 */
export function generateUserRecommendations(
  viewHistory: string[] = [],
  preferredCategories: string[] = [],
  limit: number = 5
): UserRecommendations {
  // Generate different types of recommendations
  const contentBasedRecs = getContentBasedRecommendations(viewHistory, limit);
  const categoryBasedRecs = getCategoryBasedRecommendations(preferredCategories, viewHistory, limit);
  const popularRecs = getPopularRecommendations(limit);
  
  return {
    contentBasedRecs,
    categoryBasedRecs,
    popularRecs,
    lastUpdated: new Date()
  };
}

/**
 * Get related content for a specific content item
 * @param contentId ID of the content to find related items for
 * @param limit Maximum number of related items to return
 * @returns Array of content IDs related to the specified content
 */
export function getRelatedContent(contentId: string, limit: number = 3): string[] {
  const targetContent = findContentById(contentId);
  
  if (!targetContent) return [];
  
  // Get categories from the target content
  const targetCategories = 'related_categories' in targetContent 
    ? targetContent.related_categories 
    : [];
  
  if (!targetCategories.length) return [];
  
  // Find content with similar categories
  const relatedContent = allContent
    .filter(item => {
      const id = getContentId(item);
      // Skip the target content itself
      if (id === contentId) return false;
      
      const itemCategories = 'related_categories' in item 
        ? item.related_categories 
        : [];
      
      // Check for category overlap
      return itemCategories.some(
        category => targetCategories.includes(category)
      );
    })
    .map(item => ({
      contentId: getContentId(item),
      // Count shared categories for similarity score
      similarityScore: ('related_categories' in item 
        ? item.related_categories 
        : []
      ).filter(cat => targetCategories.includes(cat)).length
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);
  
  // Return top N related content
  return relatedContent.slice(0, limit).map(item => item.contentId);
}

/**
 * Helper to extract content ID from a content item
 */
function getContentId(item: ContentItem): string {
  return 'name_video' in item ? item.name_video : item.name_blog;
}

/**
 * Find content item by ID
 */
function findContentById(id: string): ContentItem | undefined {
  return allContent.find(item => getContentId(item) === id);
}

/**
 * Get content items by their IDs
 */
export function getContentByIds(ids: string[]): ContentItem[] {
  return ids
    .map(id => findContentById(id))
    .filter(Boolean) as ContentItem[];
} 