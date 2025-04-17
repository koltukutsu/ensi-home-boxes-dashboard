import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Initialize Stripe with the secret key (use live key in production)
const stripe = new Stripe(
  process.env.NODE_ENV === 'production' 
    ? (process.env.STRIPE_SECRET_KEY_LIVE || '') 
    : (process.env.STRIPE_SECRET_KEY || ''), 
  {
    apiVersion: '2025-03-31.basil',
  }
);

// Use live or test webhook secret based on environment
const webhookSecret = process.env.NODE_ENV === 'production'
  ? (process.env.STRIPE_WEBHOOK_SECRET_LIVE || '')
  : (process.env.STRIPE_WEBHOOK_SECRET || '');

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  if (!webhookSecret) {
    console.error("Webhook secret is not set");
    return NextResponse.json(
      { error: 'Webhook secret is not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    // Handle the event based on its type
    switch (event.type) {
      // Checkout session events
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`✅ Payment successful for session: ${session.id}`);
        
        if (session.mode === 'subscription') {
          await handleSuccessfulSubscription(session);
        } else {
          await handleSuccessfulPayment(session);
        }
        break;
        
      case 'checkout.session.expired':
        console.log(`⏰ Checkout session expired: ${(event.data.object as Stripe.Checkout.Session).id}`);
        break;
      
      // Payment intent events
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💰 PaymentIntent success: ${paymentIntent.id}`);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment failed: ${failedPaymentIntent.id}`);
        // Get error message
        const error = failedPaymentIntent.last_payment_error;
        console.log(`Error: ${error ? error.message : 'Unknown error'}`);
        break;
      
      // Subscription events
      case 'customer.subscription.created':
        const newSubscription = event.data.object as Stripe.Subscription;
        console.log(`🎉 New subscription created: ${newSubscription.id}`);
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.log(`📝 Subscription updated: ${updatedSubscription.id}`);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log(`🗑️ Subscription cancelled: ${deletedSubscription.id}`);
        await handleCancelledSubscription(deletedSubscription);
        break;
        
      // Invoice events
      case 'invoice.paid':
        const paidInvoice = event.data.object as Stripe.Invoice;
        console.log(`📬 Invoice paid: ${paidInvoice.id}`);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log(`📮 Invoice payment failed: ${failedInvoice.id}`);
        // TODO: Notify user about failed payment
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Error processing webhook: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook processing error: ${err.message}` },
      { status: 500 }
    );
  }
}

// Helper functions for handling different webhook events

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  // Implement your business logic for successful one-time payments
  // For example: fulfill an order, grant access to content, etc.
  const customerId = session.customer;
  const customerEmail = session.customer_email;
  
  console.log(`Processing payment for customer: ${customerId}, email: ${customerEmail}`);
  
  // TODO: Update your database with payment information
  // TODO: Send confirmation email to customer
}

async function handleSuccessfulSubscription(session: Stripe.Checkout.Session) {
  // Implement your business logic for successful subscriptions
  // For example: provision access, store subscription data, etc.
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  
  console.log(`Processing subscription: ${subscriptionId} for customer: ${customerId}`);
  
  // If you need subscription details, you can fetch them
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
      const planId = subscription.items.data[0]?.price.id;
      const status = subscription.status;
      
      console.log(`Subscription status: ${status}, plan: ${planId}`);
      
      // TODO: Update user's subscription status in your database
      // TODO: Grant appropriate access based on the plan
    } catch (error) {
      console.error('Error retrieving subscription details:', error);
    }
  }
}

async function handleCancelledSubscription(subscription: Stripe.Subscription) {
  // Implement your business logic for cancelled subscriptions
  // For example: revoke access, update user status, etc.
  const customerId = subscription.customer;
  
  console.log(`Processing cancellation for customer: ${customerId}`);
  
  // TODO: Update user's subscription status in your database
  // TODO: Revoke access or downgrade to free tier
} 