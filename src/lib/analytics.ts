import { analytics } from '@/lib/firebase';
import { logEvent as firebaseLogEvent, EventParams } from 'firebase/analytics';

/**
 * Log an event to Firebase Analytics
 * 
 * @param eventName The name of the event to log
 * @param eventParams Optional parameters to include with the event
 */
export function logEvent(eventName: string, eventParams?: EventParams): void {
  if (analytics) {
    firebaseLogEvent(analytics, eventName, eventParams);
  }
}

/**
 * Track when a user views content
 * 
 * @param contentId The ID of the content being viewed
 * @param contentType The type of content (blog, video, etc.)
 * @param contentTitle The title of the content
 */
export function trackContentView(contentId: string, contentType: string, contentTitle: string): void {
  logEvent('content_view', {
    content_id: contentId,
    content_type: contentType,
    content_title: contentTitle
  });
}

/**
 * Track when a user starts a search
 * 
 * @param searchTerm The search term used
 */
export function trackSearch(searchTerm: string): void {
  logEvent('search', {
    search_term: searchTerm
  });
}

/**
 * Track when a user clicks on a button or link
 * 
 * @param buttonId ID or name of the button/link
 * @param buttonLocation Where in the UI the button/link is located
 */
export function trackButtonClick(buttonId: string, buttonLocation: string): void {
  logEvent('button_click', {
    button_id: buttonId,
    button_location: buttonLocation
  });
}

/**
 * Track when a user signs up
 * 
 * @param method The method used to sign up (email, Google, etc.)
 */
export function trackSignUp(method: string): void {
  logEvent('sign_up', {
    method: method
  });
}

/**
 * Track when a user logs in
 * 
 * @param method The method used to log in (email, Google, etc.)
 */
export function trackLogin(method: string): void {
  logEvent('login', {
    method: method
  });
}

/**
 * Track when a user starts the subscription process
 * 
 * @param plan The subscription plan selected
 */
export function trackSubscriptionStart(plan: string): void {
  logEvent('begin_checkout', {
    items: [{ item_id: plan, item_name: `${plan} Plan` }]
  });
}

/**
 * Track when a user completes a subscription
 * 
 * @param plan The subscription plan purchased
 * @param value The monetary value of the subscription
 * @param currency The currency of the transaction
 */
export function trackSubscriptionComplete(plan: string, value: number, currency: string = 'USD'): void {
  logEvent('purchase', {
    transaction_id: `sub_${Date.now()}`,
    value: value,
    currency: currency,
    items: [{ item_id: plan, item_name: `${plan} Plan` }]
  });
} 