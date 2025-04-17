'use client';

import { useState } from 'react';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Input } from '@/registry/new-york-v4/ui/input';
import { useToast } from '@/registry/new-york-v4/ui/use-toast';
import { Mail, Loader2 } from 'lucide-react';

interface NewsletterFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function NewsletterForm({ onSuccess, className = '' }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to subscribe');
      }
      
      if (data.alreadySubscribed) {
        toast({
          description: "You're already subscribed to our newsletter!",
        });
      } else {
        toast({
          title: "Success!",
          description: "Thank you for subscribing to our newsletter!",
        });
      }
      
      // Clear the input
      setEmail('');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      
      const errorMessage = error.message || 'Something went wrong. Please try again later.';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Subscription Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-2 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-grow relative">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={`${error ? 'border-destructive focus:ring-destructive/30' : ''}`}
            aria-label="Email address"
          />
          {error && (
            <p className="text-destructive text-xs mt-1 absolute -bottom-5 left-0">{error}</p>
          )}
        </div>
        <Button 
          type="submit" 
          size="default" 
          disabled={isLoading}
          className="whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subscribing...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Subscribe
            </>
          )}
        </Button>
      </div>
    </form>
  );
} 