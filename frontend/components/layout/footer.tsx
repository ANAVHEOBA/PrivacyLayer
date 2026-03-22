import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-background/50">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <p className="text-sm text-muted-foreground">
            PrivacyLayer — ZK-proof shielded pool on Stellar Soroban
          </p>
          <p className="text-xs text-muted-foreground/60">
            Powered by Protocol 25 native BN254 + Poseidon cryptographic primitives
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/ANAVHEOBA/PrivacyLayer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
          <Link
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Stellar
          </Link>
          <Link
            href="https://soroban.stellar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Soroban Docs
          </Link>
        </div>
      </div>
    </footer>
  );
}
