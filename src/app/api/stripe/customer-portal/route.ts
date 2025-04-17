import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the secret key (use live key in production)
const stripe = new Stripe(
  process.env.NODE_ENV === 'production' 
    ? (process.env.STRIPE_SECRET_KEY_LIVE || '') 
    : (process.env.STRIPE_SECRET_KEY || ''), 
  {
    apiVersion: '2025-03-31.basil',
  }
);

export async function POST(req: NextRequest) {
  try {
    const { customerId, returnUrl } = await req.json();
    
    // Basic validation
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const finalReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/profile`;

    // Create a customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: finalReturnUrl,
    });

    return NextResponse.json({ 
      success: true,
      url: session.url
    });
  } catch (error: any) {
    console.error('Stripe Customer Portal error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create customer portal session', 
        details: error.message
      },
      { status: 500 }
    );
  }
} 