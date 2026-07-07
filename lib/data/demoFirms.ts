export interface DemoFirm {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  specialty: string;
  logoUrl: string;
  portfolioLink: string;
}

export const DEMO_FIRMS: DemoFirm[] = [
  {
    id: 'assam-builders-co',
    name: 'Assam Builders Co.',
    location: 'Guwahati',
    rating: 4.8,
    reviewCount: 42,
    specialty: 'RCC Construction',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AssamBuilders',
    portfolioLink: '/firm/assam-builders-co',
  },
  {
    id: 'nagaon-construction-group',
    name: 'Nagaon Construction Group',
    location: 'Nagaon',
    rating: 4.6,
    reviewCount: 31,
    specialty: 'Turnkey Construction',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=NagaonConstruction',
    portfolioLink: '/firm/nagaon-construction-group',
  },
  {
    id: 'prime-rcc-contractors',
    name: 'Prime RCC Contractors',
    location: 'Jorhat',
    rating: 4.5,
    reviewCount: 24,
    specialty: 'RCC Construction',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PrimeRCC',
    portfolioLink: '/firm/prime-rcc-contractors',
  },
  {
    id: 'kamrup-infra-works',
    name: 'Kamrup Infra Works',
    location: 'Guwahati',
    rating: 4.7,
    reviewCount: 38,
    specialty: 'Labour Contractor',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=KamrupInfra',
    portfolioLink: '/firm/kamrup-infra-works',
  },
  {
    id: 'highland-structures',
    name: 'Highland Structures',
    location: 'Dibrugarh',
    rating: 4.4,
    reviewCount: 19,
    specialty: 'Assam Type Construction',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=HighlandStructures',
    portfolioLink: '/firm/highland-structures',
  },
  {
    id: 'brahmaputra-builders',
    name: 'Brahmaputra Builders',
    location: 'Tezpur',
    rating: 4.9,
    reviewCount: 56,
    specialty: 'Interior Finishing',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=BrahmaputraBuilders',
    portfolioLink: '/firm/brahmaputra-builders',
  },
];
