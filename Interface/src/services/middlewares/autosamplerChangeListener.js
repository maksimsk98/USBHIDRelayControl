import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { nodeActions, selectAutosamplerType } from '../reduxImportDispatcher';
import { AUTOSAMPLER_TYPES } from '../../constants/constants';
import { fetchAutoConfig } from '../thunks/autosampler/autosamplerThunk';

export const autosamplerChangeListener = createListenerMiddleware();

const autosamplerChangeActions = [
  nodeActions.updateNodesFromConfig,
  nodeActions.updateNodesParams,
];

autosamplerChangeListener.startListening({
  matcher: isAnyOf(...autosamplerChangeActions),
  effect: async (action, { getState, dispatch, getOriginalState }) => {
    const oldState = getOriginalState();
    const state = getState();

    const previousAutosamplerType = selectAutosamplerType(oldState);
    const newAutosamplerType = selectAutosamplerType(state);
    const isAutosamplerSame = newAutosamplerType === previousAutosamplerType;

    if (!isAutosamplerSame && newAutosamplerType !== AUTOSAMPLER_TYPES.none) {
      await dispatch(fetchAutoConfig());
    }
  },
});
