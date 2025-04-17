'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/registry/new-york-v4/ui/button';
import { AlertCircle, Key } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/registry/new-york-v4/ui/alert';
import { useOpenAIKey } from '@/hooks/useOpenAIKey';

interface AiKeyRequiredProps {
  children: React.ReactNode;
}

export function AiKeyRequired({ children }: AiKeyRequiredProps) {
  const { apiKey, isLoading } = useOpenAIKey();
  const router = useRouter();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If no API key is available, show a message and redirect button
  if (!apiKey) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4 mr-2" />
        <AlertTitle>OpenAI API Key Required</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">
            This feature requires an OpenAI API key. Please add your API key in your profile settings.
          </p>
          <Button 
            onClick={() => router.push('/profile')}
            size="sm"
            className="flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            <span>Add API Key in Profile</span>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  // If API key is available, render the children
  return <>{children}</>;
} 