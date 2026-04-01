'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Shield, Zap, Eye, Lock, Globe, ChevronDown,
  Sun, Moon, ArrowRight, CheckCircle, X, Menu,
  Github, Twitter, FileText, Coins, Users, Clock,
} from 'lucide-react';

// ─── Theme Toggle ───────────────────────────────────────────────────────────
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

// ─── Mobile Nav ─────────────────────────────────────────────────────────────
function MobileNav() {
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="md:hidden">
      <button onClick={() => setOpen(!open)} className="p-2">
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 z-50 flex flex-col gap-3">
          <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm font-medium hover:text-primary transition-colors">How It Works</a>
          <a href="#features" onClick={() => setOpen(false)} className="text-sm font-medium hover:text-primary transition-colors">Features</a>
          <a href="#security" onClick={() => setOpen(false)} className="text-sm font-medium hover:text-primary transition-colors">Security</a>
          <a href="#faq" onClick={() => setOpen(false)} className="text-sm font-medium hover:text-primary transition-colors">FAQ</a>
          <a href="/deposit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium text-center">Launch App</a>
          {mounted && (
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2 text-sm">
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">PrivacyLayer</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">How It Works</a>
          <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</a>
          <a href="#security" className="text-sm font-medium hover:text-primary transition-colors">Security</a>
          <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <MobileNav />
          <a href="/deposit" className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
            Launch App <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium mb-6 animate-fade-in">
          <Shield className="w-3.5 h-3.5" />
          Powered by Zero-Knowledge Proofs
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up">
          <span className="bg-gradient-to-r from-slate-900 dark:from-white via-purple-600 dark:via-purple-400 to-slate-900 dark:to-white bg-clip-text text-transparent">
            Privacy-First
          </span>
          <br />
          <span className="text-slate-900 dark:text-white">on Stellar</span>
        </h1>

        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
          PrivacyLayer uses cutting-edge ZK-proof technology to enable truly private transactions on the Stellar network. Deposit, mix, and withdraw — all without revealing your financial activity.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <a href="/deposit" className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-primary text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all">
            Launch App
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a href="#how-it-works" className="flex items-center gap-2 px-8 py-4 border border-slate-300 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Learn More
          </a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Open Source</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Audited Contracts</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>No KYC Required</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Deposit',
      description: 'Send XLM or any Stellar asset to the PrivacyLayer pool. Your deposit is broken into standardized denominations and mixed with other users.',
      icon: Coins,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '02',
      title: 'Mix',
      description: 'Your funds are pooled with deposits from other users. ZK proofs verify your deposit without revealing its source, breaking the on-chain link.',
      icon: Zap,
      color: 'from-purple-500 to-pink-500',
    },
    {
      number: '03',
      title: 'Withdraw',
      description: 'Withdraw to any address using a zero-knowledge proof of your deposit. The recipient sees funds arriving but cannot trace them back to you.',
      icon: Globe,
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            PrivacyLayer leverages ZK-SNARK proofs to break the transaction graph while maintaining full on-chain verifiability.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px bg-gradient-to-r from-slate-300 dark:from-slate-600 to-transparent z-0" />
              )}

              <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/30 transition-all hover:shadow-lg">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} mb-4`}>
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-bold text-slate-400 mb-2">STEP {step.number}</div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: Shield,
      title: 'Zero-Knowledge Privacy',
      description: 'ZK-SNARK proofs mathematically guarantee that withdrawals cannot be linked to deposits — no trusted setup required beyond initialization.',
    },
    {
      icon: Eye,
      title: 'No Transaction Tracing',
      description: 'Your financial activity is hidden from block explorers and analytics. Choose who sees your transaction history.',
    },
    {
      icon: Lock,
      title: 'Self-Custodial',
      description: 'You always control your funds. No admin keys, no frozen accounts. Withdraw anytime with valid proof.',
    },
    {
      icon: Coins,
      title: 'Multiple Denominations',
      description: 'Deposits are standardized into fixed amounts (0.1, 1, 10, 100 XLM) to maximize anonymity sets and make amount correlation impossible.',
    },
    {
      icon: Globe,
      title: 'Cross-Asset Privacy',
      description: 'Support for XLM and all Stellar assets. Convert, mix, and withdraw different asset types through a single interface.',
    },
    {
      icon: Zap,
      title: 'Low Fees',
      description: 'Minimal pool fees go toward circuit computation and network costs. Most private transactions cost less than $0.01.',
    },
  ];

  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why PrivacyLayer?</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Built on years of cryptographic research, PrivacyLayer provides the strongest privacy guarantees available on Stellar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500/40 dark:hover:border-purple-500/40 transition-all hover:shadow-md">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Security ───────────────────────────────────────────────────────────────
function Security() {
  return (
    <section id="security" className="py-20 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cryptographic Guarantees</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              PrivacyLayer is built on rigorous cryptographic foundations. Every withdrawal is verified by on-chain ZK proofs — no trust in any party required.
            </p>
            <div className="space-y-4">
              {[
                'ZK-SNARK proofs verified entirely on-chain',
                'All contract logic is open source and auditable',
                'No admin keys that can freeze or drain funds',
                'Multi-party computation for ceremony (trusted setup)',
                'Formal audit by independent security researchers',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-semibold">Security Status</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">All Systems Operational</div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Circuit Verified', status: '✅ Complete' },
                  { label: 'Contract Audit', status: '✅ Passed' },
                  { label: 'Trusted Setup', status: '✅ Complete' },
                  { label: 'ZK Proof Generation', status: '✅ Working' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                    <span className="text-sm font-medium">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold pulse-glow">
              Audit Passed ✅
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Is PrivacyLayer a mixer? How is it different?',
      a: 'PrivacyLayer is a privacy pool — not a mixer. Unlike mixers which shuffle funds arbitrarily, PrivacyLayer uses cryptographic ZK proofs to mathematically prove that a withdrawal comes from a valid deposit, without revealing which one. This means privacy is provable and auditable.',
    },
    {
      q: 'Who can see my transactions?',
      a: 'No one. The block explorer will show a deposit into the PrivacyLayer contract and a withdrawal to your recipient address, but there is no cryptographic link between them. Only you (with your note) can connect them.',
    },
    {
      q: 'What happens if I lose my withdrawal note?',
      a: 'The note is critical — it is the only way to withdraw your funds. If you lose it, your funds are permanently unrecoverable. Always back up your note in multiple secure locations.',
    },
    {
      q: 'How long does a withdrawal take?',
      a: 'ZK proof generation takes 30–120 seconds depending on the denomination and network congestion. Once the proof is ready, the withdrawal transaction submits in seconds.',
    },
    {
      q: 'What are the fees?',
      a: 'Pool fees are 0.1% of the transaction amount. Network fees (Stellar base fee) are also required. Total cost is typically under $0.01 per transaction.',
    },
    {
      q: 'Is KYC required to use PrivacyLayer?',
      a: 'No. PrivacyLayer is fully self-custodial and permissionless. No accounts, no KYC, no identity verification. Connect any Freighter wallet and start transacting.',
    },
  ];

  return (
    <section id="faq" className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="font-medium pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-gradient-to-br from-purple-600 to-primary rounded-3xl p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to take back your privacy?</h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto">
              Start using PrivacyLayer today. No accounts, no KYC, no tracking — just private transactions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/deposit" className="group flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl font-semibold hover:shadow-xl transition-all">
                Deposit Funds
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="/withdraw" className="flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-medium hover:bg-white/10 transition-colors">
                Learn About Withdrawals
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">PrivacyLayer</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="https://github.com/ANAVHEOBA/PrivacyLayer" className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <a href="#" className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              <FileText className="w-4 h-4" /> Docs
            </a>
          </div>

          <div className="text-xs text-slate-400">
            © 2026 PrivacyLayer. Open source under MIT.
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong>Disclaimer:</strong> PrivacyLayer is a decentralized, non-custodial privacy protocol. While it provides strong cryptographic privacy guarantees, users are responsible for their own security practices. PrivacyLayer team does not have access to your funds or transaction data. Using privacy tools may have regulatory implications in your jurisdiction — research applicable laws before using this protocol.
        </div>
      </div>
    </footer>
  );
}

// ─── Landing Page ────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <Features />
      <Security />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
