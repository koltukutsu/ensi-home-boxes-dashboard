'use client';

import { useState } from 'react';
import { CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/registry/new-york-v4/ui/tooltip';

type BillingInterval = 'monthly' | 'annual';

interface PriceInfo {
  amount: number;
  currency: string;
  formatted: string;
  interval: string;
  savePercent: number;
}

interface PricingCardProps {
  name: string;
  description: string;
  prices: {
    monthly: PriceInfo;
    annual: PriceInfo;
  };
  priceIds: {
    monthly: string;
    annual: string;
  };
  features: string[];
  popular?: boolean;
  billingInterval: BillingInterval;
}

export function PricingCard({
  name,
  description,
  prices,
  priceIds,
  features,
  popular = false,
  billingInterval
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const currentPrice = prices[billingInterval];
  const currentPriceId = priceIds[billingInterval];
  const showSaveBadge = billingInterval === 'annual' && currentPrice.savePercent > 0;

  const handleSubscribe = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: currentPriceId,
          mode: 'subscription',
          successUrl: `${window.location.origin}/subscribe/success`,
          cancelUrl: `${window.location.origin}/subscribe/cancel`,
          customerEmail: user?.email || undefined,
          customerName: user?.displayName || undefined,
          metadata: {
            plan: name,
            billing_interval: billingInterval
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Payment error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`flex flex-col h-full ${popular ? 'border-primary shadow-md' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          {popular && (
            <Badge className="w-fit mb-2" variant="default">
              Most Popular
            </Badge>
          )}
          {showSaveBadge && (
            <Badge className="bg-green-600 hover:bg-green-700" variant="default">
              Save {currentPrice.savePercent}%
            </Badge>
          )}
        </div>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-4">
          <span className="text-3xl font-bold">{currentPrice.formatted}</span>
          <span className="text-muted-foreground ml-1">/{currentPrice.interval}</span>
          {billingInterval === 'annual' && (
            <div className="text-sm text-muted-foreground mt-1">
              Billed annually ({(currentPrice.amount / 12).toFixed(2)} per month)
            </div>
          )}
        </div>
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button 
          onClick={handleSubscribe} 
          className="w-full" 
          disabled={isLoading}
          variant={popular ? "default" : "outline"}
        >
          {isLoading ? 'Processing...' : `Subscribe to ${name}`}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center text-xs text-muted-foreground cursor-help">
                <Info className="h-3 w-3 mr-1" />
                <span>Cancel anytime</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>You can cancel your subscription at any time from your account settings.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
} 