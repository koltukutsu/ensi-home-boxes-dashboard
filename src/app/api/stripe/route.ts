import { NextResponse } from 'next/server';
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

export async function POST(req: Request) {
  try {
    const { 
      priceId, 
      quantity = 1, 
      successUrl, 
      cancelUrl, 
      mode = 'payment',
      customerEmail,
      customerName,
      metadata = {}
    } = await req.json();
    
    // Basic validation
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Use provided URLs or default to environment variables
    const finalSuccessUrl = successUrl || process.env.STRIPE_CHECKOUT_SUCCESS_URL || '';
    const finalCancelUrl = cancelUrl || process.env.STRIPE_CHECKOUT_CANCEL_URL || '';

    if (!finalSuccessUrl || !finalCancelUrl) {
      return NextResponse.json(
        { error: 'Success and cancel URLs are required' },
        { status: 400 }
      );
    }

    // Common session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
      success_url: `${finalSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: finalCancelUrl,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV || 'development'
      },
      allow_promotion_codes: true,
    };

    // Add customer email if provided
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    // Add customer details for better analytics
    if (customerName) {
      sessionParams.customer_creation = 'always';
      sessionParams.payment_intent_data = {
        ...sessionParams.payment_intent_data,
        metadata: {
          customer_name: customerName,
          ...metadata
        }
      };
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ 
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error: any) {
    console.error('Stripe API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session', 
        details: error.message
      },
      { status: 500 }
    );
  }
} 