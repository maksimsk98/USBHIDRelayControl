const mockCalibration = {
  "calibrationType": "Внутренний стандарт",
  "column": "",
  "columnHeaders": null,
  "correction": "по опорному",
  "detector": "СФЛД 320 N010-000",
  "detectorType": "Panorama2",
  "eluentA": "ацетонитрил--вода 4:1 (об.)",
  "flow": 200,
  "operation": "viewCalibration",
  "operator": "User",
  "report": {
    "appVersion": "1.1.007",
    "columnDiameter": "2.1",
    "columnGranulation": "5",
    "columnLength": "120",
    "columnNumber": "",
    "columnSorbent": "Диасфер C18",
    "concentrationUnits": "нг",
    "dateTimeFile": "19-01-2024",
    "dateTimeReport": "11.02.2026",
    "detectorFabricNumber": "010-000",
    "detectorName": "СФЛД 320",
    "eluentAName": "ацетонитрил--вода 4:1 (об.)",
    "eluentBName": "",
    "eluentFlow": "200",
    "fileName": "D:\\repo\\PEAK_EXPERT_WEB\\BusinessLogic\\PeakExpertNoGUI\\PeakExpertNoGUI\\DataFiles\\бенз(а)пирен непрерывный\\Градуировки\\ГОСТ ISO 15302.ccf",
    "instrementFabricNumber": "10",
    "operatorName": "User",
    "pumpLetter1": "A",
    "pumpLetter2": "B",
    "pumpName1": "Н 330",
    "pumpName2": "Н 330",
    "pumpNumber1": "24",
    "pumpNumber2": "25",
    "substances": [
      {
        "calibrationFormula": " A = 1.3215*C",
        "correlationCoefficient": "0.93277",
        "name": "Бенз(a)пирен",
        "relativeMSD": "46.23702",
        "retentionTime": "16.16"
      },
      {
        "calibrationFormula": " A = 1*C",
        "correlationCoefficient": "1.00000",
        "name": "Бенз(b)хризен",
        "relativeMSD": "0.00000",
        "retentionTime": "20.70"
      }
    ],
    "thermostatName": "ТК 340",
    "thermstatNumber": "10"
  },
  "standard": "Бенз(b)хризен",
  "substances": [
    {
      "activePoints": [
        {
          "concentration": 0.019999999552965164,
          "response": 0.03950605819495784
        },
        {
          "concentration": 0.07999999821186066,
          "response": 0.18247419856716451
        },
        {
          "concentration": 0.4000000059604645,
          "response": 0.7449449514805859
        },
        {
          "concentration": 2,
          "response": 4.039591683452255
        },
        {
          "concentration": 4,
          "response": 4.564518476787741
        }
      ],
      "calibrationCheck": {
        "concentrationHeader": "",
        "concentrationTooltip": "Концентрация компонента (нг)",
        "points": [
          {
            "absDeviation": 0.02559177503279108,
            "calculatedConcentration": 0.03559177480927366,
            "concentration": 0.009999999776482582,
            "index": 1,
            "relDeviation": 255.9177560481184,
            "response": 0.04703487828373909
          },
          {
            "absDeviation": 0.12992377214137157,
            "calculatedConcentration": 0.1699237712473019,
            "concentration": 0.03999999910593033,
            "index": 2,
            "relDeviation": 324.8094376134856,
            "response": 0.22455592453479767
          },
          {
            "absDeviation": 0.7057177865035866,
            "calculatedConcentration": 0.9057177894838189,
            "concentration": 0.20000000298023224,
            "index": 3,
            "relDeviation": 352.85888799378614,
            "response": 1.1969149112701416
          },
          {
            "absDeviation": 3.8031251439861595,
            "calculatedConcentration": 4.8031251439861595,
            "concentration": 1,
            "index": 4,
            "relDeviation": 380.312514398616,
            "response": 6.347376823425293
          },
          {
            "absDeviation": 6.593654831522661,
            "calculatedConcentration": 8.593654831522661,
            "concentration": 2,
            "index": 5,
            "relDeviation": 329.6827415761331,
            "response": 11.356598854064941
          }
        ],
        "responseHeader": "Площадь",
        "responseTooltip": "Площадь пика"
      },
      "calibrationPoints": {
        "concentrationHeader": "Концентрация",
        "concentrationTooltip": "Концентрация компонента (нг)",
        "curveParameters": {
          "curveFormuleComboBox": [
            "A = k1*C"
          ],
          "equationStaticCalibration": " A = 1.3215*C",
          "valueCalibration_CORR_COEF": 0.9327651478627554,
          "valueCalibration_MSD_ABS": 0.7943348226653044,
          "valueCalibration_MSD_REL": 46.237023618473756
        },
        "points": [
          {
            "concentration": 0.009999999776482582,
            "fileName": "240118-1528_БаП 0,01 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1528_БаП 0,01 нг.mdfx",
            "index": 1,
            "isActive": true,
            "isFileAvailable": false,
            "response": 0.04703487828373909
          },
          {
            "concentration": 0.03999999910593033,
            "fileName": "240118-1558_БаП 0,04 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1558_БаП 0,04 нг.mdfx",
            "index": 2,
            "isActive": true,
            "isFileAvailable": false,
            "response": 0.22455592453479767
          },
          {
            "concentration": 0.20000000298023224,
            "fileName": "240118-1628_БаП 0,2 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1628_БаП 0,2 нг.mdfx",
            "index": 3,
            "isActive": true,
            "isFileAvailable": false,
            "response": 1.1969149112701416
          },
          {
            "concentration": 1,
            "fileName": "240118-1657_БаП 1,0 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1657_БаП 1,0 нг.mdfx",
            "index": 4,
            "isActive": true,
            "isFileAvailable": false,
            "response": 6.347376823425293
          },
          {
            "concentration": 2,
            "fileName": "240119-1116_БаП 2,0 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240119-1116_БаП 2,0 нг.mdfx",
            "index": 5,
            "isActive": true,
            "isFileAvailable": false,
            "response": 11.356598854064941
          }
        ],
        "responseHeader": "Площадь",
        "responseTooltip": "Площадь пика",
        "statWeightCombobox": [
          "1",
          "1/x^2"
        ]
      },
      "data": {
        "excitationWaveLength": 292,
        "name": "Бенз(a)пирен",
        "registrationWaveLength": 405,
        "retentionTime": 16.163333129882812,
        "sensitivity": "средняя"
      },
      "fittedCurve": [
        {
          "x": 0,
          "y": 0
        },
        {
          "x": 4.08,
          "y": 5.391759877837116
        }
      ],
      "hiddenPoints": [
        {
          "concentration": 0.019999999552965164,
          "response": 0.03950605819495784
        },
        {
          "concentration": 0.07999999821186066,
          "response": 0.18247419856716451
        },
        {
          "concentration": 0.4000000059604645,
          "response": 0.7449449514805859
        },
        {
          "concentration": 2,
          "response": 4.039591683452255
        },
        {
          "concentration": 4,
          "response": 4.564518476787741
        }
      ],
      "inactivePoints": [],
      "titleCalibration": "Градуировка [ГОСТ ISO 15302, Бенз(a)пирен]",
      "titlePlotViewCalibration": "Бенз(a)пирен"
    },
    {
      "activePoints": [
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        }
      ],
      "calibrationCheck": {
        "concentrationHeader": "",
        "concentrationTooltip": "Концентрация компонента (нг)",
        "points": [
          {
            "absDeviation": 0.6905738115310669,
            "calculatedConcentration": 1.190573811531067,
            "concentration": 0.5,
            "index": 1,
            "relDeviation": 138.11476230621338,
            "response": 1.190573811531067
          },
          {
            "absDeviation": 0.7306174039840698,
            "calculatedConcentration": 1.2306174039840698,
            "concentration": 0.5,
            "index": 2,
            "relDeviation": 146.12348079681396,
            "response": 1.2306174039840698
          },
          {
            "absDeviation": 1.1067159175872803,
            "calculatedConcentration": 1.6067159175872803,
            "concentration": 0.5,
            "index": 3,
            "relDeviation": 221.34318351745605,
            "response": 1.6067159175872803
          },
          {
            "absDeviation": 1.0712916851043701,
            "calculatedConcentration": 1.5712916851043701,
            "concentration": 0.5,
            "index": 4,
            "relDeviation": 214.25833702087402,
            "response": 1.5712916851043701
          },
          {
            "absDeviation": 1.9880168437957764,
            "calculatedConcentration": 2.4880168437957764,
            "concentration": 0.5,
            "index": 5,
            "relDeviation": 397.6033687591553,
            "response": 2.4880168437957764
          }
        ],
        "responseHeader": "Площадь",
        "responseTooltip": "Площадь пика"
      },
      "calibrationPoints": {
        "concentrationHeader": "Концентрация",
        "concentrationTooltip": "Концентрация компонента (нг)",
        "curveParameters": {
          "curveFormuleComboBox": [
            "A = k1*C"
          ],
          "equationStaticCalibration": " A = 1*C",
          "valueCalibration_CORR_COEF": 1,
          "valueCalibration_MSD_ABS": 0,
          "valueCalibration_MSD_REL": 0
        },
        "points": [
          {
            "concentration": 0.5,
            "fileName": "240118-1528_БаП 0,01 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1528_БаП 0,01 нг.mdfx",
            "index": 1,
            "isActive": true,
            "isFileAvailable": false,
            "response": 1.190573811531067
          },
          {
            "concentration": 0.5,
            "fileName": "240118-1558_БаП 0,04 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1558_БаП 0,04 нг.mdfx",
            "index": 2,
            "isActive": true,
            "isFileAvailable": false,
            "response": 1.2306174039840698
          },
          {
            "concentration": 0.5,
            "fileName": "240118-1628_БаП 0,2 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1628_БаП 0,2 нг.mdfx",
            "index": 3,
            "isActive": true,
            "isFileAvailable": false,
            "response": 1.6067159175872803
          },
          {
            "concentration": 0.5,
            "fileName": "240118-1657_БаП 1,0 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240118-1657_БаП 1,0 нг.mdfx",
            "index": 4,
            "isActive": true,
            "isFileAvailable": false,
            "response": 1.5712916851043701
          },
          {
            "concentration": 0.5,
            "fileName": "240119-1116_БаП 2,0 нг.mdfx",
            "filePathForOpen": "C:\\Lumex\\PeakExpert\\DataFiles\\бенз(а)пирен непрерывный\\240119-1116_БаП 2,0 нг.mdfx",
            "index": 5,
            "isActive": true,
            "isFileAvailable": false,
            "response": 2.4880168437957764
          }
        ],
        "responseHeader": "Площадь",
        "responseTooltip": "Площадь пика",
        "statWeightCombobox": [
          "1",
          "1/x^2"
        ]
      },
      "data": {
        "excitationWaveLength": 292,
        "name": "Бенз(b)хризен",
        "registrationWaveLength": 405,
        "retentionTime": 20.7,
        "sensitivity": "средняя"
      },
      "fittedCurve": [
        {
          "x": 0,
          "y": 0
        },
        {
          "x": 1.02,
          "y": 1.02
        }
      ],
      "hiddenPoints": [
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        },
        {
          "concentration": 1,
          "response": 1
        }
      ],
      "inactivePoints": [],
      "titleCalibration": "Градуировка [ГОСТ ISO 15302, Бенз(b)хризен]",
      "titlePlotViewCalibration": "Бенз(b)хризен"
    }
  ],
  "success": true,
  "time": "19.01.2024"
};

module.exports = {
  mockCalibration,
};
