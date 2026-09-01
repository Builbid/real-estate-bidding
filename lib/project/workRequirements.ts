import {
  getDrawingWorkRequirementBlocks,
  parseDrawingDetails,
} from '@/lib/drawingDesign';
import {
  getMistriWorkRequirementBlocks,
  parseMistriDetails,
} from '@/lib/mistriDetails';
import {
  getPainterWorkRequirementBlocks,
  parsePainterDetails,
} from '@/lib/painterDetails';
import { getProjectServiceType } from '@/lib/project/display';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  getTradeWorkRequirementBlocks,
  isCustomTradeWorkService,
  parseTradeDetails,
} from '@/lib/tradeWorkDetails';
import type { Project, ServiceType } from '@/lib/types';

export type WorkRequirementBlock = { label: string; value: string };

/** Redundant on project summary cards — hidden from all display grids. */
const HIDDEN_DISPLAY_LABELS = new Set([
  'Material Scope',
  'Bidding Options',
  'Bidding Options (₹ / Running Foot)',
  'Billing Notice',
  'Point Weights',
]);

function filterDisplayRequirementBlocks(blocks: WorkRequirementBlock[]): WorkRequirementBlock[] {
  return blocks.filter((block) => !HIDDEN_DISPLAY_LABELS.has(block.label));
}

export function getProjectWorkRequirementBlocks(project: {
  service_type?: ServiceType | null;
  sub_configuration?: Project['sub_configuration'];
  painter_details?: Project['painter_details'];
  mistri_details?: Project['mistri_details'];
  trade_details?: Project['trade_details'];
  drawing_details?: Project['drawing_details'];
}): { title: string; blocks: WorkRequirementBlock[] } | null {
  const serviceType = getProjectServiceType(project);

  if (serviceType === 'painter') {
    const details = parsePainterDetails(readNestedProjectDetail(project, 'painter_details'));
    if (!details) return null;
    return {
      title: 'Painter Work Requirements',
      blocks: filterDisplayRequirementBlocks(getPainterWorkRequirementBlocks(details)),
    };
  }

  if (serviceType === 'labour_contractor') {
    const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
    if (!details) return null;
    return {
      title: 'Mistri Work Requirements',
      blocks: filterDisplayRequirementBlocks(getMistriWorkRequirementBlocks(details)),
    };
  }

  if (serviceType === 'drawing_design') {
    const details = parseDrawingDetails(readNestedProjectDetail(project, 'drawing_details'));
    if (!details) return null;
    return {
      title: 'Drawing & Design Requirements',
      blocks: filterDisplayRequirementBlocks(getDrawingWorkRequirementBlocks(details)),
    };
  }

  if (isCustomTradeWorkService(serviceType)) {
    const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
    if (!details || details.service !== serviceType) return null;
    const titles: Record<typeof serviceType, string> = {
      plumber: 'Plumber Work Requirements',
      electrician: 'Electrician Work Requirements',
      carpenter: 'Work Requirements',
      false_ceiling_work: 'Interior Work Requirements',
      earthwork: 'Earthwork Requirements',
    };
    const blocks = filterDisplayRequirementBlocks(getTradeWorkRequirementBlocks(details));
    return {
      title: titles[serviceType],
      blocks:
        serviceType === 'plumber' || serviceType === 'electrician'
          ? blocks.filter((block) => block.label !== 'Approx Built-Up Area')
          : blocks,
    };
  }

  return null;
}

/** Floor-wise fixture rows belong on the full project page, not compact preview cards. */
export function isFloorFixtureRequirementLabel(label: string): boolean {
  return label.trim().toLowerCase().endsWith(' fixtures');
}

export function isWideRequirementLabel(label: string): boolean {
  return (
    label === 'Additional Requirements' ||
    label === 'Additional Notes' ||
    label === 'Civil Work Type' ||
    label === 'Project Address' ||
    label === 'Village / Town Name' ||
    label === 'Included Work Scope' ||
    label === 'Water Supply Lines (CPVC)' ||
    label === 'Water Installation Method' ||
    label === 'Soil & Waste Drainage (SWR/PVC)' ||
    label.endsWith(' included scope') ||
    label === 'Bathroom Package' ||
    label === 'Bathroom Packages' ||
    label === 'Piping Package' ||
    label === 'Piping Package Includes' ||
    label === 'House Structure' ||
    label === 'Building Structure Type' ||
    label === 'Target Work Floor' ||
    label === 'Custom / Higher Floors' ||
    label === 'Total Floors in Building' ||
    label === 'Approx Built-Up Area' ||
    label === 'Built-Up Area' ||
    label === 'Approximate built-up Area (Sqft)' ||
    label === 'Bathroom Fittings Rate' ||
    label === 'Water Piping Rate' ||
    label === 'Waste Line Rate' ||
    label === 'Water Tank Fitting Rate' ||
    label === 'Wiring & Piping Rates' ||
    label === 'Switchboards & Socket Fitting Rates' ||
    label === 'Electrical Appliance & Fixture Fitting Rates' ||
    label === 'Ceiling & Wall Paneling Work' ||
    label === 'Modular Woodwork & Cabinetry' ||
    label === 'Fixtures, Glass & Hardware Fitting' ||
    label === 'Fitting Type' ||
    label === 'Wiring Type' ||
    label === 'Estimated Long Connection Line Length' ||
    label === 'Point Weights' ||
    label === 'Water Tank Floor' ||
    label.endsWith(' Fixtures') ||
    label === 'Target Floors' ||
    label === 'Package Level' ||
    label === 'Room Size' ||
    label === 'Floor' ||
    label === 'Installation Method' ||
    label === 'Distance to Tank' ||
    label === 'Smart Piping Defaults' ||
    label === 'Scope Type' ||
    label === 'Door & Window Frames Work (Carpentry Add-on)' ||
    label === 'Deliverables' ||
    label === 'Project Submission Time' ||
    label === 'Approximate Paint Area' ||
    label === 'Heavy Appliances' ||
    label === 'Quantity / Count (Door & Window Frames)' ||
    label === 'Kitchen Size / Layout' ||
    label === 'Material Type' ||
    label === 'Fittings & Hardware' ||
    label === 'Target Space' ||
    label === 'Current Build Floors' ||
    label === 'Future Foundation Expansion' ||
    label === 'Foundation Provision For' ||
    label === 'Current Construction Scope (This Bid)' ||
    label === 'Foundation Engineering Load Capacity' ||
    label === 'Current Construction' ||
    label === 'Future Planned Capacity' ||
    label.startsWith('Assam Type') ||
    label.startsWith('RCC ')
  );
}

/** Top-level project specs shown in the bidding summary banner, not on item cards. */
const BID_SUMMARY_LABELS = new Set([
  'Approx Built-Up Area',
  'Built-Up Area',
  'Approximate built-up Area (Sqft)',
  'Approx. Area',
  'Approximate Paint Area',
  'Interior Area',
  'Total Plot Area',
  'Plot Dimensions',
  'Building Structure Type',
  'House Structure',
  'Work Start Time',
  'Project Submission Time',
  'Target Work Floor',
  'Target Floors',
  'Custom / Higher Floors',
  'Total Floors in Building',
  'Number of Floors',
  'Floor Level',
  'Work Area (Floors)',
  'Current Build Floors',
  'Foundation Provision For',
  'Village / Town Name',
  'Project Address',
  'Water Tank Floor',
  'Fitting Type',
  'Wiring Type',
  'Contract Type',
]);

const BID_NOTE_LABELS = new Set(['Additional Requirements', 'Additional Notes']);

export function splitBidRequirementDisplay(blocks: WorkRequirementBlock[]): {
  summary: WorkRequirementBlock[];
  notes: WorkRequirementBlock[];
  specs: WorkRequirementBlock[];
} {
  const summary: WorkRequirementBlock[] = [];
  const notes: WorkRequirementBlock[] = [];
  const specs: WorkRequirementBlock[] = [];
  for (const block of blocks) {
    if (BID_SUMMARY_LABELS.has(block.label)) summary.push(block);
    else if (BID_NOTE_LABELS.has(block.label)) notes.push(block);
    else specs.push(block);
  }
  return { summary, notes, specs };
}

function normalizeRequirementLabel(label: string): string {
  return label.replace(/^RCC\s+/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function findRequirementSpec(
  label: string,
  blocks: WorkRequirementBlock[],
): WorkRequirementBlock | undefined {
  const target = normalizeRequirementLabel(label);
  if (!target) return undefined;
  return blocks.find((block) => {
    const current = normalizeRequirementLabel(block.label);
    return current === target || current.includes(target) || target.includes(current);
  });
}

export function formatBidRatePlaceholder(unitSuffix: string): string {
  const unit = unitSuffix.replace(/^\//, '').replace(/^per\s+/i, '').trim().toLowerCase();
  if (!unit || unit === 'avg') return 'Enter rate per sqft / per unit';
  if (unit === 'sqft') return 'Enter rate per sqft';
  if (unit === 'unit' || unit === 'pkg') return 'Enter rate per unit';
  if (unit === 'rft') return 'Enter rate per running foot';
  if (unit === 'point') return 'Enter rate per point';
  if (unit === 'hour') return 'Enter rate per hour';
  if (unit === 'trip') return 'Enter rate per trip';
  return `Enter rate ${unitSuffix}`;
}
