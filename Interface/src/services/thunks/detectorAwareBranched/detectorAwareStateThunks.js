import { LUMEX_DETECTOR_TYPES } from "../../../constants/constants";
import { Logger } from "../../../utils/classes/Logger";
import { ridActions, stepActions, dadActions } from "../../reduxImportDispatcher";

const LOG_DETECTOR_PROGRAM_THUNKS = true;

export const detectorProgramLogger =
  new Logger("DetectorProgramThunks", LOG_DETECTOR_PROGRAM_THUNKS);

// List of all generic reducer names we want to map
const genericReducerNames = [
  "setTemplate",
  "forceTemplate",
  "addChroma",
  "deleteMeasurement",
  "setStepsTable",
  "addStep",
  "updateStep",
  "deleteFocusedStep",
  "deleteStepByIndex",
  "setReadacting",
  "setFocusedStep",
  "setActiveStep",
  "setParams"
];

// ---------- Helper to create detector entries ----------
const createDetectorEntry = (actions) => {
  const entry = { actions, payloads: {} };
  genericReducerNames.forEach((name) => {
    if (actions[name]) {
      // no need to normalize, just forward args object
      entry.payloads[name] = (args) => args;
    }
  });
  return entry;
};

// ---------- Build detector map ----------
export const detectorStepMap = {};

// Lumex detectors
LUMEX_DETECTOR_TYPES.forEach((detectorType) => {
  detectorStepMap[detectorType] = createDetectorEntry(stepActions);
});

// External detectors
detectorStepMap.DAD = createDetectorEntry(dadActions);
detectorStepMap.RID = createDetectorEntry(ridActions);

// ---------- Dispatcher helper ----------
function dispatchDetectorAction({ detectorType, actionName, args, dispatch }) {

  try {
    detectorProgramLogger.groupCollapsed(`Dispatching ${actionName} for ${detectorType}`);
    detectorProgramLogger.log('Args:', args);
    const entry = detectorStepMap[detectorType];
    detectorProgramLogger.log('Map entry found:', !!entry);
    if (!entry) return;
    const action = entry.actions[actionName];
    detectorProgramLogger.log('Action found:', !!action);
    if (!action) return;
    const payload = entry.payloads[actionName](args);
    detectorProgramLogger.log(`Dispatching action '${actionName}' with payload:`, payload);
    dispatch(action(payload));
    detectorProgramLogger.log(`Finished dispatching ${actionName} for ${detectorType}`);
    detectorProgramLogger.groupEnd();
  } catch (error) {
    detectorProgramLogger.error('Failed dispatch', {detectorType, actionName, args})
    detectorProgramLogger.groupEnd();
  }

}

/* // ---------- Generic sync thunks ----------
export const detectorThunkFactory = (actionName) => ({ detectorType, ...args }) => (dispatch) => {
  dispatchDetectorAction({ detectorType, actionName, args, dispatch });
};

// Generate thunks for all generic reducers
export const detectorProgramThunks = Object.fromEntries(
  genericReducerNames.map((name) => [name, detectorThunkFactory(name)])
); */

// we will do it manualy for autocomplete

export const detectorProgramThunks = {
  setTemplate: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "setTemplate", args, dispatch }),
  forceTemplate: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "forceTemplate", args, dispatch }),
  addChroma: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "addChroma", args, dispatch }),
  deleteMeasurement: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "deleteMeasurement", args, dispatch }),
  setStepsTable: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "setStepsTable", args, dispatch }),
  addStep: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "addStep", args, dispatch }),
  updateStep: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "updateStep", args, dispatch }),
  deleteFocusedStep: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "deleteFocusedStep", args, dispatch }),
  deleteStepByIndex: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "deleteStepByIndex", args, dispatch }),
  setReadacting: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "setReadacting", args, dispatch }),
  setFocusedStep: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "setFocusedStep", args, dispatch }),
  setActiveStep: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "setActiveStep", args, dispatch }),
  setParams: (args) => (dispatch) =>
    dispatchDetectorAction({ detectorType: args.detectorType, actionName: "setParams", args, dispatch }),
};