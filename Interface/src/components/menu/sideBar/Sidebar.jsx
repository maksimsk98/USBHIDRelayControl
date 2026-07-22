import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { Accordion } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectPumpsCount, selectMeasurementTime, selectDetectorStatusData, selectThermostatStatusData, selectPumpsStatusData, selectDetectorType, selectWithoutControl, selectThermoDispersion, selectDetectorInitializingProgress,
  selectAutosamplerState,
} from '../../../services/reduxImportDispatcher';

import styles from './Sidebar.module.css';

import StatusAccordionFormGroup from './StatusAccordionFormGroup';
import CustomInputGroup from '../../custom/CustomInputGroup';
import { DETECTOR_TYPES, PUMP_STATE_MESSAGES, SENSITIVITY_MAP } from '../../../constants/constants';
import { safeToFixed } from '../../../utils/validation';
import { setRidPurge } from '../../../services/thunks/nodes/nodesControlThunks';

const autosamplerStateMap = {
  notConnected: 'Нет связи',
  connected: 'Подключен',
  busy: 'Занят',
  isWorking: 'Работает',
}

const extractEventKeys = (structure) => {
  const eventKeys = [];
  structure.forEach((accordion) => {
    const { eventKey } = accordion;
    if (eventKey) eventKeys.push(eventKey);
    const { children } = accordion;
    if (Array.isArray(children)) eventKeys.push(...extractEventKeys(children));
  });

  return eventKeys;
};

const getPumpVolume = (status, volume, volumeMax) => {
  let result = status === 'connected' ? Math.round(volume / volumeMax * 100) : '';
  result = isNaN(result) ? '' : result;
  return result;
};

const getPumpStructure = (pump) => ({
  eventKey: pump.eventKey,
  headerText: pump.headerText,
  inputStructure: [
    {
      labelText: 'Расход (мкл/мин)',
      value: pump.status === 'connected' ? safeToFixed(pump.values.flowRate, 5) : '',
      status: pump.status,
      labelStyle: { minWidth: '135px' },
    },
    {
      labelText: 'Давление (МПа)',
      value: pump.status === 'connected' ? safeToFixed(pump.values.pressure, 5) : '',
      status: pump.status,
      labelStyle: { minWidth: '135px' },
    },
    {
      labelText: 'Объем(%)',
      value: getPumpVolume(pump.status, pump.values.volume, pump.values.volumeMax),
      status: pump.status,
      labelStyle: { minWidth: '135px' },
    },
    {
      labelText: 'Состояние',
      value: pump.status === 'connected' ? PUMP_STATE_MESSAGES[pump.values.state] ?? '' : '',
      status: pump.status,
      labelStyle: { minWidth: '135px' },
    },
  ],
});

const renderAccordion = (node, activeKeys, onChange) => (
  <StatusAccordionFormGroup
    key={node.eventKey}
    eventKey={node.eventKey}
    headerText={node.headerText}
    inputStructure={node.inputStructure}
    onChange={onChange}
  >
    {node.children?.length > 0 && (
    <Accordion activeKey={activeKeys}>
      {node.children.map((child) => renderAccordion(child, activeKeys, onChange))}
    </Accordion>
    )}
  </StatusAccordionFormGroup>
);

const buildInitGradient = (percent) => {
  if (typeof percent !== 'number') return {};

  const clamped = Math.max(0, Math.min(100, percent));

  return {
    background: `
      linear-gradient(
        to right,
        rgba(25, 135, 84, 0.35) ${clamped}%,
        transparent ${clamped}%
      )
    `,
  };
};

function Sidebar(props) {
  const dispatch = useDispatch();
  const countOfPumps = useSelector(selectPumpsCount);
  const detectorStatusData = useSelector(selectDetectorStatusData);
  const thermostatStatusData = useSelector(selectThermostatStatusData);
  const pumpsStatusData = useSelector(selectPumpsStatusData);
  const autosamplerState = useSelector(selectAutosamplerState);
  const detectorType = useSelector(selectDetectorType);
  const measurementTime = useSelector(selectMeasurementTime);
  const withoutControl = useSelector(selectWithoutControl);

  const detectorInitProgress = useSelector(selectDetectorInitializingProgress);

  const thermoDispersion = useSelector(selectThermoDispersion);

  const [activeKeys, setActiveKeys] = useState({});

  const handleRidPurgeClick = async () => await dispatch(setRidPurge())

  const {
    signalPhoto,
    signalRef,
    signalFluor,
    wavelength,
    excitationWavelength,
    registrationWavelength,
    sensitivity,
    // === Поля для RID === //
    signalRiu,
    temperature,
    purge,
    polarity,
    // ==================== //
  } = detectorStatusData || {};

  const initInput = typeof detectorInitProgress === 'number'
    ? [{
      labelText: 'Инициализация',
      value:
            detectorInitProgress === 100
              ? 'Готов'
              : `${Math.min(detectorInitProgress, 100)} %`,
      status: detectorStatusData?.status,
      labelStyle: { minWidth: '220px' },
      controlStyle: {
        minWidth: '50px',
        ...buildInitGradient(detectorInitProgress),
      },
    }]
    : [];

  const detectorStructure = useMemo(() => {
    if (!detectorType || !detectorStatusData) return []; // guard

    if (detectorType === DETECTOR_TYPES.SPHDETECTOR2 || detectorType === DETECTOR_TYPES.SPHDETECTOR) {
      return [
        {
          eventKey: 'detector',
          headerText: 'Детектор',
          inputStructure: [
            ...initInput,
            {
              labelText: 'Длина волны поглощения (нм)',
              value: detectorStatusData.status === 'connected' ? safeToFixed(wavelength, 5) : '',
              status: detectorStatusData.status,
              labelStyle: { minWidth: '220px' },
              controlStyle: { minWidth: '50px' },
            },
          ],
          children: [
            {
              eventKey: 'signals',
              headerText: 'Сигналы',
              inputStructure: [
                {
                  labelText: 'Фотометрический канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalPhoto, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '180px' },
                },
                {
                  labelText: 'Опорный канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalRef, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '180px' },
                },
              ],
            },
          ],
        },
      ];
    } else if (detectorType === DETECTOR_TYPES.PANORAMA2 || detectorType === DETECTOR_TYPES.PANORAMA) {
      return [
        {
          eventKey: 'detector',
          headerText: 'Детектор',
          inputStructure: [
            ...initInput,
            {
              labelText: 'Длина волны возбуждения (нм)',
              value: detectorStatusData.status === 'connected' ? safeToFixed(excitationWavelength, 5) : '',
              status: detectorStatusData.status,
              labelStyle: { minWidth: '230px' },
            },
            {
              labelText: 'Длина волны регистрации (нм)',
              value: detectorStatusData.status === 'connected' ? safeToFixed(registrationWavelength, 5) : '',
              status: detectorStatusData.status,
              labelStyle: { minWidth: '230px' },
            },
            {
              labelText: 'Чувствительность ФЭУ',
              value: detectorStatusData.status === 'connected' ? SENSITIVITY_MAP[sensitivity] : '',
              status: detectorStatusData.status,
              labelStyle: { minWidth: '170px' },
            },
          ],
          children: [
            {
              eventKey: 'signals',
              headerText: 'Сигналы',
              inputStructure: [
                {
                  labelText: 'Флуориметрический канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalFluor, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '196px' },
                },
                {
                  labelText: 'Фотометрический канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalPhoto, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '196px' },
                },
                {
                  labelText: 'Опорный канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalRef, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '196px' },
                },
              ],
            },
          ],
        },
      ];
    } else if (detectorType === DETECTOR_TYPES.FLUORAT) {
      return [
        {
          eventKey: 'detector',
          headerText: 'Детектор',
          inputStructure: [
            ...initInput,
            {
              labelText: 'Чувствительность ФЭУ',
              value: detectorStatusData.status === 'connected' ? SENSITIVITY_MAP[sensitivity] : '',
              status: detectorStatusData.status,
            },
          ],
          children: [
            {
              eventKey: 'signals',
              headerText: 'Сигналы',
              inputStructure: [
                {
                  labelText: 'Флуориметрический канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalFluor, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '196px' },
                },
                {
                  labelText: 'Фотометрический канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalPhoto, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '196px' },
                },
                {
                  labelText: 'Опорный канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalRef, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '196px' },
                },
              ],
            },
          ],
        },
      ];
    } else if (detectorType === DETECTOR_TYPES.DAD) {
      return [
        {
          eventKey: 'detector',
          headerText: 'Детектор',
          inputStructure: [
            ...initInput,
            {
              labelText: 'Длина волны поглощения (нм)',
              value: detectorStatusData.status === 'connected' ? safeToFixed(wavelength, 5) : '',
              status: detectorStatusData.status,
              labelStyle: { minWidth: '220px' },
              controlStyle: { minWidth: '50px' },
            },
          ],
          children: [
            {
              eventKey: 'signals',
              headerText: 'Сигналы',
              inputStructure: [
                {
                  labelText: 'Фотометрический канал',
                  value: detectorStatusData.status === 'connected' ? safeToFixed(signalPhoto, 5) : '',
                  status: detectorStatusData.status,
                  labelStyle: { minWidth: '180px' },
                },
              ],
            },
          ],
        },
      ];
    } if (detectorType === DETECTOR_TYPES.RID) {
      const lastRiu = signalRiu?.y?.length ? signalRiu.y[signalRiu.y.length - 1] : null;
      const labelStyle = { minWidth: '196px' };
      return [
        {
          eventKey: 'detector',
          headerText: 'Детектор',
          inputStructure: [
            ...initInput,
            {
              labelText: 'Температура °C',
              value: detectorStatusData.status === 'connected' && typeof temperature === 'number' ? String(temperature) : '',
              status: detectorStatusData.status,
              labelStyle,
            },
            {
              controlType: 'button',
              labelText: 'Продувка',
              value: purge === true ? 'active' : 'idle',
              status: detectorStatusData.status,
              onClick: handleRidPurgeClick,
              labelStyle,
            },
            {
              labelText: 'Полярность',
              value: detectorStatusData.status === 'connected' && typeof polarity === 'boolean' ? (polarity ? 'Нормальная' : 'Обратная') : '',
              status: detectorStatusData.status,
              labelStyle,
            },
            {
              labelText: 'Сигнал nRIU',
              value: detectorStatusData.status === 'connected' && lastRiu != null ? safeToFixed(lastRiu, 6) : '',
              status: detectorStatusData.status,
              labelStyle,
            },
          ],
        },
      ];
    }
  }, [detectorType, detectorStatusData, initInput, handleRidPurgeClick]);

  const thermostatStructure = useMemo(() => {
    if (withoutControl) return [];
    return [
      {
        eventKey: 'thermostat',
        headerText: 'Термостат',
        inputStructure: [
          {
            labelText: 'Температура °C',
            value: thermostatStatusData.status === 'connected' ? safeToFixed(thermostatStatusData.columnTemp, 5) : '',
            status: thermostatStatusData.status,
            labelStyle: { minWidth: '135px' },
          },
          {
            labelText: 'Отклонение',
            value: thermostatStatusData.status === 'connected' ? safeToFixed(thermoDispersion, 5) : '',
            status: thermostatStatusData.status,
            labelStyle: { minWidth: '135px' },
          },
        ],
      },
    ];
  }, [thermostatStatusData, withoutControl, thermoDispersion]);

  const autosamplerStructure = useMemo(() => {
    return [
      {
        eventKey: 'autosampler',
        headerText: 'Автосамплер',
        inputStructure: [
          {
            labelText: 'Cостояние',
            value: autosamplerState !== 'notConnected' ? autosamplerStateMap[autosamplerState] || autosamplerState : '',
            status: autosamplerState,
            labelStyle: { minWidth: '135px' },
          },
        ],
      },
    ];
  }, [autosamplerState]);

  const pumpStructure = useMemo(() => {
    if (withoutControl) return [];
    const pumpConfigs = [
      {
        headerText: 'Насос А1', eventKey: 'A1', values: pumpsStatusData.A1, status: pumpsStatusData.A1.status,
      },
      {
        headerText: 'Насос B1', eventKey: 'B1', values: pumpsStatusData.B1, status: pumpsStatusData.B1.status,
      },
      {
        headerText: 'Насос А2', eventKey: 'A2', values: pumpsStatusData.A2, status: pumpsStatusData.A2.status,
      },
      {
        headerText: 'Насос B2', eventKey: 'B2', values: pumpsStatusData.B2, status: pumpsStatusData.B2.status,
      },
    ];

    let pumpsToRender = [];
    if (countOfPumps === 1) {
      pumpsToRender = [pumpConfigs[0]];
    } else if (countOfPumps === 2) {
      pumpsToRender = [pumpConfigs[0], pumpConfigs[1]];
    } else if (countOfPumps === 4) {
      pumpsToRender = pumpConfigs;
    }

    return pumpsToRender.map((pump) => getPumpStructure(pump));
  }, [pumpsStatusData, countOfPumps, withoutControl]);

  const sidebarStructure = useMemo(() => [
    ...detectorStructure,
    ...autosamplerStructure,
    ...thermostatStructure,
    ...pumpStructure,
  ], [detectorStructure, autosamplerStructure, thermostatStructure, pumpStructure]);

  useEffect(() => {
    const newEventKeys = extractEventKeys(sidebarStructure);

    setActiveKeys((prev) => {
      const updated = { ...prev };
      let changed = false;

      for (const key of newEventKeys) {
        if (!(key in updated)) {
          updated[key] = true; // or false if want want to keep it collapsed initially
          changed = true;
        }
      }

      // Remove keys that no longer exist
      for (const key in updated) {
        if (!newEventKeys.includes(key)) {
          delete updated[key];
          changed = true;
        }
      }

      if (changed) { // if you want to remeber previous state of keys comment this if out
        for (const key of Object.keys(updated)) {
          updated[key] = true;
        }
      }

      return changed ? updated : prev;
    });
  }, [sidebarStructure]);

  const handleAccordionChange = (eventKey) => {
    setActiveKeys((prev) => ({
      ...prev,
      [eventKey]: !prev[eventKey],
    }));
  };

  const activeKeyArray = Object.entries(activeKeys)
    .filter(([_, isActive]) => isActive)
    .map(([key]) => key);

  return (
    <div id='sidebar' className={styles.sidebarContainer}>
      <div className={styles.sidebarContent}>
        <CustomInputGroup
          size="sm"
          label="Время измерения"
          value={measurementTime}
          name="measurementTime"
          onChange={() => {}}
          disabled
          readOnly
          labelStyle={{ minWidth: '150px' }}
          inputStyle={{ minWidth: '50px' }}
          groupClassName=""
          groupStyle={{ flexWrap: 'nowrap', width: '100%' }}
        />

        <Accordion className={styles.sidebarAccordion} alwaysOpen activeKey={activeKeyArray}>
          {sidebarStructure.map((accordion) => renderAccordion(accordion, activeKeyArray, handleAccordionChange))}
        </Accordion>
      </div>
    </div>
  );
}

export default Sidebar;
