import { ApiMocks } from '../classes/index.js';

import {
  chooseMethodDADMock,
  fetchConfigMock,
  fetchMethodsMock,
  fetchNodesMock,
  getDetectorSerialMock
} from "./index.js";
import { chooseMethodNull } from "./methods.js";

// Function to setup all initial mocks
export async function setupInitialMocks(page) {
  const apiMocks = new ApiMocks(page);
  
/*   // Session (POST)
  await apiMocks.mockPost('/api/session/register', sessionRegisterMock); */
  
  // Nodes endpoints 
  await apiMocks.mockGet('/api/nodes/fetchNodes', fetchNodesMock);
  await apiMocks.mockGet('/api/nodes/getDetectorSerial', getDetectorSerialMock);
  
  // Methods endpoints
  await apiMocks.mockGet('/api/methods/fetchMethods', fetchMethodsMock);
  await apiMocks.mockGet('/api/methods/chooseMethod', chooseMethodNull);
  
  // Config endpoint
  await apiMocks.mockGet('/api/config/fetchConfig', fetchConfigMock);

  // CFR endpoint TODO
/*   await apiMocks.mockGet('/api/role/current', roleMock); */

  // poller endpoints  TODO
/*   await apiMocks.mockGet('/api/thermostat', thermostatMock);
  await apiMocks.mockGet('/api/detector', detectorMock);
  await apiMocks.mockGet('/api/pumps', pumpsMock);
  await apiMocks.mockGet('/api/autosampler/fetchAutoState', autosamplerMock);
  await apiMocks.mockGet('/api/errors/fetchErrors', errorsMock); */
  
}