import { test } from "../../fixtures/electronFixtures.js";
import {
  fetchNodesMock,
  getDetectorSerialMock,
  fetchMethodsMock,
  chooseMethodMock,
  fetchConfigMock
} from '../../fixtures/mocks/index.js';

/* test.describe('All Mocks Verification', () => {
  
  test('should mock all endpoints correctly', async ({ window, loggers }) => {
    const logger = loggers.testLogger;
    logger.log('Testing all mocked endpoints in one go');
    
    // Fetch all endpoints in parallel for speed
    const results = await window.evaluate(async () => {
      const endpoints = [
        { url: 'http://localhost:5000/api/nodes/fetchNodes?sessionId=test', name: 'nodes' },
        { url: 'http://localhost:5000/api/nodes/getDetectorSerial?sessionId=test', name: 'detectorSerial' },
        { url: 'http://localhost:5000/api/methods/fetchMethods?sessionId=test', name: 'methods' },
        { url: 'http://localhost:5000/api/methods/chooseMethod?sessionId=test', name: 'chooseMethod' },
        { url: 'http://localhost:5000/api/config/fetchConfig?initSetup=true&sessionId=test', name: 'config' }
      ];
      
      const results = {};
      
      // Fetch all in parallel
      const fetches = endpoints.map(async (endpoint) => {
        try {
          const res = await fetch(endpoint.url);
          const data = await res.json();
          results[endpoint.name] = { success: true, data, status: res.status };
        } catch (error) {
          results[endpoint.name] = { success: false, error: error.message };
        }
      });
      
      await Promise.all(fetches);
      return results;
    });
    
    // Verify each endpoint
    logger.log('=== Verifying /api/nodes/fetchNodes ===');
    expect(results.nodes.success).toBe(true);
    expect(results.nodes.data).toEqual(fetchNodesMock);
    expect(results.nodes.data.autosamplerIps).toEqual(fetchNodesMock.autosamplerIps);
    expect(results.nodes.data.comPortList).toEqual(fetchNodesMock.comPortList);
    expect(results.nodes.data.detectors).toEqual(fetchNodesMock.detectors);
    logger.log('nodes mock verified');
    
    logger.log('=== Verifying /api/nodes/getDetectorSerial ===');
    expect(results.detectorSerial.success).toBe(true);
    expect(results.detectorSerial.data).toEqual(getDetectorSerialMock);
    expect(results.detectorSerial.data.detectorSerialNumber).toBe(getDetectorSerialMock.detectorSerialNumber);
    logger.log('detector serial mock verified');
    
    logger.log('=== Verifying /api/methods/fetchMethods ===');
    expect(results.methods.success).toBe(true);
    expect(results.methods.data).toEqual(fetchMethodsMock);
    expect(results.methods.data.operation).toBe(fetchMethodsMock.operation);
    for (const template of fetchMethodsMock.templates) {
      if (template !== null) {
        expect(results.methods.data.templates).toContain(template);
      }
    }
    logger.log(`methods mock verified (${results.methods.data.templates?.length || 0} templates found)`);
    
    logger.log('=== Verifying /api/methods/chooseMethod ===');
    expect(results.chooseMethod.success).toBe(true);
    expect(results.chooseMethod.data).toEqual(chooseMethodMock);
    expect(results.chooseMethod.data.operation).toBe(chooseMethodMock.operation);
    expect(results.chooseMethod.data.calibrationList).toEqual(chooseMethodMock.calibrationList);
    logger.log('chooseMethod mock verified');
    
    logger.log('=== Verifying /api/config/fetchConfig ===');
    expect(results.config.success).toBe(true);
    expect(results.config.data).toEqual(fetchConfigMock);
    expect(results.config.data.fullVersion).toBe(fetchConfigMock.fullVersion);
    expect(results.config.data.backendVersion).toBe(fetchConfigMock.backendVersion);
    expect(results.config.data.chromatographs.chromatographDefault.detector.type).toBe(
      fetchConfigMock.chromatographs.chromatographDefault.detector.type
    );
    expect(results.config.data.chromatographs.chromatographDefault.detector.name).toBe(
      fetchConfigMock.chromatographs.chromatographDefault.detector.name
    );
    logger.log('config mock verified');
    
    logger.log('All 5 mocks verified successfully!');
  });
}); */