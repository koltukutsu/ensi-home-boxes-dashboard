import { generateChunks } from '@/lib/ai-utils';

// Example text to demonstrate chunking
const sampleText = `
Welcome to our comprehensive guide on artificial intelligence. AI is changing the way we interact with technology. It's making our devices smarter and more responsive to our needs. Machine learning, a subset of AI, allows computers to learn from data without explicit programming. Deep learning, a more sophisticated approach, uses neural networks with many layers to analyze complex patterns. Natural Language Processing enables computers to understand and generate human language. Computer vision helps machines interpret and make decisions based on visual data. Reinforcement learning teaches AI agents to make sequences of decisions by rewarding desired behaviors. Edge AI brings artificial intelligence capabilities to local devices, reducing latency and privacy concerns. Explainable AI focuses on making AI decisions understandable to humans. Generative AI can create new content like images, text, and music that resembles human-created work. Federated learning allows models to be trained across multiple devices while keeping data private. AI ethics addresses concerns about bias, privacy, and the societal impact of artificial intelligence systems. The future of AI holds tremendous potential for solving complex problems in healthcare, climate science, and many other fields. Responsible development of AI technology requires collaboration between technical experts, policymakers, and the public to ensure benefits are broadly shared while minimizing potential harms.
`;

// Test the chunking function
function testChunking() {
  console.log("ORIGINAL TEXT:");
  console.log("=============");
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
}

testChunking(); 