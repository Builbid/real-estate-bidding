export type RoleTermsAudience = 'worker' | 'owner';

export interface RoleTermsSection {
  title: string;
  body: string;
}

export interface RoleTermsDocument {
  audience: RoleTermsAudience;
  href: string;
  heading: string;
  intro?: string;
  termsLinkLabel: string;
  sections: RoleTermsSection[];
}

export const ROLE_TERMS: Record<RoleTermsAudience, RoleTermsDocument> = {
  worker: {
    audience: 'worker',
    href: '/terms/worker',
    heading: 'TERMS AND CONDITIONS FOR WORKER & CONTRACTOR PARTNERS',
    intro:
      'By registering as a Worker or Contractor Partner on BuilBid (builbid.in), you agree to comply with and be bound by these Terms and Conditions.',
    termsLinkLabel: 'Terms & Conditions for Workers & Contractors',
    sections: [
      {
        title: '1. Fixed Unit Rates and Binding Bids',
        body: 'All unit rates submitted during the bidding process are strictly fixed and binding. These unit rates cannot be altered, increased, or renegotiated during or after the physical site visit. Site visits conducted by BuilBid field supervisors are strictly meant for verifying actual site measurements, structural scopes, and ground conditions.',
      },
      {
        title: '2. Mandatory Reporting of Material Delays',
        body: "In the event of any work stoppage caused by a shortage or non-supply of construction materials from the homeowner's end, the Worker or Contractor must immediately report the issue to BuilBid executives or the main office. BuilBid will officially log the exact number of idle days caused by material disruptions, ensuring that the partner is not held liable or penalized for project delays directly resulting from documented material supply failures by the owner.",
      },
      {
        title: '3. Site Visit Cooperation and 10-Day Agreement Window',
        body: 'Partners must fully cooperate with BuilBid field supervisors during scheduled physical site inspections. Once selected by a homeowner, the selection status remains valid for up to 10 days to conduct joint site measurements and sign the formal agreement. Partners are obligated to execute and complete the assigned construction work within the mutually agreed timeline, as unjustified delays or poor workmanship will incur delay penalties as outlined in the official agreement contract.',
      },
      {
        title: '4. Platform Payment Channel and Prohibition of Direct Collections',
        body: "Workers and Contractors are strictly prohibited from demanding or accepting direct cash/online payments from homeowners. All financial transactions, milestone payments, and advances must strictly pass through BuilBid's official payment gateway. Collecting direct payments from owners violates platform policy and will lead to immediate account termination.",
      },
      {
        title: '5. Partner Commission Payment Structure (30% Upfront + 70% Deductions)',
        body: 'Upon completion of the physical site inspection and final verification of the project value, the partner must instantly pay 30% of the total BuilBid platform commission on the spot. The remaining 70% of the commission fee will be automatically adjusted and deducted by BuilBid from the initial milestone payouts disbursed from the homeowner.',
      },
      {
        title: '6. Strict Zero-Tolerance Policy on Alcohol and Substance Abuse',
        body: "Consumption or possession of alcohol, drugs, or any intoxicating substances at the construction site during working hours is strictly prohibited. If a homeowner or field supervisor reports any partner or laborer under the influence of alcohol or drugs at the site, the partner's contract will be terminated immediately, and their profile will be permanently blacklisted from BuilBid.",
      },
    ],
  },
  owner: {
    audience: 'owner',
    href: '/terms/owner',
    heading: 'TERMS AND CONDITIONS FOR HOMEOWNERS / OWNERS',
    termsLinkLabel: 'Terms & Conditions for Homeowners',
    sections: [
      {
        title: '1. Obligation of Uninterrupted Material Supply',
        body: "For homeowners under labor, worker, or contractor rate contracts, you are required to ensure a continuous and timely supply of construction materials at the project site according to the agreed project timeline. Any delay in material delivery that halts daily construction work will automatically extend the final project completion deadline by the exact duration of the delay. Extended material supply disruptions will invalidate the contractor's completion deadline obligations and may incur idle labor charges.",
      },
      {
        title: '2. Bidding Duration and Flexible Selection Window (48 Hours Total)',
        body: 'Each posted project remains in the "Live Bidding" stage for 24 hours, during which homeowners are welcome to review bids and select their preferred Worker or Contractor at any time. Once the 24-hour live bidding concludes, homeowners receive an additional 24-hour selection window, providing a total of 48 hours from project posting to finalize their choice. If a bidder is not selected within this combined 48-hour period, the selection option for that specific project post will respectfully expire and will no longer be available.',
      },
      {
        title: '3. Mandatory 10-Day Site Visit and Verification Limit',
        body: 'Once a Worker or Contractor is selected, BuilBid representatives will get in touch to schedule the official physical site inspection and measurement checklist. Homeowners must facilitate and confirm the site visit within 10 days of selecting the bidder. If the site visit and official agreement process are not initiated or completed within this 10-day timeframe, the selected bidder status will become invalid, and the project selection will automatically be removed from the active dashboard.',
      },
      {
        title: '4. Fixed Rate Protection and Approximate Cost Basis',
        body: 'The unit rates submitted by the selected contractor or worker remain fixed and protected, as contractors are not permitted to alter their unit rates during or after the site visit. The initial project cost shown on the dashboard is an Approximate Cost calculated from user-submitted details, and the final contract amount will be accurately finalized by multiplying the fixed unit rate with the actual site measurements verified by the BuilBid supervisor during the physical inspection.',
      },
      {
        title: '5. Mandatory Official Payment Through BuilBid Only',
        body: 'Homeowners must make all project payments, milestone disbursements, and advances strictly to the official BuilBid bank account via online payment options. Homeowners are strictly advised NOT to pay cash or make direct online transfers to workers or contractors. Payments made directly to contractors will not be recorded in your legal dashboard invoice, will invalidate the BuilBid official contract agreement, and will exempt BuilBid from providing dispute resolution or legal protection under platform bylaws.',
      },
    ],
  },
};

export function termsAudienceForSignupRole(
  role: 'owner' | 'labour_contractor' | 'construction_firm',
): RoleTermsAudience {
  return role === 'owner' ? 'owner' : 'worker';
}
