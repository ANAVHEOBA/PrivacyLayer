import React, { useState } from "react";
import { useWalletStore } from "../../lib/store";
import {
  connectWallet,
  formatPublicKey,
  type WalletError,
} from "../../lib/wallet";

/**
 * ConnectButton - Connect/disconnect wallet button
 * Shows different states: idle, connecting, connected, error
 */
export function ConnectButton() {
  const { isConnected, isConnecting, publicKey, setConnecting, setConnected, setDisconnected, setError, clearError } = useWalletStore();
  const [hoverError, setHoverError] = useState(false);

  const handleConnect = async () => {
    clearError();
    setConnecting(true);

    try {
      const pk = await connectWallet();
      setConnected(pk, "TESTNET");
    } catch (err) {
      const error = err as WalletError;
      setError(error);
    }
  };

  const handleDisconnect = () => {
    setDisconnected();
  };

  // Error state with hover to show message
  if (useWalletStore.getState().error.code) {
    const error = useWalletStore.getState().error;
    return (
      <div className="relative">
        <button
          onClick={handleConnect}
          onMouseEnter={() => setHoverError(true)}
          onMouseLeave={() => setHoverError(false)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Retry Connect
          </span>
        </button>
        {hoverError && error.message && (
          <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
            {error.message}
          </div>
        )}
      </div>
    );
  }

  // Connecting state
  if (isConnecting) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm opacity-75 cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Connecting...
        </span>
      </button>
    );
  }

  // Connected state
  if (isConnected && publicKey) {
    return (
      <button
        onClick={handleDisconnect}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {formatPublicKey(publicKey)}
        </span>
      </button>
    );
  }

  // Idle state
  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
    >
      <span className="flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        Connect Wallet
      </span>
    </button>
  );
}

export default ConnectButton;
