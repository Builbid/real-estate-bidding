export const SIGNUP_ROLE_CARDS = [
  {
    role: 'owner' as const,
    emoji: '🏠',
    title: 'Client',
    subtitle: 'I want to build a house or construction project',
    bullets: [
      'Post your project for free',
      'Receive competitive bids',
      'Choose your contractor or firm',
    ],
    noteBadge: null,
    accent: 'teal' as const,
    href: '/signup/project-owner',
  },
  {
    role: 'labour_contractor' as const,
    emoji: '👷',
    title: 'Labour Contractor',
    subtitle: 'I provide construction labour & skilled workers',
    bullets: [
      'Browse live labour contract auctions',
      'Bid your best ₹/sqft rate',
      'Win construction contracts',
    ],
    noteBadge: 'Client supplies material',
    accent: 'emerald' as const,
    href: '/signup/bidder/labour-contractor',
  },
  {
    role: 'construction_firm' as const,
    emoji: '🏗️',
    title: 'Construction Firm',
    subtitle: 'We handle everything — material, labour & finishing',
    bullets: [
      'Browse turnkey construction projects',
      'Bid your complete ₹/sqft rate',
      'Deliver the full project end-to-end',
    ],
    noteBadge: 'You supply material + labour',
    accent: 'violet' as const,
    href: '/signup/bidder/construction-firm',
  },
] as const;

export type SignupRoleCard = (typeof SIGNUP_ROLE_CARDS)[number];
