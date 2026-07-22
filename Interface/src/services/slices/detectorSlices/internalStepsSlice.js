import { original } from "@reduxjs/toolkit";
import { createGenericReducers, createStepProgramSlice } from "./createStepProgramSlice";

const LOG_STEPS_ON = true;
const logSteps = (...args) => {
  if (LOG_STEPS_ON) console.log("[internalSteps]", ...args);
};


class DefaultMeasurementCreator {
  constructor() {}

  createSteps() {
    return [{
      from: 0,
      to: 600,
      component: "",
      lambda: 250,
      lambdaEx: 270,
      lambdaReg: 300,
      excitFilter: "",
      regFilter: "",
      sensitivity: "ultraLow",
    }];
  }

  createAdditionalStep() {
    return {
      maxDuration: null,
      window: null,
      threshold: null,
    };
  }

  createParams() {
    return {};
  }

  createFull() {
    return {
      steps: this.createSteps(),
      additionalStep: this.createAdditionalStep(),
      params: this.createParams(),
      isRedacting: false,
      focusedStep: 0,
      activeStep: null,
    };
  }
}

const defaultMeasurementCreator = new DefaultMeasurementCreator();

const genericReducers = createGenericReducers({
  log: logSteps,
  defaultMeasurementCreator,
});

const reducerOverrides = {
  addChroma(state, action) {
    try {
      // run generic behavior
      genericReducers.addChroma(state, action);

      const { id, directAdditionalStep } = action.payload;
      const entry = state[id];
      if (!entry) return;


      // ----------------------------------------------------------------------------
      // IMPORTANT: Immer Draft Proxy Handling
      // ----------------------------------------------------------------------------
      // `state.chosenTemplate.additionalStep` is an Immer draft proxy. Using it
      // directly (e.g., storing it elsewhere or passing to `structuredClone`) can:
      //   - Cause unintended mutations to the template if later modified
      //   - Throw `DataCloneError` when using `structuredClone`
      //   - Break serialization (Redux DevTools, logs, etc.)
      //
      // The correct way to obtain a detached, plain copy is to:
      //   1. Unwrap the draft with `original()` (from Immer or Redux Toolkit).
      //   2. Then clone the unwrapped value (e.g., with `structuredClone`).
      //
      // This works for any depth, is completely safe, and avoids proxy-related issues.
      //
      // Example:
      //   const plain = original(state.chosenTemplate.additionalStep);
      //   const cloned = structuredClone(plain);
      //
      // If you are sure the object is shallow (no nested objects), a simple spread
      // `{ ...value }` also breaks the proxy. But for nested structures, always
      // use `original` + `structuredClone` to guarantee a full deep copy.
      // ----------------------------------------------------------------------------

      const templateAdditionalStep = state.chosenTemplate?.additionalStep;
      let additionalStep = directAdditionalStep
        ? directAdditionalStep
        : templateAdditionalStep
          ? structuredClone(original(templateAdditionalStep)) // unwrap + deep clone
          : null;

      console.log({additionalStep})

      if (additionalStep) {
        logSteps("override addChroma - setting additionalStep from directAdditionalStep or templateAdditionalStep", additionalStep);
        entry.additionalStep = additionalStep;
      } else {
        logSteps("override addChroma - no additionalStep to set");
      }
      logSteps('after override addChroma entry', structuredClone(entry))
    } catch (error) {
      console.error('Failed overriden add chroma for lumex detector',error)
    }
  },

  setTemplate(state, action) {
    // run generic whitelist logic first
    genericReducers.setTemplate(state, action);

    const { template } = action.payload;
    if (!template) return;

    const { additionalStep } = template;

    if (additionalStep != undefined) {
      logSteps(
        "override setTemplate - storing additionalStep in template",
        additionalStep
      );

      state.chosenTemplate.additionalStep = structuredClone(additionalStep);
    }
  },

  forceTemplate(state, action) {
    // run generic behavior
    genericReducers.forceTemplate(state, action);
    const { measurementId, template } = action.payload;
    const entry = state[measurementId];
    if (!entry) return;
    const effectiveAdditionalStep = template?.additionalStep ?? defaultMeasurementCreator.createAdditionalStep();
    entry.additionalStep = effectiveAdditionalStep;
  },

  setAdditionalStep(state, action) {
    const { tabId, maxDuration, window, threshold } = action.payload;

    if (!tabId || !state[tabId]) return;

    const isNumOrNull = (v) => v === null || (typeof v === "number" && !isNaN(v));
    const additionalStep = { maxDuration, window, threshold };
    if (isNumOrNull(maxDuration) && isNumOrNull(window) && isNumOrNull(threshold)) {
      state[tabId].additionalStep = additionalStep;
      logSteps("override setAdditionalStep - setting additionalStep", additionalStep);
    } else {
      logSteps("override setAdditionalStep - invalid values, not setting additionalStep", additionalStep);
    }

  },
};

const stepSlice = createStepProgramSlice({
  name: "internalSteps",
  helpers: {
    log: logSteps,
    defaultMeasurementCreator,
  },
  reducerOverrides,
});

export default stepSlice.reducer;
export const stepActions = stepSlice.actions;