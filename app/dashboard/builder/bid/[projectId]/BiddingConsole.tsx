'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingDown, Info, CheckCircle2, AlertCircle,
  RefreshCw, Building, Layers, Clock
} from 'lucide-react';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_ICON_BUTTON } from '@/lib/navStyles';
import { useRealtimeBids } from '@/lib/hooks/useRealtimeBids';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getRateKeys,
  computeAverageMetric,
  averageFromSumMetric,
  formatBidMetric,
  formatRelativeTime,
  TRACK_LABELS,
  cn,
} from '@/lib/utils';
import {
  BID_RATE_ERROR,
  allowsAnyWholeNumberRate,
  getBidRateFieldError,
  getBidRateRules,
  isValidBidRate,
  parseBidRateValue,
  parseBidDbError,
  ratesToInputStrings,
  roundBidRateToNearestFive,
  sanitizeBidRateInput,
  validateBidRatesForFloorCount,
} from '@/lib/validation/bidRates';
import { submitBidAction } from '@/app/actions/bid';
import { BidWorkItemCard } from '@/components/bid/BidWorkItemCard';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { BidFloorRatesBreakdown } from '@/components/shared/BidFloorRatesBreakdown';
import {
  formatBidUnitSuffix,
  formatTripCapacityLabel,
  getVehicleCapacityError,
  isFlatRupeeService,
  isPerPointService,
  parseVehicleCapacity,
  resolveEarthworkBidMode,
  sanitizeCapacityInput,
} from '@/lib/bid/earthworkBid';
import { resolveScopeRateBidItems } from '@/lib/bid/scopeRateBid';
import {
  ELECTRICIAN_LABOUR_ONLY_DISCLAIMER,
  computeElectricianWeightedIndex,
  electricianPackageGroupsForOptions,
  electricianWeightageContextFromProject,
  getElectricianUnitRateDisplayEntries,
  parseElectricianUnitRates,
  readProjectElectricianBidOptions,
} from '@/lib/electricianBid';
import {
  INTERIOR_DESIGNER_LABOUR_ONLY_DISCLAIMER,
  computeInteriorWeightedIndex,
  getInteriorUnitRateDisplayEntries,
  interiorPackageGroupsForOptions,
  interiorWeightageContextFromProject,
  parseInteriorUnitRates,
  readProjectInteriorBidOptions,
} from '@/lib/interiorBid';
import {
  PLUMBING_LABOUR_ONLY_DISCLAIMER,
  PLUMBING_TAPE_MEASURE_DISCLAIMER,
  computePlumbingPointBidTotal,
  computePlumbingWeightedIndex,
  getPlumbingPointRateDisplayEntries,
  getPlumbingUnitRateDisplayEntries,
  parsePlumbingPointRateInputs,
  parsePlumbingRunningFootRate,
  parsePlumbingUnitRates,
  plumbingPackageGroupsForOptions,
  plumbingPointRateKey,
  plumbingPointRatesToFloorKeys,
  plumbingWeightageContextFromProject,
  readPlumbingPointRateFloors,
  readProjectPlumbingBidOptions,
} from '@/lib/plumberBid';
import { shouldShowBidFloorBreakdown, resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import { createClient } from '@/lib/supabase/client';
import { isTradeServiceType } from '@/lib/trades';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import {
  getProjectConfigOrDrawingMeta,
  getProjectServiceBadgeLabel,
} from '@/lib/project/display';
import {
  findRequirementSpec,
  formatBidRatePlaceholder,
  getProjectWorkRequirementBlocks,
  splitBidRequirementDisplay,
  type WorkRequirementBlock,
} from '@/lib/project/workRequirements';
import type { Project, Bid, BidFloorRateKey, BidRates } from '@/lib/types';

interface Props {
  project: Project;
  existingBid: Bid | null;
  builderId: string;
  builderName: string;
  builderAvatarUrl?: string | null;
  bidderServiceType?: string | null;
  backHref?: string;
}

const FLOOR_RATE_KEYS: BidFloorRateKey[] = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'];

type BidWorkItemView =
  | {
      key: string;
      title: string;
      category?: string;
      description?: string;
      unitSuffix: string;
      placeholder: string;
      kind: 'unit';
      optionId: string;
      floorKey?: undefined;
    }
  | {
      key: BidFloorRateKey;
      title: string;
      category?: string;
      description?: string;
      unitSuffix: string;
      placeholder: string;
      kind: 'floor';
      floorKey: BidFloorRateKey;
      optionId?: undefined;
    };

function formatSpecLines(blocks: WorkRequirementBlock[]): string | undefined {
  const lines = blocks.map((block) => `${block.label}: ${block.value}`).filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : undefined;
}

const LABOUR_NOTICE_CLASSES =
  'rounded-xl border border-amber-300 bg-amber-100 px-3.5 py-3 dark:border-amber-700 dark:bg-amber-900/40';
const LABOUR_NOTICE_TEXT_CLASSES = 'text-sm font-medium leading-relaxed text-amber-900 dark:text-amber-200';
const LABOUR_NOTICE_ICON_CLASSES = 'mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-200';

interface BuilderInfo {
  full_name: string;
  avatar_url?: string | null;
}

export function BiddingConsole({ project, existingBid, builderId, builderName, builderAvatarUrl, bidderServiceType, backHref = '/dashboard/builder' }: Props) {
  const { bids, loading: bidsLoading } = useRealtimeBids(project.id);
  const supabase = createClient();
  const [builders, setBuilders] = useState<Record<string, BuilderInfo>>({});
  const isTrade = isTradeServiceType(project.service_type);
  const isDrawing = isDrawingDesignServiceType(project.service_type);
  const isSingleRateBid = isTrade || isDrawing;
  const serviceBadge = getProjectServiceBadgeLabel(project);
  const configMeta = getProjectConfigOrDrawingMeta(project);
  const workRequirements = getProjectWorkRequirementBlocks(project);
  const requirementBlocks = workRequirements?.blocks ?? [];
  const {
    summary: summaryBlocks,
    notes: noteBlocks,
    specs: specBlocks,
  } = splitBidRequirementDisplay(requirementBlocks);
  const summaryBannerBlocks: WorkRequirementBlock[] = [
    ...(project.district && !summaryBlocks.some((block) => block.label === 'Project Address' || block.label === 'Village / Town Name')
      ? [{ label: 'Location', value: project.district }]
      : []),
    ...summaryBlocks,
  ];

  // Trade / Drawing & Design bid a single package rate (not per floor),
  // except scoped /sqft items (Chowkhat, Modular Kitchen, legacy carpenter).
  const bidFloors = resolveProjectBidFloors(project);
  const scopeBid = resolveScopeRateBidItems(project, bidderServiceType);
  const isScopeRateBid = scopeBid != null;
  const isAssamTypeHouse = bidFloors.isAssamType && !isScopeRateBid;
  const floorCount = isScopeRateBid ? scopeBid.count : isSingleRateBid ? 1 : bidFloors.count;
  const floorLabels = isScopeRateBid ? scopeBid.labels : isSingleRateBid ? ['Your'] : bidFloors.labels;
  const rateKeys = getRateKeys(floorCount);
  const earthworkMode = resolveEarthworkBidMode(project);
  const isPlumber = isFlatRupeeService(project.service_type);
  const isPlumbingBid = scopeBid?.kind === 'plumbing';
  const isPlumbingPointRateBid = Boolean(scopeBid?.pointRateBid);
  const plumbingPointFloors = isPlumbingPointRateBid ? readPlumbingPointRateFloors(project) : [];
  const isElectricianBid = scopeBid?.kind === 'electrician';
  const isInteriorBid = scopeBid?.kind === 'interior';
  const isTradeUnitRateBid = Boolean(scopeBid?.unitRateBid);
  const plumbingBidOptions = isPlumbingBid ? readProjectPlumbingBidOptions(project) : [];
  const electricianBidOptions = isElectricianBid ? readProjectElectricianBidOptions(project) : [];
  const interiorBidOptions = isInteriorBid ? readProjectInteriorBidOptions(project) : [];
  const tradeBidOptions = isInteriorBid
    ? interiorBidOptions
    : isElectricianBid
      ? electricianBidOptions
      : plumbingBidOptions;
  const plumbingWeightageContext = plumbingWeightageContextFromProject(project);
  const electricianWeightageContext = electricianWeightageContextFromProject(project);
  const interiorWeightageContext = interiorWeightageContextFromProject(project);
  const plumbingRateUnits = isPlumbingBid ? (scopeBid.rateUnits ?? []) : [];
  const isPlumberFlat = isPlumber && !isPlumbingBid;
  const isElectrician = isPerPointService(project.service_type) && !isTradeUnitRateBid;
  const rateUnitSuffix = isTradeUnitRateBid
    ? ''
    : isPlumbingBid
    ? 'avg'
    : formatBidUnitSuffix(undefined, earthworkMode, project.service_type);
  const isPainter = project.service_type === 'painter';
  const isFlexibleRate =
    allowsAnyWholeNumberRate(project.service_type, bidderServiceType) ||
    scopeBid?.flexibleRates === true;
  const rateRules = scopeBid?.flexibleRates
    ? { requireMultipleOfFive: false }
    : getBidRateRules(project.service_type, bidderServiceType);

  const tradeOptionGroups = isTradeUnitRateBid
    ? isInteriorBid
      ? interiorPackageGroupsForOptions(interiorBidOptions)
      : isElectricianBid
        ? electricianPackageGroupsForOptions(electricianBidOptions)
        : plumbingPackageGroupsForOptions(plumbingBidOptions)
    : [];

  const usedSpecLabels = new Set<string>();
  const unitRateWorkItems: BidWorkItemView[] = tradeOptionGroups.flatMap((group) =>
    group.options.map((option) => ({
      key: option.id,
      title: option.shortLabel,
      category: group.label,
      description: option.note,
      unitSuffix: option.unitSuffix,
      placeholder: formatBidRatePlaceholder(option.unitSuffix),
      kind: 'unit' as const,
      optionId: option.id,
    })),
  );

  const floorRateWorkItems: BidWorkItemView[] = !isTradeUnitRateBid
    ? floorLabels.flatMap((label, index) => {
        const floorKey = FLOOR_RATE_KEYS[index];
        if (!floorKey) return [];
        const plumbingUnit = isPlumbingBid ? (plumbingRateUnits[index] ?? '/Rft') : undefined;
        const pointFloor = isPlumbingPointRateBid ? plumbingPointFloors[index] : null;
        const unitSuffix =
          pointFloor
            ? '/point'
            : plumbingUnit === '/unit' || plumbingUnit === 'pkg'
            ? '/unit'
            : plumbingUnit
              ? '/Rft'
              : rateUnitSuffix || (isPlumberFlat ? '' : '/sqft');
        const matched = findRequirementSpec(label, specBlocks);
        if (matched) usedSpecLabels.add(matched.label);
        if (!matched && /civil work/i.test(label)) {
          const assam = specBlocks.find((block) => /^assam type/i.test(block.label));
          if (assam) usedSpecLabels.add(assam.label);
        }
        const title =
          label === 'Your'
            ? isPainter
              ? 'Painting Work'
              : isDrawing
                ? 'Drawing & Design'
                : earthworkMode === 'hourly'
                  ? 'Hourly Machine Work'
                  : earthworkMode === 'trip'
                    ? 'Trip Rate'
                    : isElectrician
                      ? 'Electrical Work'
                      : isPlumberFlat
                        ? 'Plumbing Work'
                        : `${serviceBadge} Rate`
            : label;
        const category =
          pointFloor
            ? 'Rate Per Point (₹)'
            : earthworkMode === 'hourly'
            ? 'Your Hourly Rate'
            : earthworkMode === 'trip'
              ? 'Your Rate Per Trip'
              : isElectrician
                ? 'Your Rate Per Point'
                : isPlumberFlat
                  ? 'Your Rate'
                  : scopeBid?.kind === 'assam-addons'
                    ? 'Add-on Rate'
                    : undefined;
        const matchedAssam =
          !matched && /civil work/i.test(label)
            ? specBlocks.find((block) => /^assam type/i.test(block.label))
            : undefined;
        return [{
          key: floorKey,
          title,
          category,
          description: pointFloor?.breakdown ?? matched?.value ?? matchedAssam?.value,
          unitSuffix,
          placeholder: formatBidRatePlaceholder(unitSuffix),
          kind: 'floor' as const,
          floorKey,
        }];
      })
    : [];

  const leftoverSpecs = specBlocks.filter((block) => !usedSpecLabels.has(block.label));
  const baseBidWorkItems: BidWorkItemView[] =
    unitRateWorkItems.length > 0 ? unitRateWorkItems : floorRateWorkItems;
  const extra = baseBidWorkItems.length === 1 ? formatSpecLines(leftoverSpecs) : undefined;
  const bidWorkItems: BidWorkItemView[] =
    extra && baseBidWorkItems[0]
      ? [{
          ...baseBidWorkItems[0],
          description: [baseBidWorkItems[0].description, extra].filter(Boolean).join('\n'),
        }]
      : baseBidWorkItems;
  const extraScopeBlocks = baseBidWorkItems.length === 1 ? [] : leftoverSpecs;

  const [rateInputs, setRateInputs] = useState<Partial<Record<BidFloorRateKey, string>>>(() => {
    if (existingBid && isPlumbingPointRateBid) {
      const stored = parsePlumbingPointRateInputs(existingBid.rates, plumbingPointFloors);
      return ratesToInputStrings(plumbingPointRatesToFloorKeys(stored, plumbingPointFloors));
    }
    return existingBid ? ratesToInputStrings(existingBid.rates) : {};
  });
  const [rates, setRates] = useState<Partial<BidRates>>(() => {
    if (existingBid && isPlumbingPointRateBid) {
      const stored = parsePlumbingPointRateInputs(existingBid.rates, plumbingPointFloors);
      return plumbingPointRatesToFloorKeys(stored, plumbingPointFloors);
    }
    if (existingBid) return existingBid.rates;
    return {};
  });
  const [unitRateInputs, setUnitRateInputs] = useState<Record<string, string>>(() => {
    const parseRates =
      project.service_type === 'electrician'
        ? parseElectricianUnitRates
        : project.service_type === 'false_ceiling_work'
          ? parseInteriorUnitRates
          : parsePlumbingUnitRates;
    const stored = existingBid ? parseRates(existingBid.rates?.unit_rates) : {};
    return Object.fromEntries(Object.entries(stored).map(([key, value]) => [key, String(value)]));
  });
  const [unitRateValues, setUnitRateValues] = useState<Record<string, number>>(() => {
    const parseRates =
      project.service_type === 'electrician'
        ? parseElectricianUnitRates
        : project.service_type === 'false_ceiling_work'
          ? parseInteriorUnitRates
          : parsePlumbingUnitRates;
    return existingBid ? parseRates(existingBid.rates?.unit_rates) : {};
  });
  const [unitRateErrors, setUnitRateErrors] = useState<Record<string, string>>({});
  const [rateErrors, setRateErrors] = useState<Partial<Record<BidFloorRateKey, string>>>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [capacityInput, setCapacityInput] = useState(() =>
    existingBid?.rates?.vehicleCapacityCum != null
      ? String(existingBid.rates.vehicleCapacityCum)
      : '',
  );
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [runningFootInput, setRunningFootInput] = useState(() => {
    const value = parsePlumbingRunningFootRate(existingBid?.rates);
    return value != null ? String(value) : '';
  });
  const [runningFootValue, setRunningFootValue] = useState<number | undefined>(() =>
    parsePlumbingRunningFootRate(existingBid?.rates) ?? undefined,
  );
  const [runningFootError, setRunningFootError] = useState<string | null>(null);

  const countdown     = useCountdown(project.bidding_ends_at);
  const biddingClosed = project.status !== 'active_24h' || countdown.isExpired;
  const tradeWeightedIndex = isTradeUnitRateBid
    ? isInteriorBid
      ? computeInteriorWeightedIndex(unitRateValues, interiorBidOptions, interiorWeightageContext)
      : isElectricianBid
        ? computeElectricianWeightedIndex(unitRateValues, electricianBidOptions, electricianWeightageContext)
        : computePlumbingWeightedIndex(unitRateValues, plumbingBidOptions, plumbingWeightageContext)
    : 0;
  const plumbingPointRateMap = Object.fromEntries(
    plumbingPointFloors.map((floor, index) => {
      const key = FLOOR_RATE_KEYS[index];
      return [plumbingPointRateKey(floor.floor), key ? (rates[key] ?? 0) : 0];
    }),
  );
  const plumbingPointTotal = isPlumbingPointRateBid
    ? computePlumbingPointBidTotal(plumbingPointRateMap, plumbingPointFloors)
    : 0;
  const averageMetric = isPlumbingPointRateBid
    ? plumbingPointTotal
    : isTradeUnitRateBid
    ? tradeWeightedIndex
    : computeAverageMetric(rates, floorCount);
  const displayBidAverage = (bid: { total_sum_metric: number; rates?: BidRates | null }) => {
    if (isPlumbingPointRateBid) {
      return formatBidMetric(bid.total_sum_metric);
    }
    if (isTradeUnitRateBid) {
      const stored = bid.rates?.weighted_index;
      if (stored != null && stored > 0) return formatBidMetric(stored);
      const count = Math.max(tradeBidOptions.length, 1);
      return formatBidMetric(averageFromSumMetric(bid.total_sum_metric, count));
    }
    return formatBidMetric(averageFromSumMetric(bid.total_sum_metric, floorCount));
  };

  const myCurrentBid = bids.find((b) => b.builder_id === builderId);
  const myRank       = bids.findIndex((b) => b.builder_id === builderId) + 1;
  const lowestBid    = bids[0];
  const isLeading    = myCurrentBid && myCurrentBid.id === bids[0]?.id;

  useEffect(() => {
    const missingIds = bids
      .map((b) => b.builder_id)
      .filter((id): id is string => !!id && id !== builderId && !builders[id]);

    if (missingIds.length === 0) return;

    supabase
      .from('profiles_public')
      .select('id, full_name, avatar_url')
      .in('id', missingIds)
      .then(({ data }) => {
        if (!data) return;
        setBuilders((prev) => ({
          ...prev,
          ...Object.fromEntries(
            data.map((p: { id: string; full_name: string; avatar_url?: string | null }) => [
              p.id,
              { full_name: p.full_name, avatar_url: p.avatar_url },
            ])
          ),
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids, builderId]);

  useEffect(() => {
    if (!isFlexibleRate) return;
    setRateErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(next) as BidFloorRateKey[]) {
        if (next[key] === BID_RATE_ERROR) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setError((prev) => (prev === BID_RATE_ERROR ? null : prev));
  }, [isFlexibleRate]);

  const allFilled = isTradeUnitRateBid
    ? tradeBidOptions.every((option) => isValidBidRate(unitRateValues[option.id], rateRules))
    : rateKeys.every((k) => isValidBidRate(rates[k], rateRules));
  const hasRateErrors = isTradeUnitRateBid
    ? tradeBidOptions.some((option) => {
        const fieldError = unitRateErrors[option.id];
        if (!fieldError) return false;
        if (isFlexibleRate && fieldError === BID_RATE_ERROR) return false;
        return true;
      })
    : rateKeys.some((k) => {
        const fieldError = rateErrors[k];
        if (!fieldError) return false;
        if (isFlexibleRate && fieldError === BID_RATE_ERROR) return false;
        return true;
      });
  const capacityValue = parseVehicleCapacity(capacityInput);
  const capacityOk = earthworkMode !== 'trip' || capacityValue != null;
  const canSubmit = allFilled && !hasRateErrors && capacityOk && !capacityError;

  function validateRateField(key: BidFloorRateKey, value: number | undefined) {
    let fieldError = getBidRateFieldError(value, rateRules);
    if (isFlexibleRate && fieldError === BID_RATE_ERROR) fieldError = null;
    setRateErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[key] = fieldError;
      else delete next[key];
      return next;
    });
  }

  function handleRateChange(key: BidFloorRateKey, raw: string) {
    const sanitized = sanitizeBidRateInput(raw);
    setRateInputs((prev) => ({ ...prev, [key]: sanitized }));
    const value = parseBidRateValue(sanitized);
    setRates((prev) => ({ ...prev, [key]: value ?? 0 }));

    if (isFlexibleRate || (value != null && isValidBidRate(value, rateRules))) {
      setError((prev) => (prev === BID_RATE_ERROR ? null : prev));
    }
    if (isFlexibleRate && value != null && value > 0) {
      setError(null);
    }

    if (!sanitized) {
      setRateErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    validateRateField(key, value);
  }

  function handleRateBlur(key: BidFloorRateKey) {
    const value = parseBidRateValue(rateInputs[key] ?? '');
    validateRateField(key, value);
  }

  function handleUnitRateChange(optionId: string, raw: string) {
    const sanitized = sanitizeBidRateInput(raw);
    setUnitRateInputs((prev) => ({ ...prev, [optionId]: sanitized }));
    const value = parseBidRateValue(sanitized);
    setUnitRateValues((prev) => {
      const next = { ...prev };
      if (value == null) delete next[optionId];
      else next[optionId] = value;
      return next;
    });
    if (!sanitized) {
      setUnitRateErrors((prev) => {
        const next = { ...prev };
        delete next[optionId];
        return next;
      });
      return;
    }
    let fieldError = getBidRateFieldError(value, rateRules);
    if (isFlexibleRate && fieldError === BID_RATE_ERROR) fieldError = null;
    setUnitRateErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[optionId] = fieldError;
      else delete next[optionId];
      return next;
    });
  }

  function handleRoundToNearestFive(key: BidFloorRateKey) {
    const current = parseBidRateValue(rateInputs[key] ?? '') ?? rates[key] ?? 0;
    if (current <= 0) return;

    const rounded = roundBidRateToNearestFive(current);
    const sanitized = String(rounded);

    setRateInputs((prev) => ({ ...prev, [key]: sanitized }));
    setRates((prev) => ({ ...prev, [key]: rounded }));
    validateRateField(key, rounded);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isTradeUnitRateBid) {
      const submitErrors: Record<string, string> = {};
      for (const option of tradeBidOptions) {
        const value = unitRateValues[option.id];
        let fieldError = getBidRateFieldError(value, rateRules);
        if (isFlexibleRate && fieldError === BID_RATE_ERROR) fieldError = null;
        if (value == null || value <= 0) submitErrors[option.id] = 'Enter a rate greater than zero.';
        else if (fieldError) submitErrors[option.id] = fieldError;
      }
      setUnitRateErrors(submitErrors);
      if (Object.keys(submitErrors).length > 0) {
        setError(Object.values(submitErrors)[0]);
        return;
      }
    } else {
      const validation = validateBidRatesForFloorCount(rates, floorCount, rateRules);
      const submitErrors = { ...validation.errors };
      if (isFlexibleRate) {
        for (const key of rateKeys) {
          if (submitErrors[key] === BID_RATE_ERROR) delete submitErrors[key];
        }
      }
      const submitBlocked = Object.keys(submitErrors).length > 0;
      setRateErrors(submitErrors);
      if (submitBlocked) {
        setError(Object.values(submitErrors)[0] ?? validation.message);
        return;
      }
    }
    if (isPlumbingPointRateBid) {
      if (runningFootInput.trim()) {
        const runningError = getBidRateFieldError(runningFootValue, rateRules);
        if (runningFootValue == null || runningFootValue <= 0) {
          setRunningFootError('Enter a rate greater than zero, or leave this field blank.');
          setError('Enter a running foot rate greater than zero, or leave it blank.');
          return;
        }
        if (runningError) {
          setRunningFootError(runningError);
          setError(runningError);
          return;
        }
      }
      setRunningFootError(null);
    }
    setError(null);

    let tripCapacity: number | undefined;
    if (earthworkMode === 'trip') {
      const capError = getVehicleCapacityError(capacityInput);
      setCapacityError(capError);
      if (capError) {
        setError(capError);
        return;
      }
      tripCapacity = parseVehicleCapacity(capacityInput);
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const bidId = existingBid?.id ?? myCurrentBid?.id ?? null;
    const result = await submitBidAction(project.id, {
      ground_rate: rates.ground_rate ?? 0,
      first_rate: rates.first_rate,
      second_rate: rates.second_rate,
      third_rate: rates.third_rate,
      ...(earthworkMode === 'hourly' ? { bid_unit: 'per_hour' as const } : {}),
      ...(earthworkMode === 'trip'
        ? { bid_unit: 'per_trip' as const, vehicleCapacityCum: tripCapacity }
        : {}),
      ...(isTradeUnitRateBid
        ? { bid_unit: 'per_point' as const, unit_rates: unitRateValues }
        : isPlumbingPointRateBid
          ? {
              bid_unit: 'per_point' as const,
              running_foot_rate: runningFootValue && runningFootValue > 0 ? runningFootValue : undefined,
            }
        : isPlumbingBid
          ? { bid_unit: 'per_running_foot' as const }
          : {}),
      ...(isPlumberFlat ? { bid_unit: 'flat' as const } : {}),
      ...(isElectrician ? { bid_unit: 'per_point' as const } : {}),
    }, bidId);

    if (result.error) {
      setError(parseBidDbError(result.error, project.service_type));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <NavLink
          href={backHref}
          prefetch
          className={cn(NAV_ICON_BUTTON, 'p-1 text-muted-foreground hover:text-foreground')}
        >
          <ArrowLeft className="w-5 h-5" />
        </NavLink>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {biddingClosed ? (
              <Badge>Bidding Closed</Badge>
            ) : (
              <Badge variant="emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Auction
              </Badge>
            )}
            <Badge>{serviceBadge}</Badge>
            {isTrade && !isDrawing && (
              <Badge>{TRACK_LABELS[project.track_type]}</Badge>
            )}
          </div>
          <h1 className="text-lg font-bold text-foreground leading-snug">{project.title}</h1>
          <p className="text-xs text-muted-foreground">
            {project.district}
            {configMeta ? ` · ${configMeta}` : ''}
          </p>
        </div>
      </div>

      {(isPlumbingBid || isElectricianBid || isInteriorBid) && (isTradeUnitRateBid || isPlumbingPointRateBid) && (
        <div className={cn('flex items-start gap-2', LABOUR_NOTICE_CLASSES)}>
          <Info className={LABOUR_NOTICE_ICON_CLASSES} />
          <p className={LABOUR_NOTICE_TEXT_CLASSES}>
            {isInteriorBid
              ? INTERIOR_DESIGNER_LABOUR_ONLY_DISCLAIMER
              : isElectricianBid
                ? ELECTRICIAN_LABOUR_ONLY_DISCLAIMER
                : PLUMBING_LABOUR_ONLY_DISCLAIMER}
          </p>
        </div>
      )}

      {summaryBannerBlocks.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
            Project specifications
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summaryBannerBlocks.map((block) => (
              <div key={block.label} className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {block.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold leading-snug text-foreground whitespace-pre-line">
                  {block.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {extraScopeBlocks.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scope details
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {extraScopeBlocks.map((block) => (
              <div key={block.label} className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {block.label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium leading-snug text-foreground whitespace-pre-line">
                  {block.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {noteBlocks.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 space-y-2">
          {noteBlocks.map((block) => (
            <div key={block.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {block.label}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-foreground whitespace-pre-line">
                {block.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Countdown — full width above the bid / leaderboard split */}
      {biddingClosed ? (
        <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-500/20 flex items-start gap-3">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Bidding Closed</p>
            <p className="text-xs text-muted-foreground">
              The bidding window has ended. No further bid updates are accepted — the owner will
              review submitted bids and select a builder.
            </p>
          </div>
        </div>
      ) : (
        <Card className="border-emerald-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-emerald-400 uppercase tracking-wider">Auction Closes In</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <CountdownTicker targetDateISO={project.bidding_ends_at} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
        {/* Left: Update Your Bid */}
        <div className="min-w-0 lg:self-stretch">
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                {biddingClosed ? 'Your Bid' : myCurrentBid ? 'Update Your Bid' : 'Submit Rate Bid'}
              </CardTitle>
              <div className="flex items-center gap-2.5 pt-0.5">
                <UserAvatar
                  name={builderName}
                  avatarUrl={builderAvatarUrl}
                  size="md"
                  gradient="from-emerald-500 to-teal-600"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{builderName}</p>
                  <p className="text-[10px] text-muted-foreground">Your profile on the live leaderboard</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {biddingClosed ? (
                myCurrentBid ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border bg-secondary/50 border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {earthworkMode === 'hourly'
                            ? 'Hourly Rate Metric'
                            : earthworkMode === 'trip'
                              ? 'Trip Rate Metric'
                              : isPlumberFlat
                                ? 'Your Rate'
                                : isScopeRateBid
                                  ? 'Your Average Rate Metric'
                                  : 'Your Final Rate Metric'}
                        </p>
                        <p className="text-lg font-bold tabular-nums text-foreground">
                          {isPlumberFlat ? 'Rs. ' : '₹'}{displayBidAverage(myCurrentBid)}
                          {earthworkMode || isElectrician || isPlumbingBid ? ` ${rateUnitSuffix}` : ''}
                        </p>
                        {earthworkMode === 'trip' && formatTripCapacityLabel(myCurrentBid.rates?.vehicleCapacityCum) && (
                          <p className="text-[11px] text-muted-foreground">
                            {formatTripCapacityLabel(myCurrentBid.rates?.vehicleCapacityCum)}
                          </p>
                        )}
                      </div>
                      {isScopeRateBid && !isPlumbingBid && (
                        <p className="text-xs text-muted-foreground/80 text-right">
                          {floorCount === 1 ? (
                            <>Single rate<br />bid</>
                          ) : (
                            <>Average of {floorCount} items</>
                          )}
                        </p>
                      )}
                      {!isAssamTypeHouse && !earthworkMode && !isPlumberFlat && !isElectrician && !isScopeRateBid && (
                        <p className="text-xs text-muted-foreground/80 text-right">
                          {isSingleRateBid ? (
                            <>Single rate<br />bid</>
                          ) : floorCount === 1 ? (
                            <>1 floor<br />avg</>
                          ) : (
                            <>Average of {floorCount} floors</>
                          )}
                        </p>
                      )}
                      {isPlumberFlat && (
                        <p className="text-xs text-muted-foreground/80 text-right">Rs.</p>
                      )}
                      {isPlumbingBid && (
                        <p className="text-xs text-muted-foreground/80 text-right">
                          {isPlumbingPointRateBid
                            ? 'estimated total'
                            : isTradeUnitRateBid
                              ? 'baseline score'
                              : 'overall avg'}
                          <br />
                          {isPlumbingPointRateBid ? 'lowest total wins' : 'lowest avg wins'}
                        </p>
                      )}
                      {earthworkMode === 'hourly' && (
                        <p className="text-xs text-muted-foreground/80 text-right">/hour</p>
                      )}
                      {isElectrician && (
                        <p className="text-xs text-muted-foreground/80 text-right">/point</p>
                      )}
                    </div>
                    {myRank > 0 && (
                      <div className={cn(
                        'flex items-center gap-3 p-2.5 rounded-lg border text-sm',
                        isLeading
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          : 'bg-secondary/50 border-border text-muted-foreground'
                      )}>
                        <TrendingDown className="w-4 h-4 flex-shrink-0" />
                        {isLeading
                          ? '🏆 You were leading when bidding closed!'
                          : `You ranked #${myRank} of ${bids.length} when bidding closed`}
                      </div>
                    )}
                    <p className="text-center text-xs text-muted-foreground/80">
                      Submitted {formatRelativeTime(myCurrentBid.updated_at ?? myCurrentBid.created_at)} — bidding is now closed and rates can no longer be changed.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Bidding closed before you submitted a bid on this project.
                  </p>
                )
              ) : (
                <>
              {error && (
                <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Bid submitted successfully!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {!isTradeUnitRateBid && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 mb-2">
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    {isPainter || isDrawing ? (
                      <>Enter your rate in ₹ per sqft. Rates must be whole numbers. Lower rates rank higher.</>
                    ) : scopeBid?.kind === 'assam-addons' ? (
                      <>
                        Mistri contractors submit add-on rates on behalf of specialized roofers, tile workers, and carpenters. Negotiate carefully—your overall average rate determines leaderboard rank.
                      </>
                    )                     : isPlumbingBid ? (
                      isPlumbingPointRateBid ? (
                      <>
                        Enter a <strong>Rate Per Point (₹)</strong> for each selected floor.
                        Basin and tap = 1 pt; shower, commode, and geyser = 2 pts each.
                        The estimated bid is the sum of floor points × rate per point.
                        The running-foot rate is optional and is <strong>not</strong> added to ranking.
                        Rates must be whole numbers ending in <strong>0 or 5</strong>. Lowest estimated total ranks first.
                      </>
                      ) : (
                      <>
                        Enter a <strong>Bathroom Package Rate</strong> (₹ / unit) for each selected
                        bathroom type, then <strong>per running foot</strong> rates for{' '}
                        <strong>Tap Water Pipe</strong> and <strong>Toilet Drainage Pipe</strong>.
                        Rates must be whole numbers ending in <strong>0 or 5</strong>. The plumber
                        with the <strong>lowest overall average unit rate</strong> ranks as the
                        winning bidder.
                      </>
                      )
                    ) : isScopeRateBid ? (
                      <>Enter your rate in ₹ per sqft for each item. Rates must be whole numbers. Lower rates rank higher.</>
                    ) : isElectrician ? (
                      <>Enter your rate in ₹ per point. Rates must be whole numbers. Lower rates rank higher.</>
                    ) : isPlumberFlat ? (
                      <>Enter your rate in <strong>Rs.</strong> Rates must be whole numbers ending in 0 or 5. Lower rates rank higher.</>
                    ) : earthworkMode === 'hourly' ? (
                      <>Enter your rate in ₹ per hour. Rates must be whole numbers ending in 0 or 5.</>
                    ) : earthworkMode === 'trip' ? (
                      <>Enter your rate in ₹ per trip and specify vehicle capacity in cu.m (cum).</>
                    ) : (
                      <>
                        Enter your rate in <strong>₹ per sqft</strong>
                        {isSingleRateBid ? '' : ' for each floor'}. Rates must be whole numbers
                        {isFlexibleRate ? '' : <> ending in <strong>0 or 5</strong></>}. Lower{' '}
                        {isSingleRateBid ? 'rates rank' : 'average rates rank'} higher.
                      </>
                    )}
                  </p>
                </div>
                )}

                {isPlumbingBid && !isTradeUnitRateBid && !isPlumbingPointRateBid && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-1">
                    <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {PLUMBING_TAPE_MEASURE_DISCLAIMER}
                    </p>
                  </div>
                )}
                <AnimatePresence>
                  {bidWorkItems.map((item, i) => {
                    const isUnitItem = item.kind === 'unit';
                    const inputValue = isUnitItem
                      ? (unitRateInputs[item.optionId] ?? '')
                      : (rateInputs[item.floorKey] ?? '');
                    const numericValue = parseBidRateValue(inputValue);
                    const fieldError = isUnitItem
                      ? unitRateErrors[item.optionId]
                      : rateErrors[item.floorKey];
                    const showRoundHelper =
                      !isFlexibleRate &&
                      fieldError === BID_RATE_ERROR &&
                      numericValue !== undefined &&
                      numericValue > 0;
                    const visibleError =
                      isUnitItem && fieldError === BID_RATE_ERROR ? undefined : fieldError;

                    return (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <BidWorkItemCard
                          title={item.title}
                          category={item.category}
                          description={item.description}
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder={item.placeholder}
                            value={inputValue}
                            onChange={(e) => {
                              if (item.kind === 'unit') {
                                handleUnitRateChange(item.optionId, e.target.value);
                              } else {
                                handleRateChange(item.floorKey, e.target.value);
                              }
                            }}
                            onBlur={
                              item.kind === 'floor'
                                ? () => handleRateBlur(item.floorKey)
                                : undefined
                            }
                            prefix={
                              <span className="text-muted-foreground text-xs">
                                {isPlumberFlat ? 'Rs.' : '₹'}
                              </span>
                            }
                            suffix={
                              item.unitSuffix ? (
                                <span className="text-muted-foreground/80 text-xs">
                                  {item.unitSuffix}
                                </span>
                              ) : undefined
                            }
                            error={visibleError}
                            required={!isUnitItem}
                          />
                          {showRoundHelper && numericValue != null && (
                            <button
                              type="button"
                              onClick={() => {
                                const rounded = String(roundBidRateToNearestFive(numericValue));
                                if (item.kind === 'unit') {
                                  handleUnitRateChange(item.optionId, rounded);
                                } else {
                                  handleRoundToNearestFive(item.floorKey);
                                }
                              }}
                              className="mt-1 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                            >
                              Round to nearest 5 (→ ₹{roundBidRateToNearestFive(numericValue).toLocaleString('en-IN')})
                            </button>
                          )}
                        </BidWorkItemCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {isPlumbingPointRateBid && (
                  <BidWorkItemCard
                    title="Rate per Linear Running Foot"
                    category="Separate line item — not ranked"
                    description="Optional extra rate for long connection lines. This is not added to the estimated bid total or ranking."
                  >
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter rate per running foot (optional)"
                      value={runningFootInput}
                      onChange={(e) => {
                        const sanitized = sanitizeBidRateInput(e.target.value);
                        setRunningFootInput(sanitized);
                        const value = parseBidRateValue(sanitized);
                        setRunningFootValue(value);
                        if (!sanitized) {
                          setRunningFootError(null);
                          return;
                        }
                        setRunningFootError(getBidRateFieldError(value, rateRules));
                      }}
                      prefix={<span className="text-muted-foreground text-xs">₹</span>}
                      suffix={<span className="text-muted-foreground/80 text-xs">/ft</span>}
                      error={runningFootError ?? undefined}
                    />
                  </BidWorkItemCard>
                )}

                {earthworkMode === 'trip' && (
                  <Input
                    label="Vehicle Trip Capacity (cu.m / cum)"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 3.5"
                    value={capacityInput}
                    onChange={(e) => {
                      const next = sanitizeCapacityInput(e.target.value);
                      setCapacityInput(next);
                      if (capacityError) setCapacityError(getVehicleCapacityError(next));
                    }}
                    onBlur={() => setCapacityError(getVehicleCapacityError(capacityInput))}
                    suffix={<span className="text-muted-foreground/80 text-xs">cu.m</span>}
                    error={capacityError ?? undefined}
                    required
                  />
                )}

                {/* Average metric preview */}
                <div className={cn(
                  'flex items-center justify-between p-2.5 rounded-xl border',
                  averageMetric > 0
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-secondary/50 border-border'
                )}>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {earthworkMode === 'hourly'
                        ? 'Hourly Rate Metric'
                        : earthworkMode === 'trip'
                          ? 'Trip Rate Metric'
                          : isPlumberFlat
                            ? 'Your Rate'
                            : isElectrician
                              ? 'Your Rate Per Point'
                              : isTradeUnitRateBid
                                ? 'Weighted Index'
                                : isPlumbingPointRateBid
                                ? 'Total Estimated Bid Amount'
                                : isPlumbingBid
                                ? 'Overall Average Rate'
                                : 'Your Average Rate Metric'}
                    </p>
                    <p className={cn('text-lg font-bold tabular-nums', averageMetric > 0 ? 'text-emerald-400' : 'text-muted-foreground/80')}>
                      {earthworkMode === 'trip' && averageMetric > 0
                        ? `₹${formatBidMetric(averageMetric)} / trip${capacityValue != null ? ` (Capacity: ${capacityValue} cum)` : ''}`
                        : `${isPlumberFlat ? 'Rs. ' : '₹'}${formatBidMetric(averageMetric)}`}
                    </p>
                  </div>
                  {earthworkMode === 'hourly' && (
                    <p className="text-xs text-muted-foreground/80 text-right">/hour</p>
                  )}
                  {isElectrician && (
                    <p className="text-xs text-muted-foreground/80 text-right">/point</p>
                  )}
                  {isPlumberFlat && (
                    <p className="text-xs text-muted-foreground/80 text-right">lump sum</p>
                  )}
                  {isPlumbingBid && (
                    <p className="text-xs text-muted-foreground/80 text-right">
                      {isPlumbingPointRateBid
                        ? 'Fixture point total'
                        : isTradeUnitRateBid
                          ? 'Weighted index'
                          : 'Overall average unit rate'}
                      <br />
                      {isPlumbingPointRateBid ? 'lowest total wins' : 'lowest avg wins'}
                    </p>
                  )}
                  {isScopeRateBid && !isPlumbingBid && (
                    <p className="text-xs text-muted-foreground/80 text-right">
                      {floorCount === 1 ? (
                        <>Single rate<br />bid</>
                      ) : (
                        <>Average of {floorCount} items</>
                      )}
                    </p>
                  )}
                  {!isAssamTypeHouse && !earthworkMode && !isPlumberFlat && !isElectrician && !isScopeRateBid && (
                    <p className="text-xs text-muted-foreground/80 text-right">
                      {isSingleRateBid ? (
                        <>Single rate<br />bid</>
                      ) : floorCount === 1 ? (
                        <>1 floor<br />avg</>
                      ) : (
                        <>Average of {floorCount} floors</>
                      )}
                    </p>
                  )}
                </div>
                {isPlumbingPointRateBid && runningFootValue != null && runningFootValue > 0 && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    Separate running-foot rate (not ranked): ₹{runningFootValue.toLocaleString('en-IN')}/ft
                  </p>
                )}

                {/* Rank preview */}
                {myCurrentBid && myRank > 0 && (
                  <div className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg border text-sm',
                    isLeading
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-secondary/50 border-border text-muted-foreground'
                  )}>
                    <TrendingDown className="w-4 h-4 flex-shrink-0" />
                    {isLeading
                      ? '🏆 You are currently leading!'
                      : `You are ranked #${myRank} of ${bids.length}`}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading || !canSubmit}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {myCurrentBid ? 'Updating…' : 'Submitting…'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {myCurrentBid ? <><RefreshCw className="w-4 h-4" /> Update Bid</> : <><CheckCircle2 className="w-4 h-4" /> Submit Bid</>}
                    </span>
                  )}
                </Button>

                {myCurrentBid && (
                  <p className="text-center text-xs text-muted-foreground/80">
                    Last submitted {formatRelativeTime(myCurrentBid.updated_at ?? myCurrentBid.created_at)}
                  </p>
                )}
              </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Leaderboard */}
        <div className="min-w-0 lg:self-stretch">
          <Card className="h-full min-h-full flex flex-col">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Live Leaderboard
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-normal text-muted-foreground">Real-time</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 flex-1">
              {bidsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />)}
                </div>
              ) : bids.length === 0 ? (
                <div className="py-10 text-center">
                  <Building className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Be the first to bid!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {bids.map((bid, index) => {
                      const isMe     = bid.builder_id === builderId;
                      const isLowest = index === 0;
                      const competitor = bid.builder_id ? builders[bid.builder_id] : undefined;
                      const rowName = isMe
                        ? builderName
                        : (competitor?.full_name ?? (bid.builder_id ? `Builder #${bid.builder_id.slice(-6).toUpperCase()}` : 'Builder'));
                      const rowAvatar = isMe ? builderAvatarUrl : competitor?.avatar_url;

                      return (
                        <motion.div
                          key={bid.id}
                          layout
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className={cn(
                            'relative flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                            isLowest && !isMe && 'bg-secondary/40 border-border',
                            isLowest && isMe  && 'bg-emerald-500/8 border-emerald-500/30',
                            !isLowest && isMe  && 'bg-indigo-500/5 border-indigo-500/20 ring-1 ring-indigo-500/20',
                            !isLowest && !isMe && 'bg-secondary/20 border-border'
                          )}
                        >
                          {isLowest && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-xl" />
                          )}

                          <div className={cn(
                            'w-7 h-7 rounded-md border flex items-center justify-center text-xs font-bold flex-shrink-0',
                            index === 0 ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                            : index === 1 ? 'bg-muted/50 border-border/30 text-foreground/80'
                            : index === 2 ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            : 'bg-secondary border-border text-muted-foreground'
                          )}>
                            {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                          </div>

                          <div className="flex-1 min-w-0 flex items-center gap-2.5">
                            <UserAvatar
                              name={rowName}
                              avatarUrl={rowAvatar}
                              size="sm"
                              gradient={isMe ? 'from-indigo-500 to-violet-600' : 'from-emerald-500 to-teal-600'}
                            />
                            <div className="min-w-0">
                              <p className={cn(
                                'truncate',
                                isMe ? 'text-sm font-semibold text-foreground' : 'text-sm font-medium text-foreground/90'
                              )}>
                                {isMe ? `You (${builderName})` : rowName}
                              </p>
                              <p className="text-[10px] text-muted-foreground/80">{formatRelativeTime(bid.created_at)}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={cn(
                              'text-sm font-bold tabular-nums',
                              isLowest ? 'text-emerald-400' : isMe ? 'text-indigo-300' : 'text-foreground'
                            )}>
                              {isPlumberFlat ? 'Rs. ' : '₹'}{displayBidAverage(bid)}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80">
                              {earthworkMode === 'hourly'
                                ? '/hour'
                                : earthworkMode === 'trip'
                                  ? (formatTripCapacityLabel(bid.rates?.vehicleCapacityCum) ?? '/trip')
                                  : isPlumbingPointRateBid
                                    ? 'estimated total'
                                  : isPlumbingBid
                                    ? 'overall avg'
                                  : isPlumberFlat
                                    ? 'Rs.'
                                    : isElectrician
                                      ? '/point'
                                      : isScopeRateBid && floorCount > 1
                                        ? '/sqft avg'
                                        : '/sqft avg'}
                            </p>
                            {isPlumbingPointRateBid && parsePlumbingRunningFootRate(bid.rates) != null && (
                              <p className="mt-1 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                ₹{parsePlumbingRunningFootRate(bid.rates)!.toLocaleString('en-IN')}/ft
                              </p>
                            )}
                          </div>

                          {(shouldShowBidFloorBreakdown(bid.rates, floorCount) ||
                            isPlumbingPointRateBid ||
                            (isTradeUnitRateBid && Object.keys(bid.rates?.unit_rates ?? {}).length > 0)) && (
                            <div className="w-full basis-full">
                              <BidFloorRatesBreakdown
                                rates={bid.rates}
                                floorLabels={isSingleRateBid && !isScopeRateBid ? undefined : floorLabels}
                                unitSuffix={isPlumbingPointRateBid ? '/point' : isPlumbingBid ? '/Rft' : '/sqft'}
                                unitSuffixes={isPlumbingBid ? plumbingRateUnits : undefined}
                                extraEntries={
                                  isPlumbingPointRateBid
                                    ? getPlumbingPointRateDisplayEntries(bid.rates, plumbingPointFloors)
                                    : isTradeUnitRateBid
                                    ? isInteriorBid
                                      ? getInteriorUnitRateDisplayEntries(bid.rates, interiorBidOptions)
                                      : isElectricianBid
                                        ? getElectricianUnitRateDisplayEntries(bid.rates, electricianBidOptions)
                                        : getPlumbingUnitRateDisplayEntries(bid.rates, plumbingBidOptions)
                                    : undefined
                                }
                                indexLabel={isPlumbingPointRateBid ? 'Estimated Total' : 'Weighted Index'}
                                indexValue={
                                  isPlumbingPointRateBid
                                    ? bid.total_sum_metric
                                    : isTradeUnitRateBid
                                      ? bid.rates?.weighted_index
                                      : undefined
                                }
                                runningFootRate={parsePlumbingRunningFootRate(bid.rates)}
                              />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {lowestBid && !bids.some((b) => b.builder_id === builderId) && (
                    <div className="pt-3 px-2">
                      <p className="text-xs text-muted-foreground">
                        💡 Current lowest: <strong className="text-emerald-400">{isPlumberFlat ? 'Rs. ' : '₹'}{displayBidAverage(lowestBid)}{rateUnitSuffix}</strong> — Beat it to lead.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
