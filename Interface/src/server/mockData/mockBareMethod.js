const mockBareMethod = {
  calibrationList: [
    {
      name: null,
      type: null,
    },
  ],
  chromaMiscData: {
    averaging: 5,
    thermostatTemp: null,
  },
  detectorProgram: {
    stepsData: [
      {
        component: '',
        from: 0,
        lambda: 250,
        to: 600,
      },
    ],
  },
  instrument: 'SPhD',
  integration: {
    isSmoothingAdaptiveChecked: true,
    isSmoothingCubicChecked: false,
    isSmoothingDoubleChecked: false,
    isSmoothingPulseChecked: true,
    maxRelation: 0.15,
    searchWindow: 0.02,
    useDriftCompensation: false,
    useRelativeTimes: true,
  },
  operation: 'getTemplateByName',
  options: {
    autoMark: true,
    autoSave: true,
    calibrationFolder: '%t\\Градуировки',
    folder: '%t',
    minimalTime: 2,
    name: '%y%m%d_%H%M_%s',
    saveBackground: true,
  },
  optionsSp: {
    autoSave: true,
    folder: '%t\\Спектры',
    name: 'Спектр_%c',
  },
  passport: null,
  reportSectionChecks: {
    generalParams: {
      calibration: false,
      calibrationTable: false,
      chromatogram: false,
      chromatograph: false,
      column: false,
      comment: false,
      detector: false,
      detectorProgram: false,
      eluent: false,
      header: false,
      noiseLevel: false,
      peakTable: false,
      pumpProgram: false,
      pumps: false,
      sample: false,
      thermostat: false,
    },
    peakParams: {
      area: false,
      asymmetry: false,
      componentName: false,
      concentrationCalc: false,
      efficiency: false,
      exitTime: false,
      halfWidth: false,
      height: false,
      number: false,
      peakValley: false,
      relativeTime: false,
      resolution: false,
    },
  },
  spectroscopic: null,
  type: 'chroma',
};

module.exports = {
  mockIsocratMethod: mockBareMethod,
};
