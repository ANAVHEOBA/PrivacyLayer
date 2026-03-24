'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Deposit', href: '/deposit' },
  { name: 'Withdraw', href: '/withdraw' },
  { name: 'Documentation', href: '/docs' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between px-4 mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
            >
              {/* Shield icon */}
              <path
                d="M16 2L4 7v9c0 7.73 5.12 14.95 12 17 6.88-2.05 12-9.27 12-17V7L16 2z"
                className="fill-primary/20 stroke-primary"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Lock icon inside */}
              <rect
                x="12"
                y="14"
                width="8"
                height="6"
                className="fill-primary/40 stroke-primary"
                strokeWidth="1.5"
                rx="1"
              />
              <path
                d="M14 14v-2a2 2 0 114 0v2"
                className="stroke-primary"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-semibold text-lg hidden sm:inline-block">
            PrivacyLayer
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side: Theme toggle + Wallet */}
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:flex" />
          <WalletConnect />
          
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden btn btn-ghost p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'md:hidden border-t border-border transition-all duration-200',
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="container px-4 py-4 space-y-3">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-border">
            <ThemeToggle className="sm:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}