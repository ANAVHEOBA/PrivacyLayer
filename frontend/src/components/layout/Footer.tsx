import Link from 'next/link';

const footerLinks = {
  protocol: [
    { name: 'Documentation', href: '/docs' },
    { name: 'GitHub', href: 'https://github.com/ANAVHEOBA/PrivacyLayer' },
    { name: 'Security', href: '/security' },
  ],
  community: [
    { name: 'Discord', href: '#' },
    { name: 'Twitter', href: '#' },
    { name: 'Telegram', href: '#' },
  ],
  legal: [
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container px-4 py-12 mx-auto">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6">
                <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
                  <path
                    d="M16 2L4 7v9c0 7.73 5.12 14.95 12 17 6.88-2.05 12-9.27 12-17V7L16 2z"
                    className="fill-primary/20 stroke-primary"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <span className="font-semibold">PrivacyLayer</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              The first ZK-proof shielded pool on Stellar Soroban. 
              Deposit and withdraw privately with zero-knowledge proofs.
            </p>
          </div>

          {/* Protocol Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Protocol</h3>
            <ul className="space-y-2">
              {footerLinks.protocol.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Community</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} PrivacyLayer. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Built on Stellar</span>
            <span>•</span>
            <span>Protocol 25</span>
          </div>
        </div>
      </div>
    </footer>
  );
}