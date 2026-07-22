const mockAutosamplerState = {
  operation: 'fetchAutosamplerState',
  autosamplerState: 'connected',
  currentAutosamplerMode: 'none',
  autosamplerProgram: {
    activeStep: 1,
    currentInjection: 1,
  },
  autosamplerThermostat: {
    isThermostatOn: true,
    targetTemp: 10,
    currentTemp: 8,
  },
};

module.exports = {
  mockAutosamplerState,
};
