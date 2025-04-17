import { videoData } from '@/data/video-data';
import { blogData } from '@/data/blog-data';
import { generateChunks, getSlugFromName } from '@/lib/ai-utils';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

async function main() {
  if (!PINECONE_API_KEY || !PINECONE_INDEX) {
    console.error("Required environment variables are missing");
    process.exit(1);
  }
  
  // Initialize Pinecone client
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY,
    maxRetries: 5,
  });
  
  // First, ensure we've created an index configured for a specific embedding model
  // If you don't have one already, create it (only once):
  /*
  await pc.createIndexForModel({
    name: PINECONE_INDEX,
    cloud: 'aws',
    region: 'us-east-1', // choose your region
    embed: {
      model: 'multilingual-e5-large', // or another model like 'openai'
      fieldMap: { text: 'chunk_text' }, // maps your text field to what the model expects
    },
    waitUntilReady: true,
  });
  */
  
  // Get index reference and target a namespace
  const namespace = pc.index(PINECONE_INDEX).namespace('content-library');
  
  // Collect all records to process
  const allRecords = [];
  
  // Process videos
  console.log('Processing videos...');
  for (const video of videoData) {
    const text = `${video.name_video}. ${video.description_video} ${video.mp3_content || ''}`;
    const chunks = generateChunks(text);
    
    for (const chunk of chunks) {
      if (chunk.length < 20) {
        console.log(`Skipping chunk: ${chunk}`);
        continue;
      }
      
      allRecords.push({
        id: `video-${getSlugFromName(video.name_video)}-${allRecords.length}`,
        text: chunk,
        title: video.name_video,
        url: `/library/video-content/${getSlugFromName(video.name_video)}`,
        type: 'video'
      });
    }
  }
  
  // Process blogs
  console.log('Processing blogs...');
  for (const blog of blogData) {
    const text = `${blog.name_blog}. ${blog.description_blog} ${blog.content?.whole_content || ''}`;
    const chunks = generateChunks(text);
    
    for (const chunk of chunks) {
      if (chunk.length < 20) continue;
      
      allRecords.push({
        id: `blog-${getSlugFromName(blog.name_blog)}-${allRecords.length}`,
        text: chunk,
        title: blog.name_blog,
        url: `/library/blog-content/${getSlugFromName(blog.name_blog)}`,
        type: 'blog'
      });
    }
  }
  
  // Process in batches to avoid rate limits
  const ORIGINAL_BATCH_SIZE = 96; // Previous batch size
  const BATCH_SIZE = 32; // Reduced from 96
  const BATCH_DELAY_MS = 5000; // Increased from 1500ms
  const MAX_RETRIES = 5;
  const INITIAL_RETRY_DELAY = 10000; // 10 seconds
  const START_FROM_BATCH = 35; // Start from the 35th batch of original processing
  
  // Calculate the starting index based on the original batch size
  const startIndex = (START_FROM_BATCH - 1) * ORIGINAL_BATCH_SIZE;
  
  console.log(`Processing ${allRecords.length - startIndex} records in batches of ${BATCH_SIZE} (starting from record ${startIndex})`);
  
  for (let i = startIndex; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor((i - startIndex)/BATCH_SIZE) + 1} of ${Math.ceil((allRecords.length - startIndex)/BATCH_SIZE)}`);
    
    // Retry logic for rate limiting
    let retries = 0;
    let success = false;

    while (!success && retries <= MAX_RETRIES) {
      try {
        // Use the upsertRecords method which automatically converts text to embeddings
        await namespace.upsertRecords(batch);
        success = true;
        console.log(`Inserted batch ${Math.floor((i - startIndex)/BATCH_SIZE) + 1}`);
      } catch (error: any) {
        if (
          typeof error === 'object' && 
          error !== null && 
          (
            (error.message && (
              error.message.includes('RESOURCE_EXHAUSTED') || 
              error.message.includes('rate limit')
            )) || 
            (error.cause && typeof error.cause === 'object' && error.cause?.message && (
              error.cause.message.includes('RESOURCE_EXHAUSTED') || 
              error.cause.message.includes('rate limit')
            )) || 
            error.status === 429
          )
        ) {
          retries++;
          if (retries > MAX_RETRIES) {
            console.error(`Failed to process batch after ${MAX_RETRIES} retries. Stopping execution.`);
            throw error;
          }
          
          // Calculate exponential backoff delay
          const backoffDelay = INITIAL_RETRY_DELAY * Math.pow(2, retries - 1);
          console.log(`Rate limit hit. Retrying batch in ${backoffDelay/1000} seconds (retry ${retries}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          // If not a rate limit error, rethrow
          throw error;
        }
      }
    }
    
    // Always wait between batches to respect rate limits
    if (i + BATCH_SIZE < allRecords.length) {
      console.log(`Waiting ${BATCH_DELAY_MS/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
  
  console.log('Record generation and storage complete');
}

main().catch(console.error);
