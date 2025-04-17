'use client';

// import { useEffect } from 'react';
// import Link from 'next/link';
import { ChevronRight, Calendar, Users, Tag, Clock, Eye } from 'lucide-react';
import { VideoContent } from '@/types';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { BackLink } from '@/components/common/back-link';
import { useVisits } from '@/context/visit-context';
import { VisitCounter } from '@/components/common/visit-counter';
import { getContentId } from '@/lib/firebase-utils';
import { useEffect } from 'react';
import { usePageViewAnalytics } from '@/hooks/usePageViewAnalytics';
import { trackContentView } from '@/lib/analytics';

interface VideoContentViewProps {
  video: VideoContent;
}

export function VideoContentView({ video }: VideoContentViewProps) {
  const { incrementVisit } = useVisits();
  const contentId = getContentId(video);
  
  // Track page view with specific content details
  usePageViewAnalytics({
    pageName: video.name_video,
    pageId: contentId,
    pageCategory: 'video',
    additionalParams: {
      content_categories: video.related_categories,
      content_length: video.mp3_content?.length || 0,
      has_youtube: !!video.youtube_url
    }
  });
  
  // Track specific content view
  useEffect(() => {
    trackContentView(contentId, 'video', video.name_video);
    // Also increment local visit counter
    incrementVisit(contentId, 'video');
  }, [contentId, incrementVisit, video.name_video]);
  
  // Function to extract YouTube video ID from URL
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Get video ID from URL
  const videoId = video.youtube_url ? getYoutubeId(video.youtube_url) : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-8">
        <BackLink href="/library">
          Library
        </BackLink>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{video.name_video}</span>
      </div>

      {/* Video Header */}
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
          {video.name_video}
        </h1>
        <p className="text-xl text-muted-foreground mb-4">
          {video.description_video}
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {video.related_categories.map((category: string) => (
            <Badge key={category} variant="outline" className="bg-primary/10 text-primary">
              {category}
            </Badge>
          ))}
        </div>
        <Separator />
      </div>

      {/* Video Content */}
      <div className="grid grid-cols-1 gap-8">
        {/* Video Player */}
        <div className="w-full">
          {videoId ? (
            <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden">
              <iframe 
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={video.name_video}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-10 text-center">
              <p>Video embed not available. Please use the button below to view the video.</p>
              {video.youtube_url && (
                <Button className="mt-4" asChild>
                  <a href={video.youtube_url} target="_blank" rel="noopener noreferrer">
                    View Video
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Video Description and Key Points */}
        <div className="prose prose-lg dark:prose-invert max-w-none mt-6">
          <h2 className="text-2xl font-bold mb-4">Content</h2>
          <div className="bg-card rounded-lg border p-6">
            {(() => {
              // Track the current speaker
              let currentSpeaker = '';
              
              // Group content by speaker
              const contentGroups: Array<{speaker: string, content: string}> = [];
              
              // Process the content line by line
              video.mp3_content.split('\n').forEach((line: string) => {
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
        {video.youtube_url && (
          <div className="mt-6 border-t pt-6">
            <Button variant="outline" asChild className="gap-2">
              <a href={video.youtube_url} target="_blank" rel="noopener noreferrer">
                <span>View Original Video</span>
              </a>
            </Button>
          </div>
        )}

        {/* Attribution note */}
        <div className="mt-8 text-xs text-muted-foreground text-center">
          <p>✨ This lovely content is brought to you courtesy of Y Combinator. All rights and cool ideas belong to them! ✨</p>
        </div>
      </div>
    </div>
  );
} 