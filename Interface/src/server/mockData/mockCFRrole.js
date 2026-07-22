const mockCFRrole = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: true,
    children: [
      {
        path: 'group_management',
        title: 'Group management',
        enabled: true,
        children: [],
      },
      {
        path: 'main_wnd',
        title: 'Main window',
        enabled: true,
        children: [
          {
            path: 'main_wnd.analysis',
            title: 'Analysis',
            enabled: true,
            children: [
              {
                path: 'main_wnd.analysis.goto_measurements',
                title: 'Go to measurements',
                enabled: true,
                children: [],
              },
              {
                path: 'main_wnd.analysis.identification_sample',
                title: 'Identification or quality control of the sample',
                enabled: true,
                children: [],
              },
              {
                path: 'main_wnd.analysis.spectrum',
                title: 'Analysis of the saved spectrum',
                enabled: true,
                children: [],
              },
              {
                path: 'main_wnd.analysis.start_measuring',
                title: 'Start measuring',
                enabled: true,
                children: [],
              },
              {
                path: 'main_wnd.analysis.unknown_sample',
                title: 'Analysis of an unknown sample',
                enabled: true,
                children: [],
              },
            ],
          },
          {
            path: 'main_wnd.calibration',
            title: 'Calibration',
            enabled: true,
            children: [
              {
                path: 'main_wnd.calibration.create',
                title: 'Create calibration',
                enabled: true,
                children: [],
              },
              {
                path: 'main_wnd.calibration.modify',
                title: 'Modify calibration',
                enabled: true,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
};

module.exports = {
  mockCFRrole,
};
