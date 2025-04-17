'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BlogPost, ContentItem, LibraryFilters, VideoContent, isBlogPost, isVideoContent } from '@/types';
import { CategoryFilter } from './CategoryFilter';
import { ContentCard, ContentCardSkeleton } from '@/components/common/content-card';
import { videoData as videoDataSource } from '@/data/video-data';
import { blogData as blogDataSource } from '@/data/blog-data';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Switch } from '@/registry/new-york-v4/ui/switch';
import { Label } from '@/registry/new-york-v4/ui/label';
import { Search, FilterIcon } from 'lucide-react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisits } from '@/context/visit-context';
import { getContentId, getMultipleContentVisits } from '@/lib/firebase-utils';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/context/auth-context';
import { usePageViewAnalytics } from '@/hooks/usePageViewAnalytics';
import { Button } from '@/registry/new-york-v4/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger
} from '@/registry/new-york-v4/ui/drawer';

// Properly initialize the IntersectionObserver with a fallback
import { defaultFallbackInView } from 'react-intersection-observer';
defaultFallbackInView(false);

type ViewMode = 'grid' | 'list';

interface FuseResult {
  item: ContentItem;
  refIndex: number;
  score?: number;
}

// Storage keys for persisting filter state
const STORAGE_KEY_FILTERS = 'library_filters';
const STORAGE_KEY_SEARCH = 'library_search_query';
const STORAGE_KEY_DEEP_SEARCH = 'library_deep_search';
const STORAGE_KEY_REGEX_SEARCH = 'library_regex_search';

// Constants for pagination
const ITEMS_PER_PAGE = 20; // Slightly increased for smoother experience

export function LibraryMain({ initialBlogs, initialVideos }: { initialBlogs: BlogPost[], initialVideos: VideoContent[] }) {
    // Track page view in analytics
    usePageViewAnalytics({
        pageName: 'Content Library',
        pageCategory: 'library',
        additionalParams: {
            initial_blog_count: initialBlogs?.length || 0,
            initial_video_count: initialVideos?.length || 0
        }
    });

    // Context and state hooks
    const { userData } = useAuth();
    const { visitData, incrementVisit, preloadVisitData, subscribeToVisitUpdates } = useVisits();
    
    // Display state
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        // Get from localStorage or default to grid
        return (typeof window !== 'undefined' && localStorage.getItem('libraryViewMode') as ViewMode) || 'grid';
    });
    
    // Content state
    const [videos, setVideos] = useState<VideoContent[]>(initialVideos || []);
    const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs || []);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [isDeepSearch, setIsDeepSearch] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    
    // Refs for tracking visible content and data loading
    const loadingMoreRef = useRef<boolean>(false);
    const displayedItemsRef = useRef<(VideoContent | BlogPost)[]>([]);
    const visibleItemsRef = useRef<Set<string>>(new Set());
    const visitUpdateTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
    
    // Simplified state for infinite scrolling
    const [page, setPage] = useState(1);
    const [allFilteredItems, setAllFilteredItems] = useState<ContentItem[]>([]);
    const [displayedItems, setDisplayedItems] = useState<ContentItem[]>([]);
    
    // Create a stable reference to displayed items to avoid closure issues
    useEffect(() => {
        displayedItemsRef.current = displayedItems;
    }, [displayedItems]);
    
    // Infinite scroll detection with useInView
    const { ref: scrollRef, inView } = useInView({
        threshold: 0,
        rootMargin: '400px 0px', // Load before user reaches the end
        trackVisibility: true,
        delay: 100,
    });
    
    // Filters state
    const [filters, setFilters] = useState<LibraryFilters>({
        contentTypes: { video: true, blog: true },
        categories: {}
    });
    
    const [isRegexSearch, setIsRegexSearch] = useState(false);
    
    // Load saved state from localStorage on initial render
    useEffect(() => {
        try {
            // Load filters
            const savedFilters = localStorage.getItem(STORAGE_KEY_FILTERS);
            if (savedFilters) {
                setFilters(JSON.parse(savedFilters));
            }
            
            // Load search query
            const savedSearchQuery = localStorage.getItem(STORAGE_KEY_SEARCH);
            if (savedSearchQuery) {
                setSearchQuery(savedSearchQuery);
            }
            
            // Load deep search setting
            const savedDeepSearch = localStorage.getItem(STORAGE_KEY_DEEP_SEARCH);
            if (savedDeepSearch) {
                setIsDeepSearch(savedDeepSearch === 'true');
            }
            
            // Load regex search setting
            const savedRegexSearch = localStorage.getItem(STORAGE_KEY_REGEX_SEARCH);
            if (savedRegexSearch) {
                setIsRegexSearch(savedRegexSearch === 'true');
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
            // If there's an error, continue with default state
        }
    }, []);
    
    // Save state to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
            localStorage.setItem(STORAGE_KEY_SEARCH, searchQuery);
            localStorage.setItem(STORAGE_KEY_DEEP_SEARCH, String(isDeepSearch));
            localStorage.setItem(STORAGE_KEY_REGEX_SEARCH, String(isRegexSearch));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }, [filters, searchQuery, isDeepSearch, isRegexSearch]);
    
    // Initial data loading with progressive enhancement
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load all data at once for simplicity, but we'll display it progressively
                setVideos(videoDataSource);
                setBlogs(blogDataSource);
                
                // Preload visit data for the first batch only
                const initialBatchIds = [
                    ...videoDataSource.slice(0, 20).map(item => getContentId(item)),
                    ...blogDataSource.slice(0, 20).map(item => getContentId(item))
                ];
                
                await preloadVisitData(initialBatchIds);
            } catch (error) {
                console.error('Error loading content data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        loadInitialData();
    }, [preloadVisitData]);
    
    // Track visible content items for visit data
    const handleContentVisible = useCallback((isVisible: boolean, contentId: string) => {
        if (!contentId) return;
        
        if (isVisible) {
            // Add to visible items set
            visibleItemsRef.current.add(contentId);
        } else {
            // Remove from visible items set
            visibleItemsRef.current.delete(contentId);
        }
    }, []);
    
    // Subscribe to visit updates for visible items
    useEffect(() => {
        const visibleItemsArray = Array.from(visibleItemsRef.current);
        if (visibleItemsArray.length === 0) return;
        
        const unsubscribe = subscribeToVisitUpdates(visibleItemsArray);
        return unsubscribe;
    }, [subscribeToVisitUpdates]);
    
    // Handle filter changes
    const handleFiltersChange = useCallback((newFilters: LibraryFilters) => {
        setFilters(newFilters);
        // Reset pagination when filters change
        setPage(1);
    }, []);
    
    // Reset filters
    const resetFilters = useCallback(() => {
        const defaultFilters = {
            contentTypes: { video: true, blog: true },
            categories: {}
        };
        setFilters(defaultFilters);
        setSearchQuery('');
        setIsDeepSearch(false);
        setIsRegexSearch(false);
        setPage(1);
        
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY_FILTERS);
        localStorage.removeItem(STORAGE_KEY_SEARCH);
        localStorage.removeItem(STORAGE_KEY_DEEP_SEARCH);
        localStorage.removeItem(STORAGE_KEY_REGEX_SEARCH);
    }, []);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        
        return () => clearTimeout(timer);
    }, [searchQuery]);
    
    const searchContent = useCallback((items: ContentItem[], query: string): ContentItem[] => {
        if (!query.trim()) return items;
        
        try {
            // Regex search
            if (isRegexSearch) {
                try {
                    const regex = new RegExp(query, 'i');
                    
                    return items.filter(item => {
                        const title = isVideoContent(item) ? item.name_video : item.name_blog;
                        const description = isVideoContent(item) ? item.description_video : item.description_blog;
                        
                        if (isDeepSearch) {
                            const content = isVideoContent(item) 
                                ? item.mp3_content
                                : item.content.whole_content;
                            return regex.test(title) || regex.test(description) || regex.test(content || '');
                        }
                        
                        return regex.test(title) || regex.test(description);
                    });
                } catch (error) {
                    console.error('Invalid regex:', error);
                }
            }
            
            // Fuzzy search with Fuse.js
            const options = {
                includeScore: true,
                threshold: 0.4,
                keys: isDeepSearch 
                    ? [
                        { name: isVideoContent(items[0]) ? 'name_video' : 'name_blog', weight: 2 },
                        { name: isVideoContent(items[0]) ? 'description_video' : 'description_blog', weight: 1.5 },
                        { name: isVideoContent(items[0]) ? 'mp3_content' : 'content.whole_content', weight: 1 }
                    ]
                    : [
                        { name: isVideoContent(items[0]) ? 'name_video' : 'name_blog', weight: 2 },
                        { name: isVideoContent(items[0]) ? 'description_video' : 'description_blog', weight: 1.5 }
                    ],
                cache: true
            };
            
            const fuse = new Fuse(items, options);
            const result = fuse.search(query);
            return result.map(item => item.item);
        } catch (error) {
            console.error('Search error:', error);
            return items; 
        }
    }, [isDeepSearch, isRegexSearch]);
    
    // Filter content based on selected filters and search query
    const filteredContent = useMemo(() => {
        // Get content based on content type filters
        let content = [
            ...(filters.contentTypes.video ? videos : []),
            ...(filters.contentTypes.blog ? blogs : [])
        ];
        
        // Filter by categories
        const hasSelectedCategories = Object.values(filters.categories).some(Boolean);
        
        if (hasSelectedCategories) {
            content = content.filter(item => {
                const itemCategories = isVideoContent(item) 
                    ? item.related_categories 
                    : item.related_categories;
                    
                return itemCategories.some(category => filters.categories[category]);
            });
        }
        
        // Apply search if needed
        if (debouncedSearchQuery.trim()) {
            content = searchContent(content, debouncedSearchQuery);
        }
        
        return content;
    }, [filters, videos, blogs, debouncedSearchQuery, searchContent]);
    
    // Update filtered items whenever the filtering changes
    useEffect(() => {
        setAllFilteredItems(filteredContent);
        setPage(1); // Reset pagination when filters change
        
        // Load the first page immediately
        setDisplayedItems(filteredContent.slice(0, ITEMS_PER_PAGE));
        loadingMoreRef.current = false;
    }, [filteredContent]);
    
    // Load more items when scrolling to the end
    const loadMoreItems = useCallback(() => {
        if (loadingMoreRef.current) return;
        
        loadingMoreRef.current = true;
        
        // Check if we have more items to load
        const nextPageItems = allFilteredItems.slice(
            displayedItemsRef.current.length, 
            displayedItemsRef.current.length + ITEMS_PER_PAGE
        );
        
        if (nextPageItems.length > 0) {
            setDisplayedItems(prevItems => [...prevItems, ...nextPageItems]);
            setPage(prevPage => prevPage + 1);
        }
        
        // Reset loading state
        setTimeout(() => {
            loadingMoreRef.current = false;
        }, 200);
    }, [allFilteredItems]);
    
    // Handle intersection observer
    useEffect(() => {
        if (inView && !loading && !loadingMoreRef.current) {
            // Check if we have more items to display
            if (displayedItemsRef.current.length < allFilteredItems.length) {
                loadMoreItems();
            }
        }
    }, [inView, loading, loadMoreItems, allFilteredItems.length]);
    
    // Handle content visibility changes for analytics
    const handleVisibilityChange = useCallback((isVisible: boolean, contentId: string) => {
        if (!contentId) return;
        
        // Use a reference to track visible items more efficiently
        if (isVisible) {
            // Add to visible items immediately for better responsiveness
            visibleItemsRef.current.add(contentId);
            
            // We're no longer automatically incrementing visit counts just for visibility
            // Only pre-load visit data for visible items to improve UI responsiveness
            if (!visitData.has(contentId)) {
                preloadVisitData([contentId]);
            }
        } else {
            // Remove from visible items
            visibleItemsRef.current.delete(contentId);
            
            // Clear any pending timeout if exists
            if (visitUpdateTimeoutsRef.current[contentId]) {
                clearTimeout(visitUpdateTimeoutsRef.current[contentId]);
                delete visitUpdateTimeoutsRef.current[contentId];
            }
        }
    }, [preloadVisitData, visitData]);
    
    // Render the component
    return (
        <div className="container mx-auto py-4 sm:py-6 px-2 sm:px-3 lg:px-4">
            <div className="mb-5 sm:mb-6 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-primary">Library</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                    Browse and explore our collection of videos and blog posts
                </p>
                
                {/* Search Bar */}
                <div className="mt-4 sm:mt-5 lg:mt-6 mb-3 sm:mb-4">
                    <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3 flex items-center">
                            Search Library Content
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                <Input 
                                    type="text" 
                                    placeholder={
                                        isRegexSearch && isDeepSearch ? "Search with regex in all content fields..."
                                        : isRegexSearch ? "Search with regex in titles..."
                                        : isDeepSearch ? "Deep search in all content fields..." 
                                        : "Search in titles..."
                                    }
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-full h-10 bg-white dark:bg-gray-800 border-2 focus:border-primary dark:focus:border-primary shadow-sm hover:shadow-md focus:shadow-lg focus:shadow-primary/20 focus:ring-2 focus:ring-primary/20 placeholder-gray-400 dark:placeholder-gray-500 rounded-md text-sm sm:text-base transition-all"
                                />
                            </div>
                            <div className="flex flex-row justify-between w-full sm:w-auto gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                                <div className="flex items-center space-x-2">
                                    <Switch 
                                        id="deep-search" 
                                        checked={isDeepSearch} 
                                        onCheckedChange={setIsDeepSearch}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="deep-search" className="text-xs sm:text-sm font-medium">Deep Search</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch 
                                        id="regex-search" 
                                        checked={isRegexSearch} 
                                        onCheckedChange={setIsRegexSearch}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="regex-search" className="text-xs sm:text-sm font-medium">Regex Search</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Main content with desktop sidebar and mobile drawer */}
            <div className="flex flex-col md:flex-row gap-5">
                {/* Desktop sidebar - visible on md and larger screens */}
                <div className="hidden md:block w-64 lg:w-72 flex-shrink-0">
                    <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm sticky top-20">
                        <h3 className="text-base font-medium mb-3 flex items-center gap-2 text-primary">
                            <FilterIcon size={16} />
                            Filter Content
                        </h3>
                        <CategoryFilter
                            filters={filters}
                            onFiltersChange={handleFiltersChange}
                        />
                    </div>
                </div>

                {/* Mobile drawer trigger - visible only on smaller screens */}
                <div className="md:hidden mb-4">
                    <Drawer direction="left">
                        <DrawerTrigger asChild>
                            <Button variant="outline" className="gap-2 bg-white dark:bg-gray-800 border-2 hover:border-primary hover:text-primary shadow-sm w-full">
                                <FilterIcon className="h-4 w-4" />
                                <span>Filter Content</span>
                                {Object.values(filters.categories).some(Boolean) && (
                                    <div className="ml-auto px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                                        {Object.values(filters.categories).filter(Boolean).length}
                                    </div>
                                )}
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="w-full max-w-[350px]">
                            <DrawerHeader>
                                <DrawerTitle>Filter Content</DrawerTitle>
                            </DrawerHeader>
                            <div className="px-4 pb-4">
                                <CategoryFilter
                                    filters={filters}
                                    onFiltersChange={handleFiltersChange}
                                />
                            </div>
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button variant="outline">Close</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </div>

                {/* Main content area */}
                <div className="flex-1">
                    {/* Filter results indicator */}
                    {!loading && filteredContent.length > 0 && (
                        <div className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800 flex items-center gap-2 mb-4">
                            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary">
                                <span className="font-semibold text-xs sm:text-sm">{filteredContent.length}</span>
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-medium">
                                    {filteredContent.length === 1 ? 'Item' : 'Items'} found
                                    {searchQuery && (
                                        <span className="ml-1">for <span className="italic font-semibold">"{searchQuery}"</span></span>
                                    )}
                                </div>
                                {(isDeepSearch && searchQuery) || Object.values(filters.categories).some(Boolean) ? (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
                                        {isDeepSearch && searchQuery && (
                                            <span className="px-1 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] inline-flex items-center">
                                                <Search className="h-2 w-2 mr-0.5" />
                                                Deep Search
                                            </span>
                                        )}
                                        {Object.values(filters.categories).some(Boolean) && (
                                            <span className="text-[10px]">
                                                {Object.values(filters.categories).filter(Boolean).length} {Object.values(filters.categories).filter(Boolean).length === 1 ? 'filter' : 'filters'}
                                            </span>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                            
                            {(searchQuery || Object.values(filters.categories).some(Boolean)) && (
                                <button
                                    onClick={resetFilters}
                                    className="ml-auto text-xs text-muted-foreground hover:text-primary underline"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    )}
                    
                    {/* Content Cards */}
                    {loading ? (
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 auto-rows-fr">
                            {Array.from({ length: 8 }).map((_, index) => (
                                <div key={index} className="h-full">
                                    <ContentCardSkeleton key={index} />
                                </div>
                            ))}
                        </div>
                    ) : filteredContent.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 lg:py-20">
                            <h3 className="text-lg sm:text-xl font-semibold mb-2">No results found</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Try adjusting your search or filters to find what you're looking for.
                            </p>
                            <button
                                onClick={resetFilters}
                                className="text-sm text-primary hover:text-primary/80 underline"
                            >
                                Reset all filters
                            </button>
                        </div>
                    ) : (
                        <div className="min-h-[60vh]">
                            <div 
                                className={`grid ${isDeepSearch && searchQuery 
                                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 auto-rows-fr' 
                                    : 'grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 auto-rows-fr'}`}
                                style={{
                                    gridAutoRows: isDeepSearch && searchQuery ? 'minmax(350px, auto)' : 'minmax(300px, auto)'
                                }}
                            >
                                {displayedItems.map((item, index) => (
                                    <div 
                                        key={`${isVideoContent(item) ? 'video' : 'blog'}-${index}-${getContentId(item)}`}
                                        className="h-full"
                                    >
                                        <ContentCard
                                            item={item}
                                            searchQuery={searchQuery}
                                            isDeepSearch={isDeepSearch}
                                            onVisibilityChange={handleVisibilityChange}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            {/* Invisible load trigger that doesn't interfere with the footer */}
                            {displayedItems.length < allFilteredItems.length && (
                                <div 
                                    ref={scrollRef}
                                    className="h-8 my-10 sm:my-12 flex justify-center items-center"
                                    aria-hidden="true"
                                >
                                    {inView && (
                                        <div className="animate-pulse flex space-x-2">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 