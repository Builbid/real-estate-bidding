'use client';

import { useCallback } from 'react';
import { useTranslation } from '@/lib/context/LanguageProvider';
import type { ConstructionStage, FloorKey } from '@/lib/constructionMatrix';

export function useConstructionI18n() {
  const { t } = useTranslation();

  const stageLabel = useCallback(
    (stage: ConstructionStage, withEmoji = true) => {
      const label =
        stage === 'structural'
          ? t('construction.columnRoofOnly')
          : t('construction.fullStructureDone');
      if (!withEmoji) return label;
      return `${stage === 'structural' ? '🏗️' : '🏠'} ${label}`;
    },
    [t],
  );

  const floorLabel = useCallback(
    (floor: FloorKey) => {
      if (floor === 'ground') return t('construction.groundFloor');
      if (floor === 'first') return t('construction.firstFloor');
      return t('construction.secondFloor');
    },
    [t],
  );

  const floorDetailDescription = useCallback(
    (floor: FloorKey) => {
      if (floor === 'ground') return t('construction.groundFloorDetail');
      if (floor === 'first') return t('construction.firstFloorDetail');
      return t('construction.secondFloorDetail');
    },
    [t],
  );

  const formatFloorStageLine = useCallback(
    (floor: FloorKey, stage: ConstructionStage) =>
      `${floorLabel(floor)} → ${stageLabel(stage)}`,
    [floorLabel, stageLabel],
  );

  const formatMatrixSummary = useCallback(
    (floors: { floor: FloorKey; stage: ConstructionStage }[]) =>
      floors
        .map((f) => {
          const shortFloor = floorLabel(f.floor).replace(' Floor', '');
          const shortStage =
            f.stage === 'structural'
              ? t('construction.columnRoofOnly')
              : t('construction.fullStructureDone');
          return `${shortFloor}: ${shortStage}`;
        })
        .join(' · '),
    [floorLabel, t],
  );

  const getIncludedSteps = useCallback(
    (floor: FloorKey, stage: ConstructionStage) => {
      const steps: { label: string; included: boolean }[] = [];
      if (floor === 'ground') {
        steps.push({ label: t('construction.stepFoundation'), included: true });
      }
      steps.push(
        { label: t('construction.stepColumns'), included: true },
        { label: t('construction.stepBeams'), included: true },
        { label: t('construction.stepRoofSlab'), included: true },
        {
          label:
            stage === 'full'
              ? t('construction.stepBrickWalls')
              : t('construction.stepBrickWallsExcluded'),
          included: stage === 'full',
        },
        {
          label:
            stage === 'full'
              ? t('construction.stepPlastering')
              : t('construction.stepPlasteringExcluded'),
          included: stage === 'full',
        },
      );
      return steps;
    },
    [t],
  );

  const tierLabel = useCallback(
    (tier: 'ground' | 'g_plus_1' | 'g_plus_2') => {
      if (tier === 'ground') return t('construction.tierGround');
      if (tier === 'g_plus_1') return t('construction.tierG1');
      return t('construction.tierG2');
    },
    [t],
  );

  return {
    t,
    stageLabel,
    floorLabel,
    floorDetailDescription,
    formatFloorStageLine,
    formatMatrixSummary,
    getIncludedSteps,
    tierLabel,
  };
}
