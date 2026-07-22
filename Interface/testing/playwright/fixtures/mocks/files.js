import { DETECTOR_FULL_NAMES, DETECTOR_TYPES } from "../../../../src/constants/constants";

export const mockOpenChromaLumexFile = [
    {
        "path": "D:\\PEAK_EXPERT_WEB\\Interface\\testing\\playwright\\fixtures\\mocks\\mockChroma.mdfx",
        "fileName": "mockChroma.mdfx",
        "hash": "70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8",
        "id": "mockChroma.mdfx_70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8"
    }
]

export const mockOpenChromaLumexEmpty = {
  "message": "Success",
  "responseData": [
    {
      "status": "fulfilled",
      "data": {
        "additionalStage": {
          "maxDuration": 0,
          "threshold": 0,
          "window": 0
        },
        "archiveCalibrationName": "",
        "automarkupParameters": {
          "markStart": 0,
          "minHalfWidth": 5,
          "minHeight": 0
        },
        "calibrationTable": {
          "substances": []
        },
        "chromaMiscData": {
          "averaging": 1,
          "thermostatTemp": 25
        },
        "chromatogramDateTime": "2024-04-18 11:29",
        "chromatogramFileName": "D:/PEAK_EXPERT_WEB/Interface/testing/playwright/fixtures/mocks/mockChroma.mdfx",
        "chromatographNumber": "",
        "detectorFabricNumber": "002",
        "detectorName": "СФЛД 320",
        "detectorType": "Panorama2",
        "integration": {
          "isSmoothingAdaptiveChecked": true,
          "isSmoothingCubicChecked": false,
          "isSmoothingDoubleChecked": false,
          "isSmoothingPulseChecked": true,
          "maxRelation": 15,
          "searchWindow": 2,
          "useDriftCompensation": false,
          "useRelativeTimes": true
        },
        "operatorName": "111",
        "passport": {
          "calibration": false,
          "columnNum": "",
          "comment": "",
          "eluentA": "",
          "eluentB": "",
          "extendedName": "",
          "precolumn": false,
          "sampleName": "EPA_дегазация",
          "sorbent": ""
        },
        "peakTable": [
          {
            "area": 0.542,
            "asymmetry": 0.488767,
            "efficiency": 6176.34,
            "halfwidth": 16.2,
            "height": 0.0323,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": null,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 489,
            "masterPeakNumber": null,
            "peakNumber": 1,
            "pvLeft": 0,
            "pvRight": 0,
            "resolution": 5.65962,
            "riderPeakNumbers": [],
            "rightBoundary": 543.2,
            "time": 525.6
          },
          {
            "area": 1.6018,
            "asymmetry": 0.781883,
            "efficiency": 16046.3,
            "halfwidth": 11.9,
            "height": 0.1225,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": true,
            "isNotSeparatedRightEnable": true,
            "isNotSeparatedWithNum": 3,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 624.4,
            "masterPeakNumber": null,
            "peakNumber": 2,
            "pvLeft": 0,
            "pvRight": 60.3808,
            "resolution": 1.35613,
            "riderPeakNumbers": [],
            "rightBoundary": 675.6,
            "time": 661
          },
          {
            "area": 0.1424,
            "asymmetry": 0.777169,
            "efficiency": 19141.6,
            "halfwidth": 11.7,
            "height": 0.0114,
            "isMasterPeak": false,
            "isNotSeparatedLeft": true,
            "isNotSeparatedLeftEnable": true,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": 2,
            "isRiderEnable": true,
            "isRiderPeak": false,
            "leftBoundary": 675.6,
            "masterPeakNumber": null,
            "peakNumber": 3,
            "pvLeft": 5.6343,
            "pvRight": 0,
            "resolution": 2.87053,
            "riderPeakNumbers": [],
            "rightBoundary": 706.8,
            "time": 688
          },
          {
            "area": 0.1131,
            "asymmetry": 0.886853,
            "efficiency": 27948.1,
            "halfwidth": 10.5,
            "height": 0.0102,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": null,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 725.6,
            "masterPeakNumber": null,
            "peakNumber": 4,
            "pvLeft": 0,
            "pvRight": 0,
            "resolution": 3.01308,
            "riderPeakNumbers": [],
            "rightBoundary": 755.6,
            "time": 741.6
          },
          {
            "area": 0.1118,
            "asymmetry": 0.893907,
            "efficiency": 35483.9,
            "halfwidth": 9.9,
            "height": 0.0106,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": null,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 776.4,
            "masterPeakNumber": null,
            "peakNumber": 5,
            "pvLeft": 0,
            "pvRight": 0,
            "resolution": 3.57079,
            "riderPeakNumbers": [],
            "rightBoundary": 809.6,
            "time": 793.6
          },
          {
            "area": 0.1877,
            "asymmetry": 1.00607,
            "efficiency": 41556.1,
            "halfwidth": 9.7,
            "height": 0.0179,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": true,
            "isNotSeparatedRightEnable": true,
            "isNotSeparatedWithNum": 7,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 835,
            "masterPeakNumber": null,
            "peakNumber": 6,
            "pvLeft": 0,
            "pvRight": 124.4,
            "resolution": 2.03186,
            "riderPeakNumbers": [],
            "rightBoundary": 872.8,
            "time": 853
          },
          {
            "area": 0.0334,
            "asymmetry": 1.03797,
            "efficiency": 38262.3,
            "halfwidth": 10,
            "height": 0.0029,
            "isMasterPeak": false,
            "isNotSeparatedLeft": true,
            "isNotSeparatedLeftEnable": true,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": 6,
            "isRiderEnable": true,
            "isRiderPeak": false,
            "leftBoundary": 872.8,
            "masterPeakNumber": null,
            "peakNumber": 7,
            "pvLeft": 20.4545,
            "pvRight": 0,
            "resolution": 9.48928,
            "riderPeakNumbers": [],
            "rightBoundary": 920.2,
            "time": 887
          },
          {
            "area": 0.1981,
            "asymmetry": 1.08933,
            "efficiency": 61456.5,
            "halfwidth": 9.7,
            "height": 0.0187,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": true,
            "isNotSeparatedRightEnable": true,
            "isNotSeparatedWithNum": 9,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 1028.4,
            "masterPeakNumber": null,
            "peakNumber": 8,
            "pvLeft": 0,
            "pvRight": 62.1221,
            "resolution": 1.8421,
            "riderPeakNumbers": [],
            "rightBoundary": 1063.6,
            "time": 1045.6
          },
          {
            "area": 0.0942,
            "asymmetry": 1.06219,
            "efficiency": 58819.4,
            "halfwidth": 10.2,
            "height": 0.0085,
            "isMasterPeak": false,
            "isNotSeparatedLeft": true,
            "isNotSeparatedLeftEnable": true,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": 8,
            "isRiderEnable": true,
            "isRiderPeak": false,
            "leftBoundary": 1063.6,
            "masterPeakNumber": null,
            "peakNumber": 9,
            "pvLeft": 28.0504,
            "pvRight": 0,
            "resolution": 7.42585,
            "riderPeakNumbers": [],
            "rightBoundary": 1106.6,
            "time": 1076.6
          },
          {
            "area": 0.5085,
            "asymmetry": 1.17699,
            "efficiency": 67074.3,
            "halfwidth": 10.6,
            "height": 0.0435,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": null,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 1188.6,
            "masterPeakNumber": null,
            "peakNumber": 10,
            "pvLeft": 0,
            "pvRight": 0,
            "resolution": 3.585,
            "riderPeakNumbers": [],
            "rightBoundary": 1239.8,
            "time": 1207.2
          },
          {
            "area": 1.3137,
            "asymmetry": 1.10169,
            "efficiency": 72475.8,
            "halfwidth": 10.8,
            "height": 0.1109,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": true,
            "isNotSeparatedRightEnable": true,
            "isNotSeparatedWithNum": 12,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 1253.6,
            "masterPeakNumber": null,
            "peakNumber": 11,
            "pvLeft": 0,
            "pvRight": 99.4585,
            "resolution": 2.14324,
            "riderPeakNumbers": [],
            "rightBoundary": 1295,
            "time": 1272
          },
          {
            "area": 0.9107,
            "asymmetry": 1.07943,
            "efficiency": 71158.4,
            "halfwidth": 11.1,
            "height": 0.0739,
            "isMasterPeak": false,
            "isNotSeparatedLeft": true,
            "isNotSeparatedLeftEnable": true,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": 11,
            "isRiderEnable": true,
            "isRiderPeak": false,
            "leftBoundary": 1295,
            "masterPeakNumber": null,
            "peakNumber": 12,
            "pvLeft": 66.2517,
            "pvRight": 0,
            "resolution": 5.98719,
            "riderPeakNumbers": [],
            "rightBoundary": 1348.2,
            "time": 1311.6
          },
          {
            "area": 0.5375,
            "asymmetry": 0.883287,
            "efficiency": 93889.3,
            "halfwidth": 11.5,
            "height": 0.0461,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": true,
            "isNotSeparatedRightEnable": true,
            "isNotSeparatedWithNum": 14,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 1407.4,
            "masterPeakNumber": null,
            "peakNumber": 13,
            "pvLeft": 0,
            "pvRight": 2.51023,
            "resolution": 0.838683,
            "riderPeakNumbers": [],
            "rightBoundary": 1433.6,
            "time": 1425
          },
          {
            "area": 0.5855,
            "asymmetry": 1.6817,
            "efficiency": 68302.8,
            "halfwidth": 13.3,
            "height": 0.0423,
            "isMasterPeak": false,
            "isNotSeparatedLeft": true,
            "isNotSeparatedLeftEnable": true,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": 13,
            "isRiderEnable": true,
            "isRiderPeak": false,
            "leftBoundary": 1433.6,
            "masterPeakNumber": null,
            "peakNumber": 14,
            "pvLeft": 2.30439,
            "pvRight": 0,
            "resolution": 2.43852,
            "riderPeakNumbers": [],
            "rightBoundary": 1469.6,
            "time": 1442.2
          },
          {
            "area": 0.1369,
            "asymmetry": 1.34832,
            "efficiency": 78266.7,
            "halfwidth": 11.8,
            "height": 0.0102,
            "isMasterPeak": false,
            "isNotSeparatedLeft": false,
            "isNotSeparatedLeftEnable": false,
            "isNotSeparatedRight": false,
            "isNotSeparatedRightEnable": false,
            "isNotSeparatedWithNum": null,
            "isRiderEnable": false,
            "isRiderPeak": false,
            "leftBoundary": 1476.4,
            "masterPeakNumber": null,
            "peakNumber": 15,
            "pvLeft": 0,
            "pvRight": 0,
            "resolution": null,
            "riderPeakNumbers": [],
            "rightBoundary": 1543,
            "time": 1493
          }
        ],
        "plotsData": {
          "backgroundChromatogram": {
            "x": [],
            "y": []
          },
          "calculatedChromatogram": {
            "x": [],
            "y": []
          },
          "columnTemp": {
            "x": [],
            "y": []
          },
          "flowRateA1Points": {
            "x": [],
            "y": []
          },
          "flowRateA2Points": {
            "x": [],
            "y": []
          },
          "flowRateB1Points": {
            "x": [],
            "y": []
          },
          "flowRateB2Points": {
            "x": [],
            "y": []
          },
          "mainParams": {
            "absMSD": 0.012007701884841689,
            "range": 0.05027559883950768,
            "relMSD": 151.8471477260275,
            "signal": 0.007907755966879778
          },
          "measuredChromatogram": {
            "x": [],
            "y": []
          },
          "photoParams": {
            "absMSD": 1.3507062164216412,
            "range": 7.477750910616962,
            "relMSD": 9.308965129024745,
            "signal": 14.509735482951028
          },
          "pressureA1Points": {
            "x": [],
            "y": []
          },
          "pressureA2Points": {
            "x": [],
            "y": []
          },
          "pressureB1Points": {
            "x": [],
            "y": []
          },
          "pressureB2Points": {
            "x": [],
            "y": []
          },
          "referenceParams": {
            "absMSD": 2.93543179475822,
            "range": 21.974068513035675,
            "relMSD": 5.469794193812755,
            "signal": 53.66622016745494
          },
          "roomTemp": {
            "x": [],
            "y": []
          },
          "signalPhoto": {
            "x": [],
            "y": []
          },
          "signalRef": {
            "x": [],
            "y": []
          }
        },
        "pumpName": "Н 330",
        "pumpNumber1": "0021",
        "pumpNumber2": "0023",
        "pumpNumber3": "",
        "pumpNumber4": "",
        "pumpProgramData": {
          "gradientProgram": {
            "conditioningTime": 5,
            "fillFlowRate": 0,
            "isAutoFill": false,
            "isContinuousSupply": false,
            "restartAfterStop": true,
            "startFlowRate": 2000,
            "startPressure": 1,
            "startVolume": 20000,
            "steps": [
              {
                "A_H": 70,
                "A_K": 0,
                "B_H": 30,
                "B_K": 100,
                "flowRate": 300,
                "from": 0,
                "to": 25
              },
              {
                "A_H": 0,
                "A_K": 0,
                "B_H": 100,
                "B_K": 100,
                "flowRate": 300,
                "from": 25,
                "to": 26
              }
            ],
            "switchingTime": 4,
            "workingVolume": 1200
          },
          "pumpMode": "gradient"
        },
        "reportCalcParams": {
          "noiseEval": null
        },
        "reportSectionChecks": {
          "generalParams": {
            "calibration": false,
            "calibrationTable": false,
            "chromatogram": false,
            "chromatograph": false,
            "column": false,
            "comment": false,
            "detector": false,
            "detectorProgram": false,
            "eluent": false,
            "header": false,
            "noiseEval": false,
            "peakTable": false,
            "pumpProgram": false,
            "pumps": false,
            "sample": false,
            "thermostat": false
          },
          "peakParams": {
            "area": false,
            "asymmetry": false,
            "componentName": false,
            "concentration": false,
            "efficiency": false,
            "exitTime": false,
            "halfWidth": false,
            "height": false,
            "number": false,
            "peakValley": false,
            "relativeTime": false,
            "resolution": false
          }
        },
        "sampleNamePart1": "EPA_дегазация",
        "sampleNamePart2": "",
        "sampleVolume": "",
        "selectedCalibrationName": "",
        "selectedTemplateName": "ПАУ_300",
        "stepsData": [
          {
            "component": "",
            "from": 0,
            "lambdaEx": 275,
            "lambdaReg": 350,
            "sensitivity": "medium",
            "to": 756
          },
          {
            "component": "",
            "from": 756,
            "lambdaEx": 260,
            "lambdaReg": 420,
            "sensitivity": "medium",
            "to": 810
          },
          {
            "component": "",
            "from": 810,
            "lambdaEx": 270,
            "lambdaReg": 440,
            "sensitivity": "medium",
            "to": 930
          },
          {
            "component": "",
            "from": 930,
            "lambdaEx": 260,
            "lambdaReg": 420,
            "sensitivity": "medium",
            "to": 1110
          },
          {
            "component": "",
            "from": 1110,
            "lambdaEx": 290,
            "lambdaReg": 430,
            "sensitivity": "medium",
            "to": 1470
          },
          {
            "component": "",
            "from": 1470,
            "lambdaEx": 250,
            "lambdaReg": 500,
            "sensitivity": "medium",
            "to": 1560
          }
        ],
        "thermostatName": "ТК 340",
        "thermostatNumber": "0123",
        "type": "chroma"
      },
      "fileName": "mockChroma.mdfx",
      "queueNames": [
        "mockChroma.mdfx_70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8_set",
        "mockChroma.mdfx_70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8_reqv"
      ],
      "hash": "70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8",
      "path": "D:\\PEAK_EXPERT_WEB\\Interface\\testing\\playwright\\fixtures\\mocks\\mockChroma.mdfx",
      "resolverKey": "mockChroma.mdfx_70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8"
    }
  ]
}

// factories/fileDataFactory.js


/**
 * Generate linear x=y plot points from stepsData
 * @param {Array} stepsData - Array of steps with from/to values
 * @returns {Object} Plot data with x and y arrays
 */
const generatePlotPoints = (stepsData) => {
  if (!stepsData || stepsData.length === 0) {
    return { x: [], y: [] };
  }
  
  // Get max time from last step's 'to' value
  const maxTime = stepsData[stepsData.length - 1].to;
  
  // Generate points from 0 to maxTime with step of 1
  const points = [];
  for (let i = 0; i <= maxTime; i++) {
    points.push(i);
  }
  
  return { x: points, y: points };
};

/**
 * Generate measured chromatogram from stepsData
 * @param {Array} stepsData - Array of steps with from/to values
 * @returns {Object} Measured chromatogram with x and y arrays
 */
const generateMeasuredChromatogram = (stepsData) => {
  if (!stepsData || stepsData.length === 0) {
    return { x: [], y: [] };
  }
  
  const maxTime = stepsData[stepsData.length - 1].to;
  const x = [];
  const y = [];
  
  for (let i = 0; i <= maxTime; i++) {
    x.push(i);
    // Simple linear function: y = x (or any other pattern)
    y.push(i);
  }
  
  return { x, y };
};

/**
 * Factory to create file data with customizable properties
 * @param {Object} props - Custom properties to override defaults
 * @returns {Object} Complete file data object
 */

export const createFileData = (props = {}) => {
  const {
    selectedTemplateName = "ПАУ_300",
    sampleNamePart1 = "EPA_дегазация",
    stepsData = [
      {
        component: "",
        from: 0,
        lambdaEx: 275,
        lambdaReg: 350,
        sensitivity: "medium",
        to: 756
      },
      {
        component: "",
        from: 756,
        lambdaEx: 260,
        lambdaReg: 420,
        sensitivity: "medium",
        to: 810
      },
      {
        component: "",
        from: 810,
        lambdaEx: 270,
        lambdaReg: 440,
        sensitivity: "medium",
        to: 930
      },
      {
        component: "",
        from: 930,
        lambdaEx: 260,
        lambdaReg: 420,
        sensitivity: "medium",
        to: 1110
      },
      {
        component: "",
        from: 1110,
        lambdaEx: 290,
        lambdaReg: 430,
        sensitivity: "medium",
        to: 1470
      },
      {
        component: "",
        from: 1470,
        lambdaEx: 250,
        lambdaReg: 500,
        sensitivity: "medium",
        to: 1560
      }
    ],
    params = {},
    plotsData = {},
    peakTable = [
      {
        area: 0.542,
        asymmetry: 0.488767,
        efficiency: 6176.34,
        halfwidth: 16.2,
        height: 0.0323,
        isMasterPeak: false,
        isNotSeparatedLeft: false,
        isNotSeparatedLeftEnable: false,
        isNotSeparatedRight: false,
        isNotSeparatedRightEnable: false,
        isNotSeparatedWithNum: null,
        isRiderEnable: false,
        isRiderPeak: false,
        leftBoundary: 489,
        masterPeakNumber: null,
        peakNumber: 1,
        pvLeft: 0,
        pvRight: 0,
        resolution: 5.65962,
        riderPeakNumbers: [],
        rightBoundary: 543.2,
        time: 525.6
      }
    ],
    detectorType = "Panorama2",
    detectorName = "СФЛД 320",
    pumpName = "Н 330",
    thermostatName = "ТК 340",
    chromatogramFileName = "D:/PEAK_EXPERT_WEB/Interface/testing/playwright/fixtures/mocks/mockChroma.mdfx",
    operatorName = "111",
    chromatogramDateTime = "2024-04-18 11:29",
    integration = {
      isSmoothingAdaptiveChecked: true,
      isSmoothingCubicChecked: false,
      isSmoothingDoubleChecked: false,
      isSmoothingPulseChecked: true,
      maxRelation: 15,
      searchWindow: 2,
      useDriftCompensation: false,
      useRelativeTimes: true
    },
    passport = {
      calibration: false,
      columnNum: "",
      comment: "",
      eluentA: "",
      eluentB: "",
      extendedName: "",
      precolumn: false,
      sampleName: sampleNamePart1,
      sorbent: ""
    },
    pumpProgramData = {
      gradientProgram: {
        conditioningTime: 5,
        fillFlowRate: 0,
        isAutoFill: false,
        isContinuousSupply: false,
        restartAfterStop: true,
        startFlowRate: 2000,
        startPressure: 1,
        startVolume: 20000,
        steps: [
          {
            A_H: 70,
            A_K: 0,
            B_H: 30,
            B_K: 100,
            flowRate: 300,
            from: 0,
            to: 25
          },
          {
            A_H: 0,
            A_K: 0,
            B_H: 100,
            B_K: 100,
            flowRate: 300,
            from: 25,
            to: 26
          }
        ],
        switchingTime: 4,
        workingVolume: 1200
      },
      pumpMode: "gradient"
    }
  } = props;

  // Generate plot points from stepsData if not provided
  const maxTime = stepsData[stepsData.length - 1]?.to || 0;
  const linearPoints = generatePlotPoints(stepsData);
  const measuredChromatogram = generateMeasuredChromatogram(stepsData);
  
  const defaultPlotsData = {
    backgroundChromatogram: { x: [], y: [] },
    calculatedChromatogram: { x: [], y: [] },
    columnTemp: { x: [], y: [] },
    flowRateA1Points: { x: [], y: [] },
    flowRateA2Points: { x: [], y: [] },
    flowRateB1Points: { x: [], y: [] },
    flowRateB2Points: { x: [], y: [] },
    mainParams: {
      absMSD: 0.012007701884841689,
      range: 0.05027559883950768,
      relMSD: 151.8471477260275,
      signal: 0.007907755966879778
    },
    measuredChromatogram,
    photoParams: {
      absMSD: 1.3507062164216412,
      range: 7.477750910616962,
      relMSD: 9.308965129024745,
      signal: 14.509735482951028
    },
    pressureA1Points: { x: [], y: [] },
    pressureA2Points: { x: [], y: [] },
    pressureB1Points: { x: [], y: [] },
    pressureB2Points: { x: [], y: [] },
    referenceParams: {
      absMSD: 2.93543179475822,
      range: 21.974068513035675,
      relMSD: 5.469794193812755,
      signal: 53.66622016745494
    },
    roomTemp: { x: [], y: [] },
    signalPhoto: linearPoints,
    signalRef: linearPoints
  };

  const finalPlotsData = { ...defaultPlotsData, ...plotsData };

  return {
    message: "Success",
    responseData: [
      {
        status: "fulfilled",
        data: {
          additionalStage: {
            maxDuration: 0,
            threshold: 0,
            window: 0
          },
          archiveCalibrationName: "",
          automarkupParameters: {
            markStart: 0,
            minHalfWidth: 5,
            minHeight: 0
          },
          calibrationTable: {
            substances: []
          },
          chromaMiscData: {
            averaging: 1,
            thermostatTemp: 25
          },
          chromatogramDateTime,
          chromatogramFileName,
          chromatographNumber: "",
          detectorFabricNumber: "002",
          detectorName,
          detectorType,
          integration,
          operatorName,
          passport,
          peakTable,
          plotsData: finalPlotsData,
          pumpName,
          pumpNumber1: "0021",
          pumpNumber2: "0023",
          pumpNumber3: "",
          pumpNumber4: "",
          pumpProgramData,
          reportCalcParams: {
            noiseEval: null
          },
          reportSectionChecks: {
            generalParams: {
              calibration: false,
              calibrationTable: false,
              chromatogram: false,
              chromatograph: false,
              column: false,
              comment: false,
              detector: false,
              detectorProgram: false,
              eluent: false,
              header: false,
              noiseEval: false,
              peakTable: false,
              pumpProgram: false,
              pumps: false,
              sample: false,
              thermostat: false
            },
            peakParams: {
              area: false,
              asymmetry: false,
              componentName: false,
              concentration: false,
              efficiency: false,
              exitTime: false,
              halfWidth: false,
              height: false,
              number: false,
              peakValley: false,
              relativeTime: false,
              resolution: false
            }
          },
          sampleNamePart1,
          sampleNamePart2: "",
          sampleVolume: "",
          selectedCalibrationName: "",
          selectedTemplateName,
          stepsData,
          params,
          thermostatName,
          thermostatNumber: "0123",
          type: "chroma"
        },
        fileName: "mockChroma.mdfx",
        queueNames: [
          `mockChroma.mdfx_70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8_set`,
          `mockChroma.mdfx_70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8_reqv`
        ],
        hash: "70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8",
        path: "D:\\PEAK_EXPERT_WEB\\Interface\\testing\\playwright\\fixtures\\mocks\\mockChroma.mdfx",
        resolverKey: "mockChroma.mdfx_70681559e714d29f6b959ff8335bce917a2922720b7764ce5bc9a15048a722f8"
      }
    ]
  };
};

/**
 * Factory for specific detector types
 */
export const createPanoramaFileData = (props = {}) => {
  return createFileData({
    detectorType: "Panorama2",
    detectorName: "СФЛД 320",
    ...props
  });
};

export const createFluoratFileData = (props = {}) => {
  return createFileData({
    detectorType: "Fluorat",
    detectorName: "Флюорат",
    ...props
  });
};

export const createDADFileData = (props = {}) => {
  return createFileData({
    detectorType: DETECTOR_TYPES.DAD,
    detectorName: 'DADName',
    stepsData: props.stepsData || [
      {
        component: "A",
        from: 0,
        sample_wl: 250,
        sample_bw: 10,
        sample_rate: 20,
        time_constant: 10,
        to: 6
      },
      {
        component: "B",
        from: 6,
        sample_wl: 252,
        sample_bw: 12,
        sample_rate: 10,
        time_constant: 100,
        to: 12
      }
    ],
    params: props.params || {
        "autoZero": true,
        "channels": {
            "A": {
                "sample_wl": 248,
                "sample_bw": 8,
                "reference_wl": 440,
                "reference_bw": 50,
                "reference_use": true
            },
            "B": {
                "sample_wl": 249,
                "sample_bw": 9,
                "reference_wl": 440,
                "reference_bw": 50,
                "reference_use": false
            },
            "C": {
                "sample_wl": 250,
                "sample_bw": 10,
                "reference_wl": 440,
                "reference_bw": 50,
                "reference_use": false
            },
            "D": {
                "sample_wl": 251,
                "sample_bw": 11,
                "reference_wl": 440,
                "reference_bw": 50,
                "reference_use": true
            },
            "E": {
                "sample_wl": 252,
                "sample_bw": 12,
                "reference_wl": 444,
                "reference_bw": 55,
                "reference_use": true
            },
            "F": {
                "sample_wl": 253,
                "sample_bw": 8,
                "reference_wl": 443,
                "reference_bw": 51,
                "reference_use": true
            },
            "G": {
                "sample_wl": 254,
                "sample_bw": 8,
                "reference_wl": 442,
                "reference_bw": 52,
                "reference_use": true
            },
            "H": {
                "sample_wl": 255,
                "sample_bw": 8,
                "reference_wl": 441,
                "reference_bw": 50,
                "reference_use": true
            }
        }
    },
    ...props
  });
};

export const createRIDFileData = (props = {}) => {
  return createFileData({
    detectorType: DETECTOR_TYPES.RID,
    detectorName: 'RIDName',
    stepsData: props.stepsData || [
      {
        from: 0,
        component: "A",
        to: 6
      },
      {
        component: "B",
        from: 6,
        to: 12
      }
    ],
    params: props.params || {
        temperature: 39,
        temperatureTolerance: 4,
        polarity: false,
        sampleRate: 5,
        autoZero: true,
        waitForTemperature: false
    },
    ...props
  });
};

export const createFileUploadResponse = (fileData) => {
  return {
    message: "File uploaded successfully",
    data: fileData
  };
};

/* export const createDADFileUploadResponse = (customProps = {}) => {
  const fileData = createDADFileData(customProps);
  return createFileUploadResponse(fileData);
};

export const createRIDFileUploadResponse = (customProps = {}) => {
  const fileData = createRIDFileData(customProps);
  return createFileUploadResponse(fileData);
}; */

export const getRIDParamsFromFileData = (fileData) => {
  return fileData?.responseData?.[0]?.data?.params || null;
};

export const getDADParamsFromFileData = (fileData) => {
  return fileData?.responseData?.[0]?.data?.params || null;
};