import { useEffect, useState } from 'react';

import { Button, Table } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import { isNumber } from 'lodash';
import CustomSelectGroup from '../../custom/CustomSelectGroup.jsx';
import CustomInputGroup from '../../custom/CustomInputGroup.jsx';

import {
  formatFloatSmart, isConvertableToFloatWithMaxDecimal, normalizeDecimalInput, tryConvertTimeFrom, tryConvertTimeTo,
} from '../../../utils/validation.js';
import {
  peaksActions, selectIsActiveTabFinished, selectPeaksMarkers, selectPeaksStatistics,
} from '../../../services/reduxImportDispatcher.js';
import { movePeakMarkers } from '../../../services/thunks/peaks/peaksThunks.js';

function PeakParams({ parentId }) {
  const dispatch = useDispatch();

  const {
    leftBorder: startBorderStoredRaw,
    rightBorder: endBorderStoredRaw,
  } = useSelector((state) => selectPeaksMarkers(state, parentId));

  const startBorderStored = startBorderStoredRaw ?? '';
  const endBorderStored = endBorderStoredRaw ?? '';

  const isValidBorders = isNumber(startBorderStored)
        && isNumber(endBorderStored)
        && endBorderStored - startBorderStored >= 1;

  const {
    average = '-',
    absMSD = '-',
    range = '-',
  } = useSelector((state) => selectPeaksStatistics(state, parentId));

  const isFinished = useSelector(selectIsActiveTabFinished);

  const [intervalMode, setIntervalMode] = useState('borders'); // "capture" or "borders"
  const [startBorder, setStartBorder] = useState(startBorderStored ?? '');
  const [endBorder, setEndBorder] = useState(endBorderStored ?? '');
  const [timeUnit, setTimeUnit] = useState('min'); // 'sec' or 'min'

  useEffect(() => {
    setStartBorder(formatFloatSmart(tryConvertTimeTo(startBorderStored, timeUnit)));
    setEndBorder(formatFloatSmart(tryConvertTimeTo(endBorderStored, timeUnit)));
  }, [startBorderStored, endBorderStored, timeUnit]);

  const createRangeInputChanger = (setter) => (e) => {
    const value = normalizeDecimalInput(e);
    if (isConvertableToFloatWithMaxDecimal(value, 2)) {
      setter(value);
    }
  };

  const handleTimeUnitSelect = (e) => {
    const newTimeUnit = e.target.value;
    setTimeUnit(newTimeUnit);
  };

  const handleRangeInputBlur = (e) => {
    const blurMap = {
      startBorder: {
        state: startBorder,
        setter: setStartBorder,
        partner: endBorderStored,
      },
      endBorder: {
        state: endBorder,
        setter: setEndBorder,
        partner: startBorderStored,
      },
    };
    const { name } = e.target;
    const value = e.target.value.replace(',', '.');

    if (value.trim() === '') {
      // Dispatch null to Redux for that border
      const newMarkers = {
        leftBorder: name === 'startBorder' ? null : startBorderStoredRaw ?? null,
        rightBorder: name === 'endBorder' ? null : endBorderStoredRaw ?? null,
      };
      dispatch(peaksActions.setPeaksMarkers({ tabId: parentId, markers: newMarkers }));
      return;
    }

    const num = parseFloat(value);

    if (!isNaN(num)) {
      const seconds = Math.round(tryConvertTimeFrom(num, timeUnit));

      const partnerValueNum = blurMap[name].partner;
      const partnerSeconds = isNumber(partnerValueNum)
        ? Math.round(partnerValueNum)
        : null;

      let leftBorder; let
        rightBorder;

      if (name === 'startBorder') {
        rightBorder = partnerSeconds;
        if (partnerSeconds !== null) {
          if (seconds >= partnerSeconds) {
            leftBorder = null;
            // clear input too
            setStartBorder('');
          } else {
            leftBorder = seconds;
          }
        } else {
          leftBorder = seconds;
        }
      } else if (name === 'endBorder') {
        leftBorder = partnerSeconds;
        if (partnerSeconds !== null) {
          if (seconds <= partnerSeconds) {
            // clear input too
            rightBorder = null;
            setEndBorder('');
          } else {
            rightBorder = seconds;
          }
        } else {
          rightBorder = seconds;
        }
      }

      dispatch(peaksActions.setPeaksMarkers({ tabId: parentId, markers: { leftBorder, rightBorder } }));
    }
  };

  const handleSubmit = () => {
    console.warn(startBorderStored, endBorderStored);
    dispatch(movePeakMarkers({
      tabId: parentId,
      leftBorder: startBorderStored,
      rightBorder: endBorderStored,
    }));
  };

  const modeOptions = [
    /*  <option key="capture" value="capture">
            Захват
        </option>, */
    <option key="borders" value="borders">
      Границы
    </option>,
  ];

  const timeUnitOptions = [
    <option key="min" value="min">
      Минутах
    </option>,
    <option key="sec" value="sec">
      Секундах
    </option>,
  ];

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <div className="border border-secondary-subtle rounded p-2">
        <CustomSelectGroup
          label="Метод интервала СКО"
          labelStyle={{ minWidth: '55px', width: '160px' }}
          name="intervalMode"
          value={intervalMode}
          onChange={(e) => setIntervalMode(e.target.value)}
          options={modeOptions}
          selectStyle={{ minWidth: '120px', maxWidth: '160px' }}
          size="sm"
          groupClassName="mb-2"
          groupStyle={{ flexWrap: 'nowrap', maxWidth: '280px', width: 'fit-content' }}
          disabled
        />

        {intervalMode === 'borders' && (
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '280px' }}>
          <CustomSelectGroup
            label="Интервал в"
            labelStyle={{ minWidth: '55px', width: '160px' }}
            name="timeUnit"
            value={timeUnit}
            onChange={handleTimeUnitSelect}
            options={timeUnitOptions}
            selectStyle={{ minWidth: '120px', maxWidth: '160px' }}
            size="sm"
            groupClassName="mb-2"
            groupStyle={{ flexWrap: 'nowrap', maxWidth: '280px', width: 'fit-content' }}
            disabled={!isFinished}
          />
          <CustomInputGroup
            label="Начало"
            name="startBorder"
            value={(startBorder)}
            onChange={createRangeInputChanger(setStartBorder)}
            onBlur={handleRangeInputBlur}
            inputStyle={{ minWidth: '60px' }}
            labelStyle={{ minWidth: '55px', width: '160px' }}
            groupStyle={{ flexWrap: 'nowrap', maxWidth: '280px' }}
            size="sm"
            disabled={!isFinished}
          />
          <CustomInputGroup
            label="Конец"
            name="endBorder"
            value={endBorder}
            onChange={createRangeInputChanger(setEndBorder)}
            onBlur={handleRangeInputBlur}
            inputStyle={{ minWidth: '60px' }}
            labelStyle={{ minWidth: '55px', width: '160px' }}
            groupStyle={{ flexWrap: 'nowrap', maxWidth: '280px' }}
            size="sm"
            groupClassName="mb-0"
            disabled={!isFinished}
          />
        </div>
        )}
      </div>

      <div style={{ maxWidth: '300px' }}>
        <Table responsive bordered size="sm" className="mb-2" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Среднее</th>
              <th style={{ whiteSpace: 'nowrap' }}>Абс. СКО</th>
              <th style={{ whiteSpace: 'nowrap' }}>Размах</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{isNumber(average) ? average.toPrecision(6) : average}</td>
              <td>{isNumber(absMSD) ? absMSD.toPrecision(6) : absMSD}</td>
              <td>{isNumber(range) ? range.toPrecision(6) : range}</td>
            </tr>
          </tbody>
        </Table>

        <div className="text-center">

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValidBorders || !isFinished}
          >
            Рассчитать
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PeakParams;
