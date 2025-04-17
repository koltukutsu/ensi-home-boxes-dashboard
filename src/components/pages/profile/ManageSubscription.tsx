'use client';

import { useState } from 'react';
import { Button } from '@/registry/new-york-v4/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManageSubscriptionProps {
  customerId?: string;
}

export function ManageSubscription({ customerId }: ManageSubscriptionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!customerId) {
      toast.error('You need to have an active subscription to manage it.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Customer portal error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleManageSubscription}
      disabled={isLoading || !customerId}
      className="w-full md:w-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Manage Subscription
        </>
      )}
    </Button>
  );
} 