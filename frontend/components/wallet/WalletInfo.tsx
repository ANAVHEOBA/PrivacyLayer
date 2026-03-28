import React from "react";
import { useWalletStore } from "../../lib/store";
import { formatPublicKey, isValidPublicKey } from "../../lib/wallet";

/**
 * WalletInfo - Display connected wallet information
 * Shows public key, network, and copy-to-clipboard functionality
 */
export function WalletInfo() {
  const { isConnected, publicKey, network } = useWalletStore();

  if (!isConnected || !publicKey) {
    return null;
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicKey);
      alert("Public key copied to clipboard!");
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = publicKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Public key copied!");
    }
  };

  const networkColors: Record<string, string> = {
    TESTNET: "bg-blue-100 text-blue-800",
    MAINNET: "bg-green-100 text-green-800",
    FUTURENET: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
        Wallet Info
      </h3>

      {/* Public Key */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          Public Key
        </label>
        <div className="flex items-center gap-2 mt-1">
          <code className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded border border-gray-200 font-mono break-all">
            {publicKey}
          </code>
          <button
            onClick={copyToClipboard}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Copy public key"
          >
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
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Formatted Address */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          Short Address
        </label>
        <p className="text-sm font-mono mt-1 text-gray-800">
          {formatPublicKey(publicKey)}
        </p>
      </div>

      {/* Network */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          Network
        </label>
        <p className="mt-1">
          <span
            className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
              networkColors[network] || "bg-gray-100 text-gray-800"
            }`}
          >
            {network}
          </span>
        </p>
      </div>

      {/* Validation */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 flex items-center gap-1">
          {isValidPublicKey(publicKey) ? (
            <>
              <svg
                className="w-3 h-3 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Valid Stellar address
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Address format may be invalid
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default WalletInfo;
