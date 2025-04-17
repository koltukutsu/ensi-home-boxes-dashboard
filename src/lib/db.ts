import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// Initialize Drizzle with the Vercel Postgres client
export const db = drizzle(sql);

// Define schema for content embeddings (for future RAG implementation)
export const contentEmbeddings = pgTable('content_embeddings', {
  id: serial('id').primaryKey(),
  contentId: varchar('content_id', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(), // 'video' or 'blog'
  embedding: text('embedding').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  url: varchar('url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define schema for chat history (optional, for later implementation)
export const chatHistory = pgTable('chat_history', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  message: text('message').notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
  createdAt: timestamp('created_at').defaultNow(),
});

// Helper function to search for content (mock implementation for now)
export async function searchContent(query: string, contentType: 'all' | 'video' | 'blog' = 'all', limit: number = 5) {
  // This would be replaced with actual database queries using embeddings
  // For now, returning mock data
  return [
    {
      id: 'video-1',
      title: 'Introduction to Startups',
      type: 'video',
      description: 'Learn the basics of starting a company and what to expect in your first year.',
      url: '/library/videos/intro-to-startups',
    },
    {
      id: 'blog-1',
      title: 'Fundraising 101',
      type: 'blog',
      description: 'Everything you need to know about raising your first round of funding.',
      url: '/library/blogs/fundraising-101',
    },
  ].slice(0, limit);
} 