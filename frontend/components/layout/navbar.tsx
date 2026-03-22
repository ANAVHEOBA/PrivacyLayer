"use client";

import { useState } from "react";

export function Navbar() {
  const [connected, setConnected] = useState(false);

  return (
    <header className="border-b border-gray-800 px-6 py-4">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="/" className="text-xl font-bold tracking-tight">
          🔐 PrivacyLayer
        </a>
        <div className="flex items-center gap-6">
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
          <button
            onClick={() => setConnected(!connected)}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm transition-colors hover:border-stellar"
          >
            {connected ? "Connected" : "Connect Wallet"}
          </button>
        </div>
      </nav>
    </header>
  );
}
