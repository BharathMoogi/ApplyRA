import { ai } from './index';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runTests() {
  console.log("=== AI Service Layer Test ===");
  console.log(`Configured Provider: ${process.env.AI_PROVIDER || 'groq (default)'}`);

  // Test 1: Generate Text
  console.log("\n--- Testing generateText ---");
  try {
    const textResponse = await ai.active.generateText({
      prompt: "Explain recursive functions in one simple sentence.",
      systemPrompt: "You are a concise computer science professor."
    });
    if (textResponse.success) {
      console.log(`Success! Response: "${textResponse.data}"`);
      console.log("Metadata:", textResponse.metadata);
    } else {
      console.error("Failed:", textResponse.error);
    }
  } catch (err) {
    console.error("Exception during generateText:", err);
  }

  // Test 2: Generate Object (JSON Schema validation)
  console.log("\n--- Testing generateObject (JSON Schema) ---");
  const testSchema = z.object({
    topic: z.string(),
    keywords: z.array(z.string()),
    difficulty: z.enum(['easy', 'medium', 'hard'])
  });

  try {
    const objResponse = await ai.active.generateObject<z.infer<typeof testSchema>>({
      prompt: "Give me information about 'React Server Components' in standard JSON format.",
      schema: testSchema
    });
    if (objResponse.success) {
      console.log("Success! Object:", objResponse.data);
      console.log("Metadata:", objResponse.metadata);
    } else {
      console.error("Failed:", objResponse.error);
    }
  } catch (err) {
    console.error("Exception during generateObject:", err);
  }

  // Test 3: Stream Text
  console.log("\n--- Testing streamText ---");
  try {
    const streamResponse = await ai.active.streamText({
      prompt: "Count to 5 in words, slowly with commas."
    });

    if (streamResponse.success) {
      console.log("Success! Streaming response chunks:");
      const reader = streamResponse.data.stream.getReader();
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          process.stdout.write(value + " | ");
        }
        done = streamDone;
      }
      console.log("\nStream completed.");
    } else {
      console.error("Failed:", streamResponse.error);
    }
  } catch (err) {
    console.error("Exception during streamText:", err);
  }
}

runTests();
