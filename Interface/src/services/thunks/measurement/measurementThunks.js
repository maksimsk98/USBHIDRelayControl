import { createAsyncThunk } from '@reduxjs/toolkit';
import { v1 as uuidv1 } from 'uuid';

import {
  EMPTY_OBJECT, FIXES, INVALID_MEAS_PARAMS, INVALID_MEAS_PARAMS_FIX, MEASUREMENT_STATUSES, MEASUREMENT_TYPES, PUMP_MODES_LIST, TAB_TYPES,
} from '../../../constants/constants';

import {
  changeTrackerActions, chromaMiscActions, chromaPlotsActions, measurementActions, passportActions, peaksActions, pumpProgramActions, reportActions, selectActiveTab, selectAreAllPumpsChosen, selectChosenThermostat, selectDataForCopy, selectDataForDetUpd, selectFileEntry, selectIsOpened, selectMeasName, selectMethodNameTemplate, selectPumpsCount, selectSampleName, selectStreamedMeasurementId, selectTabMeasurementType, selectTabMethod, selectTabType, selectMeasurements, selectNextPlaceholderName, selectChromaDataIfAltered, selectSpectroData, selectDetectorType, selectSpectroSteps, selectSpectroDetDepParams,
  selectMeasurmentSourcePath,
  selectTabSaveToFile,
  selectEffectiveDetectorType,
} from '../../reduxImportDispatcher';
// composite
import { selectChromaData } from '../../reduxImportDispatcher';

import { fetchPeakTable } from '../peaks/peaksThunks';
import { getMeasurementName } from '../../../utils/getMeasurementName';
import { fetchCalculatedChromotogram } from '../chormaPlots/chromaPlotsThunks';
import { ensureThermostatOff } from '../nodes/nodesControlThunks';
import { selectStreamedIdAndMode } from '../../selectors/selectStreamedIdAndMode';
import { handleAutoMeasurementClosed } from '../autosampler/autoMeasurementThunks';
import { checkIsPlaceholder } from '../../../utils/validation';
import { spectroPlotsActions } from '../../slices/spectroPlotsSlice';
import { createMeasurementFromFileThunk } from '../createMeasurementFromFileThunk';
import { closeFileWithApiCall } from '../file/fileThunks';
import { takeMeasurementDataSnapshotThunk } from '../snapshotThunk';
import { axiosSession } from '../../axiosConfig';
import { updatePeakIdThunk, updateSmoothingParamsThunk } from '../chromaMisc/chromaMiscThunks';
import { detectorProgramThunks } from '../detectorAwareBranched/detectorAwareStateThunks';

export const startChromaWithApiCall = createAsyncThunk(
  'measurement/startChromaWithApiCall',
  async ({ tabId }, { getState, dispatch, rejectWithValue }) => {
    const props = { tabId, measurementType: 'chroma' };

    await dispatch(ensureThermostatOff());

    const state = getState();
    const measurementParams = selectChromaData(state, props);
    console.log(measurementParams);

    dispatch(measurementActions.appendDetectorType({
      id: tabId,
      detectorType: measurementParams.detectorType,
    }));

    dispatch(chromaPlotsActions.clearAllPlotsData({
      parentId: tabId,
      preservePaths: ['background.measuredChromatogram', 'displayOptions'],
    }));
    dispatch(peaksActions.resetPeaksRuntime(tabId));

    try {
      const response = await axiosSession.post('/api/measurement/chroma/start', {
        measurementParams,
      });
      dispatch(measurementActions.startMeasurement({ tabId }));
      dispatch(changeTrackerActions.setHasAlteredData(tabId));

      await dispatch(updateSmoothingParamsThunk({
        tabId,
        params: null,
        withoutResponse: true,
      }));

      await dispatch(updatePeakIdThunk({
        tabId,
        params: null,
        withoutResponse: true,
      }));

      dispatch(takeMeasurementDataSnapshotThunk({ id: tabId }));

      return { data: response.data, measurementId: measurementParams.measurementName };
    } catch (error) {
      return rejectWithValue(error.response.data || error.message);
    }
  },
);

export const stopChromaWithApiCall = createAsyncThunk(
  'measurement/stopChromaWithApiCall',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const { streamedMeasurementId, measurementStatus } = state.measurementReducer;
    if (!streamedMeasurementId) {
      return rejectWithValue('No active measurement to stop');
    }

    try {
      const response = await axiosSession.post('/api/measurement/chroma/stop', {
        measurementName: streamedMeasurementId,
      });

      if (measurementStatus === MEASUREMENT_STATUSES.MEASUREMENT_RUNNING) {
        await dispatch(fetchCalculatedChromotogram(streamedMeasurementId));
        await dispatch(fetchPeakTable({ tabId: streamedMeasurementId, sendRequest: true }));
      }

      dispatch(measurementActions.stopMeasurement());

      return { data: response.data, measurementId: streamedMeasurementId };
    } catch (error) {
      return rejectWithValue(error.response.data || error.message);
    }
  },
);

export const closeChromaWithApiCall = createAsyncThunk(
  'measurement/closeChromaWithApiCall',
  async ({
    measurementId, needsToSave,
    alteredData = null, removeStoreEnrty = true,
    isAuto = false, wipeName = false,
  }, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const { streamedId: streamedMeasurementId, mode } = selectStreamedIdAndMode(state);
    try {
      let actualAlteredData = alteredData;
      if (actualAlteredData == null) {
        actualAlteredData = selectChromaDataIfAltered(state, measurementId);
      }

      let response;
      if (mode === 'auto') {
        console.warn(mode, streamedMeasurementId);
        await dispatch(handleAutoMeasurementClosed(streamedMeasurementId));
      } else {
        response = await axiosSession.post('/api/measurement/chroma/close', {
          measurementName: measurementId,
          needsToStop: measurementId === streamedMeasurementId,
          needsToSave: needsToSave ?? false,
          alteredData: actualAlteredData ?? {},
          isAuto,
        });
      }

      if (removeStoreEnrty) dispatch(measurementActions.closeMeasurement(measurementId));
      if (wipeName) {
        const measurements = selectMeasurements(state);
        const placeHolderName = selectNextPlaceholderName(state);
        console.warn(placeHolderName, measurements);
        dispatch(measurementActions.changeName({
          id: measurementId,
          name: placeHolderName,
        }));
        console.log(`wiped name for ${measurementId}, set placeholder ${placeHolderName}`);
      }

      return { result: 'was closed', closedTab: measurementId }; // i need to know closed tab
    } catch (error) {
      console.error('error stoping measurement', error);
      return rejectWithValue(error.response.data || error.message);
    }
  },
);

export const saveAsChromaWithApiCall = createAsyncThunk(
  'measurement/saveAsChromaWithApiCall',
  async (
    {
      measurementId,
      filePath,
    },
    { getState, dispatch, rejectWithValue },
  ) => {
    const state = getState();

    try {
      //  reuse aggregation logic
      const alteredData = selectChromaDataIfAltered(state, measurementId) ?? {};

      //  call backend
      const response = await axiosSession.post(
        '/api/measurement/chroma/save-as',
        {
          measurementName: measurementId,
          filePath,
          alteredData,
        },
      );

      // Do not reset as save as counts as separate enitity from original file
      /* dispatch(changeTrackerActions.resetHasAlteredData(measurementId)) */

      return {
        result: 'saved-as',
        measurementId,
        filePath,
      };
    } catch (error) {
      console.error('error saving measurement as', error);
      return rejectWithValue(
        error.response?.data || error.message,
      );
    }
  },
);

export const passPressedButtonToStart = createAsyncThunk(
  'measurement/pressStart',
  async (_, { getState, dispatch }) => {
    const state = getState();
    const streamedMeasurementId = selectStreamedMeasurementId(state);

    if (streamedMeasurementId === null || streamedMeasurementId === undefined) return;

    const response = await axiosSession.post('/api/measurement/chroma/pressStart', {
      measurementName: streamedMeasurementId,
    });
    dispatch(measurementActions.changeCurStreamStatus(MEASUREMENT_STATUSES.INITIALIZED_WAIT));
  },
);

export const changeMeasurementAveraging = createAsyncThunk(
  'measurement/changeAveraging',
  async ({ tabId, averaging, isMeasuring }, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/measurement/chroma/changeAveraging', { tabId, averaging, isMeasuring });
      if (!isMeasuring) {
        const {
          updatedData: {
            measuredChromatogram,
            signalPhoto,
            signalRef,
            photoParams = EMPTY_OBJECT,
            referenceParams = EMPTY_OBJECT,
            mainParams = EMPTY_OBJECT,
          },
        } = response.data;

        const plotTable = {
          mainParams,
          photoParams,
          referenceParams,
        };

        dispatch(chromaPlotsActions.clearPlot({ parentId: tabId, plotType: 'measuredChromatogram' }));
        dispatch(chromaPlotsActions.clearPlot({ parentId: tabId, plotType: 'signalPhoto' }));
        dispatch(chromaPlotsActions.clearPlot({ parentId: tabId, plotType: 'signalRef' }));
        const result = {
          parentId: tabId,
          measurementData: {
            measuredChromatogram,
            signalPhoto,
            signalRef,
          },
        };
        dispatch(chromaPlotsActions.setMeasurementPoints(result));
        dispatch(chromaPlotsActions.updatePlotTable({ parentId: tabId, plotTable }));
      }
      return response.data;
    } catch (error) {
      console.error('averaging error', error);

      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);

export const getAndCheckIsMeasNamePlaceholderById = createAsyncThunk(
  'measurement/checkName',
  async (measurementId, { getState }) => {
    const state = getState();
    const name = selectMeasName(state, measurementId);

    return {
      is: checkIsPlaceholder(name),
      name: name ?? null,
    };
  },
);

export const nameMeasurement = createAsyncThunk(
  'measurement/name',
  async ({ measurementId, forceName = false }, { dispatch, getState, rejectWithValue }) => {
    const { is: isPlaceholder, name } = await dispatch(getAndCheckIsMeasNamePlaceholderById(measurementId)).unwrap();

    if (name != null && !isPlaceholder && !forceName) {
      console.warn(`${measurementId} already has valid name ${name}`);
      return name;
    }

    const state = getState();

    const methodName = selectTabMethod(state, measurementId);
    const nameTemplate = selectMethodNameTemplate(state, methodName);
    const sampleName = selectSampleName(state, measurementId);
    const measurementType = selectTabMeasurementType(state, measurementId);
    const newName = getMeasurementName(nameTemplate, { sampleName, methodName, measurementType });

    console.groupCollapsed('name');
    console.log(measurementId);
    console.log(methodName);
    console.log(nameTemplate);
    console.log(sampleName);
    console.log(measurementType);
    console.log(newName);
    console.groupEnd();

    dispatch(measurementActions.changeName({ id: measurementId, name: newName }));

    return newName;
  },
);

export const updateProgram = createAsyncThunk(
  'measurement/updateProgram',
  async (props, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    const dataForUpd = selectDataForDetUpd(state, props);

    const response = await axiosSession.post('/api/measurement/chroma/updateProgram', { measurementName: props.tabId, dataForUpd });
    return response.data;
  },
);

const getNewName = (currentName, allNames) => {
  if (!currentName) return '(#1)';

  // Extract base name without any existing (#number)
  const baseMatch = currentName.match(/^(.*?)(?:\s*\(#\d+\))?$/);
  const baseName = baseMatch[1].trim();

  // Find all existing files with the same base name and extract their numbers
  const existingNumbers = [];

  allNames.forEach((name) => {
    const match = name.match(new RegExp(`^${escapeRegExp(baseName)}\\s*\\(#(\\d+)\\)$`));
    if (match) {
      existingNumbers.push(parseInt(match[1], 10));
    }
  });

  // If no existing numbered files found, start with (#1)
  if (existingNumbers.length === 0) {
    return `${baseName} (#1)`;
  }

  // Find the maximum number and increment
  const maxNumber = Math.max(...existingNumbers);
  return `${baseName} (#${maxNumber + 1})`;
};

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const copyChromaMeas = createAsyncThunk(
  'measurement/copyChromaMeas',
  async ({ tabId: sourceId }, { dispatch, getState, rejectWithValue }) => {
    const state = getState();

    const {
      stepsData, programParams, additionalStep, pumpProgramData, chromaMiscData, passportData, measuredChromatogram, reportData,
    } = selectDataForCopy(state, sourceId );
    const copyId = `chromatographicMeasurement_${uuidv1()}`;

    const sourceType = selectTabType(state, sourceId);

    const detectorType = selectEffectiveDetectorType(state, sourceId );

    dispatch(detectorProgramThunks.addChroma({ 
      detectorType, 
      id: copyId, 
      stepsData, 
      programParams,
      ...(additionalStep && { directAdditionalStep: additionalStep })
    }));
    dispatch(pumpProgramActions.addChroma({ id: copyId, pumpProgramData }));
    dispatch(chromaMiscActions.addChroma({ id: copyId, chromaMiscData }));
    dispatch(passportActions.addChroma({ measurementId: copyId, passportData }));
    dispatch(chromaPlotsActions.appendPlotPointsData({
      parentId: copyId,
      newPoints: measuredChromatogram,
      plotType: 'measuredChromatogram',
      plotState: 'background',
    }));
    dispatch(chromaPlotsActions.setDisplayOptions({
      parentId: copyId,
      displayOptions: { showBackground: true },
    }));

    dispatch(reportActions.initializeCheckboxes({ id: copyId }));

    if (sourceType === TAB_TYPES.MEASUREMENT) {
      dispatch(measurementActions.copyMeasurement({
        sourceId,
        targetId: copyId,
        name: null,
        shouldOpen: true,
      }));
    } else if (sourceType === TAB_TYPES.FILE) {
      const fileData = selectFileEntry(state, sourceId);
      const { type, method, calibration } = fileData;

      dispatch(measurementActions.addMeasurement({
        id: copyId, type, method, calibration, shouldOpen: true,
      }));
    }

    /* dispatch(nameMeasurement(copyId)) */ // it is named on start when baseline is finished so coment out for now
    return copyId;
  },
);

/* export const imutRestartMeas = createAsyncThunk(
  'measurement/imutRestartMeas',
  async ({tabId: sourceId}, { dispatch, getState, rejectWithValue }) => {
    const copyId = await dispatch(copyChromaMeas({tabId: sourceId})).unwrap()
    dispatch(startChromaWithApiCall({tabId: copyId}))
    return copyId
  }
) */

async function handleChromaMeasurementErrors({
  dispatch,
  tabId,
  measurementType,
  onErrors,
}) {
  const {
    fixableErrors,
    unfixableErrors,
  } = await dispatch(
    checkValidityOfMeasurement({ tabId, measurementType }),
  ).unwrap();

  if (unfixableErrors.length > 0) {
    return { ok: false, type: 'unfixable', errors: unfixableErrors };
  }

  if (fixableErrors.length > 0) {
    if (!onErrors) {
      return { ok: false, type: 'fixable', errors: fixableErrors };
    }

    const shouldFix = await onErrors({ errors: fixableErrors });

    if (shouldFix !== true) {
      return { ok: false, type: 'user-cancel' };
    }

    await dispatch(
      correctProgramForNodes({ tabId, measurementType, errors: fixableErrors }),
    );
  }

  return { ok: true };
}

export const startMeasurementOnActive = createAsyncThunk(
  'measurement/startMeasurementOnActive',
  async ({
    measurementType, sampleName, isWritingBaseline, onErrors,
  }, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    const sourceId = selectActiveTab(state);
    const isFile = selectIsOpened(state, sourceId);
    let idToStart = sourceId;
    if (measurementType === 'chroma') {
      if (isFile) {
        idToStart = await dispatch(copyChromaMeas({ tabId: sourceId })).unwrap();
      }

      dispatch(passportActions.updateSampleName({
        tabId: idToStart,
        sampleName,
      }));

      dispatch(chromaMiscActions.setIsWritingBaseline({
        id: idToStart,
        isWritingBaseline,
      }));

      const result = await handleChromaMeasurementErrors({
        dispatch,
        tabId: idToStart,
        measurementType,
        onErrors,
      });

      if (!result.ok) {
        return rejectWithValue(result);
      }

      await dispatch(startChromaWithApiCall({ tabId: idToStart })).unwrap();
      return idToStart;
    } if (measurementType === 'spectro') {
      let forRestart = false;
      if (isFile) {
        idToStart = await dispatch(createMeasurementFromFileThunk({ sourceId })).unwrap();
        forRestart = true;
        await dispatch(closeFileWithApiCall({ fileId: sourceId, needsToSave: false, forRestart })).unwrap();
      }

      await dispatch(startSpectroWithApiCall({
        tabId: idToStart,
        ...(forRestart ? { sourceId } : {}),
      })).unwrap();
      return idToStart;
    }
    rejectWithValue('no type');
  },
);

export const handleChromaMeasurementFinished = createAsyncThunk(
  'measurement/onFinishChroma',
  async (parentId, { dispatch }) => {
    try {
      console.groupCollapsed('handle finished');
      dispatch(measurementActions.stopMeasurement());
      console.log('stopped');
      await dispatch(fetchCalculatedChromotogram(parentId));
      console.log('fetched calc');
      await dispatch(fetchPeakTable({ tabId: parentId, sendRequest: true }));
      console.log('fetched peaks');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('failed handling finish on', parentId, error);
      console.groupEnd();
      return false;
    }
  },
);

export const saveSpectroWithApiCall = createAsyncThunk(
  'measurement/saveSpectroWithApiCall',
  async ({
    measurementId,
  }, { getState, dispatch, rejectWithValue }) => {
    console.log('saving')
    const state = getState();
    const detectorProg = selectSpectroSteps(state, measurementId);
    const detectorParams = selectSpectroDetDepParams(state, measurementId);
    const sourcePath = selectMeasurmentSourcePath(state, measurementId)

    const dataToSave = {
      detectorProg,
      ...detectorParams,
    };

    try {
      const response = await axiosSession.post('/api/measurement/spectro/save', {
        measurementId,
        needsToSave: true,
        dataToSave,
        sourcePath
      });

      dispatch(changeTrackerActions.resetHasAlteredData(measurementId))

      return measurementId
    } catch (error) {
      console.error('error saving measurement', error);
      return rejectWithValue(error.response.data || error.message);
    }
  },
);

export const handleSpectroMeasurementFinished = createAsyncThunk(
  'measurement/onFinishSpectro',
  async (measurementId, { dispatch, getState }) => {
    console.log('handling finish')
    const state = getState();
    const autoSave = selectTabSaveToFile(state, measurementId)
    console.log('handling finish', autoSave)

    try {
      dispatch(measurementActions.stopMeasurement());

      if (autoSave) await dispatch(saveSpectroWithApiCall({measurementId}))

      return true;
    } catch (error) {
      console.error('failed handling finish on', measurementId, error);
      console.groupEnd();
      return false;
    }
  },
);

export const handleMeasurementStarted = createAsyncThunk(
  'measurement/onStart',
  async (parentId, { dispatch }) => {
    console.groupCollapsed('handle started');
    try {
      dispatch(chromaPlotsActions.clearAllPlotsData({
        parentId,
        preservePaths: [
          'background.measuredChromatogram',
          'displayOptions',
        ],
      }));
      console.log('cleared');
      const name = await dispatch(nameMeasurement({ measurementId: parentId })).unwrap();
      console.log(`named "${name}"`);
      console.groupEnd();
      return true;
    } catch (error) {
      console.error(`failed handling start on ${parentId}`);
      console.groupEnd();
      return false;
    }
  },
);

export const addNewMeasurementTab = createAsyncThunk(
  'measurement/addNewMeasurementTab',
  async (
    {
      id, // optional, will be auto-generated if not provided
      name = null,
      method = null,
      calibration = null,
      type = MEASUREMENT_TYPES.chroma,
      shouldOpen = true,
      shouldClose = false,
    },
    { dispatch, getState },
  ) => {
    const measurementId = id || `measurement_${uuidv1()}`;

    const state = getState();
    const detectorType = selectDetectorType(state)

    // Initialize required slices
    dispatch(detectorProgramThunks.addChroma({detectorType, id: measurementId, stepsData: null, programParams: null, directAdditionalStep: null  }));
    dispatch(pumpProgramActions.addChroma({ id: measurementId, pumpProgramData: null }));
    dispatch(chromaMiscActions.addChroma({ id: measurementId, chromaMiscData: null }));
    dispatch(passportActions.addChroma({ measurementId, passportData: null }));
    dispatch(reportActions.initializeCheckboxes({ id: measurementId }));

    // Add to measurements
    dispatch(measurementActions.addMeasurement({
      id: measurementId,
      name,
      type,
      method,
      calibration,
      shouldOpen,
      shouldClose,
    }));

    return measurementId;
  },
);

export const checkValidityOfMeasurement = createAsyncThunk(
  'measurement/checkValidity',
  async (
    {
      tabId,
      measurementType,
    },
    { dispatch, getState },
  ) => {
    const state = getState();
    const measurementParams = selectDataForCopy(state, tabId ); // TODO expand for spectro

    const { chromaMiscData = {}, pumpProgramData = {} } = measurementParams;
    const { thermostatTemp } = chromaMiscData;
    const { pumpMode = 'none', isocratProgram = {}, gradientProgram = {} } = pumpProgramData;
    const { isContinuousSupply = null } = isocratProgram;

    const pumpsCount = selectPumpsCount(state);
    const chosenThermostat = selectChosenThermostat(state);

    const { hasMissing: hasMissingPumps, missingCount, missingKeys: missingPumps } = selectAreAllPumpsChosen(state);

    const connectedCount = pumpsCount - missingCount;

    const fixableErrors = [];
    const unfixableErrors = [];

    const usesPumps = PUMP_MODES_LIST.includes(pumpMode);

    const usesPumpWithMismatch = missingCount && usesPumps;

    // mismatch
    if (usesPumpWithMismatch) {
      fixableErrors.push(INVALID_MEAS_PARAMS.PUMP_COUNT_MISMATCH);
    }

    // no pumpProg on no pumps
    if (connectedCount === 0 && usesPumps) {
      fixableErrors.push(INVALID_MEAS_PARAMS.NO_PUMPS_FOR_PUMP_PROG);
    }

    // no continous supply on single pump
    if (connectedCount === 1 && pumpMode === 'isocrat' && isContinuousSupply) { // includes not connected on many, or single conected
      fixableErrors.push(INVALID_MEAS_PARAMS.ONE_PUMP_ON_CONT_SUP);
    }
    // no gradient on single pump
    if (connectedCount === 1 && pumpMode === 'gradient') { // includes not connected on many, or single conected
      fixableErrors.push(INVALID_MEAS_PARAMS.ONE_PUMP_ON_MANY_REQ);
    }
    // no thermostatTemp on no thermostat
    if (thermostatTemp && !chosenThermostat) {
      fixableErrors.push(INVALID_MEAS_PARAMS.NO_THERMO_FOR_THERMO_TEMP);
    }

    // if valid
    return {
      hasFixableErrors: fixableErrors.length, fixableErrors, hasUnfixableErrors: unfixableErrors.length, unfixableErrors,
    };
  },
);

export const correctProgramForNodes = createAsyncThunk(
  'measurement/checkValidity',
  async (
    {
      tabId,
      measurementType,
      errors,
    },
    { dispatch, getState },
  ) => {
    if (!errors.length) {
      console.warn('No errors in correction');
      return true;
    }

    const errorFixes = errors.map((error) => INVALID_MEAS_PARAMS_FIX[error]);
    const fixesSet = new Set(errorFixes);

    try {
      if (measurementType === 'chroma') {
        const turnOfPumps = () => {
          dispatch(pumpProgramActions.changePumpMode({ chromoId: tabId, mode: 'none' }));
          console.log('reset pump mode');
        };

        if (fixesSet.has(FIXES.DISABLE_PUMPS)) {
          turnOfPumps();
        }
        if (fixesSet.has(FIXES.DISABLE_THERMOSTAT_TEMP)) {
          dispatch(chromaMiscActions.setThermostatTemp({ id: tabId, newThermostatTemp: null }));
          console.log('reset thermostat');
        }
        if (fixesSet.has(FIXES.DISABLE_CONT_SUP)) {
          dispatch(pumpProgramActions.updateIsocratModalState({ chromoId: tabId, params: { isContinuousSupply: false } }));
          console.log('reset cont sup');
        }

        return true;
      }

      return false; // TODO fix for spectro
    } catch (error) {
      console.error('Faild fixing meas params', error);
      return false;
    }
  },
);

export const startSpectroWithApiCall = createAsyncThunk(
  'measurement/startSpectroWithApiCall',
  async ({ tabId, sourceId }, { getState, dispatch, rejectWithValue }) => {
    const props = { tabId, measurementType: 'spectro' };

    const state = getState();
    const { measurementId, detectorProg } = selectSpectroData(state, props);
    const detectorType = selectDetectorType(state);

    console.log('detectorProg', measurementId, detectorProg);

    dispatch(measurementActions.appendDetectorType({
      id: tabId,
      detectorType,
    }));

    try {
      const response = await axiosSession.post('/api/measurement/spectro/start', {
        measurementId, detectorProg, sourceId,
      });
      dispatch(measurementActions.startMeasurement({ tabId }));
      dispatch(changeTrackerActions.setHasAlteredData(tabId));
      dispatch(spectroPlotsActions.clearMeasuredSpectroData({ tabId }));

      return { data: response.data, measurementId };
    } catch (error) {
      return rejectWithValue(error.response.data || error.message);
    }
  },
);

export const closeSpectroWithApiCall = createAsyncThunk(
  'measurement/closeSpectroWithApiCall',
  async ({
    measurementId, needsToSave,
  }, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const detectorProg = selectSpectroSteps(state, measurementId);
    const detectorParams = selectSpectroDetDepParams(state, measurementId);
    const sourcePath = selectMeasurmentSourcePath(state, measurementId)

    console.log(detectorParams);

    const dataToSave = {
      detectorProg,
      ...detectorParams,
    };

    try {
      const response = await axiosSession.post('/api/measurement/spectro/close', {
        measurementId,
        needsToSave: needsToSave ?? false,
        dataToSave,
        sourcePath
      });

      dispatch(measurementActions.closeMeasurement(measurementId));

      return { result: 'was closed', closedTab: measurementId }; // i need to know closed tab
    } catch (error) {
      console.error('error closing measurement', error);
      return rejectWithValue(error.response.data || error.message);
    }
  },
);

export const saveAsSpectroWithApiCall = createAsyncThunk(
  'measurement/saveAsSpectroWithApiCall',
  async (
    { measurementId, filePath },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState();

      const detectorProg = selectSpectroSteps(state, measurementId);
      const detectorParams = selectSpectroDetDepParams(state, measurementId);

      const dataToSave = {
        detectorProg,
        ...detectorParams,
      };

      const response = await axiosSession.post('/api/measurement/spectro/save-as', {
        measurementId,
        filePath,
        dataToSave,
      });

      // Do not reset as save as counts as separate enitity from original file
      /*       dispatch(changeTrackerActions.resetHasAlteredData(measurementId)) */

      return {
        measurementId,
        filePath,
        result: response.data?.message ?? 'save-as requested',
      };
    } catch (error) {
      console.error('saveAsSpectroWithApiCall failed', measurementId, error);
      return rejectWithValue(
        error.response?.data?.error || error.message,
      );
    }
  },
);

export const stopSpectroWithApiCall = createAsyncThunk(
  'measurement/stopSpectroWithApiCall',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const { streamedMeasurementId } = state.measurementReducer;
    if (!streamedMeasurementId) {
      return rejectWithValue('No active measurement to stop');
    }

    try {
      const response = await axiosSession.post('/api/measurement/spectro/stop', {
        measurementId: streamedMeasurementId,
      });

      /* dispatch(measurementActions.stopMeasurement()) */ // WATCHLIST we trigger last packet with finished status so let system work no invasion in process here
      const { updatedData: processedCurves } = response.data;
      dispatch(spectroPlotsActions.setSpectroProcessedData({ tabId: streamedMeasurementId, curves: processedCurves }));

      return { data: response.data, measurementId: streamedMeasurementId };
    } catch (error) {
      return rejectWithValue(error.response.data || error.message);
    }
  },
);
