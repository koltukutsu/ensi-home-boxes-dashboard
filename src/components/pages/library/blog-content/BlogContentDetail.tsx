'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookmarkIcon, Share2, Eye, ChevronRight, BookOpen, CalendarIcon, Users } from 'lucide-react';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { ScrollArea } from '@/registry/new-york-v4/ui/scroll-area';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BlogPost } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/registry/new-york-v4/ui/use-toast';
import { VisitCounter } from '@/components/common/visit-counter';
// import { RecommendationSection } from '@/components/common/recommendation-section';

interface BlogContentDetailProps {
  blogPost: BlogPost;
}

export function BlogContentDetail({ blogPost }: BlogContentDetailProps) {
  const router = useRouter();
  const { user, addToBookmarks, removeFromBookmarks, userData, addToViewHistory } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(() => {
    if (userData?.bookmarks) {
      return userData.bookmarks.includes(blogPost.name_blog);
    }
    return false;
  });
  
  const contentId = blogPost.name_blog;
  
  // // Increment visit count when viewing the content
  // useEffect(() => {
  //   incrementVisit(contentId, 'blog');
  // }, [contentId, incrementVisit]);

  const handleBack = () => {
    router.back();
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to sign in to bookmark content",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isBookmarked) {
        await removeFromBookmarks(blogPost.name_blog);
        setIsBookmarked(false);
        toast({
          title: "Bookmark removed",
          description: "Article removed from your bookmarks"
        });
      } else {
        await addToBookmarks(blogPost.name_blog);
        setIsBookmarked(true);
        toast({
          title: "Bookmarked",
          description: "Article added to your bookmarks"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update bookmark status",
        variant: "destructive"
      });
    }
  };

  const shareContent = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: blogPost.name_blog,
          text: blogPost.description_blog,
          url: window.location.href,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not share content",
          variant: "destructive"
        });
      }
    } else {
      // Fallback - copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "URL copied to clipboard"
      });
    }
  };

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
  const renderTextContent = (text: string) => {
    const paragraphs = createParagraphs(text);
    
    return (
      <div className="space-y-5">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="leading-relaxed">{paragraph}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
      {/* Back button and actions */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleBookmark}
            className="flex items-center gap-1"
          >
            <BookmarkIcon className={`h-4 w-4 ${isBookmarked ? 'fill-primary text-primary' : ''}`} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={shareContent}
            className="flex items-center gap-1"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>
      
      {/* Blog header */}
      <div className="mb-8 relative">
        <div className="absolute top-0 right-0">
          <div className="bg-[#E53935]/10 px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="font-semibold text-[#E53935]">
              <VisitCounter contentId={contentId} small={false} hideIcon={false} className="text-[#E53935]" />
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-primary">{blogPost.name_blog}</h1>
        </div>
        <p className="text-lg text-muted-foreground mb-4">{blogPost.description_blog}</p>
        
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">{blogPost.authors.join(', ')}</span>
          </div>
          
          {blogPost.date_published && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {new Date(blogPost.date_published).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm">{blogPost.content.table_of_contents?.length || 0} sections</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-2">
          {blogPost.related_categories.map((category) => (
            <Link href={`/library?category=${encodeURIComponent(category)}`} key={category}>
              <Badge variant="outline" className="bg-primary/10 hover:bg-primary/20 transition-colors">
                {category}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Table of Contents */}
      {blogPost.content.table_of_contents && blogPost.content.table_of_contents.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm">
          <div className="bg-muted/50 rounded-lg p-4 mb-8">
            <h2 className="font-semibold mb-2">Table of Contents</h2>
            <ol className="list-decimal list-inside space-y-1">
              {blogPost.content.table_of_contents.map((item, index) => (
                <li key={index} className="text-sm hover:text-primary transition-colors">
                  <a href={`#section-${index + 1}`}>{item}</a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      
      <Separator className="my-6" />
      
      {/* Blog content */}
      <ScrollArea className="relative">
        <div className="prose prose-slate dark:prose-invert max-w-none mb-8">
          {blogPost.content.whole_content.split('\n\n').map((paragraph, pIndex) => {
            // Check if paragraph is a heading (starts with # or ##)
            if (paragraph.startsWith('# ')) {
              const headingText = paragraph.replace('# ', '');
              const headingId = `section-${pIndex + 1}`;
              return (
                <h2 id={headingId} key={pIndex} className="text-2xl font-bold mt-8 mb-4 scroll-mt-20">
                  {headingText}
                </h2>
              );
            } else if (paragraph.startsWith('## ')) {
              const headingText = paragraph.replace('## ', '');
              return <h3 key={pIndex} className="text-xl font-semibold mt-6 mb-3">{headingText}</h3>;
            } else if (paragraph.startsWith('### ')) {
              return (
                <h4 key={pIndex} className="text-lg font-semibold mt-5 mb-2">
                  {paragraph.replace('### ', '')}
                </h4>
              );
            } else if (paragraph.startsWith('* ') || paragraph.startsWith('- ')) {
              // Convert lists
              const listMarker = paragraph.startsWith('* ') ? '* ' : '- ';
              const items = paragraph.split('\n').map(item => item.replace(listMarker, ''));
              return (
                <ul key={pIndex} className="list-disc pl-6 my-4">
                  {items.map((item, i) => (
                    <li key={i} className="mb-1">{processParagraphText(item)}</li>
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
              // Regular paragraph with improved formatting
              return (
                <div key={pIndex} className="my-6">
                  {renderTextContent(paragraph)}
                </div>
              );
            }
          })}
        </div>
      </ScrollArea>
      
      {/* Attribution note */}
      <div className="mt-8 text-xs text-muted-foreground text-center">
        <p>✨ This content is provided for educational purposes. All rights reserved by the original authors. ✨</p>
      </div>
      
      {/* Related Content Section */}
      <Separator className="my-10" />
      {/* <RecommendationSection contentId={contentId} /> */}
    </div>
  );
} 