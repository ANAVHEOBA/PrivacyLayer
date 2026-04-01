'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield, Home, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useTheme } from 'next-themes';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/deposit', label: 'Deposit', icon: ArrowDownCircle },
  { href: '/withdraw', label: 'Withdraw', icon: ArrowUpCircle },
  { href: '/history', label: 'History', icon: History },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <>
      {/* Mobile header bar */}
      <header className="md:hidden sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-base dark:text-white">PrivacyLayer</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark'
                ? <span className="text-sm">☀️</span>
                : <span className="text-sm">🌙</span>}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 dark:text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white dark:bg-slate-900 shadow-xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold dark:text-white">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 dark:text-white" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
