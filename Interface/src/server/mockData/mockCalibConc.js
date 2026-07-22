const MOCK_CALIB_CONC = {
  operation: 'getCalibrationStandard',

  // может отсутствовать / null
  standardName: 'fasd',

  // может отсутствовать / null
  concentration: 1,

  // может отсутствовать / null
  concentrationUnits: 'ffdsgf',

  // NEW readonly
  response: 'height', // или 'width'
  calibrationType: 'asd',
};

module.exports = MOCK_CALIB_CONC;
