import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiKeyFromStorage } from '@/lib/ai-utils';

export function useOpenAIKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    // First check localStorage
    const storedKey = getApiKeyFromStorage();
    if (storedKey) {
      setApiKey(storedKey);
      setIsLoading(false);
      return;
    }

    // Then check user data
    if (userData?.openaiApiKey) {
      setApiKey(userData.openaiApiKey);
    }
    
    setIsLoading(false);
  }, [userData]);

  // Function to update API key in both state and localStorage
  const saveApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('openai_api_key', key);
    }
    setApiKey(key);
  };

  // Function to remove API key from both state and localStorage
  const removeApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('openai_api_key');
    }
    setApiKey(null);
  };
  
  return {
    apiKey,
    isLoading,
    saveApiKey,
    removeApiKey,
    hasKey: !!apiKey,
  };
} 