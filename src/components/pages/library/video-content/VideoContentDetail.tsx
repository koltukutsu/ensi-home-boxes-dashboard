'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookmarkIcon, Share2, ExternalLink, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { useRouter } from 'next/navigation';
import { VideoContent } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/registry/new-york-v4/ui/use-toast';
import { VisitCounter } from '@/components/common/visit-counter';

interface VideoContentDetailProps {
  videoContent: VideoContent;
}

export function VideoContentDetail({ videoContent }: VideoContentDetailProps) {
  const router = useRouter();
  const { user, addToBookmarks, removeFromBookmarks, userData, addToViewHistory } = useAuth();
  const { toast } = useToast();
  
  // Function to extract YouTube video ID from URL
  const getYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  // Get YouTube video ID
  const videoId = getYoutubeVideoId(videoContent.youtube_url);
  
  // Content ID for recommendations and visit tracking
  const contentId = videoContent.name_video;
  
  // Increment visit count when viewing the content
  // useEffect(() => {
  //   incrementVisit(contentId, 'video');
  // }, [contentId, incrementVisit]);
  
  const [isBookmarked, setIsBookmarked] = useState(() => {
    if (userData?.bookmarks) {
      return userData.bookmarks.includes(contentId);
    }
    return false;
  });


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
        await removeFromBookmarks(contentId);
        setIsBookmarked(false);
        toast({
          title: "Bookmark removed",
          description: "Video removed from your bookmarks"
        });
      } else {
        await addToBookmarks(contentId);
        setIsBookmarked(true);
        toast({
          title: "Bookmarked",
          description: "Video added to your bookmarks"
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
          title: videoContent.name_video,
          text: videoContent.description_video,
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation and actions */}
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
      
      {/* Video Header */}
      <div className="mb-10 relative">
        <div className="absolute top-0 right-0">
          <div className="bg-[#E53935]/10 px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="font-semibold text-[#E53935]">
              <VisitCounter contentId={contentId} small={false} hideIcon={false} className="text-[#E53935]" />
            </span>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">
          {videoContent.name_video}
        </h1>
        <p className="text-xl text-muted-foreground mb-4">
          {videoContent.description_video}
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {videoContent.related_categories.map((category) => (
            <Link href={`/library?category=${encodeURIComponent(category)}`} key={category}>
              <Badge variant="outline" className="bg-primary/10 hover:bg-primary/20 transition-colors">
                {category}
              </Badge>
            </Link>
          ))}
        </div>
        <Separator />
      </div>
      
      {/* Video Content */}
      <div className="grid grid-cols-1 gap-8 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm">
        {/* Video Player */}
        {videoId && (
          <div className="w-full">
            <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden">
              <iframe 
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={videoContent.name_video}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}
        
        {/* Video Transcript */}
        <div className="prose prose-lg dark:prose-invert max-w-none mt-6">
          <h2 className="text-2xl font-bold mb-4">Transcript</h2>
          <div className="bg-card rounded-lg border p-6">
            {(() => {
              // Track the current speaker
              let currentSpeaker = '';
              
              // Group content by speaker
              const contentGroups: Array<{speaker: string, content: string}> = [];
              
              // Process the content line by line
              videoContent.mp3_content.split('\n').forEach((line: string) => {
                if (line.startsWith('Speaker ')) {
                  const [speakerPart, ...contentParts] = line.split(': ');
                  const content = contentParts.join(': ');
                  
                  // If speaker changed, start a new group
                  if (speakerPart !== currentSpeaker) {
                    currentSpeaker = speakerPart;
                    contentGroups.push({ speaker: speakerPart, content });
                  } else {
                    // Same speaker, concatenate content
                    const lastGroup = contentGroups[contentGroups.length - 1];
                    lastGroup.content += ' ' + content;
                  }
                } else if (contentGroups.length > 0) {
                  // Continuation line
                  const lastGroup = contentGroups[contentGroups.length - 1];
                  lastGroup.content += ' ' + line;
                } else {
                  // If there's no speaker format, create a default group
                  contentGroups.push({ speaker: "Transcript", content: line });
                }
              });
              
              // Function to split text into paragraphs
              const createParagraphs = (text: string): string[] => {
                // Ensure proper spacing after periods
                text = text.replace(/\.(\S)/g, '. $1');
                
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
              
              // If no content groups were created, handle plain text
              if (contentGroups.length === 0 && videoContent.mp3_content) {
                contentGroups.push({ 
                  speaker: "Transcript", 
                  content: videoContent.mp3_content 
                });
              }
              
              // Render grouped content
              return contentGroups.map((group, groupIndex) => {
                const paragraphs = createParagraphs(group.content);
                
                return (
                  <div key={groupIndex} className={`mb-8 last:mb-0 ${groupIndex !== 0 ? 'mt-8' : ''}`}>
                    <div className="font-bold text-primary bg-primary/10 px-3 py-2 rounded-md inline-block mb-4">
                      {group.speaker}:
                    </div>
                    <div className="space-y-5 pl-1">
                      {paragraphs.map((paragraph, paraIndex) => (
                        <p key={paraIndex} className="leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
        
        {/* Original Source Link */}
        {videoContent.youtube_url && (
          <div className="mt-6 border-t pt-6">
            <Button variant="outline" asChild className="gap-2">
              <a href={videoContent.youtube_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span>View Original Video</span>
              </a>
            </Button>
          </div>
        )}
        
        {/* Attribution note */}
        <div className="mt-8 text-xs text-muted-foreground text-center">
          <p>✨ This content is provided for educational purposes. All rights reserved by the original authors. ✨</p>
        </div>
      </div>
    </div>
  );
} 