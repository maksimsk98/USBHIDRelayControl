// src/constants/stepFields.js
import _ from 'lodash';
import { DETECTOR_LAMBDA_RANGES, DETECTOR_TYPES, LUMEX_DETECTOR_TYPES } from './constants';
import { toOptions } from '../utils/uiConverters';

// Common fields for all detector types
export const COMMON_FIELDS = [
  { name: 'stepId', label: 'Этап' },
  { name: 'from', label: 'От' },
  { name: 'to', label: 'До' },
  { name: 'component', label: 'Компонент' },
];

// Detector-specific fields
const DETECTOR_FIELDS = {
  [DETECTOR_TYPES.SPHDETECTOR2]: [
    { name: 'lambda', label: 'λ погл.' },
  ],
  [DETECTOR_TYPES.PANORAMA2]: [
    { name: 'lambdaEx', label: 'λ возб.' },
    { name: 'lambdaReg', label: 'λ рег.' },
    { name: 'sensitivity', label: 'Чувств. ФЭУ' },
  ],
  [DETECTOR_TYPES.FLUORAT]: [
    { name: 'excitFilter', label: 'Ф. возб.' },
    { name: 'regFilter', label: 'Ф. рег.' },
    { name: 'sensitivity', label: 'Чувств. ФЭУ' },
  ],
  [DETECTOR_TYPES.RID]: [
    { name: 'temperature', label: 'Температура, °C' },
    { name: 'polarity', label: 'Полярность' },
    { name: 'sampleRate', label: 'Частота сэмплирования' },
    { name: 'autoZero', label: 'AutoZero' },
  ],
};

// Panorama and SPHDETECTOR reuse Panorama2/SPHDETECTOR2
DETECTOR_FIELDS[DETECTOR_TYPES.PANORAMA] = _.cloneDeep(DETECTOR_FIELDS[DETECTOR_TYPES.PANORAMA2]);
DETECTOR_FIELDS[DETECTOR_TYPES.SPHDETECTOR] = _.cloneDeep(DETECTOR_FIELDS[DETECTOR_TYPES.SPHDETECTOR2]);

// src/constants/sensitivityOptions.js

export const SENSITIVITY_OPTIONS = [
  { value: 'ultraLow', label: 'Сверхнизкая' },
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
  { value: 'ultraHigh', label: 'Сверхвысокая' },
];

export const CORRECTION_MAP = {
  full: 'Полная',
  transmittance: 'По пропусканию',
  reference: 'По опорному',
  off: 'Выключена',
};

export const SENSITIVITY_OPTIONS_PER_DET = {
  PANORAMA: SENSITIVITY_OPTIONS.slice(0, 4), // only 4 levels
  PANORAMA2: SENSITIVITY_OPTIONS.slice(0, 4), // same as PANORAMA
  FLUORAT: SENSITIVITY_OPTIONS, // all 5 levels
};

// AHTUNG! always remember that html select converts evrything to str, covnersion necessary or you'll get 'true'/'false' and 'false' is truthy
export const BOOL_OPTIONS = [
  { value: true, label: 'Да' },
  { value: false, label: 'Нет' },  
];

export const POLARITY_OPTIONS = [
  { value: true, label: '➕' },
  { value: false, label: '➖' },
];

// Fast lookup object for report rendering
export const SENSITIVITY_LABELS = SENSITIVITY_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {});

export { DETECTOR_FIELDS };

export const SPHDETECTOR_SPECTRO_RANGES = {
  from: [undefined, 190, 360],
  to: [undefined, 190, 360],
};

export const SPECTRO_RANGES_MAP = {
  [DETECTOR_TYPES.PANORAMA]: {
    from: [undefined, 210, 670],
    to: [undefined, 210, 670],
    fixedWaveLength: [undefined, 210, 670],
  },
  [DETECTOR_TYPES.PANORAMA2]: {
    from: [undefined, 190, 670],
    to: [undefined, 190, 670],
    fixedWaveLength: [undefined, 190, 670],
  },
  [DETECTOR_TYPES.SPHDETECTOR2]: SPHDETECTOR_SPECTRO_RANGES,
};

// Panorama and SPHDETECTOR reuse Panorama2/SPHDETECTOR2
SPECTRO_RANGES_MAP[DETECTOR_TYPES.PANORAMA] = _.cloneDeep(SPECTRO_RANGES_MAP[DETECTOR_TYPES.PANORAMA2]);
SPECTRO_RANGES_MAP[DETECTOR_TYPES.SPHDETECTOR] = _.cloneDeep(SPECTRO_RANGES_MAP[DETECTOR_TYPES.SPHDETECTOR2]);

export const SPECTRO_SCANNING_OPTIONS = [
  { value: 'exitation', label: 'по возбуждению' },
  { value: 'registration', label: 'по регистрации' },
  { value: 'sync', label: 'синхронное' },
];

export const SPECTRO_FIX_RANGES_MAP = {
  exitation: { mode: 'normal' },
  registration: { mode: 'normal' },
  sync: { mode: 'sync' },
};

export const RID_RANGES = {
  temperature: [undefined, 30, 50], // nullable , if null == off
  sampleRate: [undefined, 0.5, 20],
  temperatureTolerance: [undefined, 1, 5], // IDK just guessing hope VS fixes it if push comes to shove (Hi V 👋)
}

export const DAD_RANGES = {
  sample_wl: [undefined, 190, 820],
  sample_bw: [undefined, 4, 20],
  reference_wl: [undefined, 230, 800],
  reference_bw: [undefined, 4, 80],
}

export const RID_RANGES_FOR_PROG = {
  temperature: [30, 50],
  sampleRate: [0.5, 20],
  temperatureTolerance: [1, 5],
}

export const DAD_RANGES_FOR_PROG = {
  sample_wl: [190, 820],
  sample_bw: [4, 20],
  reference_wl: [230, 800],
  reference_bw: [4, 80],
}

export const RID_SAMPLE_RATE_OPTS = [
  { value: 0.5, label: '0.5' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
]

export const DAD_SAMPLE_RATE_VALUES = Object.freeze([1, 2, 5, 10, 20, 50, 100])
export const DAD_SAMPLE_RATE_OPTS = Object.freeze(toOptions(DAD_SAMPLE_RATE_VALUES))

export const DAD_TIME_CONSTANT_VALUES =  Object.freeze([10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000])
export const DAD_TIME_CONSTANT_OPTS = Object.freeze(toOptions(DAD_TIME_CONSTANT_VALUES))


export const RANGES_PER_DETECTOR = {
  [DETECTOR_TYPES.RID]: RID_RANGES_FOR_PROG,
  [DETECTOR_TYPES.DAD]: DAD_RANGES_FOR_PROG,
  ...Object.fromEntries(LUMEX_DETECTOR_TYPES.map(detectorType => [detectorType, DETECTOR_LAMBDA_RANGES]))
}
