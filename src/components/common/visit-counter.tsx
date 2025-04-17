'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';
import { useVisits } from '@/context/visit-context';

// Format large numbers with K/M suffixes
function formatVisitCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

interface VisitCounterProps {
  contentId: string;
  small?: boolean;
  hideIcon?: boolean;
  className?: string;
}

export function VisitCounter({ contentId, small = false, hideIcon = false, className = '' }: VisitCounterProps) {
  const { visitData } = useVisits();
  const [displayCount, setDisplayCount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousCountRef = useRef<number>(0);
  
  useEffect(() => {
    if (!contentId) return;
    
    const visitInfo = visitData.get(contentId);
    if (!visitInfo) return;
    
    const newCount = visitInfo.count || 0;
    
    // On first load, just set the count without animation
    if (previousCountRef.current === 0) {
      setDisplayCount(newCount);
      previousCountRef.current = newCount;
      return;
    }
    
    // Only animate if the count increased
    if (newCount > previousCountRef.current) {
      // Immediately show the new count
      setDisplayCount(newCount);
      
      // Trigger animation
      setIsAnimating(true);
      
      // Reset the animation after it completes
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1000); // Animation duration
      
      // Update the previous count reference
      previousCountRef.current = newCount;
      
      // Clean up on unmount
      return () => clearTimeout(timeout);
    }
  }, [contentId, visitData]);
  
  const formattedCount = formatVisitCount(displayCount);
  const counterSize = small ? 'text-xs' : 'text-sm';
  const iconSize = small ? 'w-3.5 h-3.5' : 'w-4 h-4';
  
  return (
    <div className={`flex items-center gap-1 text-gray-600 dark:text-gray-400 ${className}`}>
      {!hideIcon && (
        <Eye className={`${iconSize} opacity-70 ${isAnimating ? 'text-blue-500 dark:text-blue-400' : ''}`} />
      )}
      <span 
        className={`${counterSize} font-medium ${isAnimating ? 'text-blue-600 dark:text-blue-400 animate-pulse' : ''}`}
      >
        {formattedCount}
      </span>
    </div>
  );
} 