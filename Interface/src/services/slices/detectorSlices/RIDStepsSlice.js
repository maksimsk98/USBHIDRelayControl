import { createStepProgramSlice } from "./createStepProgramSlice";

const LOG_STEPS_ON = false;
const logSteps = (...args) => {
  if (LOG_STEPS_ON) console.log("[internalSteps]", ...args);
};

// Class-based default measurement creator
class RidMeasurementCreator {
  constructor() {}

  createSteps() {
    return [
      {
        from: 0,
        to: 600,
        component: "",
      },
    ];
  }

  createParams() {
    // Keep empty object for canonical shape
    return {
        temperature: 36,
        temperatureTolerance: 5,
        polarity: true,
        sampleRate: 10,
        autoZero: true,
        waitForTemperature: false
    };
  }

  createFull() {
    return {
      steps: this.createSteps(),
      params: this.createParams(),
      isRedacting: false,
      focusedStep: 0,
      activeStep: null,
    };
  }
}

export const ridMeasurementCreator = new RidMeasurementCreator();

const ridSlice = createStepProgramSlice({
  name: "ridSteps",
  helpers: {
    log: logSteps,
    defaultMeasurementCreator: ridMeasurementCreator,
  },
});

export default ridSlice.reducer;
export const ridActions = ridSlice.actions;