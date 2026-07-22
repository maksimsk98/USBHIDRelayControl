const mockConfigData = {
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
        name: 'COM10 - я RID',
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
  lastUsedChromatograph: 'abcRID',  // abcDAD abcRID  abcChroma abcSpectro phantomChroma chromatographDefault
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

module.exports = {
  mockConfigData,
};
