import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

/** Defer floating CTA — not needed for first paint / DOMContentLoaded. */
const FloatingPostProjectButton = dynamic(
  () =>
    import('@/components/FloatingPostProjectButton').then(
      (mod) => mod.FloatingPostProjectButton,
    ),
  { ssr: false },
);

export const metadata: Metadata = {
  title: {
    default: 'BuilBid — Professional Construction Bidding Platform',
    template: '%s | BuilBid',
  },
  description:
    'Multi-tier real estate construction bidding platform for Assam. Post projects, receive competitive per-sqft rate bids from verified builders.',
  keywords: ['construction bidding', 'real estate', 'Assam', 'RCC', 'contractor', 'auction'],
  openGraph: {
    type: 'website',
    title: 'BuilBid — Construction Bidding Platform',
    description: 'Professional 24-hour auction platform for real estate construction projects.',
    siteName: 'BuilBid',
  },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/icon.png', sizes: '512x512' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen overflow-x-clip bg-white text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
        <AppProviders>
          {children}
          <FloatingPostProjectButton />
        </AppProviders>
      </body>
    </html>
  );
}
