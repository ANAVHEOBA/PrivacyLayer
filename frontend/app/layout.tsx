import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PrivacyLayer | ZK Shielded Pool on Stellar",
  description:
    "The first ZK-proof shielded pool on Stellar Soroban. Deposit and withdraw privately using zero-knowledge proofs powered by Protocol 25 native BN254 and Poseidon primitives.",
  keywords: [
    "privacy",
    "stellar",
    "soroban",
    "zero-knowledge",
    "zk-proof",
    "shielded pool",
    "groth16",
    "bn254",
    "poseidon",
    "defi",
  ],
  openGraph: {
    title: "PrivacyLayer | ZK Shielded Pool on Stellar",
    description:
      "Private transactions on Stellar using zero-knowledge proofs. No on-chain link between deposits and withdrawals.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            {/* Background gradient effects */}
            <div className="pointer-events-none fixed inset-0 z-0">
              <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-privacy-900/20 blur-3xl" />
              <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-shield-900/20 blur-3xl" />
            </div>

            <Header />
            <main className="relative z-10 flex-1">
              <div className="container py-8">{children}</div>
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
