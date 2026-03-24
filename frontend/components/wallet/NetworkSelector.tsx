'use client';

import { useWalletNetwork } from '@/lib/store';

interface NetworkSelectorProps {
  onNetworkChange?: (network: string) => void;
}

const NETWORKS = [
  { id: 'TESTNET', name: 'Testnet', passphrase: 'Test SDF Network ; September 2015' },
  { id: 'PUBLIC', name: 'Mainnet', passphrase: 'Public Global Stellar Network ; September 2015' },
];

export default function NetworkSelector({ onNetworkChange }: NetworkSelectorProps) {
  const currentNetwork = useWalletNetwork();

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-sm">Network:</span>
      <select
        value={currentNetwork || 'TESTNET'}
        onChange={(e) => onNetworkChange?.(e.target.value)}
        className="bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-primary-500 focus:outline-none"
      >
        {NETWORKS.map((network) => (
          <option key={network.id} value={network.id}>
            {network.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500">
        (Change in Freighter)
      </span>
    </div>
  );
}