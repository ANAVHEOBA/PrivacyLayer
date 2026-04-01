'use client';

import { useState, useEffect } from 'react';
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

export default function ResponsiveWrapper({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Desktop Header ─── */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight dark:text-white">PrivacyLayer</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    active
                      ? 'text-primary'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <span className="text-sm">☀️</span>
                ) : (
                  <span className="text-sm">🌙</span>
                )}
              </button>
            )}
            <Link
              href="/deposit"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Mobile Header ─── */}
      <header className="md:hidden sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-base dark:text-white">PrivacyLayer</span>
          </Link>
          <div className="flex items-center gap-1">
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? <span className="text-sm">☀️</span> : <span className="text-sm">🌙</span>}
              </button>
            )}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 dark:text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Drawer ─── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-white dark:bg-slate-900 shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold dark:text-white">Menu</span>
              <button
                onClick={() => setDrawerOpen(false)}
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
                    onClick={() => setDrawerOpen(false)}
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
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                <Link
                  href="/deposit"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-white rounded-xl font-medium"
                >
                  Launch App
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* ─── Page Content ─── */}
      <main className="flex-1">{children}</main>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="md:hidden sticky bottom-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="flex">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'text-primary'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
