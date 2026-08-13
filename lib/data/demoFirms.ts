export type DemoPartnerType = 'labour_contractor' | 'construction_firm';

export interface DemoFirm {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  specialty: string;
  logoUrl: string;
  portfolioLink: string;
  partnerType: DemoPartnerType;
}

export const DEMO_LABOUR_CONTRACTORS: DemoFirm[] = [
  {
    id: 'kamrup-infra-works',
    name: 'Kamrup Infra Works',
    location: 'Guwahati',
    rating: 4.7,
    reviewCount: 38,
    specialty: 'Mistri Worker',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=KamrupInfra',
    portfolioLink: '/builder/kamrup-infra-works',
    partnerType: 'labour_contractor',
  },
  {
    id: 'highland-structures',
    name: 'Highland Structures',
    location: 'Dibrugarh',
    rating: 4.4,
    reviewCount: 19,
    specialty: 'Assam Type Construction',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=HighlandStructures',
    portfolioLink: '/builder/highland-structures',
    partnerType: 'labour_contractor',
  },
  {
    id: 'sonitpur-labour-solutions',
    name: 'Sonitpur Labour Solutions',
    location: 'Tezpur',
    rating: 4.6,
    reviewCount: 27,
    specialty: 'RCC Labour',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SonitpurLabour',
    portfolioLink: '/builder/sonitpur-labour-solutions',
    partnerType: 'labour_contractor',
  },
  {
    id: 'jorhat-mason-crew',
    name: 'Jorhat Mason Crew',
    location: 'Jorhat',
    rating: 4.5,
    reviewCount: 22,
    specialty: 'Skilled Masonry',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JorhatMason',
    portfolioLink: '/builder/jorhat-mason-crew',
    partnerType: 'labour_contractor',
  },
];

export const DEMO_CONSTRUCTION_FIRMS: DemoFirm[] = [
  {
    id: 'assam-builders-co',
    name: 'Assam Builders Co.',
    location: 'Guwahati',
    rating: 4.8,
    reviewCount: 42,
    specialty: 'RCC Construction',
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AssamBuilders',
    portfolioLink: '/firm/assam-builders-co',
    partnerType: 'construction_firm',
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
    partnerType: 'construction_firm',
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
    partnerType: 'construction_firm',
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
    partnerType: 'construction_firm',
  },
];
