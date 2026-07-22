export const fetchConfigMockDefault = {
  "DefaultTemplateName": "",
  "RabbitMQ": {
    "FrameMax": 131072,
    "IpAddress": "127.0.0.1",
    "Password": "guest",
    "Port": 5672,
    "Username": "guest",
    "Vhost": "/"
  },
  "Settings": {
    "ConcUnits": "нг/мл",
    "Pump": {
      "AutomaticReleasing": true,
      "MaxPressureDischarge": 0.8,
      "MaxPressureWork": 31,
      "MinPressureWork": 0,
      "ReleasingFlowRate": 1500
    },
    "saveExchangeProtocol": true,
    "saveJournal": true
  },
  "backendVersion": "0.37.26",
  "buildDate": "11.03.2026",
  "buildTime": "13.36.17",
  "chromatographs": {
    "_sessionTemp": {
      "autosampler": {
        "ip": "127.0.0.81",
        "isGetIpAuto": false,
        "type": "hta"
      },
      "degasser": {
        "name": ""
      },
      "detector": {
        "name": "",
        "portType": "usb",
        "type": "SPhDetector2"
      },
      "portType": "usb",
      "pumpCount": 1,
      "pumps": {
        "A1": "",
        "A2": "",
        "B1": "",
        "B2": ""
      },
      "thermostat": {
        "name": ""
      },
      "withoutControl": false
    },
    "chromatographDefault": {
      "autosampler": {
        "comPort": "",
        "ip": "",
        "isGetIpAuto": false,
        "type": "none"
      },
      "degasser": {
        "name": ""
      },
      "detector": {
        "name": "COM3",
        "portType": "com1",
        "type": "Fluorat"
      },
      "portType": "usb",
      "pumpCount": 2,
      "pumps": {
        "A1": "",
        "A2": "",
        "B1": "",
        "B2": ""
      },
      "thermostat": {
        "name": ""
      },
      "withoutControl": true
    }
  },
  "files": {
    "lastDirectory": ""
  },
  "folders": {
    "results": "./DataFiles",
    "templates": "./Templates",
    "temporary": "./Temp"
  },
  "fullVersion": "1.1.007",
  "lastUsedChromatograph": "chromatographDefault",
  "recentFileList": {
    "path": []
  },
  "templates": {
    "lastUsed": ""
  },
  "thermostat": {
    "dispersion": 0.5,
    "targetTemp": 25
  }
};

export const fetchConfigMockDAD = {
  DefaultTemplateName: '',
  RabbitMQ: {
    FrameMax: 131072,
    IpAddress: '127.0.0.1',
    Password: 'guest',
    Port: 5672,
    Username: 'guest',
    Vhost: '/',
  },
  Settings: {
    ConcUnits: 'нг/мл',
    Pump: {
      AutomaticReleasing: true,
      MaxPressureDischarge: 0.8,
      MaxPressureWork: 31,
      MinPressureWork: 0,
      ReleasingFlowRate: 1500,
    },
    saveJournal: true,
    saveExchangeProtocol: true,
  },
  backendVersion: '0.31.0',
  buildDate: '27.09.2025',
  buildTime: '09.17.44',
  chromatographs: {
    chromatographDefault: {
      autosampler: {
        ip: '',
        isGetIpAuto: false,
        type: 'as393',
        comPort: 'COM5'
      },
      degasser: {
        name: '',
      },
      detector: {
        name: 'SASHA2',
        portType: 'usb',
        type: 'Panorama2',
      },
      portType: 'usb',
      pumpCount: 1,
      pumps: {
        A1: '',
        A2: '',
        B1: '',
        B2: '',
      },
      thermostat: {
        name: '',
      },
      withoutControl: false,
    },
    abcChroma: {
      autosampler: {
        ip: '',
        isGetIpAuto: false,
        type: 'as393',
        comPort: 'COM5'
      },
      degasser: {
        name: '',
      },
      detector: {
        name: 'SASHA2',
        portType: 'usb',
        type: 'Panorama2',
      },
      portType: 'usb',
      pumpCount: 1,
      pumps: {
        A1: '',
        A2: '',
        B1: '',
        B2: '',
      },
      thermostat: {
        name: '',
      },
      withoutControl: false,
    },
    abcSpectro: {
      autosampler: {
        ip: '192.168.0.4',
        isGetIpAuto: false,
        type: 'hta',
      },
      degasser: {
        name: '',
      },
      detector: {
        name: 'Я есть флюорат',
        portType: 'com',
        type: 'Fluorat',
      },
      portType: 'com',
      pumpCount: 1,
      pumps: {
        A1: '',
        A2: '',
        B1: '',
        B2: '',
      },
      thermostat: {
        name: '',
      },
      withoutControl: false,
    },
    abcDAD: {
      autosampler: {
        ip: '',
        isGetIpAuto: false,
        type: 'hta',
        comPort: ''
      },
      degasser: {
        name: '',
      },
      detector: {
        name: 'VLAD1',
        portType: 'usb',
        type: 'DAD',
      },
      portType: 'usb',
      pumpCount: 1,
      pumps: {
        A1: '',
        A2: '',
        B1: '',
        B2: '',
      },
      thermostat: {
        name: '',
      },
      withoutControl: false,
    },
    abcRID: {
      autosampler: {
        ip: '',
        isGetIpAuto: false,
        type: 'hta',
      },
      degasser: {
        name: '',
      },
      detector: {
        name: 'RIDName',
        portType: 'com1',
        type: 'RID',
      },
      portType: 'usb',
      pumpCount: 2,
      pumps: {
        A1: '',
        A2: '',
        B1: '',
        B2: '',
      },
      thermostat: {
        name: '',
      },
      withoutControl: true,
    },
    phantomChroma: {
      autosampler: {
        ip: '',
        isGetIpAuto: false,
        type: 'as393',
        comPort: 'Фантомный порт ком'
      },
      degasser: {
        name: 'Фантом дегазатор',
      },
      detector: {
        name: 'Фантом детектор',
        portType: 'usb',
        type: 'Panorama2',
      },
      portType: 'usb',
      pumpCount: 1,
      pumps: {
        A1: 'N0024',
        A2: '',
        B1: '',
        B2: '',
      },
      thermostat: {
        name: 'Фантом термостат',
      },
      withoutControl: false,
    },
  },
  files: {
    lastDirectory: '',
  },
  folders: {
    results: './DataFiles',
    templates: './Templates',
    temporary: './Temp',
  },
  lastUsedChromatograph: 'abcDAD',  // abcDAD  abcChroma abcSpectro phantomChroma chromatographDefault
  recentFileList: {
    path: [],
  },
  templates: {
    lastUsed: '',
  },
  thermostat: {
    targetTemp: 27,
  },
  saveJournal: true,
  buildDate: '13.03.2025',
};

export const fetchConfigMockPanorama = {
  "DefaultTemplateName": "",
  "RabbitMQ": {
      "FrameMax": 131072,
      "IpAddress": "127.0.0.1",
      "Password": "guest",
      "Port": 5672,
      "Username": "guest",
      "Vhost": "/"
  },
  "Settings": {
      "ConcUnits": "нг/мл",
      "Pump": {
          "AutomaticReleasing": true,
          "MaxPressureDischarge": 0.8,
          "MaxPressureWork": 31,
          "MinPressureWork": 0,
          "ReleasingFlowRate": 1500
      },
      "saveExchangeProtocol": true,
      "saveJournal": true
  },
  "backendVersion": "0.37.26",
  "buildDate": "11.03.2026",
  "buildTime": "13.36.17",
  "chromatographs": {
      "_sessionTemp": {
          "autosampler": {
              "comPort": "",
              "ip": "",
              "isGetIpAuto": false,
              "type": "none"
          },
          "degasser": {
              "name": ""
          },
          "detector": {
              "name": "",
              "portType": "usb",
              "type": "SPhDetector2"
          },
          "portType": "usb",
          "pumpCount": 1,
          "pumps": {
              "A1": "",
              "A2": "",
              "B1": "",
              "B2": ""
          },
          "thermostat": {
              "name": ""
          },
          "withoutControl": false
      },
      "chromatographDefault": {
          "autosampler": {
              "comPort": "",
              "ip": "",
              "isGetIpAuto": false,
              "type": "none"
          },
          "degasser": {
              "name": ""
          },
          "detector": {
              "name": "",
              "portType": "com1",
              "type": "Fluorat"
          },
          "portType": "usb",
          "pumpCount": 2,
          "pumps": {
              "A1": "",
              "A2": "",
              "B1": "",
              "B2": ""
          },
          "thermostat": {
              "name": ""
          },
          "withoutControl": false
      },
      "fl1": {
          "autosampler": {
              "comPort": "",
              "ip": "",
              "isGetIpAuto": false,
              "type": "none"
          },
          "degasser": {
              "name": ""
          },
          "detector": {
              "name": "COM3",
              "portType": "com1",
              "type": "Fluorat"
          },
          "portType": "usb",
          "pumpCount": 2,
          "pumps": {
              "A1": "",
              "A2": "",
              "B1": "",
              "B2": ""
          },
          "thermostat": {
              "name": ""
          },
          "withoutControl": false
      },
      "flu2": {
          "autosampler": {
              "comPort": "",
              "ip": "",
              "isGetIpAuto": false,
              "type": "none"
          },
          "degasser": {
              "name": ""
          },
          "detector": {
              "name": "COM3",
              "portType": "com1",
              "type": "Fluorat"
          },
          "portType": "usb",
          "pumpCount": 1,
          "pumps": {
              "A1": "",
              "A2": "",
              "B1": "",
              "B2": ""
          },
          "thermostat": {
              "name": ""
          },
          "withoutControl": true
      },
      "panorama": {
          "autosampler": {
              "comPort": "",
              "ip": "",
              "isGetIpAuto": false,
              "type": "none"
          },
          "degasser": {
              "name": ""
          },
          "detector": {
              "name": "COM9",
              "portType": "com1",
              "type": "Panorama"
          },
          "portType": "usb",
          "pumpCount": 1,
          "pumps": {
              "A1": "",
              "A2": "",
              "B1": "",
              "B2": ""
          },
          "thermostat": {
              "name": ""
          },
          "withoutControl": true
      }
  },
  "files": {
      "lastDirectory": ""
  },
  "folders": {
      "results": "./DataFiles",
      "templates": "./Templates",
      "temporary": "./Temp"
  },
  "fullVersion": "1.1.007",
  "lastUsedChromatograph": "panorama",
  "recentFileList": {
      "path": []
  },
  "templates": {
      "lastUsed": ""
  },
  "thermostat": {
      "dispersion": 0.5,
      "targetTemp": 25
  }
}