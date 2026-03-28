import React, { useEffect, useState } from "react";
import { ConnectButton } from "./components/wallet/ConnectButton";
import { WalletInfo } from "./components/wallet/WalletInfo";
import { NetworkSelector } from "./components/wallet/NetworkSelector";
import { InstallPrompt } from "./components/wallet/InstallPrompt";
import { useWalletStore } from "./lib/store";
import { checkWalletInstalled } from "./lib/wallet";

/**
 * Main App component for PrivacyLayer Frontend
 * Demonstrates Freighter wallet integration
 */
function App() {
  const { isConnected } = useWalletStore();
  const [walletInstalled, setWalletInstalled] = useState<boolean | null>(null);

  // Check if Freighter is installed on mount
  useEffect(() => {
    checkWalletInstalled().then(setWalletInstalled);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PL</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              PrivacyLayer
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && <NetworkSelector />}
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Install Prompt */}
        {walletInstalled === false && <InstallPrompt />}

        {/* Wallet Info Panel */}
        {isConnected && (
          <div className="mb-6">
            <WalletInfo />
          </div>
        )}

        {/* Demo Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Freighter Wallet Integration Demo
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Feature List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Features Implemented
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  "Connect/disconnect Freighter wallet",
                  "Get and display public key",
                  "Copy address to clipboard",
                  "Network switching (Testnet/Mainnet)",
                  "Persistent wallet state",
                  "Comprehensive error handling",
                  "Install prompt for new users",
                  "Mobile responsive design",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Connection Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Wallet Status</span>
                  <span
                    className={`text-sm font-medium ${
                      walletInstalled === false
                        ? "text-red-600"
                        : walletInstalled === true && isConnected
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {walletInstalled === null
                      ? "Checking..."
                      : walletInstalled === false
                      ? "Not Installed"
                      : isConnected
                      ? "Connected"
                      : "Ready"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Network</span>
                  <span className="text-sm font-medium text-gray-900">
                    {useWalletStore.getState().network || "Not Set"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Persistence</span>
                  <span className="text-sm font-medium text-green-600">
                    ✓ LocalStorage
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Signing Demo */}
        {isConnected && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transaction Signing
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              The wallet is connected and ready to sign Stellar/Soroban
              transactions. Use the{" "}
              <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                signTransaction()
              </code>{" "}
              function to sign transactions for PrivacyLayer operations.
            </p>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500 font-mono">
                {`import { signTransactionWithWallet } from "@/lib/wallet";

// Sign a Soroban transaction
const signedTx = await signTransactionWithWallet(transactionXDR);`}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        <p>
          PrivacyLayer — ZK-Proof Shielded Pool on Stellar Soroban | Powered by
          Freighter
        </p>
      </footer>
    </div>
  );
}

export default App;
