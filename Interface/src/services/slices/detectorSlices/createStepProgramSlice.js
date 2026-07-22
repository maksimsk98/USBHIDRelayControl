import { createSlice } from "@reduxjs/toolkit";

const defaultLog = (...args) => {
  console.log("[defaultStepSliceLog]", ...args);
}

export const createGenericReducers = (helpers) => {
    const { defaultMeasurementCreator, log = defaultLog, } = helpers;

    if (!defaultMeasurementCreator || typeof defaultMeasurementCreator.createFull !== "function") {
        console.error(`createGenericReducers: "defaultMeasurementCreator" must be a class instance with a createMeasurement() method.`);
        throw new Error(`createGenericReducers requires "defaultMeasurementCreator" with createMeasurement() method`);
    }

    return {

        // template-related reducers
        setTemplate(state, action) {
            const { template } = action.payload;
            const { steps, params } = template || {};
            if (!steps || !params) {
                console.warn("setTemplate called with incomplete payload", action.payload);
            }
            log("setTemplate", action.payload);
            state.chosenTemplate = { stepsData: structuredClone(steps), programParams: structuredClone(params) };
        },

        forceTemplate(state, action) {          
            const { measurementId, template } = action.payload;
            const tpl = template || state.chosenTemplate;

            log("forceTemplate", action.payload, "effective template:", tpl);
            const defaultMeasurement = defaultMeasurementCreator.createFull();
            const steps = tpl?.steps ?? defaultMeasurement.steps;
            const params = tpl?.params ?? defaultMeasurement.params;
            state[measurementId] = {...defaultMeasurement, steps, params};
        },

        // chroma-related reducers
        addChroma(state, action) {
            const { id, stepsData, programParams } = action.payload;
            const template = state.chosenTemplate;
            // start from canonical default
            const measurement = defaultMeasurementCreator.createFull();
            // steps override
            if (stepsData) {
                measurement.steps = structuredClone(stepsData);
            } else if (template?.steps) {
                measurement.steps = structuredClone(template.steps);
            }
            // params override
            if (programParams) {
                measurement.params = structuredClone(programParams);
            } else if (template?.params) {
                measurement.params = structuredClone(template.params);
            }

            state[id] = measurement;

            log("addChroma result", id, structuredClone(measurement))
        },

        deleteMeasurement(state, action) {
            log("deleteMeasurement", action.payload);
            const id = action.payload;
            if (state[id]) delete state[id];
        },

        // step-related reducers
        setStepsTable(state, action) {
            log("setStepsTable", action.payload);

            const { tabId, stepsTable } = action.payload;
            if (stepsTable) state[tabId].steps = stepsTable;

        },

        addStep(state, action) {
            log("addStep", action.payload);

            const { tabId } = action.payload;

            const steps = state[tabId].steps;
            const last = steps[steps.length - 1];

            const { from, to, component, ...detectorFields } = last;

            steps.push({
                ...detectorFields,
                from: last.to,
                component: "",
                to: ""
            });

        },

        updateStep(state, action) {
            log("updateStep", action.payload);
            const { tabId, stepId, name, value } = action.payload;

            state[tabId].steps[stepId][name] = value;

            if (name === "to" && state[tabId].steps[stepId + 1]) {
                state[tabId].steps[stepId + 1].from = value;
            }

            },

        deleteFocusedStep(state, action) {
            log("deleteFocusedStep", action.payload);

            const { tabId } = action.payload;
            const entry = state[tabId];
            if (!entry) return;

            const { focusedStep, activeStep, steps } = entry;

            if (focusedStep == null || focusedStep < 1) return;

            if (activeStep !== null && focusedStep < activeStep) return;

            const stepsCount = steps.length;

            if (focusedStep + 1 !== stepsCount) {
                const prev = steps[focusedStep - 1];
                const next = steps[focusedStep + 1];

                const hasNextFrom = next.from != null && next.from !== "";

                if (hasNextFrom) {
                prev.to = next.from;
                } else {
                next.from = prev.to;
                }

                steps.splice(focusedStep, 1);
            } else {
                steps.splice(focusedStep, 1);
                entry.focusedStep = focusedStep - 1;
            }
        },

        deleteStepByIndex(state, action) {
            log("deleteStepByIndex", action.payload);

            const { tabId, index } = action.payload;
            const entry = state[tabId];
            if (!entry) return;

            const { steps, activeStep } = entry;

            if (!steps || index == null || index < 1) return;

            if (activeStep !== null && index < activeStep) return;

            const stepsCount = steps.length;
            if (index >= stepsCount) return;

            if (index + 1 !== stepsCount) {
                const prev = steps[index - 1];
                const next = steps[index + 1];

                const hasNextFrom = next.from != null && next.from !== "";

                if (hasNextFrom) {
                prev.to = next.from;
                } else {
                next.from = prev.to;
                }

                steps.splice(index, 1);
            } else {
                steps.splice(index, 1);
                entry.focusedStep = Math.max(index - 1, 0);
            }
        },

        setReadacting(state, action) {
            log("setReadacting", action.payload);

            const { tabId, value } = action.payload;
            const entry = state[tabId];
            if (!entry) return;

            entry.isRedacting = value;
        },

        setFocusedStep(state, action) {
            log("setFocusedStep", action.payload);

            const { tabId, value } = action.payload;
            const entry = state[tabId];
            if (!entry) return;

            entry.focusedStep = value;
        },

        setActiveStep(state, action) {
            log("setActiveStep", action.payload);

            const { tabId, value } = action.payload;
            const entry = state[tabId];
            if (!entry) return;

            entry.activeStep = value;
        },

        setParams(state, action) {
            log("setParams", action.payload);
            const { tabId, params } = action.payload;
            if (params && state[tabId]) {
                state[tabId].params = structuredClone(params);
            }
        },

    }
}

export function createStepProgramSlice({
  name,
  reducerOverrides = {},
  extraReducers = {},
  helpers = {}
}) {

  const genericReducers = createGenericReducers(helpers);

  const finalReducers = { ...genericReducers, ...reducerOverrides, ...extraReducers };

  const slice = createSlice({
    name,
    initialState: {
      chosenTemplate: null
    },
    reducers: finalReducers
  });

  return slice;
}