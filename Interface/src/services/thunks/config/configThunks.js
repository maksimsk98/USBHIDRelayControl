import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  thermostatActions, configActions, nodeActions, pumpProgramActions, errorsActions, selectTemplatesFolder,
  selectSelectedChromatograph,
  selectSelectedChromatographData,
  selectChromatographOwner,
} from '../../reduxImportDispatcher';
import { fetchMethods } from '../method/methodThunks';
import { axiosSession } from '../../axiosConfig';
import { COM_DETECTOR_TYPES, DETECTOR_TYPES } from '../../../constants/constants';
import { getDetectorSerial, postCurrentChromatographConfig } from '../nodes/nodesThunks';
import { selectChromatographIsMineOrFree } from '../../selectors/config/configDerived';
import { DEFAULT_CHROMATOGRAPH_NAME, SERVICE_CHROMATOGRAPH_NAMES, SESSION_CHROMATOGRAPH_NAME, SESSION_TEMP_CHROMATOGRAPH } from '../../../constants/fallbacks';

export const filterServiceChromatographs = (result) => {
  if (!result || !result.chromatographs) return result;
  return {
    ...result,
    chromatographs: Object.fromEntries(
      Object.entries(result.chromatographs).filter(
        ([name]) => !SERVICE_CHROMATOGRAPH_NAMES.includes(name)
      )
    ),
  };
};

export const getSafeLastUsedChromatograph = (lastUsedChromatograph, defaultChromatograph) => {
  if (!lastUsedChromatograph) return defaultChromatograph;
  const safe = SERVICE_CHROMATOGRAPH_NAMES.includes(lastUsedChromatograph)
    ? defaultChromatograph
    : lastUsedChromatograph;
  return safe
};

export const reaffirmChromatograph = createAsyncThunk(
  'config/reaffirmChromatograph',
  async (_, { getState, dispatch }) => {
    try {
      const state = getState();
      const chromatographData = selectSelectedChromatographData(state);
      const selectedChromatograph = selectSelectedChromatograph(state);
      if (!chromatographData || selectedChromatograph == null) {
        console.warn('No chromatograph data available to reaffirm configuration');
        return;
      }
/*       console.log('reaffirming chromatograph configuration', chromatographData); */
      dispatch(nodeActions.updateNodesFromConfig(chromatographData));
    } catch (error) {
      console.error('Failed to reaffirm chromatograph configuration', error);
    }
  },
);  


export const fetchConfig = createAsyncThunk(
  'config/fetchConfig',
  async ({initSetup = false} = {}, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();

      const response = await axiosSession.get('/api/config/fetchConfig', { params: { initSetup } }); // we reserve optimisticly nodes on fetch to mitigate race 

      // on second thought we need it to reaffirm
      /* // фильтруем сервисные хроматографы прямо в объекте
      const result = filterServiceChromatographs(response.data); */
      const result = response.data

      const {
        chromatographs,
        lastUsedChromatograph: freshlastUsedChromatograph,
        thermostat: { targetTemp, dispersion } = {},
        Settings: {
          Pump: { // api doc breaks camelCase for no reason, I WON'T, it sends broken, but requires camelCase for response
            AutomaticReleasing: automaticReleasing,
            MaxPressureDischarge: maxPressureDischarge,
            MaxPressureWork: maxPressureWork,
            MinPressureWork: minPressureWork,
            ReleasingFlowRate: releasingFlowRate,
          } = {}, // default value to avoid crash
        } = {}, // default Settings
      } = result;

      const lastUsedChromatographSafe = getSafeLastUsedChromatograph(
        freshlastUsedChromatograph,
        DEFAULT_CHROMATOGRAPH_NAME
      );

      const canAutoSelect = selectChromatographIsMineOrFree(
        state,
        lastUsedChromatographSafe
      );

      const chromaData = chromatographs?.[lastUsedChromatographSafe];
      if (!chromaData || !chromaData.detector) {
        return rejectWithValue('Invalid chromatograph config');
      }

      dispatch(configActions.setConfig(result));
      dispatch(thermostatActions.setTargetTemp(targetTemp));
      dispatch(thermostatActions.setDispersion(dispersion));
      dispatch(pumpProgramActions.setGeneralParams({
        automaticReleasing,
        maxPressureDischarge,
        maxPressureWork,
        minPressureWork,
        releasingFlowRate,
      }));

      if (canAutoSelect) {
        dispatch(
          nodeActions.updateNodesFromConfig(
            chromatographs[lastUsedChromatographSafe]
          )
        );
     

        if (COM_DETECTOR_TYPES.includes(chromaData?.detector?.type)) {
          await dispatch(getDetectorSerial())
        }

      } else {
        dispatch(
          nodeActions.updateNodesFromConfig(SESSION_TEMP_CHROMATOGRAPH)
        );
        dispatch(configActions.setSelectedChromatograph(SESSION_CHROMATOGRAPH_NAME));
        if (initSetup) {
          // only consequent sessions post _seesionTemp, first is allowed naive ownership
          await dispatch(postCurrentChromatographConfig());
          console.log('Posted empty _sessionTemp to interrupt naive nogui initialization')
        }
        console.warn('Could not auto-select chromatograph config, applied session temp config instead');
      }      

      dispatch(nodeActions.setIsLoading(false));

      return result;
    } catch (error) {
      console.error('failed parsing config',error);

      return rejectWithValue(error.response?.data || 'Failed to fetch configuration');
    }
  },
);

export const saveOperationalData = createAsyncThunk(
  'config/saveOperationalData',
  async ({ type, save }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/config/saveOperationalData', { type, save });
      dispatch(configActions.toggleSaveOperationalData(type));
      return response;
    } catch (e) {
      console.log('error toggling save protocol');
      rejectWithValue('error toggling save protocol');
      
    }
  },
);

export const saveFoldersThunk = createAsyncThunk(
  'config/saveFolders',
  async (
    { results, templates, temporary },
    { dispatch, getState, rejectWithValue },
  ) => {
    try {
      // взять старое состояние ДО изменений
      const prevTemplates = selectTemplatesFolder(getState());

      const { data } = await axiosSession.post('/api/config/setConfigFolders', {
        results,
        templates,
        temporary,
      });

      if (!data?.success) {
        throw new Error('Backend rejected config folders update');
      }

      // apply locally AFTER backend ack
      dispatch(configActions.setResultsFolder(results));
      dispatch(configActions.setTemplatesFolder(templates));
      dispatch(configActions.setTemporaryFolder(temporary));

      // условный refetch
      if (prevTemplates !== templates) {
        dispatch(fetchMethods());
      }

      return { results, templates, temporary };
    } catch (error) {
      console.error('[saveFoldersThunk] Failed to save config folders', error);
      dispatch(
        errorsActions.addError({
          fetchedError: {
            message: 'Не удалось сохранить пути конфигурации',
          },
        }),
      );
      return rejectWithValue(error.message);
    }
  },
);
