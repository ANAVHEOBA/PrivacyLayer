'use client';

import { useWalletConnected, useWalletPublicKey, useWalletNetwork } from '@/lib/store';

export default function WalletInfo() {
  const isConnected = useWalletConnected();
  const publicKey = useWalletPublicKey();
  const network = useWalletNetwork();

  if (!isConnected || !publicKey) {
    return null;
  }

  // Truncate public key for display
  const truncatedKey = `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`;

  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        Connected Wallet
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Address:</span>
          <code className="text-sm text-green-400 bg-gray-900 px-2 py-1 rounded">
            {truncatedKey}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(publicKey)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Copy full address"
          >
            📋
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Network:</span>
          <span className="text-sm text-blue-400">
            {network || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}