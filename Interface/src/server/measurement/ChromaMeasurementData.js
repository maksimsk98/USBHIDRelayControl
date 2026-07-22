// chromaMeasurementData.js
const _ = require('lodash');
const util = require('util');

class ChromaMeasurementData {
  constructor(measurementName, customInitValues = {}) {
    this.measurementName = measurementName;
    this.initValues(customInitValues);
  }

  // Define all initial values with ability to override
  initValues(customInitValues = {}) {
    // Default initial values
    const defaults = {
      measuredChromatogram: { x: [], y: [] },
      signalPhoto: { x: [], y: [] },
      signalRef: { x: [], y: [] },
      activeStep: 0,
      pumpProgramStage: 0,
      status: '',
      isAfterUpdate: false,
      photoParams: {},
      referenceParams: {},
      mainParams: {},
      batches: [],
    };

    // Deep merge defaults with custom values
    this._initialValues = _.merge({}, defaults, customInitValues);

    // Set current values to initial values
    this.resetAll('toInit'); // Use toInit for initial setup
  }

  // Reset a single field with mode option
  resetField(field, mode = 'toEmpty') {
    const initialValue = this._initialValues[field];
    
    if (mode === 'toEmpty') {
      // Lightweight reset - just clear the structure
      if (Array.isArray(initialValue)) {
        this[field] = [];
      } else if (_.isPlainObject(initialValue)) {
        // Special handling for our specific object structures
        if (field === 'measuredChromatogram' || field === 'signalPhoto' || field === 'signalRef') {
          // For these, we need to keep the { x: [], y: [] } structure
          if (this[field]) {
            // Clear existing arrays
            if (this[field].x) this[field].x.length = 0;
            if (this[field].y) this[field].y.length = 0;
          } else {
            // Create new structure if it doesn't exist
            this[field] = { x: [], y: [] };
          }
        } else if (field === 'photoParams' || field === 'referenceParams' || field === 'mainParams') {
          // For param objects, just create empty object
          this[field] = {};
        } else {
          // For other plain objects, create empty object
          this[field] = {};
        }
      } else {
        this[field] = initialValue;
      }
    } else if (mode === 'toInit') {
      // Full reset - deep clone everything for correctness
      this[field] = _.cloneDeep(initialValue);
    }
  }

  // Reset specific fields with mode option
  resetFields(fields = [], mode = 'toEmpty') {
    if (_.isEmpty(fields)) {
      // If no fields specified, reset everything
      return this.resetAll(mode);
    }

    fields.forEach(field => {
      if (_.has(this._initialValues, field)) {
        this.resetField(field, mode);
      }
    });
  }

  // Reset everything with mode option
  resetAll(mode = 'toEmpty') {
    Object.keys(this._initialValues).forEach(key => {
      this.resetField(key, mode);
    });
  }

  // Clear all stored data
  clearStoredData() {
    this.resetAll('toEmpty');
  }

  // Clear only point data - ALWAYS use toEmpty for performance
  clearPointsOnly() {
    // Fast array clearing
    this.measuredChromatogram.x.length = 0;
    this.measuredChromatogram.y.length = 0;
    this.signalPhoto.x.length = 0;
    this.signalPhoto.y.length = 0;
    this.signalRef.x.length = 0;
    this.signalRef.y.length = 0;
    
    // Fast object clearing
    this.photoParams = {};
    this.referenceParams = {};
    this.mainParams = {};
    
    // Reset flag
    this.isAfterUpdate = false;
  }

  // Clear point data from batches - use toEmpty for performance
  clearPointDataFromBatches() {
    // Fast clearing of batch data
    for (let i = 0; i < this.batches.length; i++) {
      this.batches[i].measuredChromatogram.x.length = 0;
      this.batches[i].measuredChromatogram.y.length = 0;
      this.batches[i].signalPhoto.x.length = 0;
      this.batches[i].signalPhoto.y.length = 0;
      this.batches[i].signalRef.x.length = 0;
      this.batches[i].signalRef.y.length = 0;
      
      this.batches[i].photoParams = {};
      this.batches[i].referenceParams = {};
      this.batches[i].mainParams = {};
    }
  }

  // Get data for /listen endpoint (optimized for performance)
  getDataForListen() {
    try {
      
      // Check for batches first
      if (!_.isEmpty(this.batches)) {
        const batchToSend = this.batches.shift();
        console.info(`sending batch ${JSON.stringify(batchToSend)}`);
        return batchToSend;
      }
  
      // Create response data with minimal cloning
      const data = {
        measuredChromatogram: {
          x: this.measuredChromatogram.x.slice(), // Shallow copy
          y: this.measuredChromatogram.y.slice(),
        },
        signalPhoto: {
          x: this.signalPhoto.x.slice(),
          y: this.signalPhoto.y.slice(),
        },
        signalRef: {
          x: this.signalRef.x.slice(),
          y: this.signalRef.y.slice(),
        },
        activeStep: this.activeStep,
        pumpProgramStage: this.pumpProgramStage,
        status: this.status,
        isAfterUpdate: this.isAfterUpdate,
        photoParams: _.clone(this.photoParams),
        referenceParams: _.clone(this.referenceParams),
        mainParams: _.clone(this.mainParams),
      };
  
      // Clear points after sending (fast operation)
      this.clearPointsOnly();
      return data;
    } catch (error) {
      console.log(error)
      console.log(this)
      return null
    }
  }

  // Add current state as a batch
  addBatch() {
    this.batches.push({
      measuredChromatogram: {
        x: this.measuredChromatogram.x.slice(),
        y: this.measuredChromatogram.y.slice(),
      },
      signalPhoto: {
        x: this.signalPhoto.x.slice(),
        y: this.signalPhoto.y.slice(),
      },
      signalRef: {
        x: this.signalRef.x.slice(),
        y: this.signalRef.y.slice(),
      },
      activeStep: this.activeStep,
      pumpProgramStage: this.pumpProgramStage,
      status: this.status,
      isAfterUpdate: this.isAfterUpdate,
      photoParams: _.clone(this.photoParams),
      referenceParams: _.clone(this.referenceParams),
      mainParams: _.clone(this.mainParams),
      ts: Date.now(),
    });

    this.clearPointsOnly();
  }

  // Append data efficiently (for streaming)
  appendData(newData = {}) {
    const {
      measuredChromatogram,
      signalPhoto,
      signalRef,
      ...otherData
    } = newData;

    // Fast array appends
    if (measuredChromatogram?.x) {
      this.measuredChromatogram.x.push(...measuredChromatogram.x);
      this.measuredChromatogram.y.push(...measuredChromatogram.y);
    }
    
    if (signalPhoto?.x) {
      this.signalPhoto.x.push(...signalPhoto.x);
      this.signalPhoto.y.push(...signalPhoto.y);
    }
    
    if (signalRef?.x) {
      this.signalRef.x.push(...signalRef.x);
      this.signalRef.y.push(...signalRef.y);
    }

    // Update other properties
    Object.assign(this, otherData);
  }

  updateInitialValues(newInitValues = {}) {
    _.merge(this._initialValues, newInitValues);
  }

  // Reinitialize with custom values (uses toInit mode)
  reinitialize(customInitValues = {}) {
    this.updateInitialValues(customInitValues);
    this.resetAll('toInit');
  }

  getInitialValues() {
    return _.cloneDeep(this._initialValues);
  }

  // Check if measurement has data
  hasData() {
    return this.measuredChromatogram.x.length > 0 || 
           this.signalPhoto.x.length > 0 || 
           this.signalRef.x.length > 0;
  }

  // Get all data (choose cloning level)
  getAllData(cloneLevel = 'shallow') {
    const result = {
      measurementName: this.measurementName,
    };

    Object.keys(this._initialValues).forEach(key => {
      if (cloneLevel === 'shallow') {
        if (Array.isArray(this[key])) {
          result[key] = this[key].slice();
        } else if (_.isPlainObject(this[key])) {
          result[key] = _.clone(this[key]);
        } else {
          result[key] = this[key];
        }
      } else if (cloneLevel === 'deep') {
        result[key] = _.cloneDeep(this[key]);
      } else if (cloneLevel === 'none') {
        // Warning: returns references
        result[key] = this[key];
      }
    });

    return result;
  }

  // Static method to get default initial values
  static getDefaultInitValues() {
    return {
      measuredChromatogram: { x: [], y: [] },
      signalPhoto: { x: [], y: [] },
      signalRef: { x: [], y: [] },
      activeStep: 0,
      pumpProgramStage: 0,
      status: '',
      isAfterUpdate: false,
      photoParams: {},
      referenceParams: {},
      mainParams: {},
      batches: [],
    };
  }

  // This is what Node.js uses for console.log
  [util.inspect.custom](depth, options) {
    return {
      measurementName: this.measurementName,
      measuredChromatogram: this.measuredChromatogram,
      signalPhoto: this.signalPhoto,
      signalRef: this.signalRef,
      activeStep: this.activeStep,
      pumpProgramStage: this.pumpProgramStage,
      status: this.status,
      isAfterUpdate: this.isAfterUpdate,
      photoParams: this.photoParams,
      referenceParams: this.referenceParams,
      mainParams: this.mainParams,
      batches: this.batches,
      // Optional: Add type indicator
      [util.inspect.custom]: 'ChromaMeasurementData'
    };
  }
}

module.exports = ChromaMeasurementData;