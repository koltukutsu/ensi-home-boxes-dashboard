import { videoData } from '@/data/video-data';
import { blogData } from '@/data/blog-data';
import { openai } from '@ai-sdk/openai';
import { embed, embedMany, generateText } from 'ai';
import { BlogPost, VideoContent, ContentItem, isVideoContent, isBlogPost } from '@/types';
import { Pinecone } from '@pinecone-database/pinecone';

// Utility to generate a slug from a name
export function getSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-');
}

// Pinecone client instance (will be initialized when needed)
let pineconeClient: Pinecone | null = null;
let pineconeIndex: any = null;

// Initialize Pinecone client
export async function initializePinecone(apiKey: string, indexName: string): Promise<void> {
  if (pineconeClient) return;
  
  try {
    console.log("Initializing Pinecone client...");
    pineconeClient = new Pinecone({
      apiKey,
      maxRetries: 5,
    });
    
    console.log("Pinecone client created, getting index reference...");
    
    // Get index reference
    pineconeIndex = pineconeClient.index(indexName);
    
    // Check if index exists and is ready
    try {
      console.log("Checking if index exists and is ready...");
      const indexInfo = await pineconeClient.describeIndex(indexName);
      if (!indexInfo.status.ready) {
        throw new Error(`Index ${indexName} is not ready. Current state: ${indexInfo.status.state}`);
      }
      console.log(`Index ${indexName} is ready and available.`);
    } catch (error) {
      console.error('Error checking index status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
}

// Generate embedding for a single text with API key parameter
export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  try {
    // Create a new OpenAI client with the API key
    const embeddingClient = openai.embedding('text-embedding-3-small');
    process.env.OPENAI_API_KEY = apiKey; // Set API key to environment for current request
    
    const { embedding } = await embed({
      model: embeddingClient,
      value: text.trim(),
    });
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Generate embeddings for multiple texts with API key parameter
export async function generateEmbeddings(texts: string[], apiKey?: string): Promise<number[][]> {
  try {
    // Create a new OpenAI client with the API key
    const embeddingClient = openai.embedding('text-embedding-3-small');
    process.env.OPENAI_API_KEY = apiKey; // Set API key to environment for current request
    
    const { embeddings } = await embedMany({
      model: embeddingClient,
      values: texts.map(t => t.trim()),
    });
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

// Function to preprocess and chunk content
export function generateChunks(input: string): string[] {
  if (!input || typeof input !== 'string') return [];
  
  // Ensure proper spacing after periods
  const text = input.trim().replace(/\.(\S)/g, '. $1');
  
  // Split by sentence endings (period, question mark, exclamation mark)
  const sentenceDelimiters = /[.!?](?=\s|$)/g;
  const sentences = [];
  let match;
  let lastIndex = 0;
  
  // Extract sentences with their punctuation
  while ((match = sentenceDelimiters.exec(text)) !== null) {
    const sentence = text.substring(lastIndex, match.index + 1).trim();
    if (sentence) sentences.push(sentence);
    lastIndex = match.index + 1;
  }
  
  // Add any remaining text as the last sentence
  const remaining = text.substring(lastIndex).trim();
  if (remaining) {
    sentences.push(remaining + (remaining.match(/[.!?]$/) ? '' : '.'));
  }
  
  // Group sentences into paragraphs
  const paragraphs: string[] = [];
  let currentParagraph = '';
  
  // Control paragraph size with these parameters
  // Optimal for embedding models: 256-1024 characters per chunk
  const minParagraphLength = 200;       // Minimum character length (avoid tiny chunks)
  const idealParagraphLength = 800;     // Target character length per paragraph
  const maxParagraphLength = 1000;      // Maximum character length per paragraph (avoid huge chunks)
  
  // First pass: Create paragraphs that respect min/max size constraints
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // If adding this sentence would exceed max length, start a new paragraph
    if (currentParagraph && 
        currentParagraph.length + sentence.length + 1 > maxParagraphLength) {
      paragraphs.push(currentParagraph);
      currentParagraph = '';
    }
    
    // Add space between sentences in the same paragraph
    if (currentParagraph) currentParagraph += ' ';
    
    currentParagraph += sentence;
    
    // If we've reached the ideal length or it's the last sentence, end the paragraph
    const isLastSentence = i === sentences.length - 1;
    const nearIdealLength = currentParagraph.length >= idealParagraphLength;
    
    if (isLastSentence || (nearIdealLength && currentParagraph.length >= minParagraphLength)) {
      paragraphs.push(currentParagraph);
      currentParagraph = '';
    }
  }
  
  // Add the last paragraph if not empty
  if (currentParagraph && currentParagraph.length >= minParagraphLength) {
    paragraphs.push(currentParagraph);
  } else if (currentParagraph) {
    // If the last paragraph is too small, append it to the previous paragraph if possible
    if (paragraphs.length > 0) {
      const lastIdx = paragraphs.length - 1;
      if (paragraphs[lastIdx].length + currentParagraph.length + 1 <= maxParagraphLength) {
        paragraphs[lastIdx] += ' ' + currentParagraph;
      } else {
        paragraphs.push(currentParagraph);
      }
    } else {
      paragraphs.push(currentParagraph);
    }
  }
  
  // Handle special case: If we have only a few very short paragraphs, combine them
  if (paragraphs.length > 1 && paragraphs.length <= 3) {
    const totalLength = paragraphs.reduce((sum, p) => sum + p.length, 0);
    if (totalLength <= maxParagraphLength) {
      return [paragraphs.join(' ')];
    }
  }
  
  return paragraphs;
}

// Cosine similarity function
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  
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
  
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (mA * mB);
}

// Initialize embeddings for content library and store in Pinecone
export async function initializeContentEmbeddings(
  apiKey?: string, 
  pineconeApiKey?: string, 
  pineconeIndexName?: string
): Promise<void> {
  try {
    if (!apiKey) {
      throw new Error("OpenAI API key is required for embedding generation");
    }
    
    if (!pineconeApiKey || !pineconeIndexName) {
      throw new Error("Pinecone API key and index name are required");
    }
    
    // Initialize Pinecone
    await initializePinecone(pineconeApiKey, pineconeIndexName);
    if (!pineconeIndex) {
      throw new Error("Failed to initialize Pinecone index");
    }
    
    // Set API key for the whole initialization process
    process.env.OPENAI_API_KEY = apiKey;
    
    console.log('Initializing content embeddings to Pinecone...');
    
    // Collect all chunks for batch processing
    const allChunks = [];
    
    // Process videos
    for (const video of videoData) {
      // Combine relevant text fields
      const text = `${video.name_video}. ${video.description_video} ${video.mp3_content || ''}`;
      const chunks = generateChunks(text);
      
      for (const chunk of chunks) {
        if (chunk.length < 20) continue; // Skip very short chunks
        
        allChunks.push({
          text: chunk,
          metadata: {
            id: video.name_video,
            content: chunk,
            title: video.name_video,
            url: `/library/video-content/${getSlugFromName(video.name_video)}`,
            type: 'video'
          }
        });
      }
    }
    
    // Process blogs
    for (const blog of blogData) {
      // Combine relevant text fields
      const text = `${blog.name_blog}. ${blog.description_blog} ${blog.content?.whole_content || ''}`;
      const chunks = generateChunks(text);
      
      for (const chunk of chunks) {
        if (chunk.length < 20) continue; // Skip very short chunks
        
        allChunks.push({
          text: chunk,
          metadata: {
            id: blog.name_blog,
            content: chunk,
            title: blog.name_blog,
            url: `/library/blog-content/${getSlugFromName(blog.name_blog)}`,
            type: 'blog'
          }
        });
      }
    }
    
    // Process in batches
    const BATCH_SIZE = 20;
    console.log(`Processing ${allChunks.length} chunks in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(allChunks.length/BATCH_SIZE)}`);
      
      // Generate embeddings in batch
      const texts = batch.map(item => item.text);
      const embeddings = await generateEmbeddings(texts, apiKey);
      
      // Prepare vectors for Pinecone
      const vectors = embeddings.map((embedding, idx) => ({
        id: `${batch[idx].metadata.id}-${i + idx}`,
        values: embedding,
        metadata: batch[idx].metadata
      }));
      
      // Upsert to Pinecone
      await pineconeIndex.upsert(vectors);
      
      console.log(`Inserted batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      
      // Respect rate limits
      if (i + BATCH_SIZE < allChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Content embeddings initialized in Pinecone');
  } catch (error) {
    console.error('Error initializing embeddings:', error);
    throw error;
  }
}

// Search for similar content with a query using Pinecone
export async function searchContentByEmbedding(
  query: string, 
  topK: number = 5, 
  similarityThreshold: number = 0.7, 
  apiKey?: string,
  pineconeApiKey?: string,
  pineconeIndexName?: string
) {
  try {
    if (!apiKey) {
      throw new Error("OpenAI API key is required for embedding generation");
    }
    
    // Initialize Pinecone if needed
    if (!pineconeIndex && pineconeApiKey && pineconeIndexName) {
      await initializePinecone(pineconeApiKey, pineconeIndexName);
    }
    
    if (!pineconeIndex) {
      throw new Error("Pinecone not initialized. Please provide Pinecone API key and index name");
    }
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, apiKey);
    
    // Query Pinecone for similar vectors
    const queryResponse = await pineconeIndex.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    
    // Format and filter results
    return queryResponse.matches
      .filter((match: any) => match.score > similarityThreshold)
      .map((match: any) => ({
        title: match.metadata.title,
        content: match.metadata.content,
        url: match.metadata.url,
        type: match.metadata.type,
        similarity: match.score
      }));
  } catch (error) {
    console.error('Error searching content:', error);
    return [];
  }
}

// Generate text using OpenAI with API key parameter
export async function generateOpenAIText(prompt: string, modelName: string = 'gpt-4o', apiKey?: string) {
  try {
    // Set API key for this request
    process.env.OPENAI_API_KEY = apiKey;
    
    const { text } = await generateText({
      model: openai(modelName as any), // Type assertion for model name
      prompt: prompt
    });
    return text;
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
}

// Extract key topics from text with API key parameter
export async function extractKeyTopics(text: string, apiKey?: string): Promise<string[]> {
  try {
    const prompt = `Extract 3-5 key topics from the following text as a JSON array of strings:
    
    ${text}
    
    Your response should be exactly in this format: ["topic1", "topic2", "topic3"]`;
    
    const result = await generateOpenAIText(prompt, 'gpt-4o', apiKey);
    
    try {
      // Parse the JSON response
      return JSON.parse(result);
    } catch (e) {
      // If parsing fails, try to extract topics manually
      const matches = result.match(/\["([^"]+)"(?:,\s*"([^"]+)")*\]/);
      if (matches) {
        return matches[0].replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
      }
      return [];
    }
  } catch (error) {
    console.error('Error extracting topics:', error);
    return [];
  }
}

// Helper to get Pinecone client (if already initialized)
export function getPineconeClient(): Pinecone | null {
  return pineconeClient;
}

// Helper to get Pinecone index (if already initialized)
export function getPineconeIndex(): any {
  return pineconeIndex;
}

// Get API key from localStorage
export const getApiKeyFromStorage = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('openai_api_key');
  }
  return null;
};

// Get Pinecone API key from localStorage
export const getPineconeApiKeyFromStorage = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pinecone_api_key');
  }
  return null;
};

// Get Pinecone index name from localStorage
export const getPineconeIndexNameFromStorage = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pinecone_index_name');
  }
  return null;
};

// Example usage of the utility functions with API key from localStorage
// 
// // In your component:
// const apiKey = getApiKeyFromStorage();
// if (!apiKey) {
//   // Redirect to profile page or show error
//   router.push('/profile');
//   return;
// }
// 
// // Then use the API key with the functions
// const embedding = await generateEmbedding(text, apiKey);
// const searchResults = await searchContentByEmbedding(query, 5, 0.7, apiKey);
// const generatedText = await generateOpenAIText(prompt, 'gpt-4o', apiKey); 

// Search content using Pinecone's integrated inference (no OpenAI key needed)
export async function searchContentUsingPinecone(
  query: string,
  topK: number = 5,
  pineconeApiKey?: string,
  pineconeIndexName?: string,
  namespaceName: string = 'content-library'
) {
  try {
    // Initialize Pinecone if needed
    if (!pineconeIndex && pineconeApiKey && pineconeIndexName) {
      await initializePinecone(pineconeApiKey, pineconeIndexName);
    }
    
    if (!pineconeIndex) {
      throw new Error("Pinecone not initialized. Please provide Pinecone API key and index name");
    }
    
    console.log("Pinecone index initialized, attempting search");
    
    let response;
    const searchParams = {
      query: { 
        topK, 
        inputs: { text: query } 
      },
      fields: ['title', 'text', 'url', 'type']
    };
    
    // Use either namespaced or default search based on whether namespace is provided
    try {
      if (namespaceName && namespaceName.trim() !== '') {
        console.log(`Querying namespace ${namespaceName} with text: "${query}"`);
        const namespace = pineconeIndex.namespace(namespaceName);
        if (!namespace) {
          throw new Error(`Namespace ${namespaceName} not found or could not be accessed`);
        }
        response = await namespace.searchRecords(searchParams);
      } else {
        console.log(`Querying default namespace with text: "${query}"`);
        // Use the index directly without specifying a namespace
        response = await pineconeIndex.searchRecords(searchParams);
      }
    } catch (error: any) {
      console.error(`Search failed: ${error.message}`);
      
      // If namespace not found, try falling back to default namespace
      if (error.message?.includes('namespace') && namespaceName !== '') {
        console.log('Namespace not found, falling back to default namespace');
        try {
          response = await pineconeIndex.searchRecords(searchParams);
        } catch (fallbackError: any) {
          console.error(`Fallback search also failed: ${fallbackError.message}`);
          throw fallbackError; // Rethrow the error after logging
        }
      } else {
        throw error; // Rethrow if it's not a namespace issue or if we're already using default
      }
    }
    
    console.log("Search response received:", JSON.stringify(response, null, 2).slice(0, 2000) + "...");
    
    // NEW RESPONSE FORMAT HANDLING
    // Check if response has the new format with result.hits
    if (response?.result?.hits && Array.isArray(response.result.hits)) {
      console.log("Using new Pinecone response format (result.hits)");
      return response.result.hits.map((hit: any) => ({
        title: hit.fields?.title || 'Untitled',
        text: hit.fields?.text|| 'No content available',
        url: hit.fields?.url || 'No URL',
        type: hit.fields?.type || 'unknown',
        similarity: hit._score || 0
      }));
    }
    
    // OLD FORMAT HANDLING (keeping for backward compatibility)
    // Check if response has matches property (old format)
    if (response?.matches && Array.isArray(response.matches)) {
      console.log("Using legacy Pinecone response format (matches)");
      return response.matches.map((match: any) => ({
        title: match.record?.title || 'Untitled',
        text: match.record?.text || 'No content available',
        url: match.record?.url || 'No URL',
        type: match.record?.type || 'unknown',
        similarity: match.score || 0
      }));
    }
    
    // If neither format is found, log warning and return empty array
    console.warn("Unexpected response structure from Pinecone:", response);
    return [];
  } catch (error) {
    console.error('Error searching content using Pinecone:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    throw error; // Rethrow so the calling code can handle specific errors
  }
}

// Initialize content database using Pinecone's integrated inference
export async function initializeContentWithPinecone(
  pineconeApiKey?: string,
  pineconeIndexName?: string,
  namespaceName: string = 'content-library'
): Promise<void> {
  try {
    if (!pineconeApiKey || !pineconeIndexName) {
      throw new Error("Pinecone API key and index name are required");
    }
    
    // Initialize Pinecone
    await initializePinecone(pineconeApiKey, pineconeIndexName);
    if (!pineconeIndex) {
      throw new Error("Failed to initialize Pinecone index");
    }
    
    console.log('Initializing content to Pinecone with integrated inference...');
    
    // Get namespace reference
    const namespace = pineconeIndex.namespace(namespaceName);
    
    // Collect all records for batch processing
    const allRecords = [];
    
    // Process videos
    for (const video of videoData) {
      // Combine relevant text fields
      const text = `${video.name_video}. ${video.description_video} ${video.mp3_content || ''}`;
      const chunks = generateChunks(text);
      
      for (const chunk of chunks) {
        if (chunk.length < 20) continue; // Skip very short chunks
        
        allRecords.push({
          id: `video-${getSlugFromName(video.name_video)}-${allRecords.length}`,
          chunk_text: chunk, // This should match the fieldMap in the index configuration
          title: video.name_video,
          url: `/library/video-content/${getSlugFromName(video.name_video)}`,
          type: 'video'
        });
      }
    }
    
    // Process blogs
    for (const blog of blogData) {
      // Combine relevant text fields
      const text = `${blog.name_blog}. ${blog.description_blog} ${blog.content?.whole_content || ''}`;
      const chunks = generateChunks(text);
      
      for (const chunk of chunks) {
        if (chunk.length < 20) continue; // Skip very short chunks
        
        allRecords.push({
          id: `blog-${getSlugFromName(blog.name_blog)}-${allRecords.length}`,
          chunk_text: chunk, // This should match the fieldMap in the index configuration
          title: blog.name_blog,
          url: `/library/blog-content/${getSlugFromName(blog.name_blog)}`,
          type: 'blog'
        });
      }
    }
    
    // Process in batches
    const BATCH_SIZE = 20;
    console.log(`Processing ${allRecords.length} records in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
      const batch = allRecords.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(allRecords.length/BATCH_SIZE)}`);
      
      // Use upsertRecords which handles embedding conversion automatically
      await namespace.upsertRecords(batch);
      
      console.log(`Inserted batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      
      // Respect rate limits
      if (i + BATCH_SIZE < allRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Content initialized in Pinecone with integrated inference');
  } catch (error) {
    console.error('Error initializing content with Pinecone:', error);
    throw error;
  }
} 