'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContentItem } from '@/types';
import { getRelatedContent, getContentByIds } from '@/lib/recommendation-engine';
import { ContentCard } from './content-card';
import { motion } from 'framer-motion';

interface RelatedContentProps {
  contentId: string;
  limit?: number;
  heading?: string;
  description?: string;
}

export function RelatedContent({
  contentId,
  limit = 3,
  heading = "Related Content",
  description = "You might also be interested in these"
}: RelatedContentProps) {
  const [relatedItems, setRelatedItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get related content when component mounts or contentId changes
    const fetchRelatedContent = async () => {
      setLoading(true);
      try {
        // Get related content IDs
        const relatedIds = getRelatedContent(contentId, limit);
        if (relatedIds.length === 0) {
          setRelatedItems([]);
          setLoading(false);
          return;
        }

        // Get the actual content items
        const items = getContentByIds(relatedIds);
        setRelatedItems(items);
      } catch (error) {
        console.error('Error fetching related content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedContent();
  }, [contentId, limit]);

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">{heading}</h2>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div 
              key={i} 
              className="h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (relatedItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-2">{heading}</h2>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatedItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <ContentCard item={item} />
          </motion.div>
        ))}
      </div>
    </div>
  );
} 