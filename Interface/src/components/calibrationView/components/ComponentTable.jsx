import { useDispatch, useSelector } from 'react-redux';
import { Container, Table } from 'react-bootstrap';

import { useEffect, useRef, useState } from 'react';
import { ControlledMenu, MenuDivider, MenuItem } from '@szhsin/react-menu';
import {
  calibrationActions, selectActiveCompIndexByTabId, selectCalibTabDetector, selectCompListByTabId, selectIsCalibTabCalibGen,
} from '../../../services/reduxImportDispatcher';

import { DETECTOR_TYPES, EMPTY_ARRAY, INVALID_FORMAT } from '../../../constants/constants';
import { formatNumberForOutput, normalizeDecimalInput } from '../../../utils/validation';
import { copyToClipboard } from '../../../utils/clipboard';
import FullCellInputTD from '../../custom/CustomTDCellInput';
import { floatSetter } from '../../../utils/setters';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { deleteCalibComponent, editCalibComponent } from '../../../services/thunks/calibration/calibrationThunks';
import { usePermissions } from '../../../hooks/usePermissions';

function ComponentTable({ parentId }) {
  const dispatch = useDispatch();

  const componentList = useSelector((state) => selectCompListByTabId(state, parentId)) ?? EMPTY_ARRAY;
  const activeComponentIndex = useSelector((state) => selectActiveCompIndexByTabId(state, parentId));
  const calibDetectorType = useSelector((state) => selectCalibTabDetector(state, parentId));
  const { hasPermissionForAction } = usePermissions();
  const canDeleteComponent = hasPermissionForAction('deleteCalibrationComponent');

  const [menuAnchorPoint, setMenuAnchorPoint] = useState({ x: 0, y: 0 });
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isComponentMenuOpen, setIsComponentMenuOpen] = useState(false);
  const [clickedRowIndex, setClickedRowIndex] = useState(null);
  const [isRedacting, setIsRedacting] = useState(false);

  const isTabCalibGen = useSelector((state) => selectIsCalibTabCalibGen(state, { tabId: parentId }));

  const [localCompList, setLocalCompList] = useState(componentList);

  const retentionTimeRef = useRef(null);

  useEffect(() => {
    setLocalCompList(componentList);
  }, [componentList]);

  const isSingle = localCompList.length <= 1;

  const handleComponentClick = (index) => {
    dispatch(calibrationActions.changeTabActiveComp({ id: parentId, activeComponentIndex: index }));
  };

  const getRowStyle = (index) => {
    const isActive = index === activeComponentIndex;
    return {
      backgroundColor: isActive ? '#e1f4ff' : 'white',
    };
  };

  const formatComponentRow = (component, index, locale = 'ru') => [
    index + 1,
    component.name ?? '',
    formatNumberForOutput(component.retentionTime, locale),
    component.excitationWaveLength ?? '',
  ].join('\t');

  const formatComponentTableForClipboard = (components, locale = 'ru') => {
    const header = 'Номер\tКомпонент\tВремя\tл погл.';
    const rows = components.map((c, i) => formatComponentRow(c, i, locale));
    return [header, ...rows].join('\n');
  };

  const formatComponentForCB = (component, index, locale = 'ru') => {
    const header = 'Номер\tКомпонент\tВремя\tл погл.';
    const row = formatComponentRow(component, index, locale);
    return [header, row].join('\n');
  };

  const handleTableContext = (e) => {
    if (e.target.tagName === 'TD' || e.target.tagName === 'TR') return;
    e.preventDefault();
    setMenuAnchorPoint({ x: e.clientX, y: e.clientY });
    setIsTableMenuOpen(true);
  };

  const handleRowClick = (e, index) => {
    e.preventDefault(); // optional, but helpful
    setClickedRowIndex(index);
    setMenuAnchorPoint({ x: e.clientX, y: e.clientY });
    setIsComponentMenuOpen(true);
  };

  const onRowChange = (rowIdx, field, value) => {
    const valueToAssign = floatSetter({
      name: 'retentionTime',
      value,
      setterDispatch: {
        retentionTime: (v) => v, // returns the value back
      },
      rangesMap: {
        retentionTime: [8, 8, 0, null],
      },
      formatConfig: {
        ifEmptyNull: true,
        ifInvalidFormatNull: false,
      },
    });

    if (valueToAssign === INVALID_FORMAT) return;
    console.log(value, valueToAssign);

    setLocalCompList((oldList) => {
      const next = [...oldList];
      next[rowIdx] = { ...next[rowIdx], [field]: valueToAssign ?? '' };
      return next;
    });
  };

  const onBlur = (rowIdx, field, value) => {
    setLocalCompList((oldList) => {
      const next = [...oldList];
      const numericValue = value === '' ? 0 : Number(value);
      next[rowIdx] = { ...next[rowIdx], [field]: numericValue };
      return next;
    });
  };

  const lastRedactingRef = useRef(null);
  useEffect(() => {
    if (!isRedacting && lastRedactingRef.current === true) {
      dispatch(editCalibComponent({ calibTabId: parentId, newComponents: localCompList }));
    }
    lastRedactingRef.current = isRedacting;
  }, [isRedacting]);

  const tableRef = useRef(null);
  const handleOutsideClick = () => {
    retentionTimeRef.current?.blur?.();
    requestAnimationFrame(() => setIsRedacting(false));
  };
  useOutsideClick(tableRef, handleOutsideClick);

  const detectorSpecificHeaders = {
    [DETECTOR_TYPES.SPHDETECTOR]: (
      <th>λ погл.</th>
    ),
    [DETECTOR_TYPES.SPHDETECTOR2]: (
      <th>λ погл.</th>
    ),
    [DETECTOR_TYPES.PANORAMA]: (
      <>
        <th>λ возб.</th>
        <th>λ рег.</th>
        <th>Чувств. ФЭУ</th>
      </>
    ),
    [DETECTOR_TYPES.PANORAMA2]: (
      <>
        <th>λ возб.</th>
        <th>λ рег.</th>
        <th>Чувств. ФЭУ</th>
      </>
    ),
    [DETECTOR_TYPES.FLUORAT]: (
      <>
        <th>Ф. возб.</th>
        <th>Ф. рег.</th>
        <th>Чувств. ФЭУ</th>
      </>
    ),
  };

  const detectorSpecificCells = {
    [DETECTOR_TYPES.SPHDETECTOR]: (substance, index, getRowStyle) => (
      <td style={getRowStyle(index)}>{substance.excitationWaveLength}</td>
    ),
    [DETECTOR_TYPES.SPHDETECTOR2]: (substance, index, getRowStyle) => (
      <td style={getRowStyle(index)}>{substance.excitationWaveLength}</td>
    ),
    [DETECTOR_TYPES.PANORAMA]: (substance, index, getRowStyle) => (
      <>
        <td style={getRowStyle(index)}>{substance.excitationWaveLength}</td>
        <td style={getRowStyle(index)}>{substance.registrationWaveLength}</td>
        <td style={getRowStyle(index)}>{substance.sensitivity}</td>
      </>
    ),
    [DETECTOR_TYPES.PANORAMA2]: (substance, index, getRowStyle) => (
      <>
        <td style={getRowStyle(index)}>{substance.excitationWaveLength}</td>
        <td style={getRowStyle(index)}>{substance.registrationWaveLength}</td>
        <td style={getRowStyle(index)}>{substance.sensitivity}</td>
      </>
    ),
    [DETECTOR_TYPES.FLUORAT]: (substance, index, getRowStyle) => (
      <>
        <td style={getRowStyle(index)}>{substance.excitFilter}</td>
        <td style={getRowStyle(index)}>{substance.regFilter}</td>
        <td style={getRowStyle(index)}>{substance.sensitivity}</td>
      </>
    ),
  };

  return (
    <Container fluid style={{ height: '100%', overflowY: 'auto', overflowX: 'auto' }}>
      <Table
        ref={tableRef}
        onContextMenu={handleTableContext}
        bordered
        style={{ fontSize: '12px', width: '80%' }}
      >
        <thead>
          <tr>
            <th>Номер</th>
            <th>Компонент</th>
            <th>Время</th>
            {detectorSpecificHeaders[calibDetectorType]}
          </tr>
        </thead>
        <tbody>
          {localCompList.map((substance, index) => (
            <tr
              key={index}
              onClick={() => handleComponentClick(index)}
              onContextMenu={(e) => handleRowClick(e, index)}
              style={getRowStyle(index)} // Highlight selected row
            >
              <td style={getRowStyle(index)}>{index + 1}</td>
              <td style={getRowStyle(index)}>{substance.name}</td>
              <FullCellInputTD
                ref={retentionTimeRef}
                type="input"
                name="retentionTime"
                value={(isRedacting ? substance.retentionTime : Number(substance.retentionTime)?.toFixed(2)) ?? ''}
                onChange={(e) => onRowChange(index, 'retentionTime', normalizeDecimalInput(e))}
                onBlur={(e) => onBlur(index, 'retentionTime', e.target.value)}
                rowIndex={index}
                disabled={!isRedacting}
                cellStyle={isRedacting ? { backgroundColor: 'white' } : {}}
              />
              {detectorSpecificCells[calibDetectorType](substance, index, getRowStyle)}
            </tr>
          ))}

          <ControlledMenu
            state={isTableMenuOpen ? 'open' : 'closed'}
            anchorPoint={menuAnchorPoint}
            direction="right"
            onClose={() => setIsTableMenuOpen(false)}
          >
            <MenuItem onClick={() => copyToClipboard(formatComponentTableForClipboard(componentList))}>
              Копировать таблицу
            </MenuItem>
          </ControlledMenu>

          <ControlledMenu
            state={isComponentMenuOpen ? 'open' : 'closed'}
            anchorPoint={menuAnchorPoint}
            direction="right"
            onClose={() => setIsComponentMenuOpen(false)}
          >
            <MenuItem
              disabled={!isTabCalibGen}
              onClick={() => {
                setIsRedacting(true);
              }}
            >
              Редактировать
            </MenuItem>
            <MenuItem
              disabled={isSingle || !isTabCalibGen || !canDeleteComponent}
              onClick={() => {
                dispatch(deleteCalibComponent({ substanceIndex: clickedRowIndex, calibTabId: parentId }));
              }}
            >
              Удалить компонент
            </MenuItem>

            <MenuDivider />

            <MenuItem onClick={() => {
              const component = localCompList[clickedRowIndex];
              if (component) copyToClipboard(formatComponentForCB(component, clickedRowIndex));
            }}
            >
              Копировать компонент
            </MenuItem>
          </ControlledMenu>

        </tbody>
      </Table>
    </Container>
  );
}

export default ComponentTable;
