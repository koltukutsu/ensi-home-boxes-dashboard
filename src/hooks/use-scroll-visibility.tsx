'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

interface ScrollVisibilityOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook to detect when an element comes into view while scrolling
 *
 * @param options Configuration options
 * @returns [ref, isVisible, wasEverVisible] - The ref to attach, current visibility state, and if it was ever visible
 */
export function useScrollVisibility<T extends HTMLElement>({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = false
}: ScrollVisibilityOptions = {}): [RefObject<T>, boolean, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const [wasEverVisible, setWasEverVisible] = useState(false);
  const ref = useRef<T>(null);
  
  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const isElementVisible = entry.isIntersecting;
          
          // Only update if we're not in triggerOnce mode or if the element hasn't been visible yet
          if (!triggerOnce || !wasEverVisible) {
            setIsVisible(isElementVisible);
            
            // If we're seeing it now for the first time, mark it as "ever visible"
            if (isElementVisible && !wasEverVisible) {
              setWasEverVisible(true);
            }
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin, triggerOnce, wasEverVisible]);

  return [ref as RefObject<T>, isVisible, wasEverVisible];
} 