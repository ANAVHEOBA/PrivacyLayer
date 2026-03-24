'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

/**
 * Theme provider wrapper around next-themes
 * Enables dark mode with system preference detection and localStorage persistence
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false} // Enable smooth transitions
      storageKey="privacylayer-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}