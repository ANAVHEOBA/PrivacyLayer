import React, { useState } from "react";
import { useWalletStore } from "../../lib/store";
import {
  switchWalletNetwork,
  getCurrentNetwork,
  type Network,
  type WalletError,
} from "../../lib/wallet";

/**
 * NetworkSelector - Dropdown to switch between Stellar networks
 * Allows users to switch their Freighter wallet network
 */
export function NetworkSelector() {
  const { network: storeNetwork, setNetwork, isConnected } = useWalletStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const networks: { id: Network; label: string; color: string }[] = [
    { id: "TESTNET", label: "Testnet", color: "bg-blue-500" },
    { id: "MAINNET", label: "Mainnet", color: "bg-green-500" },
    { id: "FUTURENET", label: "Futurenet", color: "bg-purple-500" },
  ];

  const currentNetwork = networks.find((n) => n.id === storeNetwork);

  const handleSwitch = async (network: Network) => {
    setError(null);
    setIsSwitching(true);

    try {
      // Switch in Freighter wallet
      await switchWalletNetwork(network);

      // Update local store
      setNetwork(network);

      // Verify the switch was successful
      const current = await getCurrentNetwork();
      if (current !== network) {
        setError("Network switch may have failed. Please verify in Freighter.");
      }

      setIsOpen(false);
    } catch (err) {
      const walletError = err as WalletError;
      setError(walletError.message || "Failed to switch network");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!isConnected || isSwitching}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
          ${
            !isConnected
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
          }
        `}
      >
        {isSwitching ? (
          <>
            <svg
              className="animate-spin w-4 h-4 text-gray-500"
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
            Switching...
          </>
        ) : (
          <>
            <span
              className={`w-2 h-2 rounded-full ${currentNetwork?.color}`}
            />
            {currentNetwork?.label || "Select Network"}
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 mb-1">Switch Network</p>
              {networks.map((net) => (
                <button
                  key={net.id}
                  onClick={() => handleSwitch(net.id)}
                  disabled={net.id === storeNetwork}
                  className={`
                    w-full flex items-center gap-2 px-2 py-2 text-sm rounded transition-colors
                    ${
                      net.id === storeNetwork
                        ? "bg-gray-100 text-gray-400 cursor-default"
                        : "hover:bg-gray-50 text-gray-700"
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${net.color}`} />
                  {net.label}
                  {net.id === storeNetwork && (
                    <svg
                      className="w-4 h-4 ml-auto text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute right-0 mt-2 w-64 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 z-20">
          {error}
        </div>
      )}
    </div>
  );
}

export default NetworkSelector;
