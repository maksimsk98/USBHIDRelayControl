const mockGradientMethod = {
  chromaMiscData: {
    averaging: 1,
  },
  detectorProgram: {
    lastStage: {
      component: '2',
      from: 10,
      lambda: 3,
      to: 1,
    },
    stepsData: [
      {
        component: '',
        from: 0,
        lambda: 250,
        to: 10,
      },
    ],
  },
  integration: {
    driftCompensation: false,
    maxScaling: 0.15,
    peakWindow: 0.02,
    smoothing: 1100,
  },
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
    autoSave: false,
    folder: '%t\\Спектры',
    name: 'Спектр_%c',
  },
  passport: {
    column: 'bbb',
    comment: 'asdasd',
    diameter: 1,
    dilution: '1',
    extendedName: 'bbb',
    flow: 3,
    length: 1,
    particleSize: 1,
    pressure: '2',
    sampleName: 'aaa',
    sorbent: 'aaa',
    thermostatTemp: 20,
    volume: 3,
  },
  pumpProgramData: {
    gradientProgram: {
      autoFill: true,
      conditioningTime: 2,
      eluentA: 'Вода',
      eluentB: 'Ацетонитрил',
      fillFlowRate: 1,
      flowRate: 3,
      restart: true,
      startFlowRate: 2000,
      startPressure: 2,
      startVolume: 30000,
      stepsData: [
        {
          A_H: 4,
          A_K: 5,
          B_H: 96,
          B_K: 95,
          flowRate: 3,
          from: 0,
          to: 2,
        },
        {
          A_H: 7,
          A_K: 8,
          B_H: 93,
          B_K: 92,
          flowRate: 3,
          from: 2,
          to: 6,
        },
      ],
      switchingTime: 2,
      workingVolume: 10000,
    },
    pumpMode: 'gradient',
  },
  template: {
    instrument: 'SPhD',
  },
  type: 'chroma',
};

module.exports = {
  mockGradientMethod,
};
