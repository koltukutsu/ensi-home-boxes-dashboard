import { MetadataRoute } from 'next';
import { blogData } from '@/data/blog-data';
import { videoData } from '@/data/video-data';

// Function to convert name to slug - same as used in the content-card component
function getSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-');
}

// Define sitemap size limit
const SITEMAP_SIZE = 1000; // Number of URLs per sitemap

// Generate multiple sitemaps for large sites
export async function generateSitemaps(): Promise<Array<{ id: string }>> {
  // Get total content count to determine how many sitemaps we need
  const blogCount = blogData.length;
  const videoCount = videoData.length;
  
  // Calculate how many content sitemaps we need
  const contentSitemapCount = Math.ceil((blogCount + videoCount) / SITEMAP_SIZE);
  
  // Generate sitemap configurations
  return [
    { id: 'static-pages' },
    ...Array.from({ length: contentSitemapCount }, (_, i) => ({
      id: `content-${i + 1}`
    })),
  ];
}

// Generate individual sitemaps based on the id
export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ochtarcus.com';
  
  // Static site pages sitemap
  if (id === 'static-pages') {
    return [
      {
        url: `${baseUrl}`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'monthly',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/library`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/ai-chat`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'), 
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/about-us`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/submit`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      // Legal pages
      {
        url: `${baseUrl}/legal`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'yearly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/legal/terms`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'yearly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/legal/privacy`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'yearly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/legal/cookie-policy`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'yearly',
        priority: 0.5,
      },
    ];
  }
  
  // Content sitemaps (blog posts and videos)
  if (id.startsWith('content-')) {
    // Extract the index from the id
    const indexStr = id.split('-')[1];
    const index = parseInt(indexStr, 10) - 1;
    
    // Combine all content data
    const allContent: { type: 'blog' | 'video', slug: string }[] = [
      ...blogData.map(blog => ({ 
        type: 'blog' as const, 
        slug: getSlugFromName(blog.name_blog)
      })),
      ...videoData.map(video => ({
        type: 'video' as const,
        slug: getSlugFromName(video.name_video)
      })),
    ];
    
    // Paginate the content data
    const start = index * SITEMAP_SIZE;
    const end = start + SITEMAP_SIZE;
    const paginatedContent = allContent.slice(start, end);
    
    // Generate URLs for this sitemap
    return paginatedContent.map(item => {
      const path = item.type === 'blog' 
        ? `/library/blog-content/${item.slug}`
        : `/library/video-content/${item.slug}`;
        
      return {
        url: `${baseUrl}${path}`,
        lastModified: new Date('2025-04-04T16:26:11.250Z'),
        changeFrequency: 'monthly',
        priority: 0.7,
      };
    });
  }
  
  // Fallback
  return [];
} 