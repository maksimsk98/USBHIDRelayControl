import { DETECTOR_TYPES } from '../constants/constants';
import { SPECTRO_FIX_RANGES_MAP, SPECTRO_RANGES_MAP } from '../constants/stepFields';
import { normalizeInstrument } from './nodes';

export function getEffectiveRanges({
  detectorType,
  scanningType,
  row, // {from, to, fixedWaveLength}
  name,
}) {
  const base = SPECTRO_RANGES_MAP[detectorType] ?? {};
  const mode = SPECTRO_FIX_RANGES_MAP[scanningType]?.mode ?? 'normal';

  if (mode === 'normal') {
    return base;
  }

  if (mode === 'sync' && (detectorType === DETECTOR_TYPES.PANORAMA || detectorType === DETECTOR_TYPES.PANORAMA2)) {
    const baseFrom = base.from; // [undef, minF, maxF]
    const baseTo = base.to; // [undef, minT, maxT]
    const baseFix = base.fixedWaveLength; // [undef, minFx, maxFx] (or undefined)

    const from = Number(row.from ?? baseFrom?.[1]);
    const to = Number(row.to ?? baseTo?.[1]);
    const fixed = Number(row.fixedWaveLength ?? baseFix?.[1]);

    if (name === 'fixedWaveLength') {
      const fixFromClamp = baseFrom[2] - from;
      const fixToClamp = baseTo[2] - to;

      const syncFixMin = 0; // it is derivative so doesn't take detector values
      const calcMax = Math.min(fixFromClamp, fixToClamp);

      return {
        from: base.from,
        to: base.to,
        fixedWaveLength: [undefined, syncFixMin, calcMax],
      };
    } if (name === 'to' || name === 'from') {
      const fromMin = baseFrom[1];
      const toMin = baseTo[1];

      const fromMax = baseFrom[2] - fixed;
      const toMax = baseTo[2] - fixed;

      return {
        from: [base.from[0], fromMin, fromMax],
        to: [base.to[0], toMin, toMax],
        fixedWaveLength: baseFix,
      };
    }
  }

  return base;
}

export function getCorrectAveragingKey(instrumentRaw) {
  const instrument = normalizeInstrument(instrumentRaw);

  if (instrument === 'Panorama' || instrument === 'Panorama2') return 'averagingFlashes';

  if (instrument === 'SPhDetector' || instrument === 'SPhDetector2') return 'averagingTime';

  return null;
}
