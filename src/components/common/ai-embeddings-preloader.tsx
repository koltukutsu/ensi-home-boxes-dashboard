'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function AiServiceInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const pathname = usePathname();
  const { userData } = useAuth();
  
  // Get the OpenAI API key on mount
  useEffect(() => {
    // Get OpenAI API key
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else if (userData?.openaiApiKey) {
      setApiKey(userData.openaiApiKey);
    }
  }, [userData]);
  
  useEffect(() => {
    // Only initialize on pages that might use the AI features
    const shouldInitialize = pathname.includes('/ai-chat') || pathname.includes('/library');
    
    if (shouldInitialize && !isInitialized && apiKey) {
      const initializeAiService = async () => {
        try {
          console.log("Initializing AI service...");
          
          // Currently no initialization needed, but keeping the structure
          // for potential future needs
          
          console.log('AI service initialized successfully');
          setIsInitialized(true);
        } catch (error) {
          console.error('Error initializing AI service:', error);
        }
      };
      
      // Use a timeout to prevent blocking initial page load
      const timeoutId = setTimeout(() => {
        initializeAiService();
      }, 2000); // Shorter delay since we're doing less
      
      return () => clearTimeout(timeoutId);
    }
  }, [pathname, isInitialized, apiKey]);
  
  // This component doesn't render anything
  return null;
}

// Export the old names for backward compatibility
export const AiEmbeddingsPreloader = AiServiceInitializer;
export const AiPineconeInitializer = AiServiceInitializer; 