export type QualityControlKind = 'civil' | 'electrical' | 'plumbing' | 'general';

export interface QualityControlSection {
  heading: string;
  points: string[];
}

export interface QualityControlProfile {
  kind: QualityControlKind;
  title: string;
  intro: string;
  sections: QualityControlSection[];
}

export function qualityControlKindForService(serviceType: string | null | undefined): QualityControlKind {
  const value = (serviceType ?? '').toLowerCase();
  if (value === 'labour_contractor' || value === 'mistri' || value === 'civil_construction') return 'civil';
  if (value === 'electrician') return 'electrical';
  if (value === 'plumber') return 'plumbing';
  return 'general';
}

const CIVIL: QualityControlProfile = {
  kind: 'civil',
  title: 'RCC Civil Work — Quality Control Form',
  intro:
    'Use this form on site for RCC civil work. Record the grade named in the agreement and sign off each check before the next stage starts.',
  sections: [
    {
      heading: 'Cement mixing ratios',
      points: [
        'Batch only the grade named in the agreement. Nominal guides: M10 = 1:3:6, M15 = 1:2:4, M20 = 1:1.5:3 (cement : sand : coarse aggregate by volume).',
        'Measure each batch. Do not add extra water after the mix leaves the mixer.',
        'Use fresh cement, clean sand, and graded aggregate. Reject bags that are lumpy or damp.',
      ],
    },
    {
      heading: 'Curing timeline',
      points: [
        'Keep the concrete continuously moist. For ordinary Portland cement, cure for at least 7 days; follow a longer period when the agreement or the structural drawing says so.',
        'Start curing as soon as the surface can take it without damage. Cover slabs and columns so they do not dry in the sun.',
        'Do not load a slab or strip formwork before the period recorded on this form.',
      ],
    },
    {
      heading: 'Shuttering safety',
      points: [
        'Props, braces, and ties must be plumb, tight, and seated on firm ground before concrete is placed.',
        'Check alignment, level, and joints. Seal gaps that would leak slurry.',
        'Apply mould release before fixing steel. Strip shutters only after the recorded curing period, and never while anyone is under an unsupported span.',
      ],
    },
    {
      heading: 'Rebar binding',
      points: [
        'Bar size, spacing, laps, and cover blocks must match the drawing before the pour.',
        'Bind every intersection so bars cannot shift when concrete is placed. Chairs and cover blocks stay in position.',
        'Loose, rusty-flaking, or oil-coated bars are cleaned or replaced before concreting.',
      ],
    },
  ],
};

const ELECTRICAL: QualityControlProfile = {
  kind: 'electrical',
  title: 'Electrical Work — Quality Control Form',
  intro:
    'Use this form for the wiring scope in the agreement. Concealed work is checked before plaster closes the conduits.',
  sections: [
    {
      heading: 'Concealed conduit wiring',
      points: [
        'Conduits are continuous, fixed, and free of sharp bends. Junction boxes stay accessible after plaster.',
        'Wire is drawn only after the conduit run is complete. Joints are made in boxes, not buried in the wall.',
        'Colour coding and circuit labels match the board schedule in the agreement.',
      ],
    },
    {
      heading: 'Grounding and earthing',
      points: [
        'The earth electrode, lead, and main board earth bar are continuous. Record the earth resistance when a meter is used.',
        'Metal boards, geyser points, and three-pin sockets have a connected earth.',
        'Earth and neutral stay separate. A missing earth is corrected before energising.',
      ],
    },
    {
      heading: 'Load balancing',
      points: [
        'Where more than one phase is used, lighting, sockets, and heavy appliances are spread across the phases named in the board schedule.',
        'Each circuit breaker or fuse matches the cable size for that circuit.',
        'The total connected load stays within the supply sanctioned for the house.',
      ],
    },
    {
      heading: 'Switch and socket test',
      points: [
        'Every switch controls the point marked on the drawing. Polarity on sockets is live-to-live and neutral-to-neutral.',
        'Test each socket and light point with the supply on, then isolate the board before leaving the board open.',
        'Note any point that fails and do not close the wall until it is corrected.',
      ],
    },
  ],
};

const PLUMBING: QualityControlProfile = {
  kind: 'plumbing',
  title: 'Plumbing Work — Quality Control Form',
  intro:
    'Use this form for the water supply, drainage, and fixture scope in the agreement. Concealed pipes are tested before they are covered.',
  sections: [
    {
      heading: 'Water pressure testing',
      points: [
        'Cap the supply lines and hold the test pressure agreed for the job long enough to show a drop. Record the start and end readings.',
        'A falling gauge or a wet joint fails the test. Repair and repeat before plaster or tile covers the line.',
        'Open outlets only after the closed test has passed.',
      ],
    },
    {
      heading: 'Pipe alignment',
      points: [
        'Hot and cold lines run parallel, are clipped at regular centres, and fall the right way toward drains.',
        'Bends are smooth. Pipes do not bear on sharp edges or pass through walls without a sleeve.',
        'Vertical stacks are plumb and supported at each floor.',
      ],
    },
    {
      heading: 'Leak check',
      points: [
        'Inspect every joint, valve, and trap under pressure and again after fixtures are fitted.',
        'Drainage lines are checked with a water pour. There is no backflow at traps and no damp patch on the slab.',
        'Leaks are repaired and retested. A concealed leak is not left for the finish stage.',
      ],
    },
    {
      heading: 'Fixture fitting standards',
      points: [
        'Basins, WCs, showers, and taps sit level, are sealed at the wall or floor, and have working shut-off valves.',
        'Traps hold a water seal. Wastes discharge into the stack named in the drawing, not onto an open surface.',
        'The fitting type in the agreement (concealed or non-concealed) is the type installed.',
      ],
    },
  ],
};

const GENERAL: QualityControlProfile = {
  kind: 'general',
  title: 'Site Work — Quality Control Form',
  intro: 'Use this form to record workmanship checks for the scope named in the agreement.',
  sections: [
    {
      heading: 'Workmanship',
      points: [
        'Materials and methods match the agreement and the accepted bid.',
        'Each stage is inspected before it is covered by the next trade.',
        'Defects are listed, corrected, and checked again before handover.',
      ],
    },
  ],
};

const PROFILES: Record<QualityControlKind, QualityControlProfile> = {
  civil: CIVIL,
  electrical: ELECTRICAL,
  plumbing: PLUMBING,
  general: GENERAL,
};

export function qualityControlProfileForService(
  serviceType: string | null | undefined,
): QualityControlProfile {
  return PROFILES[qualityControlKindForService(serviceType)];
}
