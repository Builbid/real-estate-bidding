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
import {
  getTradeWorkRequirementBlocks,
  isCustomTradeWorkService,
  parseTradeDetails,
} from '@/lib/tradeWorkDetails';
import type { Project, ServiceType } from '@/lib/types';

export type WorkRequirementBlock = { label: string; value: string };

export function getProjectWorkRequirementBlocks(project: {
  service_type?: ServiceType | null;
  painter_details?: Project['painter_details'];
  mistri_details?: Project['mistri_details'];
  trade_details?: Project['trade_details'];
  drawing_details?: Project['drawing_details'];
}): { title: string; blocks: WorkRequirementBlock[] } | null {
  const serviceType = getProjectServiceType(project);

  if (serviceType === 'painter') {
    const details = parsePainterDetails(project.painter_details);
    if (!details) return null;
    return { title: 'Painter Work Requirements', blocks: getPainterWorkRequirementBlocks(details) };
  }

  if (serviceType === 'labour_contractor') {
    const details = parseMistriDetails(project.mistri_details);
    if (!details) return null;
    return { title: 'Mistri Work Requirements', blocks: getMistriWorkRequirementBlocks(details) };
  }

  if (serviceType === 'drawing_design') {
    const details = parseDrawingDetails(project.drawing_details);
    if (!details) return null;
    return {
      title: 'Drawing & Design Requirements',
      blocks: getDrawingWorkRequirementBlocks(details),
    };
  }

  if (isCustomTradeWorkService(serviceType)) {
    const details = parseTradeDetails(project.trade_details);
    if (!details || details.service !== serviceType) return null;
    const titles: Record<typeof serviceType, string> = {
      plumber: 'Plumber Work Requirements',
      electrician: 'Electrician Work Requirements',
      carpenter: 'Carpenter Work Requirements',
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
    label === 'Package' ||
    label === 'Packages' ||
    label === 'Scope Type' ||
    label === 'Deliverables' ||
    label === 'Project Submission Time' ||
    label === 'Approximate Paint Area' ||
    label === 'Heavy Appliances' ||
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
