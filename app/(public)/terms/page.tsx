import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions governing your use of the BuilBid construction bidding platform.',
};

export default function TermsPage() {
  return (
    <StaticPageShell
      title="Terms of Service"
      subtitle="Please read these terms carefully before using BuilBid. By creating an account or using our platform, you agree to be bound by this agreement."
      lastUpdated="7 July 2026"
    >
      <StaticSection title="1. Acceptance of terms">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of the BuilBid
          platform, website, and related services (collectively, the &ldquo;Platform&rdquo;)
          operated by BuilBid. If you do not agree to these Terms, do not use the Platform.
        </p>
      </StaticSection>

      <StaticSection title="2. About BuilBid">
        <p>
          BuilBid is a technology platform that facilitates construction project auctions
          between clients and bidders (labour contractors and construction firms).
          BuilBid is a marketplace — we are not a construction company, contractor, employer
          of builders, or party to construction contracts formed between users.
        </p>
      </StaticSection>

      <StaticSection title="3. Eligibility & accounts">
        <ul className="list-disc pl-5 space-y-2">
          <li>You must be at least 18 years old and legally capable of entering binding contracts in India.</li>
          <li>You must provide accurate, current information during registration and keep it updated.</li>
          <li>You are responsible for safeguarding your login credentials and all activity under your account.</li>
          <li>One person or entity may not maintain multiple accounts to manipulate auctions or rankings.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </StaticSection>

      <StaticSection title="4. User roles & responsibilities">
        <p><strong className="text-foreground">Clients</strong> agree to:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2 mb-4">
          <li>Post accurate project specifications, including scope, area, location, and construction type.</li>
          <li>Run auctions in good faith and honour the selection process after bidding closes.</li>
          <li>Not solicit off-platform deals intended to circumvent BuilBid fees or auction rules during an active listing.</li>
        </ul>
        <p><strong className="text-foreground">Labour contractors & construction firms</strong> agree to:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Submit good-faith bids they intend to honour if selected.</li>
          <li>Maintain valid profile information, including GST details where applicable for firms.</li>
          <li>Not collude with other bidders to fix rates or manipulate auction outcomes.</li>
          <li>Deliver work in accordance with agreements reached directly with the client after selection.</li>
        </ul>
      </StaticSection>

      <StaticSection title="5. Auction rules">
        <ul className="list-disc pl-5 space-y-2">
          <li>Bidding windows are time-bound (typically 24 hours) as displayed on each project listing.</li>
          <li>Bid rates must comply with platform formatting rules (e.g., whole-number ₹/sqft rates ending in 0 or 5 for labour contracts).</li>
          <li>Live rankings are calculated automatically based on submitted rates and displayed rules.</li>
          <li>Withdrawn bids may not be reinstated. BuilBid&apos;s records of bid timestamps are authoritative for dispute resolution.</li>
          <li>After bidding closes, projects enter a selection phase during which clients review profiles and choose a partner.</li>
        </ul>
      </StaticSection>

      <StaticSection title="6. Fees">
        <p>
          BuilBid may introduce platform fees for certain services in the future. Any applicable
          fees will be disclosed clearly before you incur them. Posting projects and browsing
          auctions may be free during promotional periods unless otherwise stated on the Platform.
        </p>
      </StaticSection>

      <StaticSection title="7. Disclaimers">
        <p>
          THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo; TO THE
          FULLEST EXTENT PERMITTED BY LAW, BUILBID DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED,
          INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p className="mt-3">
          We do not guarantee the quality, safety, legality, or completion of any construction
          work. We do not verify every claim made in user profiles beyond our stated verification
          process. Users enter into construction agreements at their own risk and should conduct
          independent due diligence.
        </p>
      </StaticSection>

      <StaticSection title="8. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, BUILBID AND ITS FOUNDERS, OFFICERS,
          EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING
          FROM YOUR USE OF THE PLATFORM OR ANY TRANSACTION BETWEEN USERS.
        </p>
        <p className="mt-3">
          Our total aggregate liability for any claim arising from these Terms or the Platform
          shall not exceed the greater of (a) ₹5,000 or (b) the amount you paid to BuilBid in
          the twelve months preceding the claim.
        </p>
      </StaticSection>

      <StaticSection title="9. Indemnification">
        <p>
          You agree to indemnify and hold harmless BuilBid from any claims, damages, losses, or
          expenses (including reasonable legal fees) arising from your use of the Platform,
          your violation of these Terms, your violation of any law, or any dispute between
          you and another user.
        </p>
      </StaticSection>

      <StaticSection title="10. Intellectual property">
        <p>
          The BuilBid name, logo, website design, software, and content are owned by BuilBid
          or its licensors. You may not copy, modify, distribute, or reverse-engineer any part
          of the Platform without written permission. You retain ownership of content you
          upload but grant BuilBid a license to display it on the Platform as needed to
          operate the service.
        </p>
      </StaticSection>

      <StaticSection title="11. Termination">
        <p>
          You may close your account at any time by contacting support. We may suspend or
          terminate access immediately if you breach these Terms, engage in fraud, or if
          continued service poses risk to other users or the Platform.
        </p>
      </StaticSection>

      <StaticSection title="12. Governing law & disputes">
        <p>
          These Terms are governed by the laws of India. Any disputes shall be subject to the
          exclusive jurisdiction of the courts in Guwahati, Assam, unless applicable consumer
          protection law provides otherwise.
        </p>
        <p className="mt-3">
          We encourage you to contact us first at{' '}
          <a href="mailto:support@builbid.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            support@builbid.in
          </a>{' '}
          to resolve issues before pursuing formal proceedings.
        </p>
      </StaticSection>

      <StaticSection title="13. Changes to terms">
        <p>
          We may modify these Terms at any time. Updated Terms will be posted on this page
          with a revised date. Material changes may also be communicated via email or in-app
          notice. Continued use after changes constitutes acceptance.
        </p>
      </StaticSection>

      <StaticSection title="14. Contact">
        <p>
          Questions about these Terms? Contact{' '}
          <a href="mailto:legal@builbid.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            legal@builbid.in
          </a>{' '}
          or visit our{' '}
          <Link href="/contact" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Contact page
          </Link>.
          See also our{' '}
          <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Privacy Policy
          </Link>.
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}
