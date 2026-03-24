import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'PrivacyLayer - ZK-Proof Shielded Pool on Stellar',
    template: '%s | PrivacyLayer',
  },
  description: 'The first ZK-proof shielded pool on Stellar Soroban. Deposit and withdraw privately with zero-knowledge proofs.',
  keywords: ['Stellar', 'Soroban', 'ZKP', 'Zero-Knowledge', 'Privacy', 'Blockchain', 'Cryptocurrency'],
  authors: [{ name: 'PrivacyLayer Team' }],
  creator: 'PrivacyLayer',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://privacylayer.io',
    siteName: 'PrivacyLayer',
    title: 'PrivacyLayer - ZK-Proof Shielded Pool on Stellar',
    description: 'The first ZK-proof shielded pool on Stellar Soroban.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrivacyLayer - ZK-Proof Shielded Pool on Stellar',
    description: 'The first ZK-proof shielded pool on Stellar Soroban.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <div className="relative min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
        
        {/* Script to prevent flash of unstyled content */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('privacylayer-theme');
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                  document.documentElement.classList.add('hydrated');
                } catch (e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}