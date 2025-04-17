'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, CalendarIcon, Users, Eye } from 'lucide-react';
import { BlogPost } from '@/types';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { ScrollArea } from '@/registry/new-york-v4/ui/scroll-area';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { BackLink } from '@/components/common/back-link';
import { useVisits } from '@/context/visit-context';
import { VisitCounter } from '@/components/common/visit-counter';
import { getContentId } from '@/lib/firebase-utils';
import { usePageViewAnalytics } from '@/hooks/usePageViewAnalytics';
import { trackContentView } from '@/lib/analytics';

interface BlogContentViewProps {
  blog: BlogPost;
}

export function BlogContentView({ blog }: BlogContentViewProps) {
  const { incrementVisit } = useVisits();
  const contentId = getContentId(blog);
  
  // Track page view with specific content details
  usePageViewAnalytics({
    pageName: blog.name_blog,
    pageId: contentId,
    pageCategory: 'blog',
    additionalParams: {
      content_categories: blog.related_categories,
      content_length: blog.content.whole_content?.length || 0,
      author: blog.authors.join(', ')
    }
  });
  
  // Track specific content view and increment local counter
  useEffect(() => {
    trackContentView(contentId, 'blog', blog.name_blog);
    incrementVisit(contentId, 'blog');
  }, [contentId, incrementVisit, blog.name_blog]);
  
  // Function to process paragraph text and make it more readable
  const processParagraphText = (text: string): string => {
    // Ensure proper spacing after periods
    return text.replace(/\.(\S)/g, '. $1')
      // Fix spacing after commas
      .replace(/,(\S)/g, ', $1')
      // Fix spacing after colons and semicolons
      .replace(/([;:])(\S)/g, '$1 $2')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Function to create readable paragraphs from text
  const createParagraphs = (text: string): string[] => {
    // Pre-process the text to ensure proper spacing
    text = processParagraphText(text);
    
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
    
    // Adjust this value to control paragraph length
    const idealSentencesPerParagraph = 8;
    let sentenceCount = 0;
    
    sentences.forEach((sentence) => {
      // Start a new paragraph if:
      // 1. We've reached the ideal number of sentences OR
      // 2. The current paragraph is getting long (over 400 chars)
      if (sentenceCount >= idealSentencesPerParagraph || 
          (currentParagraph.length > 0 && currentParagraph.length + sentence.length > 400)) {
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
  };

  // Process regular text content into paragraphs
  const renderTextContent = (content: string) => {
    const paragraphs = createParagraphs(content);
    
    return (
      <div className="space-y-5">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="leading-relaxed">{paragraph}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-8">
        <BackLink href="/library">
          Library
        </BackLink>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{blog.name_blog}</span>
      </div>

      {/* Blog Header */}
      <div className="mb-10 relative">
        <div className="absolute top-0 right-0">
          <div className="bg-[#E53935]/10 px-3 py-1.5 rounded-md flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#E53935]" />
            <span className="font-semibold text-[#E53935]">
              <VisitCounter contentId={contentId} small={true} hideIcon={true} className="text-[#E53935]" />
            </span>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">
          {blog.name_blog}
        </h1>
        <p className="text-xl text-muted-foreground mb-4">
          {blog.description_blog}
        </p>
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">{blog.authors.join(', ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm">{blog.content.table_of_contents.length} sections</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {blog.related_categories.map((category) => (
            <Badge key={category} variant="outline" className="bg-primary/10 text-primary">
              {category}
            </Badge>
          ))}
        </div>
        <Separator />
      </div>

      {/* Blog Content */}
      <div className="grid grid-cols-1 gap-8">
        {/* Main Content */}
        <div className="w-full">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {blog.content.whole_content.split('\n\n').map((paragraph, pIndex) => {
              // Check if this is a heading
              if (paragraph.startsWith('# ')) {
                return (
                  <h1 key={pIndex} id={`section-${pIndex}`} className="text-3xl font-bold mt-8 mb-4">
                    {paragraph.replace('# ', '')}
                  </h1>
                );
              } else if (paragraph.startsWith('## ')) {
                return (
                  <h2 key={pIndex} id={`section-${pIndex}`} className="text-2xl font-bold mt-8 mb-3">
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              } else if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={pIndex} id={`section-${pIndex}`} className="text-xl font-bold mt-6 mb-2">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              } else if (paragraph.startsWith('- ')) {
                // Handle bullet points
                return (
                  <ul key={pIndex} className="list-disc pl-6 my-4">
                    {paragraph.split('\n').map((item, iIndex) => (
                      <li key={iIndex} className="mb-2">{processParagraphText(item.replace('- ', ''))}</li>
                    ))}
                  </ul>
                );
              } else if (paragraph.startsWith('1. ')) {
                // Handle numbered lists
                return (
                  <ol key={pIndex} className="list-decimal pl-6 my-4">
                    {paragraph.split('\n').map((item, iIndex) => {
                      const numberMatch = item.match(/^\d+\.\s/);
                      return numberMatch ? (
                        <li key={iIndex} className="mb-2">{processParagraphText(item.replace(numberMatch[0], ''))}</li>
                      ) : null;
                    })}
                  </ol>
                );
              } else if (paragraph.startsWith('```')) {
                // Handle code blocks
                const codeContent = paragraph.replace(/```.*\n([\s\S]*?)```/g, '$1');
                return (
                  <pre key={pIndex} className="bg-muted p-4 rounded-md overflow-x-auto my-4">
                    <code>{codeContent}</code>
                  </pre>
                );
              } else {
                // Regular paragraph - Using the advanced paragraph processing approach
                return (
                  <div key={pIndex} className="my-6 bg-card p-5 rounded-md border border-muted">
                    {renderTextContent(paragraph)}
                  </div>
                );
              }
            })}
          </div>
          
          {/* Original Source Link */}
          {/* {blog.page_url && (
            <div className="mt-12 border-t pt-6">
              <Button variant="outline" asChild className="gap-2">
                <a href={blog.page_url} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4" />
                  <span>View Original Article</span>
                </a>
              </Button>
            </div>
          )} */}
          
          {/* Attribution note */}
          <div className="mt-8 text-xs text-muted-foreground text-center">
            <p>✨ This lovely content is brought to you courtesy of Y Combinator. All rights and cool ideas belong to them! ✨</p>
          </div>
        </div>
      </div>
    </div>
  );
} 