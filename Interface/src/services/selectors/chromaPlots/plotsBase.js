import { createSelector } from '@reduxjs/toolkit';
import { DEFAULT_POINTS } from '../../../constants/constants';
import { selectAllFiles } from '../file/fileBase';
import { buildPoorQuickXYHash } from '../../../utils/hash';

export const selectAllChromaPlotsData = (state) => state.chromaPlotsReducer;

export const selectDoShowBackground = (state, tabId) => state.chromaPlotsReducer[tabId]?.displayOptions?.showBackground ?? false;

export const selectBackgroundChroma = (state, tabId) => state.chromaPlotsReducer[tabId]?.background?.measuredChromatogram ?? DEFAULT_POINTS;

export const selectChromaPlotsById = (state, parentId) => state.chromaPlotsReducer[parentId];

export const selectChromaPlotsRevision = (state, parentId) => state.chromaPlotsReducer[parentId]?.revision ?? 0;

export const selectPoorPlotSnapshot = createSelector(
  [
    (state, tabId) => selectPlotData(state, {
      tabId,
      pointType: 'measuredChromatogram',
      plotState: 'active',
    }),
    (state, tabId) => selectPlotData(state, {
      tabId,
      pointType: 'calculatedChromatogram',
      plotState: 'active',
    }),
  ],
  (measured, calculated) => {
    const measuredLen = measured?.x?.length && measured?.y?.length
      ? Math.min(measured.x.length, measured.y.length)
      : 0;

    const calcX = calculated?.x ?? [];
    const calcY = calculated?.y ?? [];
    const calcLen = Math.min(calcX.length, calcY.length);

    return {
      measuredIsEmpty: measuredLen === 0,

      calculated: {
        length: calcLen,
        quickHash:
          calcLen === 0
            ? 'empty'
            : buildPoorQuickXYHash(calcX, calcY),
      },
    };
  },
);

export const selectPlotsDataByIdAndType = createSelector(
  [
    (state, props) => selectChromaPlotsById(state, props.tabId),
    (_, props) => props.pointTypes,
    (_, props) => props.plotState ?? 'active',
  ],
  (chromaPlots, pointTypes, plotState) => {
    const fetchedPoints = {};

    pointTypes.forEach((pointType) => {
      fetchedPoints[pointType] = chromaPlots?.[plotState]?.[pointType] ?? DEFAULT_POINTS;
    });
    return fetchedPoints;
  },
);

export const selectPlotData = createSelector(
  [
    (state, props) => selectChromaPlotsById(state, props.tabId),
    (_, props) => props.pointType,
    (_, props) => props.plotState ?? 'active',
  ],
  (chromaPlots, pointType, plotState) => {
    const fetchedPoints = chromaPlots?.[plotState]?.[pointType] ?? DEFAULT_POINTS;
    return fetchedPoints;
  },
);

export const selectLastXSecMeasured = createSelector(
  [
    (state, tabId) => selectPlotData(state, { tabId, pointType: 'measuredChromatogram' }),
  ],
  (measuredChromatogram) => {
    const xValues = measuredChromatogram?.x ?? [];
    const lastXSec = xValues[xValues.length - 1] ?? 0;
    return lastXSec;
  },
);

// Factory selector — gives each usage its own memo cache
export const makeSelectChromaPlotsByIds = () => createSelector(
  [
    // Accept props as args to the selector
    (state, filesIdsArr, type) => filesIdsArr,
    (state, filesIdsArr, type) => type,
    (state) => state, // full state for use in inner selector
  ],
  (filesIdsArr, type, state) => filesIdsArr.reduce((acc, id) => {
    acc[id] = type != null
      ? selectPlotData(state, { tabId: id, pointType: type })
      : selectChromaPlotsById(state, id);
    return acc;
  }, {}),
);

export const selectFileNameById = createSelector(
  [
    selectAllFiles,
    (_, id) => id, // take id from props or argument
  ],
  (files, id) => {
    const file = files.find((f) => f.id === id);
    return file ? file.name : null;
  },
);

export const selectFileNamesByIdsMap = createSelector(
  [selectAllFiles, (_state, ids) => ids],
  (files, ids) => {
    const byId = new Map(files.map((f) => [f.id, f.name]));
    const resultObj = ids.reduce((acc, id) => {
      const name = byId.get(id);
      if (name != null) acc[id] = name;
      return acc;
    }, {});
    return resultObj;
  },
);

export const selectChromaPlotsByIds = (state, filesIdsArr, type = null) => {
  const packagePlotsByIds = filesIdsArr.reduce((acc, id) => {
    acc[id] = type
      ? selectPlotData(state, { tabId: id, pointType: type })
      : selectChromaPlotsById(state, id);
    return acc;
  }, {});

  return packagePlotsByIds;
};

export const selectActMeasuredChromatogram = createSelector(
  [selectChromaPlotsById],
  (chromaPlots) => chromaPlots?.active?.measuredChromatogram || null,
);

export const selectActCalculatedChromatogram = createSelector(
  [selectChromaPlotsById],
  (chromaPlots) => chromaPlots?.active?.calculatedChromatogram || null,
);

export const selectIsActCalculatedEmpty = createSelector(
  [
    (state, props) => selectPlotData(state, {
      tabId: props.tabId,
      pointType: 'calculatedChromatogram',
      plotState: 'active',
    }),
  ],
  (calculatedChromatogram) => !calculatedChromatogram?.x?.length || !calculatedChromatogram?.y?.length,
);

export const selectIsPlotEmpty = createSelector(
  [
    (state, props) => selectPlotData(state, props),
  ],
  (plotData) => !plotData?.x?.length
    || !plotData?.y?.length,
);
