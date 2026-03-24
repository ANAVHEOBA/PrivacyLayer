'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Theme toggle button with sun/moon icons
 * Supports keyboard shortcut (Ctrl/Cmd + K) for theme switching
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + K to toggle theme
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolvedTheme, setTheme]);

  if (!mounted) {
    // Placeholder to prevent layout shift
    return (
      <button
        className={cn(
          'btn btn-ghost h-9 w-9 p-0 opacity-50',
          className
        )}
        aria-label="Toggle theme"
        disabled
      >
        <span className="h-5 w-5" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'btn btn-ghost h-9 w-9 p-0 hover:bg-secondary',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`${isDark ? 'Light' : 'Dark'} mode (Ctrl+K)`}
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        className={cn(
          'h-5 w-5 transition-all duration-300',
          isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0 absolute'
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
      
      {/* Moon icon (shown in light mode) */}
      <svg
        className={cn(
          'h-5 w-5 transition-all duration-300',
          isDark ? 'rotate-90 scale-0 absolute' : 'rotate-0 scale-100'
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>
    </button>
  );
}

/**
 * Theme toggle with dropdown for light/dark/system options
 */
export function ThemeToggleDropdown({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="skeleton h-9 w-24 rounded-md" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="input h-9 w-auto text-sm"
        aria-label="Select theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      
      {/* Visual indicator of current theme */}
      <div className="flex items-center gap-1 text-muted-foreground text-sm">
        {resolvedTheme === 'dark' ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        )}
        <span className="capitalize">{theme === 'system' ? 'System' : theme}</span>
      </div>
    </div>
  );
}