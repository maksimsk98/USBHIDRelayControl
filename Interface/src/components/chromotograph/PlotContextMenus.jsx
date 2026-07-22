import { useEffect, useState } from 'react';

import {
  ControlledMenu, MenuDivider, MenuItem, SubMenu,
} from '@szhsin/react-menu';
import { Plotly } from '../../utils/setupPlotly';

import { addPeak, changePeakProperty, deletePeak } from '../../services/thunks/peaks/peaksThunks';

function PlotContextMenus({
  peak = {}, plot, controls = {}, meta = {},
}) {
  const {
    ref: peakContextRef,
    selected: selectedPeakNum,
    data: peakData,
    disabled: isDisabledPeakFuncs = false,
  } = peak;

  const {
    plotElem,
    ref: plotContextRef,
    prevLayouts = [],
    markers: { show: showMarkers, set: setShowMarkers } = {},
  } = plot;

  const {
    anchorPoint: menuAnchorPoint,
    openMenu,
    setOpenMenu,
    setLayout,
    dispatch,
    buttons: { reset: resetButton, prevLayout: prevLayoutButton },
  } = controls;

  const {
    enablePeakContext = false,
    parentId,
  } = meta;

  // derive booleans instead of keeping separate state
  const isPeakContextOpen = openMenu === 'peak';
  const isPlotContextOpen = openMenu === 'plot';
  const setIsPeakContextOpen = (flag) => setOpenMenu((prev) => {
    if (flag) return 'peak'; // open my menu
    return prev === 'peak' ? null : prev; // close only if I own it
  });

  const setIsPlotContextOpen = (flag) => setOpenMenu((prev) => {
    if (flag) return 'plot';
    return prev === 'plot' ? null : prev;
  });

  const [showGrid, setShowGrid] = useState(false);

  const toggleShowGrid = () => {
    setShowGrid((prev) => !prev);
  };

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      xaxis: {
        ...prev.xaxis,
        showgrid: showGrid,
      },
      yaxis: {
        ...prev.yaxis,
        showgrid: showGrid,
      },
    }));
  }, [showGrid, setLayout]);

  const getPlotSnapshot = async (plotElem) => await Plotly.toImage(plotElem, {
    format: 'png',
    width: 800,
    height: 600,
  });

  const dataURLToBlob = async (dataURL) => {
    const res = await fetch(dataURL);
    return await res.blob();
  };

  const copyImageBlob = async (blob) => {
    try {
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      console.log('Plot image copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy plot image:', err);
    }
  };

  const handleCopyPlotToClipboard = async () => {
    try {
      const dataURL = await getPlotSnapshot(plotElem);
      const blob = await dataURLToBlob(dataURL);
      await copyImageBlob(blob);
    } catch (err) {
      console.error('Copy plot failed:', err);
    }
  };

  const formatNumber = (value, locale = 'en') => {
    if (typeof value !== 'number') return '';
    return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
      useGrouping: false,
    }).format(value);
  };

  const extractVisiblePlotDataAsClipboardText = (plotElem, locale = 'ru') => {
    if (!plotElem || !plotElem.data || !Array.isArray(plotElem.data)) return '';

    const visibleTraces = plotElem.data.filter((trace) => trace.visible !== false
      && Array.isArray(trace.x)
      && Array.isArray(trace.y)
      && trace.x.length === trace.y.length);

    if (visibleTraces.length === 0) return '';

    // Build headers: traceName X, traceName Y
    const headers = visibleTraces.flatMap((trace) => {
      const name = trace.name || trace.customData?.type || 'trace';
      return [`${name} X`, `${name} Y`];
    });

    const maxLen = Math.max(...visibleTraces.map((t) => t.x.length));
    const rows = [];

    for (let i = 0; i < maxLen; i++) {
      const row = visibleTraces.flatMap((trace) => [
        formatNumber(trace.x[i], locale),
        formatNumber(trace.y[i], locale),
      ]);
      rows.push(row.join('\t'));
    }

    return [headers.join('\t'), ...rows].join('\n');
  };

  const handleCopyPointsData = async () => {
    const text = extractVisiblePlotDataAsClipboardText(plotElem, 'ru');
    await navigator.clipboard.writeText(text);
  };

  return (
    <>
      {enablePeakContext && (
        <ControlledMenu
          ref={peakContextRef}
          anchorPoint={menuAnchorPoint}
          state={isPeakContextOpen ? 'open' : 'closed'}
          direction="right"
          onClose={() => setIsPeakContextOpen(false)}
        >
          <MenuItem
            disabled={menuAnchorPoint?.xCoord == null || isDisabledPeakFuncs}
            onClick={() => dispatch(deletePeak({
              tabId: parentId,
              leftPoint: { x: menuAnchorPoint.xCoord, y: menuAnchorPoint.yCoord },
              rightPoint: null,
            }))}
          >
            Удалить этот пик
          </MenuItem>
          <MenuDivider />
          <MenuItem
            type="checkbox"
            checked={peakData?.[selectedPeakNum]?.isNotSeparatedLeft}
            disabled={!peakData?.[selectedPeakNum]?.isNotSeparatedLeftEnable}
            onClick={() => dispatch(changePeakProperty({ tabId: parentId, peakIndex: selectedPeakNum, property: 'isSeparatedLeft' }))}
          >
            Неразделенный слева
          </MenuItem>
          <MenuItem
            type="checkbox"
            checked={peakData?.[selectedPeakNum]?.isNotSeparatedRight}
            disabled={!peakData?.[selectedPeakNum]?.isNotSeparatedRightEnable}
            onClick={() => dispatch(changePeakProperty({ tabId: parentId, peakIndex: selectedPeakNum, property: 'isSeparatedRight' }))}
          >
            Неразделенный справа
          </MenuItem>
          <MenuItem
            type="checkbox"
            checked={peakData?.[selectedPeakNum]?.isRiderPeak}
            disabled={!peakData?.[selectedPeakNum]?.isRiderEnable}
            onClick={() => dispatch(changePeakProperty({ tabId: parentId, peakIndex: selectedPeakNum, property: 'isRider' }))}
          >
            Наездник
          </MenuItem>
        </ControlledMenu>
      )}

      <ControlledMenu
        ref={plotContextRef}
        anchorPoint={menuAnchorPoint}
        state={isPlotContextOpen ? 'open' : 'closed'}
        direction="right"
        onClose={() => setIsPlotContextOpen(false)}
      >
        <MenuItem onClick={() => resetButton?.click()}>Восстановить</MenuItem>
        <MenuItem
          disabled={prevLayouts.length === 0}
          onClick={() => prevLayoutButton?.click()}
        >
          Предыдущая область
        </MenuItem>

        <MenuDivider />

        {enablePeakContext && (
          <>
            <MenuItem
              disabled={menuAnchorPoint?.xCoord == null || isDisabledPeakFuncs}
              onClick={() => dispatch(addPeak({
                tabId: parentId,
                xCoord: menuAnchorPoint?.xCoord,
              }))}
            >
              Добавить пик здесь
            </MenuItem>

            <MenuDivider />
          </>
        )}
        {showMarkers != null && setShowMarkers != null && (
          <MenuItem
            type="checkbox"
            checked={showMarkers}
            onClick={() => setShowMarkers((prev) => !prev)}
          >
            Показывать точки
          </MenuItem>
        )}

        <MenuItem
          type="checkbox"
          checked={showGrid}
          onClick={toggleShowGrid}
        >
          Показывать сетку
        </MenuItem>

        <MenuDivider />

        <SubMenu label="Копировать">
          <MenuItem onClick={() => handleCopyPlotToClipboard()}>
            График
          </MenuItem>
          <MenuItem onClick={() => handleCopyPointsData()}>
            Данные
          </MenuItem>
        </SubMenu>
      </ControlledMenu>
    </>
  );
}

export default PlotContextMenus;
