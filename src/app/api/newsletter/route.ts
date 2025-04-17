import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Use dynamic import to load mailchimp
async function getMailchimpInstance() {
  try {
    const mailchimpModule = await import('@mailchimp/mailchimp_marketing');
    const mailchimp = mailchimpModule.default;
    
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY || '',
      server: process.env.MAILCHIMP_SERVER_PREFIX || '', // e.g., "us10"
    });
    
    return mailchimp;
  } catch (error) {
    console.error('Failed to load Mailchimp module:', error);
    throw new Error('Could not initialize Mailchimp');
  }
}

export async function POST(req: Request) {
  try {
    const { email, firstName, lastName } = await req.json();
    
    // Basic validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const listId = process.env.MAILCHIMP_LIST_ID || '';
    if (!listId) {
      return NextResponse.json(
        { error: 'Mailchimp list ID is not configured' },
        { status: 500 }
      );
    }

    try {
      // Get mailchimp instance
      const mailchimp = await getMailchimpInstance();
      
      // Try to add the subscriber
      const response = await mailchimp.lists.addListMember(listId, {
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: firstName || '',
          LNAME: lastName || '',
        },
      });

      return NextResponse.json({ 
        success: true,
        id: response.id,
        message: 'Subscribed successfully!'
      });
    } catch (error: any) {
      // Handle already subscribed case gracefully
      if (error.response && 
          error.response.body && 
          error.response.body.title === 'Member Exists') {
        return NextResponse.json({ 
          success: true, 
          alreadySubscribed: true,
          message: 'This email is already subscribed to our newsletter.' 
        });
      }
      
      // Log and return the error
      console.error('Mailchimp API error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to subscribe', 
          details: error.response?.body?.detail || error.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Implement a check endpoint to see if an email is already subscribed
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }
  
  const listId = process.env.MAILCHIMP_LIST_ID || '';
  if (!listId) {
    return NextResponse.json(
      { error: 'Mailchimp list ID is not configured' },
      { status: 500 }
    );
  }

  try {
    // Create MD5 hash of lowercase email address for Mailchimp API
    const emailHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
    
    // Get mailchimp instance
    const mailchimp = await getMailchimpInstance();
    
    // Try to get the member
    await mailchimp.lists.getListMember(listId, emailHash);
    
    // If no error was thrown, the member exists
    return NextResponse.json({ 
      subscribed: true,
      message: 'This email is already subscribed.' 
    });
  } catch (error: any) {
    // If the error is 404, the member doesn't exist
    if (error.status === 404) {
      return NextResponse.json({ 
        subscribed: false,
        message: 'This email is not subscribed yet.' 
      });
    }
    
    // For other errors, return error response
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
} 