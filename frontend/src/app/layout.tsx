import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PrivacyLayer - ZK Shielded Pool on Stellar",
  description: "The first ZK-proof shielded pool on Stellar Soroban. Deposit, mix, and withdraw with complete privacy using zero-knowledge proofs.",
  keywords: ["Stellar", "Soroban", "ZK", "Zero-Knowledge", "Privacy", "DeFi", "Blockchain", "Cryptocurrency"],
  authors: [{ name: "PrivacyLayer Team" }],
  openGraph: {
    title: "PrivacyLayer - ZK Shielded Pool on Stellar",
    description: "The first ZK-proof shielded pool on Stellar Soroban. Deposit, mix, and withdraw with complete privacy using zero-knowledge proofs.",
    type: "website",
    locale: "en_US",
    siteName: "PrivacyLayer",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrivacyLayer - ZK Shielded Pool on Stellar",
    description: "The first ZK-proof shielded pool on Stellar Soroban.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}