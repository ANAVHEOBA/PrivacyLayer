'use client';

export default function InstallPrompt() {
  return (
    <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-6 max-w-md text-center">
      <h3 className="text-lg font-semibold text-yellow-400 mb-2">
        ⚠️ Freighter Not Detected
      </h3>
      <p className="text-gray-300 mb-4">
        Freighter wallet is required to interact with PrivacyLayer.
        Please install it to continue.
      </p>
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
      >
        Install Freighter
      </a>
    </div>
  );
}