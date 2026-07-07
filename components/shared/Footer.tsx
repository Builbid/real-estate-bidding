'use client';

import Link from 'next/link';
import { Building2, BadgeCheck, Shield, Star } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageProvider';

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.126 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface FooterProps {
  compact?: boolean;
}

export function Footer({ compact }: FooterProps) {
  const { t } = useTranslation();

  const TRUST_BADGES = [
    { icon: BadgeCheck, text: t('home.trust.verifiedBuilders'), color: 'text-violet-400' },
    { icon: Shield, text: t('home.trust.privateContact'), color: 'text-blue-400' },
    { icon: Star, text: t('home.trust.transparentPricing'), color: 'text-amber-400' },
  ] as const;

  const PLATFORM_LINKS = [
    { label: t('footer.exploreProjects'), href: '/' },
    { label: t('footer.activeBids'), href: '/#live-auctions' },
    { label: t('footer.forBuilders'), href: '/register' },
  ] as const;

  const COMPANY_LINKS = [
    { label: t('footer.aboutUs'), href: '/#about' },
    { label: t('footer.contact'), href: '/#contact' },
    { label: t('footer.careers'), href: '/#careers' },
  ] as const;

  const LEGAL_LINKS = [
    { label: t('footer.privacyPolicy'), href: '/privacy' },
    { label: t('footer.termsOfService'), href: '/terms' },
  ] as const;

  const SOCIAL_LINKS = [
    { label: 'LinkedIn', href: 'https://linkedin.com', icon: LinkedInIcon },
    { label: 'X (Twitter)', href: 'https://twitter.com', icon: XIcon },
  ] as const;

  return (
    <footer className="border-t border-border bg-background">
      <div className={`max-w-7xl mx-auto px-6 ${compact ? 'py-8' : 'py-12'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              aria-label="BuilBid Home"
              className="inline-flex items-center gap-2.5 group mb-4 cursor-pointer hover:opacity-80 transition-opacity no-underline"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/30 group-hover:bg-violet-500/20 transition-colors">
                <Building2 className="w-5 h-5 text-violet-400" />
              </div>
              <span className="text-base font-bold text-foreground tracking-tight">BuilBid</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
              {TRUST_BADGES.map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Icon className={`w-3 h-3 ${color}`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-4">
              {t('footer.platform')}
            </h3>
            <ul className="space-y-3">
              {PLATFORM_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-4">
              {t('footer.company')}
            </h3>
            <ul className="space-y-3">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-4">
              {t('footer.legal')}
            </h3>
            <ul className="space-y-3">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground order-2 sm:order-1">{t('footer.copyright')}</p>
          <div className="flex items-center gap-3 order-1 sm:order-2">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border hover:bg-card transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
