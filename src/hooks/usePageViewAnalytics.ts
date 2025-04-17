import { useEffect } from 'react';
import { trackContentView, logEvent } from '@/lib/analytics';

interface PageViewAnalyticsProps {
  pageName: string;
  pageId?: string;
  pageCategory?: string;
  additionalParams?: Record<string, any>;
}

/**
 * A hook to track page views in analytics
 * Use this hook in page components to automatically log page visits
 */
export function usePageViewAnalytics({
  pageName,
  pageId = '',
  pageCategory = 'page',
  additionalParams = {}
}: PageViewAnalyticsProps) {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Track as a content view
    trackContentView(
      pageId || `page_${pageName.toLowerCase().replace(/\s+/g, '_')}`,
      pageCategory,
      pageName
    );

    // Also log a specific page_visit event with additional parameters
    logEvent('page_visit', {
      page_name: pageName,
      page_id: pageId,
      page_category: pageCategory,
      ...additionalParams
    });

    // For debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Page view tracked:', pageName);
    }
  }, [pageName, pageId, pageCategory, additionalParams]);
} 