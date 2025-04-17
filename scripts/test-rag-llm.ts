import * as readline from 'readline';
import { Pinecone } from '@pinecone-database/pinecone';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

// Import utilities
import { 
  searchContentUsingPinecone,
  generateOpenAIText
} from '@/lib/ai-utils';

// Configure environment
dotenv.config();

// Environment variables
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main testing function that demonstrates the RAG process
 */
async function testRagProcess() {
  console.log(chalk.blue.bold('📚 RAG Testing Tool 📚'));
  console.log(chalk.gray('Enter a query to test the RAG process. Type "exit" to quit.\n'));

  // Validate environment variables
  if (!PINECONE_API_KEY || !PINECONE_INDEX || !OPENAI_API_KEY) {
    console.error(chalk.red('❌ Missing required environment variables'));
    console.log(chalk.yellow('Please make sure you have set:'));
    console.log('- PINECONE_API_KEY');
    console.log('- PINECONE_INDEX');
    console.log('- OPENAI_API_KEY');
    rl.close();
    return;
  }

  // Function to handle user queries
  const askQuestion = () => {
    rl.question(chalk.green('\n🔍 Enter your query: '), async (query) => {
      if (query.toLowerCase() === 'exit') {
        console.log(chalk.blue('👋 Goodbye!'));
        rl.close();
        return;
      }

      try {
        await processQuery(query);
        askQuestion(); // Continue prompting
      } catch (error: any) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        askQuestion(); // Continue despite error
      }
    });
  };

  // Start asking questions
  askQuestion();
}

/**
 * Process a single user query through the RAG pipeline
 */
async function processQuery(query: string) {
  console.log(chalk.gray('\n---------------------------------------------'));
  console.log(chalk.blue.bold('Step 1: 🔎 Retrieving relevant content from Pinecone'));
  console.log(chalk.gray(`Query: "${query}"`));
  
  // STEP 1: Retrieve relevant documents from Pinecone
  console.log(chalk.gray('Searching for relevant content...'));
  const startTime = Date.now();
  const results = await searchContentUsingPinecone(
    query,
    3, // topK
    PINECONE_API_KEY,
    PINECONE_INDEX,
    'content-library' // namespace
  );
  const retrievalTime = Date.now() - startTime;
  
  // Display retrieval results
  console.log(chalk.green(`✅ Retrieved ${results.length} relevant documents in ${retrievalTime}ms`));
  
  if (results.length === 0) {
    console.log(chalk.yellow('⚠️ No relevant content found. Try a different query.'));
    return;
  }
  
  console.log('\nRetrieved Content:');
  results.forEach((result: any, i: number) => {
    console.log(chalk.cyan(`\n[${i+1}] ${result.title} (${result.type}) - Similarity: ${(result.similarity * 100).toFixed(2)}%`));
    console.log(chalk.gray(`URL: ${result.url}`));
    console.log(chalk.white(`"${result.content}"`));
  });
  
  // STEP 2: Format context for LLM
  console.log(chalk.gray('\n---------------------------------------------'));
  console.log(chalk.blue.bold('Step 2: 📝 Formatting context for LLM'));
  
  // Create a context from the retrieved documents
  const context = results.map((result: any, i: number) => 
    `[Document ${i+1}] ${result.title}\n${result.content}`
  ).join('\n\n');
  
  console.log(chalk.gray('Context created with retrieved documents'));
  
  // STEP 3: Send to LLM with appropriate prompt
  console.log(chalk.gray('\n---------------------------------------------'));
  console.log(chalk.blue.bold('Step 3: 🧠 Generating response with LLM'));
  
  const promptTemplate = `
You are a helpful assistant that answers questions based on the provided context.
If the answer cannot be found in the context, say you don't know based on the available information.
Do not make up information.

CONTEXT:
${context}

USER QUERY: ${query}

ANSWER:`;

  console.log(chalk.gray('Sending prompt to OpenAI...'));
  
  // Generate response using OpenAI
  const generationStartTime = Date.now();
  const response = await generateOpenAIText(promptTemplate, 'gpt-4o', OPENAI_API_KEY);
  const generationTime = Date.now() - generationStartTime;
  
  // STEP 4: Display final result
  console.log(chalk.gray('\n---------------------------------------------'));
  console.log(chalk.blue.bold('Step 4: ✨ Final Response'));
  console.log(chalk.green(`Generation time: ${generationTime}ms`));
  console.log(chalk.yellow('\nAnswer:'));
  console.log(chalk.white(response));
  console.log(chalk.gray('\n---------------------------------------------'));
}

// Run the test
testRagProcess().catch(error => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
});