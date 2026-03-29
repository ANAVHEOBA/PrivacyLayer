import React, { useState } from "react";

/**
 * InstallPrompt - Prompts users to install Freighter wallet
 * Shown when Freighter is not detected in the browser
 */
export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-6 h-6 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-yellow-800 mb-1">
            Freighter Wallet Not Detected
          </h4>
          <p className="text-xs text-yellow-700 mb-3">
            PrivacyLayer requires the Freighter wallet to interact with the
            Stellar network. Please install the browser extension.
          </p>

          {/* Install Button */}
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Install Freighter
          </a>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 text-yellow-500 hover:text-yellow-700 transition-colors"
          aria-label="Dismiss"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Supported Browsers */}
      <div className="mt-3 pt-3 border-t border-yellow-200">
        <p className="text-xs text-yellow-700 mb-2">Supported browsers:</p>
        <div className="flex flex-wrap gap-2">
          {["Chrome", "Firefox", "Brave", "Edge"].map((browser) => (
            <span
              key={browser}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white bg-opacity-60 rounded text-xs text-yellow-800"
            >
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              {browser}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
