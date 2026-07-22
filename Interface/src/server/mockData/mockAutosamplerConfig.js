const mockAutosamplerConfig = {
  operation: 'getAutosamplerProperties',
  autosamplerState: 'connected',
  isThermostatingSupported: true,
  numberRows: 2,
  numberSamplesInRow: 3,
  vialLabels: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  inputWashSolvents: ['PreW1', 'PreW2'],
  outputWashSolvents: ['PostW1', 'PostW2'],
  coolingReagents: ['C1', 'C2'],
};

module.exports = {
  mockAutosamplerConfig,
};
