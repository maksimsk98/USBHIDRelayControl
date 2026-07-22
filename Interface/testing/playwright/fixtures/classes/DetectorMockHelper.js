import { DETECTOR_TYPES } from '../../../../src/constants/constants.js';
import { MockStore } from './index.js';
import { fetchConfigMock, chooseMethodDADMock } from '../mocks/index.js';
import { chooseMethodNull, methodsMocksPerDetector } from '../mocks/methods.js';

/**
 * @typedef {Object} DetectorConfig
 * @property {string} type - Detector type (Fluorat, Panorama, DAD, etc.)
 * @property {string} name - Detector name/port
 * @property {string} serial - Detector serial number
 * @property {Object} [baseConfig] - Base config to extend
 * @property {string} [portType] - Port type (usb, com1, etc.)
 */

/**
 * Helper class for managing detector mocks in tests
 */
export default class DetectorMockHelper {
  /**
   * @param {Object} apiMocks - ApiMocks instance from fixture
   */
  constructor(apiMocks) {
    /** @type {Object} */
    this.apiMocks = apiMocks;
    /** @type {MockStore} */
    this.mockStore = new MockStore(apiMocks);
  }

  /**
   * Save initial mock state
   * @returns {Promise<void>}
   */
  async saveInitial() {
    await this.mockStore.save('initial');
  }

  /**
   * Restore initial mock state
   * @returns {Promise<void>}
   */
  async restoreInitial() {
    await this.mockStore.restore('initial');
  }

  /**
   * Setup detector mocks with custom configuration
   * @param {DetectorConfig} config - Detector configuration
   * @returns {Promise<void>}
   */
  async setupDetector(config) {
    const { type, name, serial, baseConfig, portType = 'usb' } = config;
    
    await this.apiMocks.clearAllMocks();
    
    const defaultConfig = baseConfig || fetchConfigMock;
    
    await this.apiMocks.mockGet('/api/config/fetchConfig', {
      ...defaultConfig,
      chromatographs: {
        ...defaultConfig.chromatographs,
        chromatographDefault: {
          ...defaultConfig.chromatographs.chromatographDefault,
          detector: {
            type,
            name,
            portType
          }
        }
      }
    });
    
    await this.apiMocks.mockGet('/api/nodes/getDetectorSerial', {
      detectorSerialNumber: serial
    });
  }

  /**
   * Setup DAD detector
   * @param {string} [name='DADName'] - Detector name
   * @param {string} [serial='DAD 12345'] - Serial number
   * @returns {Promise<void>}
   */
  async setupDAD(name = 'DADName', serial = 'DAD 12345') {
    const detectorType = DETECTOR_TYPES.DAD
    await this.setupDetector({
      type: detectorType,
      name,
      serial,
      portType: 'usb'
    });
    return detectorType
  }

  /**
   * Setup RID detector
   * @param {string} [name='RIDName'] - Detector name
   * @param {string} [serial='RID 12345'] - Serial number
   * @returns {Promise<void>}
   */
  async setupRID(name = 'RIDName', serial = 'RID 12345') {
    const detectorType = DETECTOR_TYPES.RID
    await this.setupDetector({
      type: detectorType,
      name,
      serial,
      portType: 'usb'
    });
    return detectorType
  }

  /**
   * Setup Fluorat detector
   * @param {string} [name='COM3'] - Detector name/port
   * @param {string} [serial='N 10134'] - Serial number
   * @returns {Promise<void>}
   */
  async setupFluorat(name = 'COM3', serial = 'N 10134') {
    await this.setupDetector({
      type: DETECTOR_TYPES.FLUORAT,
      name,
      serial,
      portType: 'com1'
    });
  }

  /**
   * Setup Panorama detector
   * @param {string} [name='Pan1'] - Detector name
   * @param {string} [serial='P 54321'] - Serial number
   * @returns {Promise<void>}
   */
  async setupPanorama(name = 'Pan1', serial = 'P 54321') {
    await this.setupDetector({
      type: DETECTOR_TYPES.PANORAMA,
      name,
      serial,
      portType: 'com3'
    });
  }

  /**
   * Setup SPhDetector
   * @param {string} [name='COM1'] - Detector name/port
   * @param {string} [serial='S 2222'] - Serial number
   * @returns {Promise<void>}
   */
  async setupSPhDetector(name = 'COM1', serial = 'S 2222') {
    await this.setupDetector({
      type: 'SPhDetector',
      name,
      serial,
      portType: 'com1'
    });
  }

  /**
   * Setup SPhDetector2
   * @param {string} [name='Sph2Name'] - Detector name
   * @param {string} [serial='S2 3333'] - Serial number
   * @returns {Promise<void>}
   */
  async setupSPhDetector2(name = 'Sph2Name', serial = 'S2 3333') {
    await this.setupDetector({
      type: 'SPhDetector2',
      name,
      serial,
      portType: 'usb'
    });
  }

  /**
   * Setup a custom detector with full control
   * @param {Object} options - Custom detector options
   * @param {string} options.displayName - Display name for credentials
   * @param {string} options.type - Detector type
   * @param {string} options.name - Detector name
   * @param {string} options.serial - Serial number
   * @returns {Promise<void>}
   */
  async setupCustom({ displayName, type, name, serial }) {
    await this.setupDetector({ type, name, serial });
  }

  async setupMethod(config) {
    const { customMock, detectorType = null, clearAllMocks = true} = config;
    
    if (clearAllMocks) await this.apiMocks.clearAllMocks();
    
    const defaultConfig = chooseMethodNull;

    const detectorFallback = methodsMocksPerDetector[detectorType];

    const effectiveMock = customMock ?? detectorFallback ?? defaultConfig
    
    await this.apiMocks.mockPost('/api/methods/chooseMethod', effectiveMock);
    
    return effectiveMock
  }

  async setupFile(config) {
    const { fileData, clearAllMocks = false } = config;
    
    if (clearAllMocks) {
      await this.apiMocks.clearAllMocks();
    }
    
    await this.apiMocks.mockPost('/api/files/upload', fileData, 200);
    
    return fileData;
  }
}

