'use client';

import * as React from 'react';

import { useTheme } from 'next-themes';

import { Button } from '@/registry/new-york-v4/ui/button';

import { MoonIcon, SunIcon } from 'lucide-react';

import { META_THEME_COLORS, useMetaColor } from '@/hooks/use-meta-color';

export function ModeToggle() {
    const { setTheme, resolvedTheme } = useTheme();
    const { setMetaColor } = useMetaColor();

    const toggleTheme = React.useCallback(() => {
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        setMetaColor(newTheme === 'light' ? META_THEME_COLORS.light : META_THEME_COLORS.dark);
    }, [resolvedTheme, setTheme, setMetaColor]);

    return (
        <Button 
            variant='ghost' 
            className='group/toggle h-8 w-8 px-0 rounded-full' 
            onClick={toggleTheme}
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <SunIcon className='h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
            <MoonIcon className='absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
            <span className='sr-only'>Toggle theme</span>
        </Button>
    );
}
