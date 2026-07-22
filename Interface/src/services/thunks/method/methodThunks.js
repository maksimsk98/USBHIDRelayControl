import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  chromaMiscActions, methodActions, passportActions, pumpProgramActions, selectActiveTabType,
  selectEffectiveDetectorType,
  selectRawMethodData,
  selectTabMeasurementType,
  selectTabMethod,
} from '../../reduxImportDispatcher';
// base
// composite
import { selectMethodData } from '../../reduxImportDispatcher';
import { takeMeasurementMethodSnapshotThunk } from '../snapshotThunk';
import { axiosSession } from '../../axiosConfig';
import { detectorProgramThunks } from '../detectorAwareBranched/detectorAwareStateThunks';
import { Logger } from '../../../utils/classes/Logger';

const LOG_METHODS = true;

const methodsLogger = new Logger("MethodThunks", LOG_METHODS);

export const fetchMethods = createAsyncThunk(
  'method/fetchMethods',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.get('/api/methods/fetchMethods');
      const { data } = response;

      methodsLogger.log('Fetched methods data:', data.templates);

      dispatch(methodActions.setMethodOptions(data.templates));

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const submitMethod = createAsyncThunk(
  'method/submitMethod',
  async ({ tabId, methodName, sourceMethod }, { getState, dispatch, rejectWithValue }) => {
    try {
      methodsLogger.groupCollapsed('Submitting method', { tabId, methodName, sourceMethod });

      const state = getState();
      const methodData = selectMethodData(state, tabId);
      const tabMethod = selectTabMethod(state, tabId);
      const oldMethodData = selectRawMethodData(state, tabMethod);
      const tabMeasType = selectTabMeasurementType(state, tabId);

      methodsLogger.log('Selected method data for submission:', methodData);
      if (!methodData) throw new Error('No method data found for tab');

      methodsLogger.log('Old method data:', oldMethodData);

      const { common, spectroMethodData, chromaMethodData } = methodData ?? {};

      const messageBase = { name: methodName, sourceMethod, ...common };

      methodsLogger.log('Message base:', messageBase);

      let message;

      if (tabMeasType === 'spectro') {
        message = {
          ...oldMethodData,
          ...spectroMethodData, // grab local spectro data
          ...messageBase,
        };
      } else if (tabMeasType === 'chroma') {
        message = {
          ...oldMethodData,
          ...chromaMethodData, // grab local chroma data
          ...messageBase,
        };
      } else {
        console.error(
          'No measurement type defined or unsupported type on method chosen:',
          tabMeasType,
        );
        message = {
          ...common,
          ...spectroMethodData,
          ...chromaMethodData,
          ...messageBase,
        };
      }

      methodsLogger.log('Final message to submit:', message);
      const response = await axiosSession.post('/api/methods/submit', message);

      const { data } = response;
      methodsLogger.log('Response from method submission:', data);

      // ПАРСИНГ КАК В fetchMethods
      if (data?.templates) {
        dispatch(methodActions.setMethodOptions(data.templates));
      }

      const tabType = selectActiveTabType(state);
      switch (tabType) {
        case 'measurement':
          // we don't change it anymore as per 12.03.2026  BB's and AB's consensus
          /* dispatch(measurementActions.changeMethod({ id: tabId, method: methodName })); */
          
          if (methodName === sourceMethod) {
            dispatch(takeMeasurementMethodSnapshotThunk({ id: tabId }));
          }
          break;
        case 'file':
          // we don't change it anymore as per 14.10.2025  BB's command
          /*           dispatch(fileActions.changeMethod({ id: tabId, method: methodName })); */
          break;
        default:
          break;
      }
      
      methodsLogger.groupEnd();

      return { tabId, response: response.data };
    } catch (error) {
      methodsLogger.groupEnd();
      console.error('Failed to save method', error);
      return rejectWithValue(error.message);
    }
  },
);

export const updateMethodByTabId = createAsyncThunk(
  'method/updateMethodById',
  async (
    { tabId },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState();

      const tabMethod = selectTabMethod(state, tabId);

      const params = { tabId, methodName: tabMethod, sourceMethod: tabMethod };

      await dispatch(submitMethod(params)).unwrap();

      return { tabId, method: tabMethod };
    } catch (error) {
      console.error('Failed to update method', error);
      return rejectWithValue(error.message);
    }
  },
);

export const forceChosenTemplate = createAsyncThunk(
  'method/forceChosenTemplate',
  async ({ tabId }, { getState, dispatch }) => {
    const state = getState();
    const detectorType = selectEffectiveDetectorType(state, tabId );

    dispatch(passportActions.forceTemplate({ measurementId: tabId }));
    
    dispatch(detectorProgramThunks.forceTemplate({ detectorType, measurementId: tabId }));
    dispatch(chromaMiscActions.forceTemplate({ measurementId: tabId }));
    dispatch(pumpProgramActions.forceTemplate({ measurementId: tabId }));
  },
);
