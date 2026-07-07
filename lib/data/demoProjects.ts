import { deriveLegacyProjectFields } from '@/lib/buildingConfig';
import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig';
import type { ShowcaseProject } from '@/lib/projectShowcase';
import type { FinishingLevel, ServiceType } from '@/lib/types';

const DEMO_OWNER_ID = '00000000-0000-4000-a000-000000000001';

interface DemoProjectTemplate {
  id: string;
  title: string;
  description: string;
  district: string;
  service_type: ServiceType;
  building_types: BuildingType[];
  construction_types: ConstructionTypesMap;
  plot_area_sqft?: number;
  floor_area_sqft?: number;
  finishing_level?: FinishingLevel;
  budget_range_min?: number;
  budget_range_max?: number;
  bid_count: number;
  lowest_rate: number;
  /** Hours from now when bidding closes */
  biddingEndsInHours: number;
  /** Hours ago when posted */
  postedHoursAgo: number;
}

const LABOUR_TEMPLATES: DemoProjectTemplate[] = [
  {
    id: 'demo-labour-1',
    title: '2-Storey RCC Home — Beltola, Guwahati',
    description: 'Residential G+1 with full finishing on ground and structural first floor.',
    district: 'Kamrup Metropolitan',
    service_type: 'labour_contractor',
    building_types: ['RCC Ground Floor', 'RCC 1st Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
      'RCC 1st Floor': 'Column + Slab Casting',
    },
    plot_area_sqft: 2400,
    bid_count: 6,
    lowest_rate: 1240,
    biddingEndsInHours: 18,
    postedHoursAgo: 2,
  },
  {
    id: 'demo-labour-2',
    title: 'Assam Type Bungalow — Jorhat Town',
    description: 'Traditional Assam-type frame to roof with full finishing scope.',
    district: 'Jorhat',
    service_type: 'labour_contractor',
    building_types: ['Assam Type'],
    construction_types: {
      'Assam Type': 'Full Finishing',
    },
    plot_area_sqft: 1800,
    bid_count: 4,
    lowest_rate: 980,
    biddingEndsInHours: 8,
    postedHoursAgo: 5,
  },
  {
    id: 'demo-labour-3',
    title: 'G+2 RCC Residential — Dibrugarh',
    description: 'Three-floor RCC build; owner supplies materials. Labour-only contract.',
    district: 'Dibrugarh',
    service_type: 'labour_contractor',
    building_types: ['RCC Ground Floor', 'RCC 1st Floor', 'RCC 2nd Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
      'RCC 1st Floor': 'Column + Slab Casting',
      'RCC 2nd Floor': 'Column + Slab Casting',
    },
    plot_area_sqft: 3200,
    bid_count: 8,
    lowest_rate: 1385,
    biddingEndsInHours: 36,
    postedHoursAgo: 1,
  },
  {
    id: 'demo-labour-4',
    title: 'Single Floor RCC — Nagaon Residential Plot',
    description: 'Compact ground-floor RCC home with full finishing labour scope.',
    district: 'Nagaon',
    service_type: 'labour_contractor',
    building_types: ['RCC Ground Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
    },
    plot_area_sqft: 1200,
    bid_count: 3,
    lowest_rate: 1120,
    biddingEndsInHours: 12,
    postedHoursAgo: 8,
  },
  {
    id: 'demo-labour-5',
    title: 'G+1 Structural Build — Tezpur Riverside',
    description: 'Ground full finishing with first floor structural slab casting only.',
    district: 'Sonitpur',
    service_type: 'labour_contractor',
    building_types: ['RCC Ground Floor', 'RCC 1st Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
      'RCC 1st Floor': 'Column + Slab Casting',
    },
    plot_area_sqft: 2100,
    bid_count: 5,
    lowest_rate: 1195,
    biddingEndsInHours: 24,
    postedHoursAgo: 4,
  },
];

const FIRM_TEMPLATES: DemoProjectTemplate[] = [
  {
    id: 'demo-firm-1',
    title: 'Turnkey 3BHK — Six Mile, Guwahati',
    description: 'Complete turnkey construction including materials, labour, and standard finishes.',
    district: 'Kamrup Metropolitan',
    service_type: 'construction_firm',
    building_types: ['RCC Ground Floor', 'RCC 1st Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
      'RCC 1st Floor': 'Full Finishing',
    },
    floor_area_sqft: 1850,
    finishing_level: 'standard',
    budget_range_min: 2500000,
    budget_range_max: 3500000,
    bid_count: 5,
    lowest_rate: 1420,
    biddingEndsInHours: 20,
    postedHoursAgo: 3,
  },
  {
    id: 'demo-firm-2',
    title: 'Premium Villa — Kaziranga Road, Golaghat',
    description: 'High-spec villa with premium fittings, landscaping allowance, and RCC G+1.',
    district: 'Golaghat',
    service_type: 'construction_firm',
    building_types: ['RCC Ground Floor', 'RCC 1st Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
      'RCC 1st Floor': 'Full Finishing',
    },
    floor_area_sqft: 4500,
    finishing_level: 'premium',
    budget_range_min: 8000000,
    budget_range_max: 12000000,
    bid_count: 4,
    lowest_rate: 1680,
    biddingEndsInHours: 48,
    postedHoursAgo: 6,
  },
  {
    id: 'demo-firm-3',
    title: 'Commercial Office Block — Dispur, Guwahati',
    description: 'Turnkey RCC commercial build with standard office-grade finishing.',
    district: 'Kamrup Metropolitan',
    service_type: 'construction_firm',
    building_types: ['RCC Ground Floor', 'RCC 1st Floor', 'RCC 2nd Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
      'RCC 1st Floor': 'Full Finishing',
      'RCC 2nd Floor': 'Full Finishing',
    },
    floor_area_sqft: 6200,
    finishing_level: 'standard',
    budget_range_min: 9500000,
    budget_range_max: 14000000,
    bid_count: 3,
    lowest_rate: 1550,
    biddingEndsInHours: 32,
    postedHoursAgo: 2,
  },
  {
    id: 'demo-firm-4',
    title: 'Budget Housing Unit — Barpeta Town',
    description: 'Affordable single-floor turnkey home for a first-time landowner.',
    district: 'Barpeta',
    service_type: 'construction_firm',
    building_types: ['RCC Ground Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
    },
    floor_area_sqft: 1100,
    finishing_level: 'basic',
    budget_range_min: 1200000,
    budget_range_max: 1800000,
    bid_count: 7,
    lowest_rate: 1290,
    biddingEndsInHours: 10,
    postedHoursAgo: 7,
  },
  {
    id: 'demo-firm-5',
    title: 'G+2 Turnkey Home — Silchar, Cachar',
    description: 'Three-storey family home with standard finishing across all floors.',
    district: 'Cachar',
    service_type: 'construction_firm',
    building_types: ['RCC Ground Floor', 'RCC 1st Floor', 'RCC 2nd Floor'],
    construction_types: {
      'RCC Ground Floor': 'Full Finishing',
      'RCC 1st Floor': 'Full Finishing',
      'RCC 2nd Floor': 'Full Finishing',
    },
    floor_area_sqft: 2800,
    finishing_level: 'standard',
    budget_range_min: 4200000,
    budget_range_max: 5800000,
    bid_count: 6,
    lowest_rate: 1485,
    biddingEndsInHours: 28,
    postedHoursAgo: 5,
  },
];

const DEMO_OWNERS = [
  'Priya Sharma',
  'Rajiv Das',
  'Ananya Bordoloi',
  'Mohit Saikia',
  'Neha Gogoi',
  'Arjun Baruah',
  'Meera Kalita',
  'Sanjay Hazarika',
  'Kavita Phukan',
  'Rohit Nath',
] as const;

function buildShowcaseProject(
  template: DemoProjectTemplate,
  ownerName: string,
  nowMs: number,
): ShowcaseProject {
  const legacy = deriveLegacyProjectFields(template.building_types, template.construction_types);
  const createdAt = new Date(nowMs - template.postedHoursAgo * 60 * 60 * 1000).toISOString();
  const biddingEndsAt = new Date(nowMs + template.biddingEndsInHours * 60 * 60 * 1000).toISOString();
  const updatedAt = createdAt;

  return {
    id: template.id,
    owner_id: DEMO_OWNER_ID,
    title: template.title,
    description: template.description,
    track_type: legacy.track_type,
    sub_configuration: legacy.sub_configuration,
    building_types: template.building_types,
    construction_types: template.construction_types,
    district: template.district,
    state: 'Assam',
    plot_area_sqft: template.plot_area_sqft ?? null,
    total_floors: legacy.total_floors,
    status: 'active_24h',
    bidding_ends_at: biddingEndsAt,
    selection_ends_at: null,
    selected_builder_id: null,
    service_type: template.service_type,
    floor_area_sqft: template.floor_area_sqft ?? null,
    finishing_level: template.finishing_level ?? null,
    budget_range_min: template.budget_range_min ?? null,
    budget_range_max: template.budget_range_max ?? null,
    drawing_url: null,
    created_at: createdAt,
    updated_at: updatedAt,
    owner: { id: DEMO_OWNER_ID, full_name: ownerName },
    bid_count: template.bid_count,
    lowest_rate: template.lowest_rate,
    isDemo: true,
  };
}

/** Ten demo live auctions — 5 labour contractor, 5 construction firm. */
export function getDemoShowcaseProjects(nowMs: number = Date.now()): ShowcaseProject[] {
  const templates = [...LABOUR_TEMPLATES, ...FIRM_TEMPLATES];
  return templates.map((template, index) =>
    buildShowcaseProject(template, DEMO_OWNERS[index], nowMs),
  );
}

export function isDemoProjectId(projectId: string): boolean {
  return projectId.startsWith('demo-');
}

export function mergeShowcaseProjects(
  realProjects: ShowcaseProject[],
  demoProjects: ShowcaseProject[],
): ShowcaseProject[] {
  const realIds = new Set(realProjects.map((project) => project.id));
  const demos = demoProjects.filter((project) => !realIds.has(project.id));
  return [...realProjects, ...demos];
}
