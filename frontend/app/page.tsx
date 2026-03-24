import ConnectButton from '@/components/wallet/ConnectButton'
import WalletInfo from '@/components/wallet/WalletInfo'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          🔐 PrivacyLayer
        </h1>
        <p className="text-center text-gray-500 mb-8">
          The first ZK-proof shielded pool on Stellar Soroban
        </p>
        
        <div className="flex flex-col items-center gap-4">
          <ConnectButton />
          <WalletInfo />
        </div>
      </div>
    </main>
  )
}