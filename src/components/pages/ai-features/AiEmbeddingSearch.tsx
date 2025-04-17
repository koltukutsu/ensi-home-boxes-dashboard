'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { SearchIcon, Loader2 } from 'lucide-react';
import { searchContentByEmbedding } from '@/lib/ai-utils';
import { AiKeyRequired } from '@/components/common/AiKeyRequired';
import { useOpenAIKey } from '@/hooks/useOpenAIKey';

interface SearchResult {
  title: string;
  content: string;
  url: string;
  type: 'video' | 'blog';
  similarity: number;
}

export default function AiEmbeddingSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { apiKey } = useOpenAIKey();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || !apiKey) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      // Use the API key with the search function
      const searchResults = await searchContentByEmbedding(
        query,
        5,   // topK
        0.7, // similarityThreshold
        apiKey
      );
      
      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred during search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleResultClick = (url: string) => {
    router.push(url);
  };
  
  return (
    <AiKeyRequired>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Semantic Search</CardTitle>
          <CardDescription>
            Search our content library using AI-powered semantic search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <Input
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <SearchIcon className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </form>
          
          {error && (
            <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((result, index) => (
                <div 
                  key={index} 
                  className="border p-4 rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleResultClick(result.url)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{result.title}</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {result.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.content}</p>
                  <div className="text-xs text-muted-foreground">
                    Relevance: {Math.round(result.similarity * 100)}%
                  </div>
                </div>
              ))
            ) : (
              !isSearching && query && !error && (
                <div className="text-center p-8 text-muted-foreground">
                  No results found. Try a different search query.
                </div>
              )
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <div>
            Powered by OpenAI embeddings
          </div>
        </CardFooter>
      </Card>
    </AiKeyRequired>
  );
} 