import { NextRequest, NextResponse } from 'next/server';
import { initializeContentWithPinecone } from '@/lib/ai-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Maximum duration allowed for hobby plan

export async function GET(req: NextRequest) {
  try {
    // Get API keys from headers or environment
    const openaiApiKey = req.headers.get('x-api-key') || process.env.OPENAI_API_KEY;
    const pineconeApiKey = req.headers.get('x-pinecone-api-key') || process.env.PINECONE_API_KEY;
    const pineconeIndexName = req.headers.get('x-pinecone-index-name') || process.env.PINECONE_INDEX;
    const namespace = req.headers.get('x-namespace') || 'content-library';
    
    if (!pineconeApiKey || !pineconeIndexName) {
      return NextResponse.json({ 
        success: false,
        error: 'Pinecone API key and index name are required' 
      }, { status: 401 });
    }
    
    console.log('Initializing content with Pinecone:', {
      pineconeApiKey: pineconeApiKey ? 'present' : 'not present',
      pineconeIndexName,
      namespace
    });
    
    // Initialize content with Pinecone's integrated inference
    await initializeContentWithPinecone(pineconeApiKey, pineconeIndexName, namespace);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Content initialized in Pinecone successfully' 
    });
  } catch (error: any) {
    console.error('Error seeding content to Pinecone:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'An error occurred while seeding content to Pinecone' 
      },
      { status: 500 }
    );
  }
} 