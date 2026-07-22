import { createAsyncThunk } from '@reduxjs/toolkit';

import { nodeActions, selectOwnersSnapshot } from '../../reduxImportDispatcher';
import { axiosSession } from '../../axiosConfig';
import { SERVICE_NODE_NAMES } from '../../../constants/constants';
import { selectChromatographConfigForPost, selectNodesForSession } from '../../selectors/nodes/nodesDerived';
import { selectSessionId } from '../../selectors/session/sessionBase';
import { processNodeConfig } from '../../../utils/configUtils';

export const fetchNodes = createAsyncThunk(
  'nodes/fetchNodes',
  async (_, { dispatch }) => {
    const response = await axiosSession.get('/api/nodes/fetchNodes');

    const result = response.data;
    dispatch(nodeActions.setAvailableNodes(result));

    return result;
  },
);

export const getFirmwareVersions = createAsyncThunk(
  'config/getFirmwareVersions',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.get('/api/nodes/getFirmwareVersions');
      console.log(response.data);
      const versions = response.data;
      dispatch(nodeActions.setFirmwareVersions(versions));
      return versions;
    } catch (error) {
      console.error('Failed fetching firmware versions');
      rejectWithValue(error);
    }
  },
);

export const getDetectorSerial = createAsyncThunk(
  'config/getDetectorSerial',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.get('/api/nodes/getDetectorSerial');
      const {detectorSerialNumber} = response.data;
      console.log('fetched serial', detectorSerialNumber);
      dispatch(nodeActions.setDetectorSerialNum(detectorSerialNumber));
      return detectorSerialNumber;
    } catch (error) {
      console.error('Failed fetching detector serial ');
      rejectWithValue(error);
    }
  },
);

export const postNodeConfig = createAsyncThunk(
  'nodes/postConfig',
  async (configData, { dispatch, getState }) => {
    const { chromatograph } = configData;

    console.group('post config')
    const state = getState()
    const nodesForSession = selectNodesForSession(state)
    console.log('nodes for session', nodesForSession)
    // Process node configuration and collect reset nodes
    const { cleanedData, resetNodes } = processNodeConfig(
      chromatograph.data,
      nodesForSession
    );

    console.log('cleaned', cleanedData)

    if (resetNodes.length > 0) {
      console.log('Nodes reset due to ownership:', resetNodes);
    }

    // there was no established protocol when i made my architecture, so last step convert is nessessary
    const transformedBody = {
      chromatograph: {
        name: chromatograph.name,
        withoutControl: chromatograph.data.withoutControl,
        data: {
          autosampler: {
            ip: chromatograph.data.autosampler.ip,
            comPort:  cleanedData.autosampler.comPort,
            isGetIpAuto: chromatograph.data.autosampler.getIpAuto,
            type: chromatograph.data.autosampler.type,
          },
          detector: {
            portType: chromatograph.data.detector.portType,
            type: chromatograph.data.detector.type,
            name: cleanedData.detector.chosenDetector,
          },
          pumpCount: chromatograph.data.pumps.count,
          pumps: {
            A1: cleanedData.pumps.chosenPumps.A1,
            A2: cleanedData.pumps.chosenPumps.A2,
            B1: cleanedData.pumps.chosenPumps.B1,
            B2: cleanedData.pumps.chosenPumps.B2,
          },
          degasser: {
            name: cleanedData.degasser.chosenDegasser,
          },
          thermostat: {
            name: cleanedData.thermostat.chosenThermostat,
          },
          portType: chromatograph.data.nodesPort,
        },
      },
    };

    console.log('transform', transformedBody)
    console.groupEnd()

    try {
      const response = await axiosSession.post('/api/nodes/postConfig', transformedBody);
      dispatch(nodeActions.setIsLoading(true));
      // Return true if status is 200
      const { pumps: pumpsMeta } = response.data;
      if (pumpsMeta) dispatch(nodeActions.setPumpsMeta({ pumpsMeta }));

      return response.status === 200;
    } catch (error) {
      if (error.response) {
        // If the server responded with a status code outside 2xx
        console.error(
          `Request failed with status ${error.response.status}:`,
          error.response.data.error,
        );
      } else if (error.request) {
        // If the request was made but no response was received
        console.error('No response received from the server:', error.request);
      } else {
        // If something else caused the error
        console.error('Error in setting config:', error.message);
      }
      // Return false explicitly to indicate failure
      return false;
    }
  },
);

export const postCurrentChromatographConfig = createAsyncThunk(
  'nodes/postCurrentChromatographConfig',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    const configData = selectChromatographConfigForPost(state);
    console.log('Posting chromatograph config:', configData);
    try {
      await dispatch(postNodeConfig(configData));
      return true;
    } catch (error) {
      console.error('Failed posting chromatograph config');
      rejectWithValue(error);
      return false;
    }
  }
);