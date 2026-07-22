const mockDADMethod = {
  calibrationList: [{ name: null, type: null }, { name: 'FF', type: 'Абсолютная' }, { name: 'oijiuj9ju', type: 'Внутренний стандарт' }, { name: 'ujhuiyyh', type: 'Абсолютная' }, { name: 'Вит А, D и Е без гидр', type: 'Абсолютная' }, { name: 'лдьодль', type: 'Внутренняя нормализация' }, { name: 'рдрод', type: 'Абсолютная' }, { name: 'фыв', type: 'Абсолютная' }],
  chromaMiscData: {
    averaging: 1,
    thermostatTemp: 7,
  },
  detectorProgram: {

    stepsData:  [
      {
        from: 0,
        to: 6,
        component: "A",
        sample_wl	:	250,
        sample_bw	:	10,
        sample_rate	:	20,
        time_constant	:	10,
      },
      {
        from: 6,
        to: 12,
        component: "B",
        sample_wl	:	252,
        sample_bw	:	12,
        sample_rate	:	20,
        time_constant	:	10,
      }
    ],
  },
  params: {
    "autoZero": true,
    "channels": {
        "A": {
            "sample_wl": 248,
            "sample_bw": 8,
            "reference_wl": 440,
            "reference_bw": 50,
            "reference_use": true
        },
        "B": {
            "sample_wl": 249,
            "sample_bw": 9,
            "reference_wl": 440,
            "reference_bw": 50,
            "reference_use": false
        },
        "C": {
            "sample_wl": 250,
            "sample_bw": 10,
            "reference_wl": 440,
            "reference_bw": 50,
            "reference_use": false
        },
        "D": {
            "sample_wl": 251,
            "sample_bw": 11,
            "reference_wl": 440,
            "reference_bw": 50,
            "reference_use": true
        },
        "E": {
            "sample_wl": 252,
            "sample_bw": 12,
            "reference_wl": 444,
            "reference_bw": 55,
            "reference_use": true
        },
        "F": {
            "sample_wl": 253,
            "sample_bw": 8,
            "reference_wl": 443,
            "reference_bw": 51,
            "reference_use": true
        },
        "G": {
            "sample_wl": 254,
            "sample_bw": 8,
            "reference_wl": 442,
            "reference_bw": 52,
            "reference_use": true
        },
        "H": {
            "sample_wl": 255,
            "sample_bw": 8,
            "reference_wl": 441,
            "reference_bw": 50,
            "reference_use": true
        }
    }
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
  mockDADMethod,
};
