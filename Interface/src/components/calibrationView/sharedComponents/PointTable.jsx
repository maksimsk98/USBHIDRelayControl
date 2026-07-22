import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import { ControlledMenu, MenuItem } from '@szhsin/react-menu';
import { selectIsCalibTabCalibGen, selectPointsByTabId } from '../../../services/reduxImportDispatcher';

import { EMPTY_ARRAY } from '../../../constants/constants';
import { activatePoint, deleteCalibLevel } from '../../../services/thunks/calibration/calibrationThunks';
import { openFilesByAbsolutePathWithHash } from '../../../services/thunks/file/fileUploadThunk';
import { copyToClipboard } from '../../../utils/clipboard';
import { formatNumberForOutput as formatNumber } from '../../../utils/validation';
import { usePermissions } from '../../../hooks/usePermissions';

function PointTable({ parentId }) {
  const dispatch = useDispatch();
  const pointData = useSelector((state) => selectPointsByTabId(state, parentId)) ?? EMPTY_ARRAY;
  const isFileCalibGen = useSelector((state) => selectIsCalibTabCalibGen(state, { tabId: parentId }));
  const { hasPermissionForAction } = usePermissions();
  const canDeleteLevel = hasPermissionForAction('deleteCalibrationLevel');

  const [menuAnchorPoint, setMenuAnchorPoint] = useState({ x: 0, y: 0 });
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isPointMenuOpen, setIsPointMenuOpen] = useState(false);
  const [clickedRowIndex, setClickedRowIndex] = useState(null);

  const isSingleActive = pointData.filter((point) => point.isActive).length <= 1;
  const isClickedLastAct = isSingleActive && pointData[clickedRowIndex]?.isActive;

  const handleRowClick = (e, index) => {
    e.preventDefault(); // optional, but helpful
    setClickedRowIndex(index);
    setMenuAnchorPoint({ x: e.clientX, y: e.clientY });
    setIsPointMenuOpen(true);
  };

  const handleTableContext = (e) => {
    if (e.target.tagName === 'TD' || e.target.tagName === 'TR') return; // skip if row already handled
    e.preventDefault();
    setMenuAnchorPoint({ x: e.clientX, y: e.clientY });
    setIsTableMenuOpen(true);
  };

  const renderStatusCircle = (isUsed) => (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: isUsed ? 'green' : 'red',
        marginRight: 6,
        verticalAlign: 'middle',
      }}
    />
  );

  const formatPointRow = (point, locale = 'ru') => [
    point.index ?? '',
    formatNumber(point.concentration, locale),
    formatNumber(point.response, locale),
  ].join('\t');

  const formatTable = (points, locale = 'ru') => {
    const header = 'Точка\tКонцентрация\tПлощадь';
    const rows = points.map((p) => formatPointRow(p, locale));
    return [header, ...rows].join('\n');
  };

  const formatPoint = (point, locale = 'ru') => {
    const header = 'Точка\tКонцентрация\tПлощадь';
    const row = formatPointRow(point, locale);
    return [header, row].join('\n');
  };

  return (
    <Table
      onContextMenu={handleTableContext}
      size="sm"
      bordered
      style={{ fontSize: '12px', tableLayout: 'auto', width: 'auto' }}
    >
      <thead>
        <tr>
          <th>Точка</th>
          <th>Концентрация</th>
          <th>Площадь</th>
          <th>Файл</th>
        </tr>
      </thead>
      <tbody>
        {pointData.map((row, index) => (
          <tr key={index} onContextMenu={(e) => handleRowClick(e, index)} style={{ cursor: 'pointer' }}>
            <td>
              {renderStatusCircle(row.isActive)}
              {row?.index ?? ''}
            </td>
            <td>{row?.concentration?.toFixed(2) ?? ''}</td>
            <td>{row?.response?.toFixed(2) ?? ''}</td>
            <td>{row?.fileName ?? ''}</td>
          </tr>
        ))}

        <ControlledMenu
          state={isPointMenuOpen ? 'open' : 'closed'}
          anchorPoint={menuAnchorPoint}
          direction="right"
          onClose={() => setIsPointMenuOpen(false)}
        >
          <MenuItem
            disabled={isClickedLastAct || !isFileCalibGen}
            onClick={() => {
              dispatch(activatePoint({ calibTabId: parentId, pointIndex: clickedRowIndex, isActive: !pointData[clickedRowIndex].isActive }));
            }}
          >
            {`${pointData[clickedRowIndex]?.isActive ? 'Исключить' : 'Включить'}`}
            {' '}
            точку
          </MenuItem>
          <MenuItem
            disabled={!pointData[clickedRowIndex]?.isFileAvailable}
            onClick={() => {
              const path = pointData[clickedRowIndex]?.filePathForOpen;
              if (!path) return;

              dispatch(openFilesByAbsolutePathWithHash({ paths: path }));
            }}
          >
            Открыть хроматограмму
          </MenuItem>
          <MenuItem
            onClick={
              () => dispatch(deleteCalibLevel({ calibTabId: parentId, pointIndex: clickedRowIndex }))
            }
            disabled={isClickedLastAct || !isFileCalibGen || !canDeleteLevel}
          >
            Удалить уровень
          </MenuItem>
          <MenuItem onClick={() => {
            const point = pointData[clickedRowIndex];
            if (point) copyToClipboard(formatPoint(point));
          }}
          >
            Копировать точку
          </MenuItem>
        </ControlledMenu>

        <ControlledMenu
          state={isTableMenuOpen ? 'open' : 'closed'}
          anchorPoint={menuAnchorPoint}
          direction="right"
          onClose={() => setIsTableMenuOpen(false)}
        >
          <MenuItem onClick={() => copyToClipboard(formatTable(pointData))}>
            Копировать таблицу
          </MenuItem>
        </ControlledMenu>
      </tbody>
    </Table>
  );
}

export default PointTable;
