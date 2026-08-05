import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageShell, StaticSection } from '@/components/marketing/StaticPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How BuilBid collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <StaticPageShell
      title="Privacy Policy"
      subtitle="Your privacy matters to us. This policy explains what information we collect, how we use it, and the choices you have."
      lastUpdated="7 July 2026"
    >
      <StaticSection title="1. Who we are">
        <p>
          BuilBid (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the BuilBid
          construction bidding platform at builbid.in and related services. We are committed
          to protecting the personal information of clients, mistri contractors,
          construction firms, and visitors to our website.
        </p>
        <p>
          For privacy-related questions, contact us at{' '}
          <a href="mailto:privacy@builbid.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            privacy@builbid.in
          </a>.
        </p>
      </StaticSection>

      <StaticSection title="2. Information we collect">
        <p>We collect information you provide directly and data generated through your use of the platform:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-foreground">Account information:</strong> name, email address, mobile number, password (stored securely hashed), role (owner, mistri contractor, or construction firm).</li>
          <li><strong className="text-foreground">Profile information:</strong> company name, GST number, physical address, profile photo or firm logo, years in business, and portfolio details you choose to upload.</li>
          <li><strong className="text-foreground">Project & bidding data:</strong> project specifications, bid rates, auction timestamps, and selection decisions.</li>
          <li><strong className="text-foreground">Technical data:</strong> IP address, browser type, device information, and usage logs for security and performance.</li>
        </ul>
      </StaticSection>

      <StaticSection title="3. How we use your information">
        <p>We use collected information to:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Create and manage your account</li>
          <li>Run live construction auctions and display real-time bid rankings</li>
          <li>Verify builder and firm identities on the platform</li>
          <li>Facilitate connections between clients and selected bidders after a match</li>
          <li>Send transactional emails (account confirmation, auction notifications, selection updates)</li>
          <li>Improve platform security, prevent fraud, and enforce our Terms of Service</li>
          <li>Comply with applicable legal obligations</li>
        </ul>
        <p className="mt-3">
          We do not sell your personal information to third parties for marketing purposes.
        </p>
      </StaticSection>

      <StaticSection title="4. Contact detail privacy">
        <p>
          A core feature of BuilBid is protecting private contact information during the
          bidding phase. Builder names and profile photos may appear on public leaderboards,
          but phone numbers, email addresses, and exact locations are not shared with other
          users until a client selects a winning bidder and both parties agree to connect.
        </p>
      </StaticSection>

      <StaticSection title="5. Information sharing">
        <p>We may share information only in these circumstances:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-foreground">With your consent:</strong> when you select a builder or firm and authorize contact exchange.</li>
          <li><strong className="text-foreground">Service providers:</strong> trusted vendors who help us operate the platform (hosting, email delivery, database services), bound by confidentiality obligations.</li>
          <li><strong className="text-foreground">Legal requirements:</strong> when required by law, court order, or to protect the rights and safety of BuilBid, our users, or the public.</li>
        </ul>
      </StaticSection>

      <StaticSection title="6. Data retention">
        <p>
          We retain account and project data for as long as your account is active or as needed
          to provide services, resolve disputes, and meet legal obligations. You may request
          account deletion by contacting{' '}
          <a href="mailto:privacy@builbid.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            privacy@builbid.in
          </a>.
          Some records may be retained where required by law or for legitimate business purposes
          such as fraud prevention.
        </p>
      </StaticSection>

      <StaticSection title="7. Security">
        <p>
          We implement industry-standard technical and organizational measures to protect your
          data, including encrypted connections (HTTPS), secure password hashing, and access
          controls on our infrastructure. No method of transmission over the internet is
          100% secure; we continuously work to improve our safeguards.
        </p>
      </StaticSection>

      <StaticSection title="8. Cookies & local storage">
        <p>
          We use essential cookies and browser local storage to maintain your session, remember
          theme preferences (light/dark mode), and keep you signed in. We do not use third-party
          advertising cookies. You can control cookies through your browser settings, though
          disabling essential cookies may affect platform functionality.
        </p>
      </StaticSection>

      <StaticSection title="9. Your rights">
        <p>Depending on applicable law, you may have the right to:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate or incomplete information</li>
          <li>Request deletion of your account and associated data</li>
          <li>Withdraw consent where processing is consent-based</li>
          <li>Lodge a complaint with a relevant data protection authority</li>
        </ul>
        <p className="mt-3">
          To exercise these rights, email{' '}
          <a href="mailto:privacy@builbid.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            privacy@builbid.in
          </a>{' '}
          with your registered email address.
        </p>
      </StaticSection>

      <StaticSection title="10. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be
          posted on this page with an updated &ldquo;Last updated&rdquo; date. Continued use
          of BuilBid after changes constitutes acceptance of the revised policy.
        </p>
      </StaticSection>

      <StaticSection title="11. Contact">
        <p>
          BuilBid — Privacy Team<br />
          Email:{' '}
          <a href="mailto:privacy@builbid.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            privacy@builbid.in
          </a>
          <br />
          See also our{' '}
          <Link href="/contact" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Contact page
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Terms of Service
          </Link>.
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}
