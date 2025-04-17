# AI Chat Feature - Ochtarcus

This document describes the implementation of the AI Chat feature in the Ochtarcus platform, which allows users to interact with an AI assistant that can understand and respond to queries about the content library.

## Overview

The AI Chat feature is a generative AI RAG (Retrieval Augmented Generation) system that uses the Vercel AI SDK to provide conversational access to the Ochtarcus content library. The feature:

1. Requires user authentication
2. Requires either a subscription or a user-provided OpenAI API key
3. Streams responses in real-time using the edge runtime
4. Provides references to relevant content in the library

## Implementation Details

### Component Structure

- `/app/ai-chat/page.tsx`: Main entry point for the AI Chat feature, handles authentication, API key verification, and subscription checks
- `/components/pages/ai-chat/AiChatMain.tsx`: The main chat interface component with message display and input
- `/app/api/ai-chat/route.ts`: API route that processes chat requests and communicates with OpenAI
- `/lib/db.ts`: Database utilities for the RAG system (content embeddings and search)

### Authentication and API Key Management

Users must be authenticated to use the AI Chat feature. Additionally, they must either:

1. Have an active subscription to Ochtarcus Pro, or
2. Provide their own OpenAI API key

The API key is stored:
- In localStorage for browser persistence
- Optionally in the user's Firestore document (encrypted)

#### API Key Validation

To prevent fraud and ensure a better user experience, API keys are validated before they are saved and used:

1. When a user adds an API key in their profile, the system validates it by making a test request to the OpenAI API
2. Invalid keys are rejected with appropriate error messages
3. The API route also validates keys before using them to prevent using fraudulent or expired keys
4. Users receive clear guidance if their key is invalid, with links to update it

This validation process ensures:
- Only valid API keys are stored and used
- Users don't waste time trying to use invalid keys
- Better error handling throughout the chat experience

### Subscription Management

A subscription system has been implemented allowing users to choose between:
- Free tier (requires API key for AI Chat)
- Pro tier ($9.99/month, includes AI Chat)
- Enterprise tier ($49.99/month, includes advanced features)

The `/subscribe` page presents these options and will eventually integrate with a payment processor.

#### Subscription and API Key Priority Flow

The system follows this priority when determining chat access:

1. Check if the user has an active subscription (Pro or Enterprise)
   - If yes, allow access without requiring an API key
   - Subscription status is verified in the API route via the Firestore database

2. If no subscription is active, check for a valid API key
   - Either from localStorage (client-side)
   - Or from the user's Firestore document

3. If neither is available, show the user options to:
   - Subscribe to a paid plan
   - Add their own OpenAI API key

This approach gives users flexibility while ensuring the system is secure and fraud-resistant.

### RAG Implementation

The Retrieval Augmented Generation system:
1. Takes a user query
2. Searches the content library for relevant documents
3. Provides these documents as context to the AI model
4. Generates a response that references relevant content

The current implementation includes a placeholder search function in `db.ts` that will be expanded to use proper vector embeddings.

## Technologies Used

- [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction)
- OpenAI API (gpt-4o model)
- Drizzle ORM (for database operations)
- Firebase Authentication (for user management)
- React/Next.js (frontend framework)

## Future Enhancements

1. Implement proper vector embeddings for more accurate content retrieval
2. Add content-based filtering to improve relevance
3. Implement history tracking for chat conversations
4. Add the ability to bookmark or save chat responses
5. Extend the system to include more content sources
6. Implement usage tracking and limits for paid subscription tiers

## Usage

To use the AI Chat feature:

1. Users must be logged in
2. They must either subscribe to a paid plan or provide an OpenAI API key in their profile
3. They can then navigate to `/ai-chat` and start interacting with the assistant

The chat interface provides suggested prompts to help users get started.
