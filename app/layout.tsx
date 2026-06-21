import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'BidEstate — Professional Construction Bidding Platform',
    template: '%s | BidEstate',
  },
  description:
    'Multi-tier real estate construction bidding platform for Assam. Post projects, receive competitive per-sqft rate bids from verified builders.',
  keywords: ['construction bidding', 'real estate', 'Assam', 'RCC', 'contractor', 'auction'],
  openGraph: {
    type: 'website',
    title: 'BidEstate — Construction Bidding Platform',
    description: 'Professional 24-hour auction platform for real estate construction projects.',
    siteName: 'BidEstate',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
