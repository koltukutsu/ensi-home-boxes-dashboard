// Import the chunking function
// Since this is a JS file, we'd need to dynamically import or copy the function
// For this test, let's copy the implementation directly

// Implementation of generateChunks
function generateChunks(input) {
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
  const paragraphs = [];
  let currentParagraph = '';
  
  // Control paragraph size with these parameters
  const idealSentencesPerParagraph = 8;  // Number of sentences per paragraph
  const maxParagraphLength = 500;       // Maximum character length per paragraph
  let sentenceCount = 0;
  
  sentences.forEach((sentence) => {
    // Start a new paragraph if:
    // 1. We've reached the ideal number of sentences OR
    // 2. The current paragraph is getting long
    if (sentenceCount >= idealSentencesPerParagraph || 
        (currentParagraph.length > 0 && currentParagraph.length + sentence.length > maxParagraphLength)) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph);
        currentParagraph = '';
        sentenceCount = 0;
      }
    }
    
    // Add space between sentences in the same paragraph
    if (currentParagraph) currentParagraph += ' ';
    
    currentParagraph += sentence;
    sentenceCount++;
  });
  
  // Add the last paragraph if not empty
  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs;
}

// Example text to demonstrate chunking
const sampleText = `
Welcome to our comprehensive guide on artificial intelligence. AI is changing the way we interact with technology. It's making our devices smarter and more responsive to our needs. Machine learning, a subset of AI, allows computers to learn from data without explicit programming. Deep learning, a more sophisticated approach, uses neural networks with many layers to analyze complex patterns. Natural Language Processing enables computers to understand and generate human language. Computer vision helps machines interpret and make decisions based on visual data. Reinforcement learning teaches AI agents to make sequences of decisions by rewarding desired behaviors. Edge AI brings artificial intelligence capabilities to local devices, reducing latency and privacy concerns. Explainable AI focuses on making AI decisions understandable to humans. Generative AI can create new content like images, text, and music that resembles human-created work. Federated learning allows models to be trained across multiple devices while keeping data private. AI ethics addresses concerns about bias, privacy, and the societal impact of artificial intelligence systems. The future of AI holds tremendous potential for solving complex problems in healthcare, climate science, and many other fields. Responsible development of AI technology requires collaboration between technical experts, policymakers, and the public to ensure benefits are broadly shared while minimizing potential harms.
`;

// Also create an alternative sampleText to show how single sentences would be chunked
const singleSentenceSample = `This is a single sentence that will be chunked on its own. This is another sentence that should be in the same paragraph. Here's a third sentence to demonstrate paragraph grouping. Let's add a fourth sentence to get closer to our paragraph limit. This fifth sentence continues building the paragraph. The sixth sentence adds more content. Sentence seven is still part of the same paragraph. Now the eighth sentence should complete our first paragraph. This ninth sentence should start a second paragraph. And this tenth sentence continues the second paragraph.`;

// Test the chunking function
function testChunking() {
  // Test with the long text sample
  console.log("SAMPLE 1 - LONG TEXT:");
  console.log("=====================");
  console.log(sampleText);
  console.log("\n");
  
  console.log("CHUNKS (PARAGRAPHS):");
  console.log("===================");
  const chunks = generateChunks(sampleText);
  
  chunks.forEach((chunk, index) => {
    console.log(`Chunk ${index + 1} (${chunk.length} characters):`);
    console.log(chunk);
    console.log("---");
  });
  
  console.log(`\nTotal chunks: ${chunks.length}`);
  console.log(`Average chunk size: ${chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length} characters`);
  
  // Test with the single sentence sample
  console.log("\n\nSAMPLE 2 - SENTENCE GROUPING:");
  console.log("============================");
  console.log(singleSentenceSample);
  console.log("\n");
  
  console.log("CHUNKS (PARAGRAPHS):");
  console.log("===================");
  const chunks2 = generateChunks(singleSentenceSample);
  
  chunks2.forEach((chunk, index) => {
    console.log(`Chunk ${index + 1} (${chunk.length} characters):`);
    console.log(chunk);
    console.log("---");
  });
  
  console.log(`\nTotal chunks: ${chunks2.length}`);
  console.log(`Average chunk size: ${chunks2.reduce((sum, chunk) => sum + chunk.length, 0) / chunks2.length} characters`);
}

testChunking(); 