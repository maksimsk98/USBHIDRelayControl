const mockIsocratMethod = {
  calibrationList: [{ name: null, type: null }, { name: 'FF', type: 'Абсолютная' }, { name: 'oijiuj9ju', type: 'Внутренний стандарт' }, { name: 'ujhuiyyh', type: 'Абсолютная' }, { name: 'Вит А, D и Е без гидр', type: 'Абсолютная' }, { name: 'лдьодль', type: 'Внутренняя нормализация' }, { name: 'рдрод', type: 'Абсолютная' }, { name: 'фыв', type: 'Абсолютная' }],
  chromaMiscData: {
    averaging: 1,
    thermostatTemp: 7,
  },
  detectorProgram: {
    lastStage: {
      component: 'Пока',
      from: 60,
      lambda: 230,
      to: 120,
    },
    stepsData: [
      {
        component: 'Консерванты',
        from: 0,
        lambda: 254,
        to: 40,
      },
      {
        component: 'Привет',
        from: 40,
        lambda: 270,
        to: 60,
      },
    ],
  },
  integration: {
    driftCompensation: false,
    maxScaling: 0.2,
    peakWindow: 0.5,
    smoothing: 1200,
  },
  options: {
    autoMark: true,
    autoSave: true,
    calibrationFolder: '%t\\Градуировки',
    folder: '%t',
    minimalTime: 2,
    name: '%y%m%d-%H%M_%s',
    saveBackground: true,
  },
  optionsSp: {
    autoSave: true,
    folder: '%t\\Спектры',
    name: 'Спектр_%c',
  },
  passport: {
    comment: 'Сорбиновая, бензойная кислоты в пище М 04-58-2009 (2014)\\\\С использованием ацетатного буферного раствора (pH 4.9)',
    diameter: 2.1,
    extendedName: 'fasfds',
    flow: 200,
    length: 120,
    particleSize: 5,
    precolumn: true,
    sampleName: 'консерванты в пище',
    sorbent: 'Диасфер C18',
    thermostatTemp: 25,
    volume: 20,
  },
  pumpProgramData: {
    isocratProgram: {
      isAutoFill: false,
      conditioningTime: 7,
      fillFlowRate: 7,
      flowRate: 7,
      restart: true,
      startFlowRate: 7,
      startPressure: 7,
      thermostatTemp: 7,
    },
    pumpMode: 'isocrat',
  },
  template: {
    instrument: 'SPhD',
  },
  type: 'chroma',
};

module.exports = {
  mockIsocratMethod,
};
