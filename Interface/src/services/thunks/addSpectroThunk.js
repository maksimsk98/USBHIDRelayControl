import { createAsyncThunk } from '@reduxjs/toolkit';
import { chooseMethod } from './method/chooseMethodThunk';
import { EMPTY_ARRAY, NOT_GENERAL_METHOD, OPEN_STATES } from '../../constants/constants';
import { spectroPlotsActions } from '../slices/spectroPlotsSlice';
import { spectroMiscActions } from '../reduxImportDispatcher';
import { getCorrectAveragingKey } from '../../utils/spectroSteps';

const {
  spectroStepsActions, selectIsMethodGeneral, fileActions, methodActions, selectSelectedMethodIfGeneral, measurementActions,
} = require('../reduxImportDispatcher');

export const addSpectroThunk = createAsyncThunk(
  'measurement/addChroma',
  async ({
    preId,
    loadedData,
    shouldOpen = false,
    fileCategory = null,
    fileHash = null,
    packageId = null,
    path = null,
  }, { dispatch, getState }) => {
    try {
      const {
        measurementProgram = null,
        curves = EMPTY_ARRAY,
        detectorType,
        measurementTemplateName = null,
        smoothingFactor: factor = null,
        smoothingMinLevel: threshold = null,

        sensitivity = null,
        correction = null,
        averaging = null,
      } = loadedData || {}; // If something is not present in JSON, it will be undefined during destructuring

      const measurementType = 'spectro';
      const state = getState();

      console.log('INSTRUMENT NAME', detectorType);

      // if file id is name(that is id for meas) + hash
      const id = loadedData ? `${preId}_${fileHash}` : preId;

      // common
      dispatch(spectroStepsActions.addSpectro({ id, stepsData: measurementProgram }));
      const spectroMiscPatrial = {
        factor,
        threshold,
        selectedBackgroundIndex: loadedData ? null : 0,
      };
      dispatch(spectroMiscActions.addSpectro({ tabId: id, initData: spectroMiscPatrial }));
      // file or meas fork
      if (loadedData) { // means it is file
        console.log('OPENED');
        const isLoadedMethodGeneral = selectIsMethodGeneral(state, { method: measurementTemplateName });

        if (isLoadedMethodGeneral) {
          await dispatch(chooseMethod({ selectedMethod: measurementTemplateName, allowTemplateOverwrite: false }));
        }

        dispatch(fileActions.openFile({
          id,
          name: preId,
          type: measurementType,
          method: measurementTemplateName,
          /* calibration: null, */
          detectorType,
          openState: shouldOpen ? OPEN_STATES.QUEUE : OPEN_STATES.CLOSED,
          category: fileCategory,
          hash: fileHash,
          packageId,
          path,
        }));

        dispatch(methodActions.addFileMethod({ fileId: id, newMethod: measurementTemplateName }));
        dispatch(spectroPlotsActions.setSpectroProcessedData({ tabId: id, curves }));
        dispatch(
          spectroStepsActions.updateSpectroParam({
            tabId: id,
            name: 'sensitivity',
            value: sensitivity,
          }),
        );
        dispatch(
          spectroStepsActions.updateSpectroParam({
            tabId: id,
            name: 'correction',
            value: correction,
          }),
        );
        dispatch(
          spectroStepsActions.updateSpectroParam({
            tabId: id,
            name: getCorrectAveragingKey(detectorType),
            value: averaging,
          }),
        );
      } else {
        console.log('FRESH');
        let selectedMethod = selectSelectedMethodIfGeneral(state);
        // when creating new measurement from opened file needs to fall back to null to not keep inexplicit data
        if (selectedMethod === NOT_GENERAL_METHOD) {
          selectedMethod = null;
        }

        dispatch(measurementActions.addMeasurement({
          id, type: 'spectro', method: selectedMethod, shouldOpen,
        }));

        return {
          id, type: 'spectro', method: selectedMethod, shouldOpen,
        };
      }
    } catch (error) {
      console.error(error);
    }
  },
);
