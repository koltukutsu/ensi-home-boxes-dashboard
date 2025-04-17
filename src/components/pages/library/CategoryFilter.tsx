'use client';

import React, { useState, useMemo, memo, useCallback } from 'react';
import { CheckIcon } from 'lucide-react';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Checkbox } from '@/registry/new-york-v4/ui/checkbox';
import { ScrollArea } from '@/registry/new-york-v4/ui/scroll-area';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { LibraryFilters, ALL_CATEGORIES, VIDEO_CATEGORIES, BLOG_CATEGORIES } from '@/types';

interface CategoryFilterProps {
    filters: LibraryFilters;
    onFiltersChange: (filters: LibraryFilters) => void;
}

export const CategoryFilter = memo(({ filters, onFiltersChange }: CategoryFilterProps) => {
    const [tempFilters, setTempFilters] = useState<LibraryFilters>(filters);
    
    // Reset temp filters when actual filters change (sync state)
    React.useEffect(() => {
        setTempFilters(filters);
    }, [filters]);
    
    // Count active filters - memoized to prevent recalculation on every render
    const activeFilterCount = useMemo(() => {
        return Object.values(filters.categories).filter(Boolean).length + 
               (filters.contentTypes.video ? 1 : 0) + 
               (filters.contentTypes.blog ? 1 : 0);
    }, [filters]);
    
    // Get selected categories for display - memoized 
    const selectedCategories = useMemo(() => {
        return Object.entries(filters.categories)
            .filter(([_, isSelected]) => isSelected)
            .map(([category]) => category);
    }, [filters.categories]);
    
    const handleContentTypeChange = useCallback((type: 'video' | 'blog', checked: boolean) => {
        // Create new filter object
        const newFilters = {
            ...filters,
            contentTypes: {
                ...filters.contentTypes,
                [type]: checked
            }
        };
        
        // If a content type is being unchecked, clear categories that only belong to that type
        if (!checked) {
            const categoriesToCheck = Object.keys(filters.categories).filter(cat => filters.categories[cat]);
            
            categoriesToCheck.forEach(category => {
                if (type === 'video' && VIDEO_CATEGORIES.includes(category) && !BLOG_CATEGORIES.includes(category)) {
                    // If unchecking video and this is video-only category, uncheck it
                    newFilters.categories[category] = false;
                }
                
                if (type === 'blog' && BLOG_CATEGORIES.includes(category) && !VIDEO_CATEGORIES.includes(category)) {
                    // If unchecking blog and this is blog-only category, uncheck it
                    newFilters.categories[category] = false;
                }
            });
        }
        
        onFiltersChange(newFilters);
    }, [filters, onFiltersChange]);
    
    const handleCategoryChange = useCallback((category: string, checked: boolean) => {
        const newFilters = {
            ...filters,
            categories: {
                ...filters.categories,
                [category]: checked
            }
        };
        onFiltersChange(newFilters);
    }, [filters, onFiltersChange]);
    
    const handleClearFilters = useCallback(() => {
        const resetFilters: LibraryFilters = {
            contentTypes: {
                video: true,
                blog: true
            },
            categories: {}
        };
        onFiltersChange(resetFilters);
    }, [onFiltersChange]);
    
    // Memoized category sections to prevent unnecessary re-renders
    const categorySections = useMemo(() => {
        // Filter categories based on selected content types
        const visibleCategories = ALL_CATEGORIES.filter(category => {
            // If both content types are selected, show all categories
            if (filters.contentTypes.video && filters.contentTypes.blog) {
                return true;
            }
            
            // If only video content is selected, show only video categories
            if (filters.contentTypes.video && !filters.contentTypes.blog) {
                return VIDEO_CATEGORIES.includes(category);
            }
            
            // If only blog content is selected, show only blog categories
            if (!filters.contentTypes.video && filters.contentTypes.blog) {
                return BLOG_CATEGORIES.includes(category);
            }
            
            // If neither content type is selected, don't show any categories
            return false;
        });
        
        return visibleCategories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
                <Checkbox 
                    id={`category-${category}`} 
                    checked={filters.categories[category] || false}
                    onCheckedChange={(checked) => 
                        handleCategoryChange(category, checked as boolean)
                    }
                />
                <label 
                    htmlFor={`category-${category}`} 
                    className="text-sm cursor-pointer line-clamp-1"
                >
                    {category}
                    <span className="text-xs text-muted-foreground ml-1">
                        {VIDEO_CATEGORIES.includes(category) && 
                         BLOG_CATEGORIES.includes(category) ? 
                         '(Video, Blog)' : 
                         VIDEO_CATEGORIES.includes(category) ? 
                         '(Video)' : '(Blog)'}
                    </span>
                </label>
            </div>
        ));
    }, [filters.contentTypes, filters.categories, handleCategoryChange]);
    
    return (
        <div>
            {/* Content Types */}
            <h3 className="text-sm font-medium mb-2">Content Type</h3>
            <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2">
                    <Checkbox 
                        id="video" 
                        checked={filters.contentTypes.video}
                        onCheckedChange={(checked) => 
                            handleContentTypeChange('video', checked as boolean)
                        }
                    />
                    <label htmlFor="video" className="text-sm cursor-pointer">
                        Video Content
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox 
                        id="blog" 
                        checked={filters.contentTypes.blog}
                        onCheckedChange={(checked) => 
                            handleContentTypeChange('blog', checked as boolean)
                        }
                    />
                    <label htmlFor="blog" className="text-sm cursor-pointer">
                        Blog Content
                    </label>
                </div>
            </div>
            
            <Separator className="my-4" />
            
            {/* Categories */}
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Categories</h3>
                {selectedCategories.length > 0 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleClearFilters}
                        className="h-7 text-xs hover:text-primary"
                    >
                        Clear All
                    </Button>
                )}
            </div>
            
            {/* Selected categories badges (for easy removal) */}
            {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {selectedCategories.map(category => (
                        <Badge key={category} variant="secondary" className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                            {category}
                            <button 
                                onClick={() => handleCategoryChange(category, false)}
                                className="ml-1 rounded-full hover:bg-primary/30 w-4 h-4 inline-flex items-center justify-center"
                            >
                                <span className="sr-only">Remove</span>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            
            {/* Category list with scrollable area */}
            <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-2">
                    {categorySections.length > 0 ? (
                        categorySections
                    ) : (
                        <div className="text-sm text-muted-foreground py-4 text-center">
                            {!filters.contentTypes.video && !filters.contentTypes.blog 
                                ? "Select a content type to see categories" 
                                : "No categories available for the selected content type"}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
});

// Display name for debugging
CategoryFilter.displayName = 'CategoryFilter'; 