import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  selectAutoMode,
  selectAutoControlSessionId,
  selectAutoControlProgram,
  autosamplerActions,
  selectTabMethod,
  selectSampleName,
  passportActions,
  selectCurrentInjection,
  selectActiveAutoStep,
  selectSelectedMethod,
} from '../reduxImportDispatcher';

import { AUTOSAMPLER_MODES } from '../../constants/constants';
import { handleAutoSessionEnd } from '../thunks/autosampler/autosamplerThunk';
import { chooseMethod } from '../thunks/method/chooseMethodThunk';
import { nameMeasurement } from '../thunks/measurement/measurementThunks';
import { forceChosenTemplate } from '../thunks/method/methodThunks';

export const autosamplerStatusListener = createListenerMiddleware();

autosamplerStatusListener.startListening({
  actionCreator: autosamplerActions.setDetectorProgramState,
  effect: async (action, { getState, dispatch, getOriginalState }) => {
    const state = getState();
    const oldState = getOriginalState();
    const sessionId = selectAutoControlSessionId(state);
    if (!sessionId) return; /* console.warn('no session id') */

    const currentSessionMethod = selectTabMethod(state, sessionId);
    const { activeStep } = action.payload || {};

    const autosamplerProgram = selectAutoControlProgram(state);

    const oldMode = selectAutoMode(oldState);
    const mode = selectAutoMode(state);
    const oldSampleName = selectSampleName(oldState, sessionId);

    const oldActiveStep = selectActiveAutoStep(oldState);
    const oldInjection = selectCurrentInjection(oldState);
    const currentInjection = selectCurrentInjection(state);
    const selectedMethod = selectSelectedMethod(state);

    const transitionedToFinished = oldMode === AUTOSAMPLER_MODES.AUTOSAMPLER_PROGRAM && mode === AUTOSAMPLER_MODES.NONE;
    if (transitionedToFinished || activeStep === null) {
      // transition from active session to none
      await dispatch(handleAutoSessionEnd(sessionId));
      return;
    }

    if (mode === AUTOSAMPLER_MODES.AUTOSAMPLER_PROGRAM) {
      const currentStepMethod = autosamplerProgram[activeStep]?.method;
      const currentStepSampleName = autosamplerProgram[activeStep]?.sampleName;
      /*       console.groupCollapsed('test method')
      console.log(activeStep, autosamplerProgram)
      console.log("sessionId",sessionId)
      console.log(currentStepMethod, currentSessionMethod)
      console.log(currentStepSampleName)
      console.groupEnd() */

      if (oldActiveStep !== activeStep || oldInjection !== currentInjection) {
        if (selectedMethod !== currentStepMethod) {
          console.log('Rechoose method due to mismatch', selectedMethod, currentStepMethod);
          await dispatch(chooseMethod({ selectedMethod: currentStepMethod, tabId: sessionId, allowInitializedOverwrite: true }));
        } else {
          console.log('Reforce method for safety', selectedMethod, currentStepMethod);
          await dispatch(forceChosenTemplate({ tabId: sessionId }));
        }
      }

      let needsRenaming = false;
      if (currentStepMethod !== undefined && currentStepMethod !== currentSessionMethod) {
        console.log('Rechoose method due to session/step mismatch', selectedMethod, currentStepMethod, currentSessionMethod);
        await dispatch(chooseMethod({ selectedMethod: currentStepMethod, tabId: sessionId, allowInitializedOverwrite: true }));
        needsRenaming = true;
      }

      if (oldSampleName !== currentStepSampleName) {
        dispatch(passportActions.updateSampleName({ tabId: sessionId, sampleName: currentStepSampleName }));
        needsRenaming = true;
      }

      if (oldActiveStep === activeStep && oldInjection !== currentInjection) {
        needsRenaming = true;
      }

      if (needsRenaming) {
        dispatch(nameMeasurement({ measurementId: sessionId, forceName: true }));
      }
    }
  },
});
