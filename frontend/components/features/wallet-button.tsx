"use client";

import { useWalletStore } from "@/lib/store";
import { truncateAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  const { connected, address, loading, error, connect, disconnect } =
    useWalletStore();

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-shield-500 animate-pulse" />
          <span className="text-sm font-mono text-foreground">
            {truncateAddress(address, 6)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="text-xs"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="hidden sm:block text-xs text-red-400 max-w-48 truncate">
          {error}
        </span>
      )}
      <Button
        variant="gradient"
        size="sm"
        onClick={connect}
        loading={loading}
      >
        Connect Wallet
      </Button>
    </div>
  );
}
