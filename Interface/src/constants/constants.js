// Full dossier with metadata
export const UTILITY_TABS = Object.freeze({
  ISOCRAT: Object.freeze({
    id: 'isocrat',
    blockOnNoControl: true,
  }),
  GRADIENT: Object.freeze({
    id: 'gradient',
    blockOnNoControl: true,
  }),
  THERMOSTAT: Object.freeze({
    id: 'thermostat',
    blockOnNoControl: true,
  }),
  DEGASSER: Object.freeze({
    id: 'degasser',
    blockOnNoControl: true,
  }),
});

export const UTILITY_TABS_MAP = Object.freeze(
  Object.keys(UTILITY_TABS).reduce((acc, key) => {
    acc[key] = UTILITY_TABS[key].id;
    return acc;
  }, {}),
);

export const UTILITY_GROUP_NAMES = Object.freeze(
  Object.values(UTILITY_TABS).map((tab) => tab.id),
);

// Tabs that should close when control is missing
export const BLOCKED_TABS_ON_WITHOUT_CONTROL = Object.freeze(
  Object.values(UTILITY_TABS)
    .filter((tab) => tab.blockOnNoControl)
    .map((tab) => tab.id),
);

export const CLOSING_MODALS_MESSAGES = {
  CLOSE_CONFIRM_TITLE: 'Подтверждение закрытия',
  CLOSE_CONFIRM_BODY: 'Измерение в процессе, Вы уверены что хотите его закрыть? Все несохраненные данные будут утеряны.',
  SAVE_CONFIRM_TITLE: 'Подтверждение сохранения изменений',
  SAVE_CONFIRM_BODY: 'Существуют несохраненные изменения. Сохранить изменения?',
  CLOSE_PRIMARY_LABEL: 'Закрыть',
  CLOSE_SECONDARY_LABEL: 'Назад',
  SAVE_PRIMARY_LABEL: 'Да',
  SAVE_SECONDARY_LABEL: 'Нет',
};

export const DEFAULT_POINTS = { x: [], y: [] };

export const MEASUREMENT_STATUSES = {
  INACTIVE: 'idle',
  AWAITING_BACKEND: 'awaitnigBackend',
  PRESTART: 'readyStart',
  PREPARE_PUMP: 'preparePump',
  PREPARE_THERMO: 'prepareThermo',
  INITIALIZED_WAIT: 'initializedWait',
  MEASUREMENT_RUNNING: 'measurementRunning',
  MEASUREMENT_FINISHED: 'finished',
};

export const STREAMING_STATUSES = [
  MEASUREMENT_STATUSES.AWAITING_BACKEND,
  MEASUREMENT_STATUSES.PRESTART,
  MEASUREMENT_STATUSES.PREPARE_PUMP,
  MEASUREMENT_STATUSES.PREPARE_THERMO,
  MEASUREMENT_STATUSES.INITIALIZED_WAIT,
  MEASUREMENT_STATUSES.MEASUREMENT_RUNNING,
];

export const PREPARATION_STATUSES = [
  MEASUREMENT_STATUSES.AWAITING_BACKEND,
  MEASUREMENT_STATUSES.PRESTART,
  MEASUREMENT_STATUSES.PREPARE_PUMP,
  MEASUREMENT_STATUSES.PREPARE_THERMO,
];

export const INITIALIZED_STATUSES = [
  MEASUREMENT_STATUSES.AWAITING_BACKEND,
  MEASUREMENT_STATUSES.PRESTART,
  MEASUREMENT_STATUSES.PREPARE_PUMP,
  MEASUREMENT_STATUSES.PREPARE_THERMO,
  MEASUREMENT_STATUSES.INITIALIZED_WAIT,
  MEASUREMENT_STATUSES.MEASUREMENT_RUNNING,
  MEASUREMENT_STATUSES.MEASUREMENT_FINISHED,
];

// Matches up to 3 digits followed by up to 3 more segments like .123
// Doesn't allow starting with a dot or double dots
export const PARTIAL_IP_REGEX = /^(?!\.)(\d{0,3}(\.\d{0,3}){0,3})?$/;

// IPv4: 0.0.0.0 to 255.255.255.255
export const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

// IPv6: supports full and compressed formats (not strict RFC 5952)
export const IPV6_REGEX = /^(([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(([a-fA-F0-9]{1,4}:){1,7}:)|(:{2}([a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4})|(::))$/;

export const TOAST_MESSAGES = {
  AWAITING_BACKEND: {
    HEADER: 'Ожидание',
    BODY: 'Ожидаем отклик на старт модуля приборов',
  },
  PRESTART: {
    HEADER: 'Подготовка старта измерений',
    BODY: 'Для старта измерений поверните кран-дозатор',
  },
  PREPARE_PUMP: {
    HEADER: 'Подготовка насосов',
    BODY: 'Подготовка насосов к работе',
  },
  PREPARE_THERMO: {
    HEADER: 'Подготовка термостата',
    BODY: 'Подготовка термостата к работе',
  },
  BACKEND_OFFLINE: {
    HEADER: 'Backend приборов не отвечает',
    BODY: 'Backend приборов не отвечает',
  },
  AUTO_PRESTART: {
    HEADER: 'Автосамплер работает',
    BODY: 'Происходит инжекция',
  },
  MEASUREMENT_FINISHED: {
    HEADER: 'Измерение завершено',
    BODY: 'Измерение завершено',
  },
};

export const NODE_STATUSES = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'notConnected',
  NOT_RESPONSIVE: 'notResponsive',
  BUSY: 'busy',
  IS_WORKING: 'isWorking',
};

export const PUMP_STATE_MESSAGES = {
  FillAirInCamera: 'В камере воздух',
  FillFinished: 'Набор завершен',
  DischargeFinished: 'Слив завершен',
  PressureRelease: 'Сброс давления',
  PressureIncrease: 'Набор давления',
  Wait: 'Ожидание',
  Work: 'Подача',
  Fill: 'Набор',
  FillWait: 'Набор (ожидание)',
  FillWork: 'Набор (подготовка)',
  Discharge: 'Слив',
  GradientStart: 'Разгон',
  GradientConditioning: 'Кондиционирование',
  GradientWait: 'Ожидание',
  GradientStage: 'Этап',
  NotConnected: 'Нет связи с насосом',
};

export const PUMP_MODES = {
  ISOCRAT: 'isocrat',
  GRADIENT: 'gradient',
};

export const PUMP_MODES_LIST = Object.values(PUMP_MODES);

export const DEGASSER_STATES = Object.freeze({
  WORK: 'work',
  WAIT: 'wait',
  ALARM: 'alarm',
  NOT_CONNECTED: 'notConnected',
});

export const CONTROLABLE_DEGASSER_STATES = [DEGASSER_STATES.WORK, DEGASSER_STATES.WAIT];

export const DEGASSER_STATE_MESSAGES = {
  [DEGASSER_STATES.WORK]: 'В работе',
  [DEGASSER_STATES.WAIT]: 'В ожидании команд',
  [DEGASSER_STATES.ALARM]: 'Ошибка',
  [DEGASSER_STATES.NOT_CONNECTED]: 'Нет связи',
};

export const AUTOSAMPLER_MODES = Object.freeze({
  NONE: 'none',
  AUTOSAMPLER_PROGRAM: 'autosamplerProgram',
  SINGLE_INJECTION: 'singleInjection',
  WASH: 'wash',
});

export const AUTOSAMPLER_STATES = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'notConnected',
  WORKING: 'isWorking',
  BUSY: 'busy',
};

export const AUTOSAMPLER_CONNECTED_STATES = [
  AUTOSAMPLER_STATES.CONNECTED,
  AUTOSAMPLER_STATES.WORKING,
  AUTOSAMPLER_STATES.BUSY,
];

export const AUTOSAMPLER_AVAILABLE_STATES = [
  AUTOSAMPLER_STATES.CONNECTED,
  AUTOSAMPLER_STATES.WORKING,
];

export const AUTO_WASH_VOLUME_MAP = {
  las: [1, 30],
  hta: [1, 100],
};

export const BUTTON_TO_FINISH_MAP = {
  fill: 'FillFinished',
  drain: 'DischargeFinished',
};

export const PUMP_FINISHED_STATES = [
  'FillFinished',
  'DischargeFinished',
];

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

export const NOT_GENERAL_METHOD = Symbol('NOT_GENERAL_METHOD');
export const NOT_GENERAL_CALIBRATION = Symbol('NOT_GENERAL_CALIBRATION');

export const DETECTOR_TYPES = {
  PANORAMA: 'Panorama',
  PANORAMA2: 'Panorama2',
  SPHDETECTOR: 'SPhDetector',
  SPHDETECTOR2: 'SPhDetector2',
  FLUORAT: 'Fluorat',
  DAD: 'DAD',
  RID: 'RID',
};

export const LUMEX_DETECTOR_TYPES = [
  DETECTOR_TYPES.PANORAMA,
  DETECTOR_TYPES.PANORAMA2,
  DETECTOR_TYPES.SPHDETECTOR,
  DETECTOR_TYPES.SPHDETECTOR2,
  DETECTOR_TYPES.FLUORAT
];

export const EXTERNAL_DETECTOR_TYPES = [
  DETECTOR_TYPES.DAD,
  DETECTOR_TYPES.RID
];

export const DETECTOR_FULL_NAMES = {
  [DETECTOR_TYPES.PANORAMA]: 'СФЛД 2310 Панорама',
  [DETECTOR_TYPES.PANORAMA2]: 'СФЛД 320',
  [DETECTOR_TYPES.SPHDETECTOR]: 'СФД 3220',
  [DETECTOR_TYPES.SPHDETECTOR2]: 'СФД 310',
  [DETECTOR_TYPES.FLUORAT]: 'ФЛД 2420 Флюорат-02-4М',
  [DETECTOR_TYPES.RID]: 'Рефрактометрический RID RI-201H',
  [DETECTOR_TYPES.DAD]: 'Диодоматричный Ex1800 DAD',
};

export const CONFIRM_MESSAGES = {
  EMPTY_COMPONENTS: 'Пустые компоненты не заносятся в градуировку. Продолжить?',
  STOP_PUMPS: 'Остановить насосы?',
};

// has to keep camel to confirm with api
export const SENSITIVITY_MAP = {
  ultraLow: 'Сверхнизкая',
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  ultraHigh: 'Сверхвысокая',
};

export const TAB_TYPES = {
  NONE: 'none', // no tab selected
  MEASUREMENT: 'measurement',
  FILE: 'file',
  CALIBRATION: 'calibration',
  PACKAGE: 'package',
  UNKNOWN: 'unknown', // tab exists but type unrecognized
};

export const MEASUREMENT_TYPES = {
  chroma: 'chroma',
  spectro: 'spectro',
  unknown: 'unknown',
};

export const MEASUREMENT_TYPES_TITLES = {
  [MEASUREMENT_TYPES.chroma]: 'Хроматограмма',
  [MEASUREMENT_TYPES.spectro]: 'Спектрограмма',
};

export const FILE_TYPES = {
  ...MEASUREMENT_TYPES,
  package: 'package',
  unsupported: 'unsupported',
};

export const TAB_TYPES_FOR_MEAS = {
  [MEASUREMENT_TYPES.chroma]: [TAB_TYPES.FILE, TAB_TYPES.MEASUREMENT],
  [MEASUREMENT_TYPES.spectro]: [TAB_TYPES.FILE, TAB_TYPES.MEASUREMENT],
};

export const allowedTabsFor = (measurementType) => TAB_TYPES_FOR_MEAS[measurementType] ?? [];
export const isTabAllowedFor = (measurementType, tabType) => allowedTabsFor(measurementType).includes(tabType);

export const DETECTOR_LAMBDA_RANGES = {
  lambda: [190, 360],
  lambdaEx: [190, 670],
  lambdaReg: [190, 670],
};

export const DEFAULT_EXPECTED_PLOTS = [
  'measuredChromatogram',
  'backgroundChromatogram',
  'calculatedChromatogram',
  'signalPhoto',
  'signalRef',
  'flowRateA1Points',
  'flowRateA2Points',
  'flowRateB1Points',
  'flowRateB2Points',
  'pressureA1Points',
  'pressureA2Points',
  'pressureB1Points',
  'pressureB2Points',
  'columnTemp',
  'roomTemp',
];

export const PACKAGE_EXPECTED_PLOTS = [
  'calculatedChromatogram',
];

export const WARNINGS = {
  detectorMismatch: 'detectorMismatch',
};
export const PEAK_WORK_MODES = {
  ADD: 'add',
  DELETE: 'delete',
  DELETE_ALL: 'deleteAll',
};

export const DETECTOR_PLOTS = [
  'measuredChromatogram',
  'signalPhoto',
  'signalRef',
];

export const DETECTOR_Y_LABELS = {
  [DETECTOR_TYPES.PANORAMA]: 'Сигнал (отн. ед.)',
  [DETECTOR_TYPES.PANORAMA2]: 'Сигнал (отн. ед.)',
  [DETECTOR_TYPES.SPHDETECTOR]: 'Оптическая<br> плотность (mAU)',
  [DETECTOR_TYPES.SPHDETECTOR2]: 'Оптическая<br> плотность (mAU)',
  [DETECTOR_TYPES.FLUORAT]: 'Сигнал (отн. ед.)',
  [DETECTOR_TYPES.RID]: 'Показатель<br> преломления (nRIU)',
};

export const DETECTOR_UNITS = {
  [DETECTOR_TYPES.PANORAMA]: 'отн. ед.',
  [DETECTOR_TYPES.PANORAMA2]: 'отн. ед.',
  [DETECTOR_TYPES.SPHDETECTOR]: 'mAU',
  [DETECTOR_TYPES.SPHDETECTOR2]: 'mAU',
  [DETECTOR_TYPES.FLUORAT]: 'отн. ед.',
  [DETECTOR_TYPES.RID]: 'nRIU',
};

export const DEFAULT_Y_LABEL = DETECTOR_Y_LABELS[DETECTOR_TYPES.SPHDETECTOR];

export const UI_ONLY_SIGNAL_PARAMS = [
  'standardDeviationInterval',
  'standardDeviationUnit',
  'isSquishableInterval',
  'customUserDeviationInterval',
];

export const CUSTOM_DEVIATION_INTERVALS_MAP = {
  customUser: 'Указать',
  captureInterval: 'Захват',
};

export const STANDART_DEVIATION_INTERVALS = [
  1, 2, 3, 4, 5, 10, 30,
];

export const SQUISHABLE_INTERVAL_VALUES = [
  ...STANDART_DEVIATION_INTERVALS, CUSTOM_DEVIATION_INTERVALS_MAP.customUser,
];

export const PUMP_RANGES = {
  fillVolume: [0, 35000],
  drainVolume: [0, 35000],
  supplyFlowRate: [0, 2000],
  supplyStartFlowRate: [0, 2000],
  supplyStartPressure: [0, 100000],
  maxPressureWork: [0, 62],
  minPressureWork: [0, 62],
  maxPressureDischarge: [0, 62],
  releasingFlowRate: [0, 2000],
  startVolume: [0, 99999], // wasn't told default to max number for 5 digits
  isocratVolume: [0, 99999], // wasn't told default to max number for 5 digits
  gradientVolume: [0, 99999], // wasn't told default to max number for 5 digits
};

export const PUMP_PRESSURE_RANGES_MAP = {
  'H 360': [0, 35],
  'H 330': [0, 62],
};

export const CALIB_TYPES = {
  inNorm: 'Внутренняя нормализация',
  inStandart: 'Внутренний стандарт',
  abs: 'Абсолютная',
};

export const detectorPortMap = {
  [DETECTOR_TYPES.SPHDETECTOR]: 'com1',
  [DETECTOR_TYPES.PANORAMA]: 'com1',
  [DETECTOR_TYPES.SPHDETECTOR2]: 'usb',
  [DETECTOR_TYPES.PANORAMA2]: 'usb',
  [DETECTOR_TYPES.FLUORAT]: 'com',
  [DETECTOR_TYPES.DAD]: 'com',
  [DETECTOR_TYPES.RID]: 'com',
};

export const FALLBACK_WITHOUT_CONTROL = false;

export const WITHOUT_CONTROL_MAP = new Proxy({
  [DETECTOR_TYPES.SPHDETECTOR]: true,
  [DETECTOR_TYPES.PANORAMA]: true,
  [DETECTOR_TYPES.SPHDETECTOR2]: false,
  [DETECTOR_TYPES.PANORAMA2]: false,
  [DETECTOR_TYPES.FLUORAT]: true,
  [DETECTOR_TYPES.RID]: true,
}, {
  get: (target, prop) => {
    // If the property exists in the object, return it
    if (prop in target) {
      return target[prop];
    }
    // Otherwise return the fallback value
    return FALLBACK_WITHOUT_CONTROL;
  }
});

export const pumpNamesPerNum = {
  1: ['A1'],
  2: ['A1', 'B1'],
  4: ['A1', 'A2', 'B1', 'B2'],
};

export const detectorTypeOptions = [
  { value: DETECTOR_TYPES.SPHDETECTOR, label: 'Спектрофотометрический (СФД 3220)' },
  { value: DETECTOR_TYPES.PANORAMA, label: 'Спектрофлуориметрический (СФЛД 2310 Панорама)' },
  { value: DETECTOR_TYPES.SPHDETECTOR2, label: 'Спектрофотометрический (СФД 310)' },
  { value: DETECTOR_TYPES.PANORAMA2, label: 'Спектрофлуориметрический (СФЛД 320)' },
  { value: DETECTOR_TYPES.FLUORAT, label: 'Флуориметрический (ФЛД 2420 Флюорат-02-4М)' },
  { value: DETECTOR_TYPES.DAD, label: 'Диодоматречный (Ex 1800 DAD)' },
  { value: DETECTOR_TYPES.RID, label: 'Рефрактометрический (RI-201H)' },
];

export const CALIB_ERROR_MESSAGES = {
  emptyName: 'Название не может быть пустым.',
  invalidConcentration: (
    <>
      Необходимо задать концентрацию
      <br />
      компонента больше 0
    </>
  ),
  duplicateComponent: 'Имена компонентов должны быть уникальны.',
};

export const INVALID_FORMAT = Symbol('invalidFormat');

export const EARLY_RETURN = Symbol('earlyReturn');

export const VALID_EXTENSIONS = ['.mdfx'];

export const FILE_ID_CATEGORIES = {
  OPENED: 'opened',
  PACKAGE: 'package',
  PREVIEW: 'preview', // has references as package category to where they are used, but not part of final product on save
};

export const PURE_GET_CATEGORIES = [FILE_ID_CATEGORIES.PACKAGE, FILE_ID_CATEGORIES.PREVIEW];

export const INDEXING_CATEGORIES = [...PURE_GET_CATEGORIES];

export const OPEN_STATES = {
  QUEUE: 'queue',
  OPENED: 'opened',
  CLOSED: 'closed',
};

export const TAB_TYPES_WITH_BOUND_M_C = [
  TAB_TYPES.CALIBRATION, TAB_TYPES.FILE, TAB_TYPES.MEASUREMENT,
];

export const PLOTLY_COLOR_MAP = {
  blue: '#1f77b4',
  orange: '#ff7f0e',
  green: '#2ca02c',
  red: '#d62728',
  purple: '#9467bd',
  brown: '#8c564b',
  pink: '#e377c2',
  gray: '#7f7f7f',
  olive: '#bcbd22',
  cyan: '#17becf',
};

export const PLOTLY_COLOR_ARR = Object.values(PLOTLY_COLOR_MAP);

export const LINE_DASHES = {
  solid: 'solid',
  dot: 'dot',
  dash: 'dash',
  longdash: 'longdash',
  dashdot: 'dashdot',
  longdashdot: 'longdashdot',
};

export const LINE_STYLES = Object.entries(LINE_DASHES).flatMap(([dashName, dash]) => Object.entries(PLOTLY_COLOR_MAP).map(([colorName, color]) => ({
  color,
  dash,
  name: `${colorName}-${dashName}`, // Optional: helpful for legend/debug
})));

export const PERMISSIVE_DELETE_TYPES = [
  TAB_TYPES.CALIBRATION, TAB_TYPES.MEASUREMENT,
];

export const USE_PER_DETECTOR = false;

export const DETECTOR_TYPE_DASH_MAP = {
  [DETECTOR_TYPES.FLUORAT]: LINE_DASHES.solid,
  [DETECTOR_TYPES.SPHDETECTOR2]: LINE_DASHES.dot,
  [DETECTOR_TYPES.PANORAMA]: LINE_DASHES.dash,
  [DETECTOR_TYPES.PANORAMA2]: LINE_DASHES.longdash,
  [DETECTOR_TYPES.SPHDETECTOR]: LINE_DASHES.dashdot,
  // no assignment for longdashdot
  [DETECTOR_TYPES.RID]: LINE_DASHES.longdashdot,
};

export const INDX_BY_PACK_EDIT_MAP = {
  ADD: 'add',
  REMOVE: 'remove',
};

export const DASH_MAP = {
  solid: '', // (no dash array; use full border instead)
  dot: '2 4',
  dash: '6 4',
  longdash: '12 4',
  dashdot: '6 4 2 4',
  longdashdot: '12 4 2 4',
};

export const DEFAULT_DRAG_MODE = 'zoom';

export const CUSTOM_DRAGMODES = {
  PAN: 'customPan',
};

export const INVALID_MEAS_PARAMS = {
  NO_PUMPS_FOR_PUMP_PROG: 'noPumpForPumpProg',
  ONE_PUMP_ON_MANY_REQ: 'onePumpOnManyRequired',
  ONE_PUMP_ON_CONT_SUP: 'onePumpOnContSupply',
  NO_THERMO_FOR_THERMO_TEMP: 'noThermoHasThermoTemp',
  PUMP_COUNT_MISMATCH: 'pumpCountMismatch',
};

export const INVALID_MEAS_PARAMS_MESSAGES = {
  [INVALID_MEAS_PARAMS.NO_PUMPS_FOR_PUMP_PROG]: 'Нет подключенных насосов для использования',
  [INVALID_MEAS_PARAMS.ONE_PUMP_ON_MANY_REQ]: 'Градиентный режим требует больше одного насоса, подключен только один насос',
  [INVALID_MEAS_PARAMS.NO_THERMO_FOR_THERMO_TEMP]: 'Термостат не подключен, термостатирование недоступно',
  [INVALID_MEAS_PARAMS.PUMP_COUNT_MISMATCH]: 'Не все насосы выбраны, для указанного числа насосов',
  [INVALID_MEAS_PARAMS.ONE_PUMP_ON_CONT_SUP]: 'Непрерывная подача требует больше одного насоса, подключен только один насос',
};

export const INVALID_MEAS_PARAMS_FIX_MESSAGES = {
  [INVALID_MEAS_PARAMS.NO_PUMPS_FOR_PUMP_PROG]: 'Программа насосов не будет использоваться',
  [INVALID_MEAS_PARAMS.ONE_PUMP_ON_MANY_REQ]: 'Программа насосов не будет использоваться',
  [INVALID_MEAS_PARAMS.NO_THERMO_FOR_THERMO_TEMP]: 'Термостатирование не будет использоваться',
  [INVALID_MEAS_PARAMS.PUMP_COUNT_MISMATCH]: 'Программа насосов не будет использоваться',
  [INVALID_MEAS_PARAMS.ONE_PUMP_ON_CONT_SUP]: 'Непрерывная подача не будет использоваться',
};

export const FIXES = {
  DISABLE_PUMPS: 'disablePumps',
  DISABLE_THERMOSTAT_TEMP: 'disableThermostatTemp',
  DISABLE_CONT_SUP: 'disableContinuousSupply',
};

export const INVALID_MEAS_PARAMS_FIX = {
  [INVALID_MEAS_PARAMS.NO_PUMPS_FOR_PUMP_PROG]: FIXES.DISABLE_PUMPS,
  [INVALID_MEAS_PARAMS.ONE_PUMP_ON_MANY_REQ]: FIXES.DISABLE_PUMPS,
  [INVALID_MEAS_PARAMS.NO_THERMO_FOR_THERMO_TEMP]: FIXES.DISABLE_THERMOSTAT_TEMP,
  [INVALID_MEAS_PARAMS.PUMP_COUNT_MISMATCH]: FIXES.DISABLE_PUMPS,
  [INVALID_MEAS_PARAMS.ONE_PUMP_ON_CONT_SUP]: FIXES.DISABLE_CONT_SUP,
};

export const PLACEHOLDER_REGEX = /^Хроматографическое измерение \[(\d+)\]$/;

export const SERVICE_NODE_NAMES = ['noneChosen', 'noneAvailable'];

export const AUTOSAMPLER_TYPES = {
  none: 'none',
  hta: 'hta',
  las: 'las',
  as393: 'as393'
};

export const IP_AUTOSAMPLERS = [AUTOSAMPLER_TYPES.hta, AUTOSAMPLER_TYPES.las]

export const COM_AUTOSAMPLERS = [AUTOSAMPLER_TYPES.as393]

export const REAL_METHOD_KEYS = [
  'chromaMiscData',
  'detectorProgram',
  'params',
  'integration',
  'options',
  'optionsSp',
  'passport',
  'pumpProgramData',
  'spectroscopic',
  'instrument',
];

export const SPECTRO_MISC_WHITELIST = [
  'threshold',
  'factor',
  'hasSmoothing',
  'hasScaling',
];

export const COM_DETECTOR_TYPES = [
  DETECTOR_TYPES.PANORAMA,
  DETECTOR_TYPES.SPHDETECTOR,
  DETECTOR_TYPES.FLUORAT,
  DETECTOR_TYPES.RID,
];

export const DETECTOR_Y_AXIS_LABEL = new Proxy({
  [DETECTOR_TYPES.SPHDETECTOR]: 'Опт. плотность',
  [DETECTOR_TYPES.SPHDETECTOR2]: 'Опт. плотность',
  [DETECTOR_TYPES.RID]: 'nRIU',
  [DETECTOR_TYPES.PANORAMA]: 'Флуориметрия',
  [DETECTOR_TYPES.PANORAMA2]: 'Флуориметрия',
  [DETECTOR_TYPES.FLUORAT]: 'Флуориметрия',
}, {
  get(target, prop) {
    // Use hasOwnProperty to ignore prototype chain
    return Object.hasOwn(target, prop) ? target[prop] : 'Измеренный сигнал';
  }
});

export const BUTTON_VARIANT_PER_STATE = {
  active: 'success',      // green – active/on
  idle: 'outline-secondary', // grey outline – inactive/off
  working: 'primary',     // blue – in progress
  busy: 'warning',        // orange – busy, attention
  warn: 'danger',         // red – warning/error
  subtle: 'outline-light', // light outline – subtle action
  // Add more as needed
};