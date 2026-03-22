import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "PrivacyLayer — Shielded Pool on Stellar",
  description:
    "Compliance-forward private transactions on Stellar Soroban using zero-knowledge proofs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
        <header className="border-b border-gray-800 px-6 py-4">
          <nav className="mx-auto flex max-w-6xl items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight">
              🔐 PrivacyLayer
            </a>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="/deposit" className="hover:text-white transition-colors">
                Deposit
              </a>
              <a href="/withdraw" className="hover:text-white transition-colors">
                Withdraw
              </a>
              <a href="/history" className="hover:text-white transition-colors">
                History
              </a>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
