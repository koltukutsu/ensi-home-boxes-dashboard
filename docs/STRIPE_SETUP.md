# Stripe Integration Setup

This document outlines how to set up and configure the Stripe payment integration for Ochtarcus.

## Prerequisites

1. A [Stripe account](https://stripe.com)
2. Products and prices configured in your Stripe dashboard

## Environment Variables

Add the following environment variables to your `.env` file:

```
# Stripe API keys for test/development environment
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe API keys for production environment
STRIPE_SECRET_KEY_LIVE=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET_LIVE=whsec_your_live_webhook_secret

# Stripe price IDs for monthly subscription plans
STRIPE_PRICE_BASIC=price_basic_monthly_id
STRIPE_PRICE_PRO=price_pro_monthly_id
STRIPE_PRICE_TEAM=price_team_monthly_id

# Stripe price IDs for annual subscription plans
STRIPE_PRICE_BASIC_ANNUAL=price_basic_annual_id
STRIPE_PRICE_PRO_ANNUAL=price_pro_annual_id
STRIPE_PRICE_TEAM_ANNUAL=price_team_annual_id

# Default success and cancel URLs
STRIPE_CHECKOUT_SUCCESS_URL=https://ochtarcus.com/subscribe/success
STRIPE_CHECKOUT_CANCEL_URL=https://ochtarcus.com/subscribe/cancel
```

## Setting Up Stripe Products & Prices

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Products > Add Product
3. Create the following products:
   - Basic Plan
   - Pro Plan
   - Team Plan
4. For each product, create **both monthly and annual recurring prices**:
   - Monthly price (e.g., $9.99/month)
   - Annual price (e.g., $99.99/year with discount)
5. Copy each price ID and add it to your environment variables

## Setting Up Webhooks

To handle events like successful payments, failed payments, and subscription changes, you need to set up a webhook endpoint:

1. Go to the [Stripe Dashboard Webhooks page](https://dashboard.stripe.com/webhooks)
2. Click "Add Endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select the following events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Add the endpoint and copy the signing secret
6. Add this signing secret to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Setting Up the Customer Portal

To allow users to manage their subscriptions, you need to configure the Stripe Customer Portal:

1. Go to the [Stripe Dashboard Settings > Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the Customer Portal
3. Configure your branding and available options:
   - Enable subscription cancellation
   - Enable subscription updates
   - Configure available products and prices
   - Set a custom domain if needed
4. Save the configuration

## Testing the Integration

1. Use Stripe's test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Authentication Required: `4000 0025 0000 3155`
2. Expiration date: Any future date
3. CVC: Any 3 digits
4. ZIP: Any 5 digits

## Subscription Lifecycle

Our implementation handles the complete subscription lifecycle:

1. **Creation**: User selects a plan and subscribes via Stripe Checkout
2. **Confirmation**: Webhook receives `checkout.session.completed` and provisions access
3. **Management**: User can change plans or update payment methods via Customer Portal
4. **Renewal**: Automatic billing handled by Stripe with `invoice.paid` events
5. **Failures**: Payment failures handled with `invoice.payment_failed` events
6. **Cancellation**: User can cancel via Customer Portal, triggering `customer.subscription.deleted`

## Understanding the Code Structure

- `/api/stripe/route.ts` - Creates checkout sessions for payments and subscriptions
- `/api/stripe/webhook/route.ts` - Processes Stripe webhook events
- `/api/stripe/customer-portal/route.ts` - Creates portal sessions for subscription management
- `/subscribe/page.tsx` - Main subscription page with pricing plans and monthly/annual toggle
- `/subscribe/success/page.tsx` - Payment success page
- `/subscribe/cancel/page.tsx` - Payment cancellation page
- `/components/pages/pricing/PricingCard.tsx` - Reusable pricing card component
- `/components/pages/profile/ManageSubscription.tsx` - Component for accessing the Customer Portal
- `/config/stripe.ts` - Stripe configuration and product information

## Production Considerations

1. Make sure to use the production Stripe API keys in your production environment
2. Set up proper error handling and logging for payment failures
3. Implement additional security measures like validating the webhook signature
4. Set up monitoring for payment-related events
5. Configure appropriate email notifications for payment events
6. Test the entire payment and subscription flow in test mode before going live

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal) 