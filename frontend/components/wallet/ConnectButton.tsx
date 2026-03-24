'use client';

import { useWalletStore, useWalletLoading, useWalletConnected, useWalletError } from '@/lib/store';

export default function ConnectButton() {
  const connect = useWalletStore((state) => state.connect);
  const disconnect = useWalletStore((state) => state.disconnect);
  const isLoading = useWalletLoading();
  const isConnected = useWalletConnected();
  const error = useWalletError();

  const handleClick = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          px-6 py-3 rounded-lg font-medium text-white
          transition-all duration-200 ease-in-out
          ${isConnected 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-primary-600 hover:bg-primary-700'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4"
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Connecting...
          </span>
        ) : isConnected ? (
          'Disconnect Wallet'
        ) : (
          'Connect Freighter Wallet'
        )}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm mt-2 max-w-md text-center">
          {error}
        </p>
      )}
    </div>
  );
}