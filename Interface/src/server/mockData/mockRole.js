/**
 * Mock data for role API responses
 * Based on examples from role.js comments
 * Includes various edge cases for comprehensive testing
 */

/**
 * Mock 1: Full access role - all permissions enabled
 * Standard happy path scenario
 */
const mockRoleFullAccess = {
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

/**
 * Mock 2: Partial access role - some permissions disabled
 * Edge case: mixed enabled/disabled permissions
 */
const mockRolePartialAccess = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: true,
    children: [
      {
        path: 'group_management',
        title: 'Group management',
        enabled: false,
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
                enabled: false,
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
                enabled: false,
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
            enabled: false,
            children: [
              {
                path: 'main_wnd.calibration.create',
                title: 'Create calibration',
                enabled: false,
                children: [],
              },
              {
                path: 'main_wnd.calibration.modify',
                title: 'Modify calibration',
                enabled: false,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Mock 3: No access role - all permissions disabled
 * Edge case: user with no permissions
 */
const mockRoleNoAccess = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: false,
    children: [
      {
        path: 'group_management',
        title: 'Group management',
        enabled: false,
        children: [],
      },
      {
        path: 'main_wnd',
        title: 'Main window',
        enabled: false,
        children: [
          {
            path: 'main_wnd.analysis',
            title: 'Analysis',
            enabled: false,
            children: [
              {
                path: 'main_wnd.analysis.goto_measurements',
                title: 'Go to measurements',
                enabled: false,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Mock 4: Empty permissions tree
 * Edge case: empty children array
 */
const mockRoleEmptyTree = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: true,
    children: [],
  },
};

/**
 * Mock 5: Null permissions
 * Edge case: permissions field is null
 */
const mockRoleNullPermissions = {
  operation: 'getRoleCFR',
  permissions: null,
};

/**
 * Mock 6: Deep nested structure
 * Edge case: very deep permission tree
 */
const mockRoleDeepNested = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: true,
    children: [
      {
        path: 'level1',
        title: 'Level 1',
        enabled: true,
        children: [
          {
            path: 'level1.level2',
            title: 'Level 2',
            enabled: true,
            children: [
              {
                path: 'level1.level2.level3',
                title: 'Level 3',
                enabled: true,
                children: [
                  {
                    path: 'level1.level2.level3.level4',
                    title: 'Level 4',
                    enabled: true,
                    children: [
                      {
                        path: 'level1.level2.level3.level4.level5',
                        title: 'Level 5',
                        enabled: true,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Mock 7: Cyrillic titles
 * Edge case: Russian locale titles
 */
const mockRoleCyrillicTitles = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'root',
    title: 'Корневой',
    enabled: true,
    children: [
      {
        path: 'group_management',
        title: 'Управление группами',
        enabled: true,
        children: [],
      },
      {
        path: 'main_wnd',
        title: 'Главное окно',
        enabled: true,
        children: [
          {
            path: 'main_wnd.analysis',
            title: 'Анализ',
            enabled: true,
            children: [
              {
                path: 'main_wnd.analysis.start_measuring',
                title: 'Начать измерение',
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

/**
 * Mock 8: Missing operation field
 * Edge case: response without operation field
 */
const mockRoleNoOperation = {
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: true,
    children: [],
  },
};

/**
 * Mock 9: Single permission node
 * Edge case: minimal structure
 */
const mockRoleSingleNode = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'single.permission',
    title: 'Single Permission',
    enabled: true,
    children: [],
  },
};

/**
 * Mock 10: Complex mixed structure
 * Edge case: combination of enabled/disabled with various nesting levels
 */
const mockRoleComplexMixed = {
  operation: 'getRoleCFR',
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: true,
    children: [
      {
        path: 'enabled_group',
        title: 'Enabled Group',
        enabled: true,
        children: [
          {
            path: 'enabled_group.enabled_item',
            title: 'Enabled Item',
            enabled: true,
            children: [],
          },
          {
            path: 'enabled_group.disabled_item',
            title: 'Disabled Item',
            enabled: false,
            children: [],
          },
        ],
      },
      {
        path: 'disabled_group',
        title: 'Disabled Group',
        enabled: false,
        children: [
          {
            path: 'disabled_group.nested_enabled',
            title: 'Nested Enabled',
            enabled: true,
            children: [],
          },
          {
            path: 'disabled_group.nested_disabled',
            title: 'Nested Disabled',
            enabled: false,
            children: [],
          },
        ],
      },
    ],
  },
};

module.exports = {
  mockRoleFullAccess,
  mockRolePartialAccess,
  mockRoleNoAccess,
  mockRoleEmptyTree,
  mockRoleNullPermissions,
  mockRoleDeepNested,
  mockRoleCyrillicTitles,
  mockRoleNoOperation,
  mockRoleSingleNode,
  mockRoleComplexMixed,
};
