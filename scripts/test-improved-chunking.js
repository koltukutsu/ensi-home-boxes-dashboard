// Implementation of the improved generateChunks function
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

// Example texts to demonstrate chunking
const samples = [
  {
    name: "LONG DOCUMENT",
    text: `Welcome to our comprehensive guide on artificial intelligence. AI is changing the way we interact with technology. It's making our devices smarter and more responsive to our needs. Machine learning, a subset of AI, allows computers to learn from data without explicit programming. Deep learning, a more sophisticated approach, uses neural networks with many layers to analyze complex patterns. Natural Language Processing enables computers to understand and generate human language. Computer vision helps machines interpret and make decisions based on visual data. Reinforcement learning teaches AI agents to make sequences of decisions by rewarding desired behaviors. Edge AI brings artificial intelligence capabilities to local devices, reducing latency and privacy concerns. Explainable AI focuses on making AI decisions understandable to humans. Generative AI can create new content like images, text, and music that resembles human-created work. Federated learning allows models to be trained across multiple devices while keeping data private. AI ethics addresses concerns about bias, privacy, and the societal impact of artificial intelligence systems. The future of AI holds tremendous potential for solving complex problems in healthcare, climate science, and many other fields. Responsible development of AI technology requires collaboration between technical experts, policymakers, and the public to ensure benefits are broadly shared while minimizing potential harms.`
  },
  {
    name: "SEQUENTIAL SENTENCES",
    text: `This is a single sentence that will be chunked on its own. This is another sentence that should be in the same paragraph. Here's a third sentence to demonstrate paragraph grouping. Let's add a fourth sentence to get closer to our paragraph limit. This fifth sentence continues building the paragraph. The sixth sentence adds more content. Sentence seven is still part of the same paragraph. Now the eighth sentence should complete our first paragraph. This ninth sentence should start a second paragraph. And this tenth sentence continues the second paragraph.`
  },
  {
    name: "SHORT TEXT",
    text: `Artificial intelligence is transforming industries. Machine learning models can find patterns in data.`
  },
  {
    name: "VERY LONG SENTENCES",
    text: `The implementation of advanced artificial intelligence algorithms in contemporary technological frameworks represents a significant paradigm shift in how computational systems interact with and interpret complex data structures, especially in scenarios where traditional rule-based approaches fail to capture the inherent nonlinear relationships between variables. Machine learning methodologies, particularly those leveraging deep neural network architectures with multiple hidden layers of computation, have demonstrated remarkable capabilities in tasks ranging from natural language understanding to computer vision and strategic decision-making, often surpassing human-level performance in narrowly defined domains while still requiring substantial human oversight and intervention for broader, more generalized applications.`
  }
];

// Test the chunking function
function testImprovedChunking() {
  samples.forEach(sample => {
    console.log(`\n========== ${sample.name} ==========`);
    console.log("\nORIGINAL TEXT:");
    console.log(sample.text);
    console.log("\n");
    
    console.log("IMPROVED CHUNKS (PARAGRAPHS):");
    console.log("===================");
    const chunks = generateChunks(sample.text);
    
    chunks.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1} (${chunk.length} characters):`);
      console.log(chunk);
      console.log("---");
    });
    
    console.log(`\nTotal chunks: ${chunks.length}`);
    if (chunks.length > 0) {
      console.log(`Average chunk size: ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length)} characters`);
    }
  });
}

// Run the test
testImprovedChunking(); 