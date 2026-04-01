import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import ResponsiveWrapper from '@/components/layout/ResponsiveWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'PrivacyLayer – Privacy-Preserving Smart Contract',
  description: 'PrivacyLayer uses zero-knowledge proofs to enable private transactions on Stellar. Deposit, mix, and withdraw with cryptographic privacy.',
  keywords: ['privacy', 'zero-knowledge', 'stellar', 'zk-snark', 'defi', 'mixer'],
  openGraph: {
    title: 'PrivacyLayer',
    description: 'Privacy-preserving smart contract powered by ZK proofs on Stellar.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrivacyLayer',
    description: 'Privacy-preserving smart contract powered by ZK proofs on Stellar.',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ResponsiveWrapper>{children}</ResponsiveWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
