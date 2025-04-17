/**
 * This file contains Stripe configuration and product/price IDs
 * 
 * Pricing psychology implemented:
 * - Anchoring: Displaying higher-priced plans first to make others seem like better value
 * - Value-based messaging: Emphasizing outcomes, not just features
 * - Strategic feature gating: Placing high-value features in optimal tiers
 * - Charm pricing: Using .99 pricing to create perception of better deals
 * - Decoy pricing: Strategic plan positioning to guide users to preferred tier
 */

export const STRIPE_CONFIG = {
  // Public environment variables
  publishableKey: process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE 
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  
  // Display order for plans (affects presentation in UI - anchoring technique)
  planDisplayOrder: ['team', 'pro', 'basic'],
  
  // Pricing plans - these should match your actual Stripe price IDs
  prices: {
    basic: {
      monthly: process.env.STRIPE_PRICE_BASIC || 'price_basic_monthly',
      annual: process.env.STRIPE_PRICE_BASIC_ANNUAL || 'price_basic_annual',
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
    },
    team: {
      monthly: process.env.STRIPE_PRICE_TEAM || 'price_team_monthly',
      annual: process.env.STRIPE_PRICE_TEAM_ANNUAL || 'price_team_annual',
    },
    enterprise: {
      contactSales: true,
    }
  },
  
  // Product names and descriptions - for frontend display
  products: {
    basic: {
      name: 'Basic Plan',
      description: 'Essential access for individuals just getting started.',
      tag: 'STARTER',
      prices: {
        monthly: {
          amount: 9.99,
          currency: 'USD',
          formatted: '$9.99',
          interval: 'month',
          savePercent: 0,
        },
        annual: {
          amount: 99.99,
          currency: 'USD',
          formatted: '$99.99',
          interval: 'year',
          savePercent: 17, // 16.6% discount for annual billing
          monthlyEquivalent: '$8.33',
        },
      },
      features: [
        'Access to basic content library',
        'Limited AI search functionality',
        'Email support'
      ],
      valueProposition: 'Get started with essential tools',
      idealFor: 'Individual users and beginners',
      popular: false,
      ctaText: 'Get Started'
    },
    pro: {
      name: 'Pro Plan',
      description: 'Perfect balance of features and value for serious users.',
      tag: 'RECOMMENDED',
      prices: {
        monthly: {
          amount: 19.99,
          currency: 'USD',
          formatted: '$19.99',
          interval: 'month',
          savePercent: 0,
        },
        annual: {
          amount: 199.92,
          currency: 'USD',
          formatted: '$199.92',
          interval: 'year',
          savePercent: 20, // Increased annual discount for psychological impact
          monthlyEquivalent: '$16.66',
        },
      },
      features: [
        'Full content library access',
        'Unlimited AI search queries',
        'Advanced analytics',
        'Priority support',
        'Early access to new features'
      ],
      valueProposition: 'Unlock your full productivity potential',
      idealFor: 'Power users and professionals',
      popular: true, // This is the plan we want to promote most
      bestValue: true,
      ctaText: 'Upgrade to Pro'
    },
    team: {
      name: 'Team Plan',
      description: 'Advanced collaboration tools for growing organizations.',
      tag: 'BUSINESS',
      prices: {
        monthly: {
          amount: 49.99,
          currency: 'USD',
          formatted: '$49.99',
          interval: 'month',
          savePercent: 0,
          perUser: true,
        },
        annual: {
          amount: 479.88,
          currency: 'USD',
          formatted: '$479.88',
          interval: 'year',
          savePercent: 20, // Consistent with Pro plan for clean messaging
          monthlyEquivalent: '$39.99',
          perUser: true,
        },
      },
      features: [
        'Everything in Pro Plan',
        'Team management dashboard',
        'Collaboration tools',
        'Custom analytics reports',
        'Dedicated account manager',
        'Team onboarding session'
      ],
      valueProposition: 'Scale your team\'s productivity',
      idealFor: 'Teams and organizations',
      popular: false,
      ctaText: 'Empower Your Team'
    },
    enterprise: {
      name: 'Enterprise',
      description: 'Custom solutions for large organizations with complex needs.',
      tag: 'CUSTOM',
      contactSales: true,
      features: [
        'Everything in Team Plan',
        'Custom integrations',
        'Dedicated support team',
        'Service level agreement (SLA)',
        'Advanced security features',
        'Custom training and onboarding',
        'Unlimited storage'
      ],
      valueProposition: 'Tailored to your organization\'s unique requirements',
      idealFor: 'Large organizations with custom needs',
      popular: false,
      ctaText: 'Contact Sales'
    }
  },
  
  // Psychological elements to display on pricing page
  pricingPsychology: {
    guarantees: [
      {
        title: '14-Day Money-Back Guarantee',
        description: 'Try risk-free with our no-questions-asked refund policy',
        icon: 'ShieldCheck'
      }
    ],
    testimonials: [
      {
        quote: "Ochtarcus Pro completely transformed our research process. The AI tools alone saved us hours every week.",
        author: "Sarah Johnson, Marketing Director",
        company: "Growth Technologies"
      }
    ],
    faqs: [
      {
        question: "Can I cancel anytime?",
        answer: "Yes, you can cancel your subscription at any time with no cancellation fees."
      },
      {
        question: "How does the annual billing discount work?",
        answer: "Annual plans offer up to 20% savings compared to monthly billing, while providing the same great features."
      }
    ],
    comparisonMetrics: [
      {
        title: "Time saved per week",
        basic: "2 hours",
        pro: "8+ hours",
        team: "15+ hours per user"
      },
      {
        title: "ROI",
        basic: "2x",
        pro: "5x",
        team: "10x+"
      }
    ]
  }
}; 