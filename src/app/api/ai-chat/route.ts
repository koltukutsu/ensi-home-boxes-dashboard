import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { 
  searchContentByEmbedding, 
  extractKeyTopics, 
  searchContentUsingPinecone,
  initializePinecone,
  getPineconeApiKeyFromStorage,
  getPineconeIndexNameFromStorage
} from '@/lib/ai-utils';

// Import content data sources
import { videoData } from '@/data/video-data';
import { blogData } from '@/data/blog-data';
import { embed } from 'ai';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Function to validate OpenAI API key
async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    // Make a minimal request to the OpenAI API to validate the key
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

// Function to check if a user has an active subscription
async function checkSubscription(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Check if user has an active subscription
      if (userData.isSubscribed && userData.subscriptionTier &&
          (userData.subscriptionTier === 'pro' || userData.subscriptionTier === 'enterprise')) {
        
        // Check if subscription is active (not expired)
        if (!userData.subscriptionExpiresAt || 
            new Date(userData.subscriptionExpiresAt.toDate()) > new Date()) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// Simple in-memory vector store for demo purposes
// In production, use a proper vector database
let contentEmbeddings: { 
  id: string;
  content: string;
  embedding: number[];
  title: string;
  url: string;
  type: 'video' | 'blog';
}[] = [];

// Function to generate embedding for a query
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Find content in local data source if Pinecone result is missing content
async function findContentForResult(result: any): Promise<string> {
  // If we already have content, just return it
  if (result.content && result.content !== 'No content available') {
    return result.content;
  }

  if (result.text && result.text !== 'No content available') {
    return result.text;
  }

  // Attempt to parse out the content type and slug from the URL
  const urlParts = (result.url || '').split('/');
  const contentType = urlParts[2] || ''; // e.g., "video-content" or "blog-content"
  const slug = urlParts[3] || ''; // e.g., "startup-legal-mechanics"

  console.log(`Content missing, attempting to find content for ${contentType}/${slug}`);

  // Look up content in local data arrays
  if (contentType === 'video-content') {
    const video = videoData.find(v => v.name_video.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-') === slug);
    if (video) {
      return `${video.description_video} ${video.mp3_content || ''}`;
    }
  } else if (contentType === 'blog-content') {
    const blog = blogData.find(b => b.name_blog.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-') === slug);
    if (blog) {
      return `${blog.description_blog} ${blog.content?.whole_content || ''}`;
    }
  }

  // Return the best we can, or fallback message
  return `${result.title} (No detailed content available from original source)`;
}

// Function to preprocess and chunk content
function generateChunks(input: string): string[] {
  return input
    .trim()
    .split('.')
    .filter(i => i.trim() !== '')
    .map(i => i.trim() + '.');
}

// Function to find similar content using cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  
  return dotProduct / (mA * mB);
}

// Enhanced function to search for relevant content with fallback to local data
async function searchContent(query: string, apiKey?: string, pineconeApiKey?: string, pineconeIndexName?: string, namespace: string = 'content-library') {
  try {
    console.log(`Searching for content with query: "${query}"`);
    
    // If Pinecone credentials are available, use it for search
    if (pineconeApiKey && pineconeIndexName) {
      console.log('Using Pinecone for search');
      try {
        // Initialize Pinecone
        await initializePinecone(pineconeApiKey, pineconeIndexName);
        
        // Try searching with Pinecone's integrated search
        const results = await searchContentUsingPinecone(
          query,
          5, // topK
          pineconeApiKey,
          pineconeIndexName,
          namespace
        );
        
        // If we got results, check and fill in missing content
        if (results && results.length > 0) {
          console.log(`Found ${results.length} results from Pinecone`);
          
          // Check for missing content in results
          for (let i = 0; i < results.length; i++) {
            if (!results[i].content || results[i].content === 'No content available') {
              results[i].content = await findContentForResult(results[i]);
            }
          }
          
          return results;
        }
      } catch (error: any) {
        console.error('Pinecone search failed, falling back to embedding search:', error);
        
        // If namespace error, try without namespace
        if (error.message?.includes('namespace') && 
            error.message?.includes('not found') && 
            namespace === 'content-library') {
          console.log('Retrying without namespace...');
          return searchContent(query, apiKey, pineconeApiKey, pineconeIndexName, '');
        }
      }
    }
    
    // Fallback to embedding-based search
    console.log('Using embedding-based search as fallback');
    const results = await searchContentByEmbedding(query, 5, 0.7, apiKey);
    
    // Check for missing content
    for (let i = 0; i < results.length; i++) {
      if (!results[i].content || results[i].content === 'No content available') {
        results[i].content = await findContentForResult(results[i]);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error searching content:', error);
    return [];
  }
}

// Initialize embeddings for all content
// async function initializeEmbeddings() {
//   try {
//     // Process videos
//     for (const video of videoData) {
//       const chunks = generateChunks(video.description_video + ' ' + (video.mp3_content || ''));
//       for (const chunk of chunks) {
//         if (chunk.length < 10) continue; // Skip very short chunks
        
//         const embedding = await generateEmbedding(chunk);
//         contentEmbeddings.push({
//           id: video.name_video,
//           content: chunk,
//           embedding,
//           title: video.name_video,
//           url: `/library/video-content/${video.name_video.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}`,
//           type: 'video'
//         });
//       }
//     }
    
//     // Process blogs
//     for (const blog of blogData) {
//       const chunks = generateChunks(blog.description_blog + ' ' + (blog.content?.whole_content || ''));
//       for (const chunk of chunks) {
//         if (chunk.length < 10) continue; // Skip very short chunks
        
//         const embedding = await generateEmbedding(chunk);
//         contentEmbeddings.push({
//           id: blog.name_blog,
//           content: chunk,
//           embedding,
//           title: blog.name_blog,
//           url: `/library/blog-content/${blog.name_blog.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}`,
//           type: 'blog'
//         });
//       }
//     }
    
//     console.log(`Initialized ${contentEmbeddings.length} content embeddings`);
//   } catch (error) {
//     console.error('Error initializing embeddings route:', error);
//   }
// }

export async function POST(req: NextRequest) {
  try {
    console.log('AI-CHAT: AI chat endpoint called');
    
    // Get user ID and API key from headers
    const userId = req.headers.get('x-user-id');
    const apiKey = req.headers.get('x-api-key');
    const pineconeApiKey = req.headers.get('x-pinecone-api-key');
    const pineconeIndexName = req.headers.get('x-pinecone-index-name');
    const namespace = req.headers.get('x-namespace') || 'content-library';
    
    console.log('AI-CHAT: Headers received:', { 
      userId: userId ? 'present' : 'not present', 
      apiKey: apiKey ? 'present' : 'not present',
      pineconeApiKey: pineconeApiKey ? 'present' : 'not present',
      pineconeIndexName: pineconeIndexName ? 'present' : 'not present',
      namespace
    });
    
    // Check if API key is valid
    if (apiKey) {
      console.log('AI-CHAT: Validating provided API key');
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        console.log('AI-CHAT: API key validation failed');
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      console.log('AI-CHAT: API key validation successful');
    } else {
      // If no API key provided, check for environment variable
      console.log('AI-CHAT: No API key in headers, checking environment variable');
      const envApiKey = process.env.OPENAI_API_KEY;
      if (!envApiKey) {
        console.log('AI-CHAT: No API key found in environment variables');
        return NextResponse.json({ 
          error: 'API key required', 
          details: 'Please provide an OpenAI API key' 
        }, { status: 401 });
      }
      console.log('AI-CHAT: Using API key from environment variables');
    }

    // Parse the request body
    console.log('AI-CHAT: Parsing request body');
    const { messages } = await req.json();
    console.log('AI-CHAT: Messages received:', messages.length);
    
    // Use the provided API key or fall back to environment variable
    const effectiveApiKey = apiKey || process.env.OPENAI_API_KEY;
    const effectivePineconeApiKey = pineconeApiKey || process.env.PINECONE_API_KEY;
    const effectivePineconeIndexName = pineconeIndexName || process.env.PINECONE_INDEX;
    
    console.log('AI-CHAT: Using effective API keys:', {
      openai: effectiveApiKey ? 'present' : 'not present',
      pinecone: effectivePineconeApiKey ? 'present' : 'not present',
      pineconeIndex: effectivePineconeIndexName || 'not present'
    });
    
    // Set API key in environment for this request
    process.env.OPENAI_API_KEY = effectiveApiKey;
    console.log('AI-CHAT: API key set in environment for this request');
    
    // Create stream with AI SDK
    console.log('AI-CHAT: Creating stream with AI SDK');
    const result = streamText({
      model: openai('gpt-4o'),
      system: `You are an AI assistant for Ochtarcus, a platform with a library of content about startups, business, and technology. 
      Your primary goal is to help users find relevant content in our library and answer questions about it.
      
      When responding, follow these guidelines:
      1. Be helpful, concise, and accurate.
      2. When you don't know something, admit it politely.
      3. When mentioning specific content, provide the title and link to the content.
      4. Maintain a professional but friendly tone.
      5. Format your responses using Markdown for better readability.
      6. Use the searchContent tool to find relevant information when users ask about topics.
      7. Use the extractTopics tool to identify key topics in user's questions.
      
      When providing answers based on retrieved content:
      1. ONLY use information presented in the retrieved content.
      2. If the answer cannot be found in the retrieved content, say "Based on the available information, I cannot answer this question."
      3. Structure your reasoning step-by-step before providing a final answer.
      4. Cite specific parts of the content that support your answer.
      5. If the content contains conflicting information, acknowledge the contradiction.`,
      messages,
      tools: {
        searchContent: tool({
          description: `Search for relevant content in the Ochtarcus library based on the user's query.
          Use this tool whenever a user asks for information about specific topics or content.`,
          parameters: z.object({
            query: z.string().describe('The search query to find relevant content'),
          }),
          execute: async ({ query }) => {
            console.log('AI-CHAT: Executing searchContent tool with query:', query);
            
            // Enhanced search with both Pinecone and embedding fallback
            const results = await searchContent(
              query, 
              effectiveApiKey, 
              effectivePineconeApiKey, 
              effectivePineconeIndexName,
              namespace
            );
            
            console.log('AI-CHAT: Search results:', results.length);
            return results;
          },
        }),
        extractTopics: tool({
          description: `Extract key topics from the user's message to better understand their intent.
          Use this tool when you need to analyze what topics the user is most interested in.`,
          parameters: z.object({
            text: z.string().describe('The text to extract topics from'),
          }),
          execute: async ({ text }) => {
            console.log('AI-CHAT: Executing extractTopics tool with text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
            const topics = await extractKeyTopics(text, effectiveApiKey);
            console.log('AI-CHAT: Extracted topics:', topics);
            return topics;
          },
        }),
      },
      maxTokens: 1000,
    });
    console.log('AI-CHAT: Stream created successfully');

    console.log('AI-CHAT: Returning stream response');
    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('AI-CHAT: Error in AI chat endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 