'use client';

import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileTextIcon, PlayCircleIcon, UsersIcon, ChevronDownIcon, ChevronUpIcon, SearchIcon, BookmarkIcon } from 'lucide-react';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/registry/new-york-v4/ui/dialog';
import { ScrollArea } from '@/registry/new-york-v4/ui/scroll-area';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/registry/new-york-v4/ui/use-toast';
import { useAuth } from '@/context/auth-context';
import { useVisits } from '@/context/visit-context';
import { VisitCounter } from '@/components/common/visit-counter';
import { useScrollVisibility } from '@/hooks/use-scroll-visibility';
import { getContentId } from '@/lib/firebase-utils';

import { BlogPost, VideoContent, isVideoContent, isBlogPost } from '@/types';

// Function to convert name to slug
function getSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-');
}

type ContentCardProps = {
    item: VideoContent | BlogPost;
    onClick?: (item: VideoContent | BlogPost) => void;
    searchQuery?: string;
    isDeepSearch?: boolean;
    isBookmarkPage?: boolean;
    viewMode?: 'grid' | 'list';
    onVisibilityChange?: (isVisible: boolean, contentId: string) => void;
};

// Helper function to highlight matched text
function highlightText(text: string, query: string): React.ReactNode {
    if (!query || !text) return <>{text}</>;
    
    try {
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        
        return (
            <>
                {parts.map((part, i) => 
                    regex.test(part) ? 
                        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">{part}</mark> : 
                        <span key={i}>{part}</span>
                )}
            </>
        );
    } catch (e) {
        // If regex fails, return the original text
        return <>{text}</>;
    }
}

// Function to extract content snippets around matches
function extractMatchSnippets(content: string, query: string, snippetLength: number = 100): string[] {
    if (!query || !content) return [];
    
    try {
        const regex = new RegExp(query, 'gi');
        const snippets: string[] = [];
        let match;
        
        // Find all matches
        while ((match = regex.exec(content)) !== null) {
            const start = Math.max(0, match.index - snippetLength);
            const end = Math.min(content.length, match.index + match[0].length + snippetLength);
            let snippet = content.substring(start, end);
            
            // Add ellipsis if needed
            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';
            
            snippets.push(snippet);
            
            // Limit to 3 snippets
            if (snippets.length >= 3) break;
        }
        
        return snippets;
    } catch (e) {
        return [];
    }
}

export const ContentCard = memo(({ item, onClick, searchQuery = '', isDeepSearch = false, isBookmarkPage = false, viewMode = 'grid', onVisibilityChange }: ContentCardProps) => {
    const router = useRouter();
    const { user, userData, addToBookmarks, removeFromBookmarks, addToViewHistory } = useAuth();
    const { incrementVisit, preloadVisitData } = useVisits();
    const { toast } = useToast();
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isViewed, setIsViewed] = useState(false);
    const contentId = React.useMemo(() => getContentId(item), [item]);
    
    // Preload visit data for this content item as soon as card renders
    useEffect(() => {
        preloadVisitData([contentId]);
    }, [contentId, preloadVisitData]);
    
    // Track when card is visible in viewport
    const [inViewRef, isVisible, wasEverVisible] = useScrollVisibility<HTMLDivElement>({
        threshold: 0.6, // Card must be 60% visible
        triggerOnce: false // Allow tracking visibility changes
    });
    
    // Call onVisibilityChange callback when visibility changes, with performance optimizations
    useEffect(() => {
        // Skip visibility reporting if callback is not provided
        if (!onVisibilityChange) return;
        
        // Use a short timeout to debounce visibility changes and prevent excessive updates
        const visibilityTimer = setTimeout(() => {
            // Only track visibility for preloading data, not for incrementing counts
            onVisibilityChange(isVisible, contentId);
        }, 300);
        
        return () => {
            clearTimeout(visibilityTimer);
        };
    }, [isVisible, contentId, onVisibilityChange]);
    
    // Check if the content is bookmarked
    useEffect(() => {
        if (isBookmarkPage) {
            // In bookmarks page, we know it's bookmarked
            setIsBookmarked(true);
            return;
        }
        
        if (userData && userData.bookmarks) {
            const isItemBookmarked = userData.bookmarks.includes(contentId);
            setIsBookmarked(isItemBookmarked);
        }
    }, [userData, contentId, isBookmarkPage]);
    
    // Check if the content has been viewed before
    useEffect(() => {
        if (userData && userData.viewHistory) {
            const hasBeenViewed = userData.viewHistory.includes(contentId);
            setIsViewed(hasBeenViewed);
        }
    }, [userData, contentId]);
    
    // If we're in deep search mode with a query, use the DeepSearchCard
    if (isDeepSearch && searchQuery) {
        return <DeepSearchCard item={item} searchQuery={searchQuery} isBookmarkPage={isBookmarkPage} onVisibilityChange={onVisibilityChange} />;
    }
    
    const isVideo = isVideoContent(item);
    const isBlog = isBlogPost(item);
    
    // Generate the appropriate URL for the content type
    const contentUrl = isVideo 
        ? `/library/video-content/${getSlugFromName(isVideo ? item.name_video : '')}`
        : `/library/blog-content/${getSlugFromName(isBlog ? item.name_blog : '')}`;

    const title = isVideo ? item.name_video : item.name_blog;
    const description = isVideo ? item.description_video : item.description_blog;

    // Handle the animated navigation and record view history
    const handleViewContent = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // Add to view history if user is logged in
        if (user) {
            addToViewHistory(contentId);
        }
        
        // Get the categories for this content
        const categories = isVideo ? item.related_categories : item.related_categories;
        
        // Only increment visit count when user actually clicks to view the content
        incrementVisit(contentId, isVideo ? 'video' : 'blog', categories)
            .catch(error => console.error('Failed to increment visit:', error));
        
        // Add exit animation to the current page
        document.documentElement.classList.add('page-exit');
        
        // Navigate to the content page after a short delay
        setTimeout(() => {
            router.push(contentUrl);
        }, 300); // Matches the CSS transition duration
    };
    
    // Modify the toggleBookmark function to skip if isBookmarkPage is true
    const toggleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Don't allow toggling in bookmarks page - use the dedicated remove button instead
        if (isBookmarkPage) return;
        
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
                toast({
                    title: "Bookmark removed",
                    description: "Content removed from your bookmarks"
                });
            } else {
                await addToBookmarks(contentId);
                toast({
                    title: "Bookmarked",
                    description: "Content added to your bookmarks"
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

    return (
        <motion.div
            ref={inViewRef}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="h-full"
        >
            <Card className={`h-full flex flex-col hover:shadow-md transition-shadow duration-200 ${viewMode === 'list' ? 'flex-row gap-2' : ''} ${isViewed ? 'border-primary/30 bg-primary/5' : ''} overflow-hidden`}>
                <CardHeader className={`${viewMode === 'list' ? 'flex-1 min-w-0' : ''} p-2 pt-3 sm:p-3 sm:pt-4 md:p-4 md:pt-5`}>
                    <div className="flex items-center gap-2">
                        {isVideo && <PlayCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />}
                        {isBlog && <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />}
                        <CardTitle className={`text-base sm:text-lg ${viewMode === 'list' ? 'truncate' : 'line-clamp-2'} cursor-pointer hover:text-primary transition-colors`} onClick={handleViewContent}>
                            {searchQuery ? highlightText(title, searchQuery) : title}
                        </CardTitle>
                        <button 
                            onClick={toggleBookmark}
                            className="ml-auto p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0 touch-manipulation"
                            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                        >
                            <BookmarkIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        </button>
                    </div>
                    <CardDescription className={`mt-1.5 sm:mt-2 ${viewMode === 'list' ? 'line-clamp-1' : 'line-clamp-5'} text-xs sm:text-sm cursor-pointer hover:text-primary transition-colors`} onClick={handleViewContent}>
                        {searchQuery ? highlightText(description, searchQuery) : description}
                    </CardDescription>
                </CardHeader>
                <CardContent className={`flex-grow ${viewMode === 'list' ? 'py-2 sm:py-3 flex-shrink-0' : ''} px-2 sm:px-3 md:px-4 pt-0 pb-0`}>
                    <div className="flex flex-wrap gap-1 mt-1 min-h-[28px]">
                        {isVideo && item.related_categories.slice(0, viewMode === 'list' ? 2 : 3).map((category) => (
                            <Badge key={category} variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 bg-primary/10 text-primary">
                                {category}
                            </Badge>
                        ))}
                        {isBlog && item.related_categories.slice(0, viewMode === 'list' ? 2 : 3).map((category) => (
                            <Badge key={category} variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 bg-primary/10 text-primary">
                                {category}
                            </Badge>
                        ))}
                        {((isVideo && item.related_categories.length > (viewMode === 'list' ? 2 : 3)) || 
                          (isBlog && item.related_categories.length > (viewMode === 'list' ? 2 : 3))) && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-5">
                                +{isVideo 
                                    ? item.related_categories.length - (viewMode === 'list' ? 2 : 3)
                                    : item.related_categories.length - (viewMode === 'list' ? 2 : 3)} more
                            </Badge>
                        )}
                    </div>
                    {isBlog && (
                        <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                            <UsersIcon className="h-3 w-3" />
                            <span className="truncate">{item.authors.join(', ')}</span>
                        </div>
                    )}
                    {!isBlog && (
                        <div className="mt-2 h-5"></div>
                    )}
                </CardContent>
                <CardFooter className={`mt-auto flex justify-between items-center pt-0 px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 ${viewMode === 'list' ? 'flex-shrink-0' : ''}`}>
                    <VisitCounter contentId={contentId} small={true} />
                    
                    <Button variant="ghost" size="sm" className="text-primary h-7 px-2 text-xs sm:text-sm" onClick={handleViewContent}>
                        {isViewed ? "Read Again" : "Read more"}
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
});

// Display name for debugging
ContentCard.displayName = 'ContentCard';

export const DeepSearchCard = memo(({ item, searchQuery, isBookmarkPage = false, onVisibilityChange }: { 
    item: VideoContent | BlogPost, 
    searchQuery: string,
    isBookmarkPage?: boolean,
    onVisibilityChange?: (isVisible: boolean, contentId: string) => void
}) => {
    const router = useRouter();
    const { user, userData, addToBookmarks, removeFromBookmarks, addToViewHistory } = useAuth();
    const { incrementVisit, preloadVisitData } = useVisits();
    const { toast } = useToast();
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isViewed, setIsViewed] = useState(false);
    const [showFullSnippets, setShowFullSnippets] = useState(false);
    const contentId = getContentId(item);
    
    // Preload visit data for this content item as soon as card renders
    useEffect(() => {
        preloadVisitData([contentId]);
    }, [contentId, preloadVisitData]);
    
    // Track when card is visible in viewport
    const [inViewRef, isVisible, wasEverVisible] = useScrollVisibility<HTMLDivElement>({
        threshold: 0.6, // Card must be 60% visible
        triggerOnce: false // Allow tracking visibility changes
    });
    
    // Call onVisibilityChange callback when visibility changes, with performance optimizations
    useEffect(() => {
        // Skip visibility reporting if callback is not provided
        if (!onVisibilityChange) return;
        
        // Use a short timeout to debounce visibility changes and prevent excessive updates
        const visibilityTimer = setTimeout(() => {
            // Only track visibility for preloading data, not for incrementing counts
            onVisibilityChange(isVisible, contentId);
        }, 300);
        
        return () => {
            clearTimeout(visibilityTimer);
        };
    }, [isVisible, contentId, onVisibilityChange]);
    
    // Check if the content is bookmarked
    useEffect(() => {
        if (isBookmarkPage) {
            // In bookmarks page, we know it's bookmarked
            setIsBookmarked(true);
            return;
        }
        
        if (userData && userData.bookmarks) {
            const isItemBookmarked = userData.bookmarks.includes(contentId);
            setIsBookmarked(isItemBookmarked);
        }
    }, [userData, contentId, isBookmarkPage]);
    
    // Check if the content has been viewed before
    useEffect(() => {
        if (userData && userData.viewHistory) {
            const hasBeenViewed = userData.viewHistory.includes(contentId);
            setIsViewed(hasBeenViewed);
        }
    }, [userData, contentId]);
    
    const isVideo = isVideoContent(item);
    const isBlog = isBlogPost(item);
    
    // Get the appropriate URL
    const contentUrl = isVideo 
        ? `/library/video-content/${getSlugFromName(isVideo ? item.name_video : '')}`
        : `/library/blog-content/${getSlugFromName(isBlog ? item.name_blog : '')}`;
        
    // Get the title and description
    const title = isVideo ? item.name_video : item.name_blog;
    const description = isVideo ? item.description_video : item.description_blog;
    
    // Get the content for deep search
    const content = isVideo 
        ? item.mp3_content 
        : isBlog 
            ? item.content.whole_content 
            : '';
            
    // Extract snippets from content if they match the search query
    const snippets = extractMatchSnippets(content, searchQuery);
    
    // Handle the animated navigation
    const handleViewContent = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // Add to view history if user is logged in
        if (user) {
            addToViewHistory(contentId);
        }
        
        // Get the categories for this content
        const categories = isVideo ? item.related_categories : item.related_categories;
        
        // Only increment visit count when user actually clicks to view the content
        incrementVisit(contentId, isVideo ? 'video' : 'blog', categories)
            .catch(error => console.error('Failed to increment visit:', error));
        
        // Add exit animation to the current page
        document.documentElement.classList.add('page-exit');
        
        // Navigate to the content page after a short delay
        setTimeout(() => {
            router.push(contentUrl);
        }, 300); // Matches the CSS transition duration
    };
    
    // Toggle bookmarking
    const toggleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Don't allow toggling in bookmarks page - use the dedicated remove button instead
        if (isBookmarkPage) return;
        
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
                toast({
                    title: "Bookmark removed",
                    description: "Content removed from your bookmarks"
                });
                setIsBookmarked(false);
            } else {
                await addToBookmarks(contentId);
                toast({
                    title: "Bookmarked",
                    description: "Content added to your bookmarks"
                });
                setIsBookmarked(true);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not update bookmark status",
                variant: "destructive"
            });
        }
    };

    return (
        <motion.div
            ref={inViewRef}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="h-full"
        >
            <Card className={`h-full flex flex-col hover:shadow-md transition-shadow duration-200 ${isViewed ? 'border-primary/30 bg-primary/5' : ''} overflow-hidden`}>
                <CardHeader className="p-2 pt-3 sm:p-3 sm:pt-4 md:p-4 md:pt-5">
                    <div className="flex items-center gap-2">
                        {isVideo && <PlayCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />}
                        {isBlog && <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />}
                        <CardTitle className="text-base sm:text-lg cursor-pointer hover:text-primary transition-colors line-clamp-2" onClick={handleViewContent}>
                            {highlightText(title, searchQuery)}
                        </CardTitle>
                        <button 
                            onClick={toggleBookmark}
                            className="ml-auto p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0 touch-manipulation"
                            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                        >
                            <BookmarkIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        </button>
                    </div>
                    <CardDescription className="mt-1.5 sm:mt-2 line-clamp-1 text-xs sm:text-sm cursor-pointer hover:text-primary transition-colors" onClick={handleViewContent}>
                        {highlightText(description, searchQuery)}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-grow px-2 sm:px-3 md:px-4 pt-0 pb-0">
                    <div className="flex flex-wrap gap-1 mt-1 min-h-[28px]">
                        {isVideo && item.related_categories.slice(0, 3).map((category) => (
                            <Badge key={category} variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 bg-primary/10 text-primary">
                                {category}
                            </Badge>
                        ))}
                        {isBlog && item.related_categories.slice(0, 3).map((category) => (
                            <Badge key={category} variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 bg-primary/10 text-primary">
                                {category}
                            </Badge>
                        ))}
                    </div>
                    
                    {isBlog && (
                        <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                            <UsersIcon className="h-3 w-3" />
                            <span className="truncate">{item.authors.join(', ')}</span>
                        </div>
                    )}
                    {!isBlog && (
                        <div className="mt-2 h-5"></div>
                    )}
                    
                    {snippets.length > 0 && (
                        <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] sm:text-xs font-medium flex items-center">
                                    <SearchIcon className="h-3 w-3 mr-1 text-primary" />
                                    <span>Matches in content:</span>
                                </p>
                                {snippets.length > 1 && (
                                    <button 
                                        onClick={() => setShowFullSnippets(!showFullSnippets)}
                                        className="text-[10px] sm:text-xs text-primary flex items-center touch-manipulation"
                                    >
                                        {showFullSnippets ? (
                                            <>Less <ChevronUpIcon className="h-3 w-3 ml-0.5" /></>
                                        ) : (
                                            <>More <ChevronDownIcon className="h-3 w-3 ml-0.5" /></>
                                        )}
                                    </button>
                                )}
                            </div>
                            
                            <div className={`space-y-1 ${!showFullSnippets ? "max-h-16" : "max-h-32"} overflow-hidden`}>
                                {snippets.slice(0, showFullSnippets ? snippets.length : 1).map((snippet, idx) => (
                                    <div key={idx} className="bg-muted/50 p-1.5 rounded-sm text-[10px] sm:text-xs leading-relaxed">
                                        {highlightText(snippet, searchQuery)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {snippets.length === 0 && (
                        <div className="mt-2 h-24"></div>
                    )}
                </CardContent>
                
                <CardFooter className="mt-auto flex justify-between items-center pt-0 px-2 sm:px-3 md:px-4 pb-2 sm:pb-3">
                    <VisitCounter contentId={contentId} small={true} />
                    
                    <Button variant="ghost" size="sm" className="text-primary h-7 px-2 text-xs sm:text-sm" onClick={handleViewContent}>
                        {isViewed ? "Read Again" : "Read more"}
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
});

// Display name for debugging
DeepSearchCard.displayName = 'DeepSearchCard';

type ContentDetailProps = {
    content: VideoContent | BlogPost | null;
    isOpen: boolean;
    onClose: () => void;
};

export function ContentDetail({ content, isOpen, onClose }: ContentDetailProps) {
    if (!content) return null;
    
    const isVideo = isVideoContent(content);
    const isBlog = isBlogPost(content);
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-primary">
                        {isVideo ? content.name_video : content.name_blog}
                    </DialogTitle>
                    <DialogDescription>
                        {isVideo ? content.description_video : content.description_blog}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex flex-wrap gap-1 mt-2 mb-4">
                    {isVideo && content.related_categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs bg-primary/10 text-primary">
                            {category}
                        </Badge>
                    ))}
                    {isBlog && content.related_categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs bg-primary/10 text-primary">
                            {category}
                        </Badge>
                    ))}
                </div>
                
                {isBlog && (
                    <div className="flex items-center gap-1 mb-4 text-sm text-muted-foreground">
                        <UsersIcon className="h-3 w-3" />
                        <span>By {content.authors.join(', ')}</span>
                    </div>
                )}
                
                <Separator className="my-2" />
                
                <ScrollArea className="flex-grow overflow-auto pr-4">
                    {isVideo && (
                        <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-line">{content.mp3_content}</p>
                            {content.youtube_url && (
                                <div className="mt-4">
                                    <a href={content.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                        Watch on YouTube
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {isBlog && (
                        <div>
                            <div className="bg-muted p-4 rounded-md mb-4">
                                <h3 className="font-medium mb-2">Table of Contents</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    {content.content.table_of_contents.map((item, index) => (
                                        <li key={index} className="text-sm">{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-line">{content.content.whole_content}</div>
                            </div>
                        </div>
                    )}
                </ScrollArea>
                
                <div className="flex items-center justify-between mt-2">
                    <DialogFooter className="mt-4">
                        {isVideo && content.page_url && (
                            <Button variant="outline" asChild>
                                <a href={content.page_url} target="_blank" rel="noopener noreferrer">
                                    Visit Original Page
                                </a>
                            </Button>
                        )}
                        {isBlog && content.page_url && (
                            <Button variant="outline" asChild>
                                <a href={content.page_url} target="_blank" rel="noopener noreferrer">
                                    Visit Original Blog
                                </a>
                            </Button>
                        )}
                        <DialogClose asChild>
                            <Button variant="default" onClick={onClose}>Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function ContentCardSkeleton() {
    return (
        <Card className="h-full flex flex-col animate-pulse">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-5 w-40 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="space-y-2 mt-2">
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-1 mt-2">
                    {[1, 2].map((item) => (
                        <div key={item} className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    ))}
                </div>
                <div className="flex items-center gap-1 mt-3">
                    <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </CardContent>
            <CardFooter>
                <div className="w-full h-9 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardFooter>
        </Card>
    );
} 