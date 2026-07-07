import type { BuilderPortfolioItem, FirmPortfolioItem, PublicFirmProfile } from '@/lib/types';
import {
  DEMO_CONSTRUCTION_FIRMS,
  DEMO_LABOUR_CONTRACTORS,
  type DemoFirm,
} from '@/lib/data/demoFirms';

/** Curated Unsplash construction imagery (stable photo IDs). */
const PHOTOS = {
  rccFrame: 'https://images.unsplash.com/photo-1565008440462-9f3a5284a412?w=900&q=80',
  rccSlab: 'https://images.unsplash.com/photo-1590859808308-65d94895c781?w=900&q=80',
  rccSite: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80',
  crane: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=900&q=80',
  modernHome: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
  villa: 'https://images.unsplash.com/photo-1600047509807-ba139529edbf?w=900&q=80',
  bungalow: 'https://images.unsplash.com/photo-1600585154526-990dcee969b0?w=900&q=80',
  brickwork: 'https://images.unsplash.com/photo-1578894381166-e72c17f2d45f?w=900&q=80',
  interior: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80',
  commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80',
  finishing: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=900&q=80',
  assamHouse: 'https://images.unsplash.com/photo-1600047509358-677dc3c31666?w=900&q=80',
  foundation: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&q=80',
  apartment: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf04?w=900&q=80',
  luxury: 'https://images.unsplash.com/photo-1600596542814-ffad4c1539a9?w=900&q=80',
  plaster: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=80',
} as const;

export interface DemoLabourProfile {
  id: string;
  companyName: string;
  location: string;
  rating: number;
  reviewCount: number;
  specialty: string;
  logoUrl: string;
  yearsInBusiness: number;
  projectsCompleted: number;
  isVerified: boolean;
  about: string;
  portfolio: BuilderPortfolioItem[];
}

export interface DemoFirmProfileBundle {
  firm: PublicFirmProfile;
  portfolio: FirmPortfolioItem[];
  about: string;
  rating: number;
  reviewCount: number;
  specialty: string;
}

function labourPortfolio(
  builderId: string,
  items: Array<{
    id: string;
    title: string;
    description: string;
    photo_urls: string[];
    sort_order: number;
  }>,
): BuilderPortfolioItem[] {
  const now = '2026-01-15T00:00:00.000Z';
  return items.map((item) => ({
    id: item.id,
    builder_id: builderId,
    title: item.title,
    description: item.description,
    photo_urls: item.photo_urls,
    sort_order: item.sort_order,
    created_at: now,
    updated_at: now,
  }));
}

function firmPortfolio(
  firmId: string,
  items: Array<{
    id: string;
    project_name: string;
    location: string;
    year_completed: number;
    description: string;
    photos: string[];
  }>,
): FirmPortfolioItem[] {
  const now = '2026-01-15T00:00:00.000Z';
  return items.map((item) => ({
    id: item.id,
    firm_id: firmId,
    project_name: item.project_name,
    location: item.location,
    year_completed: item.year_completed,
    photos: item.photos,
    description: item.description,
    created_at: now,
  }));
}

const LABOUR_EXTRAS: Record<
  string,
  Pick<DemoLabourProfile, 'yearsInBusiness' | 'projectsCompleted' | 'isVerified' | 'about' | 'portfolio'>
> = {
  'kamrup-infra-works': {
    yearsInBusiness: 14,
    projectsCompleted: 86,
    isVerified: true,
    about:
      'Kamrup Infra Works is a Guwahati-based labour contractor specialising in RCC residential builds across Kamrup Metropolitan. Our crews handle foundation, column, slab, and full finishing scopes with on-site supervision and transparent milestone reporting for owners.',
    portfolio: labourPortfolio('kamrup-infra-works', [
      {
        id: 'kiw-1',
        title: 'G+1 RCC Residence — Beltola',
        description:
          'Complete labour contract for a 2,400 sqft G+1 RCC home. Ground floor full finishing and first floor structural slab with brickwork.',
        photo_urls: [PHOTOS.rccFrame, PHOTOS.rccSlab, PHOTOS.brickwork, PHOTOS.modernHome],
        sort_order: 0,
      },
      {
        id: 'kiw-2',
        title: 'Ground Floor RCC — Dispur',
        description:
          'Single-storey RCC build with foundation, column-beam-slab, and full internal & external plastering completed in 5 months.',
        photo_urls: [PHOTOS.foundation, PHOTOS.rccSite, PHOTOS.plaster, PHOTOS.finishing],
        sort_order: 1,
      },
      {
        id: 'kiw-3',
        title: 'G+2 Structural Package — Six Mile',
        description:
          'Multi-floor RCC structural labour for a developer plot. Column, beam, and slab casting across three levels with quality checks at each pour.',
        photo_urls: [PHOTOS.crane, PHOTOS.rccSlab, PHOTOS.rccFrame, PHOTOS.apartment],
        sort_order: 2,
      },
    ]),
  },
  'highland-structures': {
    yearsInBusiness: 11,
    projectsCompleted: 52,
    isVerified: true,
    about:
      'Highland Structures serves upper Assam with skilled teams for Assam-type and hybrid residential projects. We focus on traditional frame-to-roof builds and modern RCC extensions in Dibrugarh and nearby districts.',
    portfolio: labourPortfolio('highland-structures', [
      {
        id: 'hs-1',
        title: 'Assam Type Home — Dibrugarh Town',
        description:
          'Traditional Assam-type frame, roof, and full finishing labour for a family bungalow on a 1,800 sqft plot.',
        photo_urls: [PHOTOS.assamHouse, PHOTOS.bungalow, PHOTOS.brickwork, PHOTOS.finishing],
        sort_order: 0,
      },
      {
        id: 'hs-2',
        title: 'RCC Extension — Chabua',
        description:
          'Rear RCC extension labour added to an existing Assam-type core. Foundation tie-in, column casting, and slab work.',
        photo_urls: [PHOTOS.foundation, PHOTOS.rccFrame, PHOTOS.rccSite, PHOTOS.modernHome],
        sort_order: 1,
      },
      {
        id: 'hs-3',
        title: 'Assam Type Duplex — Tinsukia',
        description:
          'Two-unit Assam-type labour package including roofing, verandah columns, and complete plaster & paint scope.',
        photo_urls: [PHOTOS.bungalow, PHOTOS.plaster, PHOTOS.assamHouse, PHOTOS.interior],
        sort_order: 2,
      },
    ]),
  },
  'sonitpur-labour-solutions': {
    yearsInBusiness: 9,
    projectsCompleted: 64,
    isVerified: true,
    about:
      'Sonitpur Labour Solutions deploys trained mason and bar-bender teams for RCC projects in Tezpur and across Sonitpur district. We are known for disciplined site attendance and rate-transparent labour-only contracts.',
    portfolio: labourPortfolio('sonitpur-labour-solutions', [
      {
        id: 'sls-1',
        title: 'RCC Bungalow — Tezpur Cantonment',
        description:
          'Ground-floor RCC labour with full finishing for a 1,450 sqft residential plot near cantonment road.',
        photo_urls: [PHOTOS.rccFrame, PHOTOS.brickwork, PHOTOS.modernHome, PHOTOS.interior],
        sort_order: 0,
      },
      {
        id: 'sls-2',
        title: 'G+1 RCC — Biswanath Chariali',
        description:
          'Two-storey RCC labour contract: structural first floor and full finishing ground floor delivered ahead of schedule.',
        photo_urls: [PHOTOS.rccSlab, PHOTOS.rccSite, PHOTOS.plaster, PHOTOS.villa],
        sort_order: 1,
      },
      {
        id: 'sls-3',
        title: 'Column & Slab Package — Rangapara',
        description:
          'Upper-floor structural-only labour for an owner-managed material supply project. Three slab pours with QA sign-off.',
        photo_urls: [PHOTOS.crane, PHOTOS.rccSlab, PHOTOS.foundation, PHOTOS.rccFrame],
        sort_order: 2,
      },
    ]),
  },
  'jorhat-mason-crew': {
    yearsInBusiness: 16,
    projectsCompleted: 73,
    isVerified: true,
    about:
      'Jorhat Mason Crew is a specialist masonry and RCC labour team serving Jorhat, Majuli, and Golaghat. Our foremen bring decades of trowel-level craftsmanship to plaster, brickwork, and finishing stages.',
    portfolio: labourPortfolio('jorhat-mason-crew', [
      {
        id: 'jmc-1',
        title: 'Heritage Renovation — Jorhat Rajbari Area',
        description:
          'Brick restoration, lime plaster repair, and RCC balcony extension for a heritage residential property.',
        photo_urls: [PHOTOS.brickwork, PHOTOS.plaster, PHOTOS.bungalow, PHOTOS.finishing],
        sort_order: 0,
      },
      {
        id: 'jmc-2',
        title: 'G+1 Family Home — Titabor',
        description:
          'Full masonry and finishing labour for a 2,100 sqft RCC home including compound wall and gate pillars.',
        photo_urls: [PHOTOS.rccFrame, PHOTOS.brickwork, PHOTOS.modernHome, PHOTOS.interior],
        sort_order: 1,
      },
      {
        id: 'jmc-3',
        title: 'RCC Ground Floor — Mariani',
        description:
          'Compact 980 sqft ground-floor RCC labour with owner-supplied materials and weekly progress photos.',
        photo_urls: [PHOTOS.foundation, PHOTOS.rccSite, PHOTOS.rccSlab, PHOTOS.villa],
        sort_order: 2,
      },
    ]),
  },
};

interface FirmExtra {
  about: string;
  yearsInBusiness: number;
  gstMasked: string;
  address: string;
  pincode: string;
  portfolio: FirmPortfolioItem[];
}

const FIRM_EXTRAS: Record<string, FirmExtra> = {
  'assam-builders-co': {
    about:
      'Assam Builders Co. is a Guwahati turnkey construction firm delivering RCC residential and small commercial projects end-to-end — drawings, materials, labour, and handover. GST registered with in-house site engineers.',
    yearsInBusiness: 18,
    gstMasked: '18AABCA****A1Z5',
    address: 'Six Mile, Guwahati, Assam',
    pincode: '781022',
    portfolio: firmPortfolio('assam-builders-co', [
      {
        id: 'abc-1',
        project_name: 'Turnkey G+1 Residence — Six Mile',
        location: 'Guwahati',
        year_completed: 2025,
        description: 'Complete ₹/sqft turnkey build with standard finishes, boundary wall, and driveway.',
        photos: [PHOTOS.modernHome, PHOTOS.interior, PHOTOS.rccFrame, PHOTOS.finishing],
      },
      {
        id: 'abc-2',
        project_name: '3BHK RCC Villa — Khanapara',
        location: 'Guwahati',
        year_completed: 2024,
        description: 'Premium-standard villa with landscaped front yard and modular kitchen fit-out.',
        photos: [PHOTOS.luxury, PHOTOS.villa, PHOTOS.interior, PHOTOS.modernHome],
      },
      {
        id: 'abc-3',
        project_name: 'Corner Plot Home — Beltola',
        location: 'Guwahati',
        year_completed: 2024,
        description: 'Narrow-plot optimised RCC design with rooftop water tank room and parking slab.',
        photos: [PHOTOS.apartment, PHOTOS.rccSlab, PHOTOS.brickwork, PHOTOS.modernHome],
      },
    ]),
  },
  'nagaon-construction-group': {
    about:
      'Nagaon Construction Group handles turnkey housing across central Assam. We specialise in budget-conscious standard finishes without compromising structural quality — ideal for first-time homeowners.',
    yearsInBusiness: 12,
    gstMasked: '18AABCN****B1Z9',
    address: 'Haibargaon, Nagaon, Assam',
    pincode: '782002',
    portfolio: firmPortfolio('nagaon-construction-group', [
      {
        id: 'ncg-1',
        project_name: 'Affordable 2BHK — Nagaon Town',
        location: 'Nagaon',
        year_completed: 2025,
        description: 'Basic-tier turnkey RCC home delivered within a fixed budget envelope for a salaried owner.',
        photos: [PHOTOS.villa, PHOTOS.rccFrame, PHOTOS.interior, PHOTOS.bungalow],
      },
      {
        id: 'ncg-2',
        project_name: 'G+1 Turnkey — Kaliabor',
        location: 'Nagaon',
        year_completed: 2024,
        description: 'Two-storey family home with standard vitrified tiles and exterior weather-coat paint.',
        photos: [PHOTOS.modernHome, PHOTOS.brickwork, PHOTOS.finishing, PHOTOS.rccSite],
      },
      {
        id: 'ncg-3',
        project_name: 'Riverfront Bungalow — Puranigudam',
        location: 'Nagaon',
        year_completed: 2023,
        description: 'Single-storey elevated RCC bungalow designed for flood-prone belt with raised plinth.',
        photos: [PHOTOS.bungalow, PHOTOS.foundation, PHOTOS.assamHouse, PHOTOS.interior],
      },
    ]),
  },
  'prime-rcc-contractors': {
    about:
      'Prime RCC Contractors is a Jorhat-based construction firm focused on RCC structural integrity and clean finishing. We serve residential developers and individual plot owners across upper Assam.',
    yearsInBusiness: 15,
    gstMasked: '18AABCP****C1Z3',
    address: 'Tarajan, Jorhat, Assam',
    pincode: '785001',
    portfolio: firmPortfolio('prime-rcc-contractors', [
      {
        id: 'prc-1',
        project_name: 'G+2 RCC — Jorhat Town',
        location: 'Jorhat',
        year_completed: 2025,
        description: 'Three-level turnkey RCC with rental unit on first floor and owner occupancy on ground.',
        photos: [PHOTOS.apartment, PHOTOS.crane, PHOTOS.rccSlab, PHOTOS.modernHome],
      },
      {
        id: 'prc-2',
        project_name: "Doctor's Residence — Malow Ali",
        location: 'Jorhat',
        year_completed: 2024,
        description: 'Standard-tier turnkey home with dedicated clinic room and separate entrance on ground floor.',
        photos: [PHOTOS.luxury, PHOTOS.interior, PHOTOS.brickwork, PHOTOS.villa],
      },
      {
        id: 'prc-3',
        project_name: 'Tea Estate Staff Quarters — Titabor',
        location: 'Jorhat',
        year_completed: 2023,
        description: 'Block of four identical RCC units built on a phased schedule for an estate management company.',
        photos: [PHOTOS.rccSite, PHOTOS.rccFrame, PHOTOS.foundation, PHOTOS.apartment],
      },
    ]),
  },
  'brahmaputra-builders': {
    about:
      'Brahmaputra Builders is known across Sonitpur for premium interior finishing and turnkey RCC homes. Our in-house finishing teams deliver detailed woodwork, painting, and tile work to owner specifications.',
    yearsInBusiness: 20,
    gstMasked: '18AABCB****D1Z7',
    address: 'Mission Chariali, Tezpur, Assam',
    pincode: '784001',
    portfolio: firmPortfolio('brahmaputra-builders', [
      {
        id: 'bb-1',
        project_name: 'Premium Interior Fit-out — Tezpur',
        location: 'Tezpur',
        year_completed: 2025,
        description: 'Premium-tier turnkey with designer tiles, modular kitchen, and false ceiling throughout.',
        photos: [PHOTOS.interior, PHOTOS.finishing, PHOTOS.luxury, PHOTOS.modernHome],
      },
      {
        id: 'bb-2',
        project_name: 'Riverside Villa — Tezpur',
        location: 'Sonitpur',
        year_completed: 2024,
        description: 'G+1 villa with large glazing, premium bathroom suites, and landscaped compound wall.',
        photos: [PHOTOS.luxury, PHOTOS.villa, PHOTOS.interior, PHOTOS.modernHome],
      },
      {
        id: 'bb-3',
        project_name: 'Showroom + Residence — Balipara',
        location: 'Sonitpur',
        year_completed: 2023,
        description: 'Mixed-use ground-floor commercial shell with owner residence on the first floor.',
        photos: [PHOTOS.commercial, PHOTOS.rccFrame, PHOTOS.finishing, PHOTOS.interior],
      },
    ]),
  },
};

function buildLabourProfile(firm: DemoFirm): DemoLabourProfile | null {
  const extra = LABOUR_EXTRAS[firm.id];
  if (!extra) return null;
  return {
    id: firm.id,
    companyName: firm.name,
    location: firm.location,
    rating: firm.rating,
    reviewCount: firm.reviewCount,
    specialty: firm.specialty,
    logoUrl: firm.logoUrl,
    yearsInBusiness: extra.yearsInBusiness,
    projectsCompleted: extra.projectsCompleted,
    isVerified: extra.isVerified,
    about: extra.about,
    portfolio: extra.portfolio,
  };
}

function buildFirmProfile(firm: DemoFirm): DemoFirmProfileBundle | null {
  const extra = FIRM_EXTRAS[firm.id];
  if (!extra) return null;
  return {
    firm: {
      id: firm.id,
      company_name: firm.name,
      logo_url: firm.logoUrl,
      years_in_business: extra.yearsInBusiness,
      is_verified: true,
      gst_masked: extra.gstMasked,
      gst_verified: true,
      physical_address: extra.address,
      pincode: extra.pincode,
      created_at: '2024-06-01T00:00:00.000Z',
    },
    portfolio: extra.portfolio,
    about: extra.about,
    rating: firm.rating,
    reviewCount: firm.reviewCount,
    specialty: firm.specialty,
  };
}

export function getDemoLabourProfile(slug: string): DemoLabourProfile | null {
  const firm = DEMO_LABOUR_CONTRACTORS.find((entry) => entry.id === slug);
  if (!firm) return null;
  return buildLabourProfile(firm);
}

export function getDemoFirmProfile(slug: string): DemoFirmProfileBundle | null {
  const firm = DEMO_CONSTRUCTION_FIRMS.find((entry) => entry.id === slug);
  if (!firm) return null;
  return buildFirmProfile(firm);
}

export function isDemoLabourSlug(slug: string): boolean {
  return DEMO_LABOUR_CONTRACTORS.some((entry) => entry.id === slug);
}

export function isDemoFirmSlug(slug: string): boolean {
  return DEMO_CONSTRUCTION_FIRMS.some((entry) => entry.id === slug);
}
