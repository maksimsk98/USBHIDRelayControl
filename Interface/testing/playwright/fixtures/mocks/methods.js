import {DETECTOR_TYPES} from '../../../../src/constants/constants'
import { dadMeasurementCreator } from '../../../../src/services/slices/detectorSlices/DADStepsSlice';
import { ridMeasurementCreator } from '../../../../src/services/slices/detectorSlices/RIDStepsSlice';

export const chooseMethodDADMock = {
    "calibrationList": [
        {
            "name": null,
            "type": null
        },
        {
            "name": "лдьодль",
            "type": "Внутренняя нормализация"
        },
    ],
    "chromaMiscData": {
        "averaging": 1,
        "thermostatTemp": 7
    },
    "detectorProgram": {
        "stepsData": [
            {
                "from": 0,
                "to": 6,
                "component": "A",
                "sample_wl": 250,
                "sample_bw": 10,
                "sample_rate": 20,
                "time_constant": 10
            },
            {
                "from": 6,
                "to": 12,
                "component": "B",
                "sample_wl": 252,
                "sample_bw": 12,
                "sample_rate": 20,
                "time_constant": 10
            }
        ]
    },
    "params": {
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
    "integration": {
        "driftCompensation": false,
        "maxScaling": 0.2,
        "peakWindow": 0.5,
        "smoothing": 1200
    },
    "options": {
        "autoMark": true,
        "autoSave": true,
        "calibrationFolder": "%t\\Градуировки",
        "folder": "%t",
        "minimalTime": 2,
        "name": "%y%m%d-%H%M_%s",
        "saveBackground": true
    },
    "optionsSp": {
        "autoSave": true,
        "folder": "%t\\Спектры",
        "name": "Спектр_%c"
    },
    "passport": {
        "comment": "Сорбиновая, бензойная кислоты в пище М 04-58-2009 (2014)\\\\С использованием ацетатного буферного раствора (pH 4.9)",
        "diameter": 2.1,
        "extendedName": "fasfds",
        "flow": 200,
        "length": 120,
        "particleSize": 5,
        "precolumn": true,
        "sampleName": "консерванты в пище",
        "sorbent": "Диасфер C18",
        "thermostatTemp": 25,
        "volume": 20
    },
    "pumpProgramData": {
        "isocratProgram": {
            "isAutoFill": false,
            "conditioningTime": 7,
            "fillFlowRate": 7,
            "flowRate": 7,
            "restart": true,
            "startFlowRate": 7,
            "startPressure": 7,
            "thermostatTemp": 7
        },
        "pumpMode": "isocrat"
    },
    "template": {
        "instrument": "DAD"
    },
    "type": "chroma"
}

export const chooseMethodRIDMock = {
    "calibrationList": [
        {
            "name": null,
            "type": null
        },
        {
            "name": "лдьодль",
            "type": "Внутренняя нормализация"
        },
    ],
    "chromaMiscData": {
        "averaging": 1,
        "thermostatTemp": 7
    },
    "detectorProgram": {
        "stepsData": [
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
        ]
    },
    "params": {
        temperature: 39,
        temperatureTolerance: 4,
        polarity: false,
        sampleRate: 5,
        autoZero: true,
        waitForTemperature: false
    },
    "integration": {
        "driftCompensation": false,
        "maxScaling": 0.2,
        "peakWindow": 0.5,
        "smoothing": 1200
    },
    "options": {
        "autoMark": true,
        "autoSave": true,
        "calibrationFolder": "%t\\Градуировки",
        "folder": "%t",
        "minimalTime": 2,
        "name": "%y%m%d-%H%M_%s",
        "saveBackground": true
    },
    "optionsSp": {
        "autoSave": true,
        "folder": "%t\\Спектры",
        "name": "Спектр_%c"
    },
    "passport": {
        "comment": "Сорбиновая, бензойная кислоты в пище М 04-58-2009 (2014)\\\\С использованием ацетатного буферного раствора (pH 4.9)",
        "diameter": 2.1,
        "extendedName": "fasfds",
        "flow": 200,
        "length": 120,
        "particleSize": 5,
        "precolumn": true,
        "sampleName": "консерванты в пище",
        "sorbent": "Диасфер C18",
        "thermostatTemp": 25,
        "volume": 20
    },
    "pumpProgramData": {
        "isocratProgram": {
            "isAutoFill": false,
            "conditioningTime": 7,
            "fillFlowRate": 7,
            "flowRate": 7,
            "restart": true,
            "startFlowRate": 7,
            "startPressure": 7,
            "thermostatTemp": 7
        },
        "pumpMode": "isocrat"
    },
    "template": {
        "instrument": "RID"
    },
    "type": "chroma"
}

export const chooseMethodFluoratMock = {
    "calibrationList": [
        {
            "name": null,
            "type": null
        }
    ],
    "chromaMiscData": {
        "averaging": 1,
        "thermostatTemp": null
    },
    "detectorProgram": {
        "additionalStage": {
            "maxDuration": 1,
            "threshold": 3,
            "window": 2
        },
        "stepsData": [
            {
                "component": "change",
                "excitFilter": "",
                "from": 0,
                "regFilter": "",
                "sensitivity": "high",
                "to": 180
            }
        ]
    },
    "instrument": "Fluorat",
    "integration": {
        "alternativeFilters": "none",
        "isSmoothingAdaptiveChecked": true,
        "isSmoothingCubicChecked": false,
        "isSmoothingDoubleChecked": false,
        "isSmoothingPulseChecked": true,
        "maxRelation": 15,
        "minHalfWidth": 5,
        "searchWindow": 2,
        "smoothingFactor": 1,
        "smoothingWindow": 5,
        "useDriftCompensation": false,
        "useRelativeTimes": true
    },
    "operation": "getTemplateByName",
    "options": {
        "autoMark": true,
        "autoSave": true,
        "calibrationFolder": "%tГрадуировки",
        "folder": "%t",
        "minimalTime": 2,
        "name": "%y%m%d_%H%M_%s",
        "saveBackground": false
    },
    "optionsSp": {
        "autoSave": false,
        "folder": "%tСпектры",
        "name": "Спектр_%c"
    },
    "passport": {
        "columnNum": "1",
        "diameter": 0,
        "dilution": 30,
        "eluentA": "3",
        "eluentB": "4",
        "flow": 0,
        "length": 0,
        "particleSize": 0,
        "precolumn": true,
        "pressure": 0,
        "sampleName": "testFlu2",
        "sorbent": "2",
        "temperature": 0,
        "volume": 3
    },
    "reportCalcParams": {
        "noiseEval": null
    },
    "reportSectionChecks": {
        "generalParams": {
            "calibration": true,
            "calibrationTable": false,
            "chromatogram": true,
            "chromatograph": true,
            "column": true,
            "comment": true,
            "detector": true,
            "detectorProgram": true,
            "eluent": true,
            "header": false,
            "noiseEval": false,
            "peakTable": true,
            "pumpProgram": true,
            "pumps": true,
            "sample": true,
            "thermostat": true
        },
        "peakParams": {
            "area": true,
            "asymmetry": true,
            "componentName": true,
            "concentration": false,
            "efficiency": true,
            "exitTime": true,
            "halfWidth": true,
            "height": true,
            "number": true,
            "peakValley": false,
            "relativeTime": false,
            "resolution": true
        }
    },
    "spectroscopic": null,
    "type": "chroma"
}

export const chooseMethodPanoramaMock = {
    "calibrationList": [
        {
            "name": null,
            "type": null
        }
    ],
    "chromaMiscData": {
        "averaging": 1,
        "thermostatTemp": null
    },
    "detectorProgram": {
        "additionalStage": {
            "maxDuration": 1,
            "threshold": 3,
            "window": 2
        },
        "stepsData": [
            {
                "component": "testPanoramaComp",
                "from": 0,
                "lambdaEx": 265,
                "lambdaReg": 310,
                "sensitivity": "medium",
                "to": 180
            }
        ]
    },
    "instrument": "SPF2",
    "integration": {
        "alternativeFilters": "none",
        "isSmoothingAdaptiveChecked": true,
        "isSmoothingCubicChecked": false,
        "isSmoothingDoubleChecked": false,
        "isSmoothingPulseChecked": true,
        "maxRelation": 15,
        "minHalfWidth": 5,
        "searchWindow": 2,
        "smoothingFactor": 1,
        "smoothingWindow": 5,
        "useDriftCompensation": false,
        "useRelativeTimes": true
    },
    "operation": "getTemplateByName",
    "options": {
        "autoMark": true,
        "autoSave": true,
        "calibrationFolder": "%tГрадуировки",
        "folder": "%t",
        "minimalTime": 2,
        "name": "%y%m%d_%H%M_%s",
        "saveBackground": false
    },
    "optionsSp": {
        "autoSave": false,
        "folder": "%tСпектры",
        "name": "Спектр_%c"
    },
    "passport": {
        "diameter": 0,
        "dilution": 0,
        "flow": 0,
        "length": 0,
        "particleSize": 0,
        "precolumn": false,
        "pressure": 0,
        "temperature": 0,
        "volume": 0
    },
    "reportCalcParams": {
        "noiseEval": null
    },
    "reportSectionChecks": {
        "generalParams": {
            "calibration": true,
            "calibrationTable": false,
            "chromatogram": true,
            "chromatograph": true,
            "column": true,
            "comment": true,
            "detector": true,
            "detectorProgram": true,
            "eluent": true,
            "header": false,
            "noiseEval": false,
            "peakTable": true,
            "pumpProgram": true,
            "pumps": true,
            "sample": true,
            "thermostat": true
        },
        "peakParams": {
            "area": true,
            "asymmetry": true,
            "componentName": true,
            "concentration": false,
            "efficiency": true,
            "exitTime": true,
            "halfWidth": true,
            "height": true,
            "number": true,
            "peakValley": false,
            "relativeTime": false,
            "resolution": true
        }
    },
    "spectroscopic": null,
    "type": "chroma"
};



export const chooseMethodNull = {
  "calibrationList": [
    {
      "name": null,
      "type": null
    }
  ],
  "operation": "getTemplateByName",
  _isMockedNull: true
};

export const methodsMocksPerDetector = {
  [DETECTOR_TYPES.DAD] : chooseMethodDADMock,
  [DETECTOR_TYPES.RID] : chooseMethodRIDMock,
  [DETECTOR_TYPES.FLUORAT] : chooseMethodFluoratMock,
  [DETECTOR_TYPES.PANORAMA] : chooseMethodPanoramaMock,
}

export const methodsNameMap = {
    DAD1: 'DAD1',
    FLUORAT1: 'TestFlu1',
    PANORAMA1: 'TestPanorama1',
    RID1: 'RID1'
}

// WATCHLIST TODO fetch methods should be per detector for now united
export const fetchMethodsMock = {
  "operation": "getTemplatesList",
  "templates": [
    null,
    ...(Object.values(methodsNameMap))
  ]
};

// Helper to generate default DAD steps data
export const generateDefaultDADSteps = () => {
  const fullData = dadMeasurementCreator.createFull();
  return fullData.steps;
};

export const generateDefaultDADParams = () => {
  const fullData = dadMeasurementCreator.createFull();
  return fullData.params;
};


export const generateDefaultRIDSteps = () => {
  const fullData = ridMeasurementCreator.createFull();
  return fullData.steps;
};

export const generateDefaultRIDParams = () => {
  const fullData = ridMeasurementCreator.createFull();
  return fullData.params;
};

export const getRIDParamsFromMethodMock = (methodMock) => {
    return methodMock.params
}

export const getDADParamsFromMethodMock = (methodMock) => {
    return methodMock.params
}