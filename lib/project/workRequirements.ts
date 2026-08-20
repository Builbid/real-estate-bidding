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
    return { title: 'Painter Work Requirements', blocks: getPainterWorkRequirementBlocks(details) };
  }

  if (serviceType === 'labour_contractor') {
    const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
    if (!details) return null;
    return { title: 'Mistri Work Requirements', blocks: getMistriWorkRequirementBlocks(details) };
  }

  if (serviceType === 'drawing_design') {
    const details = parseDrawingDetails(readNestedProjectDetail(project, 'drawing_details'));
    if (!details) return null;
    return {
      title: 'Drawing & Design Requirements',
      blocks: getDrawingWorkRequirementBlocks(details),
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
    return { title: titles[serviceType], blocks: getTradeWorkRequirementBlocks(details) };
  }

  return null;
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
    label === 'Total Floors in Building' ||
    label === 'Approx Built-Up Area' ||
    label === 'Bathroom Fittings Rate' ||
    label === 'Water Piping Rate' ||
    label === 'Waste Line Rate' ||
    label === 'Water Tank Fitting Rate' ||
    label === 'Water Tank Floor' ||
    label === 'Target Floors' ||
    label === 'Package Level' ||
    label === 'Room Size' ||
    label === 'Floor' ||
    label === 'Installation Method' ||
    label === 'Distance to Tank' ||
    label === 'Smart Piping Defaults' ||
    label === 'Bidding Options' ||
    label === 'Bidding Options (₹ / Running Foot)' ||
    label === 'Billing Notice' ||
    label === 'Material Scope' ||
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
