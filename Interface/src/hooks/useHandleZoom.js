import { useDispatch } from 'react-redux';
import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import _ from 'lodash';

import { plotViewActions } from '../services/reduxImportDispatcher';
import { recalcRangeLayout } from '../utils/generatePlotTicks';

const parseLayout = (unparsedLayout, { doSuppressXAutoRange = true, doSuppressYAutoRange = true }) => {
  /* console.log(unparsedLayout) */
  const nestedLayout = {};
  const convertToArray = [];
  Object.keys(unparsedLayout).forEach((key) => {
    const keys = key.split(/\.|\[|\]/).filter((k) => k !== '');
    if (keys.length === 3) {
      convertToArray.push([keys[0], keys[1]]);
      if (!nestedLayout[keys[0]]) {
        nestedLayout[keys[0]] = {};
      }
      if (!nestedLayout[keys[0]][keys[1]]) {
        nestedLayout[keys[0]][keys[1]] = {};
      }
      nestedLayout[keys[0]][keys[1]][keys[2]] = unparsedLayout[key];
    }
    if (keys.length === 2) {
      if (!nestedLayout[keys[0]]) {
        nestedLayout[keys[0]] = {};
      }
      nestedLayout[keys[0]][keys[1]] = unparsedLayout[key];
    }
    if (keys.length === 1) {
      nestedLayout[key] = unparsedLayout[key];
    }
  });
  if (convertToArray.length > 0) {
    convertToArray.forEach((keyPair) => {
      const arrayFromObject = [];
      Object.keys(nestedLayout[keyPair[0]][keyPair[1]]).sort().forEach((index) => {
        arrayFromObject.push(nestedLayout[keyPair[0]][keyPair[1]][index]);
      });
      nestedLayout[keyPair[0]][keyPair[1]] = arrayFromObject;
    });
    convertToArray.length = 0;
  }

  if (nestedLayout.yaxis && nestedLayout.yaxis.range && doSuppressYAutoRange) nestedLayout.yaxis.autorange = false; // fix to disable autorange of axis, we need the to avoid dropping zoom on new points adding
  if (nestedLayout.xaxis && nestedLayout.xaxis.range && doSuppressXAutoRange) nestedLayout.xaxis.autorange = false;

  return nestedLayout;
};

const useHandleZoom = (
  parentId,
  initiator,
  zoomLayout,
  setLayout,
  lastXSec = null,
  setActiveDragmode,
  timeUnit = false,
  hookConfig = {}, // default to empty object
  throttleTimeout = 200,
) => {

  const {doSuppressXAutoRange = true, doSuppressYAutoRange= true, minZoomForAdjust = 5} = hookConfig

  const dispatch = useDispatch();

  const prevZoomRef = useRef(null);

  const handleRelayout = useCallback((
    eventLayout,
    config = {
      needsParsing: true,
      recalcTicks: true,
    },
  ) => {
    /* if (_.isEqual(eventLayout, {'xaxis.autorange': true, 'yaxis.autorange': true})) return */
    if (_.isEqual(eventLayout, { autosize: true })) return; // autosize is already on, we don't care
    if (_.isEqual(eventLayout, zoomLayout)) return; // if nothing changed, we don't care

    /* console.warn(eventLayout); */

    const parsedLayout = config.needsParsing ? parseLayout(eventLayout, hookConfig) : eventLayout;

    if ('dragmode' in eventLayout && setActiveDragmode) {
      console.log(eventLayout.dragmode);
      setActiveDragmode(eventLayout.dragmode);
    } else if ('dragmode' in eventLayout && !setActiveDragmode) {
      console.error('No setter for drag mode');
    }

    const range = parsedLayout?.xaxis?.range;
    let [rangeStartSec, rangeEndSec] = range ?? [];

    const isXAutorange = parsedLayout?.xaxis?.autorange && !range;

    if (range && range.length === 2 && Math.abs(rangeStartSec - rangeEndSec) < minZoomForAdjust) {
      rangeStartSec -= 2.5;
      rangeEndSec += 2.5;
      const newRange = [rangeStartSec, rangeEndSec];
      /*       console.log(`Zoom too small, resetting to ${rangeStartSec}, ${rangeEndSec}`); */
      setLayout((prevLayout) => ({
        ...prevLayout,
        xaxis: {
          ...prevLayout.xaxis,
          range: newRange,
        },
      }));
      parsedLayout.xaxis.range = newRange; // doing mutably because here it doesn't matter
    }

    if (isXAutorange && lastXSec) {
      rangeStartSec = 0;
      rangeEndSec = lastXSec;
    }

    const resultLayout = config.recalcTicks && rangeStartSec != null && rangeEndSec != null
      ? recalcRangeLayout(parsedLayout, rangeEndSec, timeUnit, rangeStartSec)
      : parsedLayout;

    delete resultLayout.shapes; // don;t leak markers and peaks to other tabs

    const { excludeFromHistory } = resultLayout ?? {};
    if ('excludeFromHistory' in resultLayout) {
      delete resultLayout.excludeFromHistory;
    }

    dispatch(plotViewActions.setZoomState({
      layout: resultLayout,
      initiator,
      tabId: parentId,
      ...(!excludeFromHistory && { prevLayout: prevZoomRef.current }),
    }));

    prevZoomRef.current = resultLayout;
  }, [dispatch, zoomLayout, initiator, parentId, timeUnit, lastXSec]);

  // throttling to prevent excessive execution
  const throttledRelayout = useMemo(() => _.throttle(handleRelayout, throttleTimeout), [handleRelayout]);

  // Cleanup throttled function on unmount
  useEffect(() => () => throttledRelayout.cancel(), [throttledRelayout]);

  useEffect(() => {
    if (zoomLayout && Object.keys(zoomLayout).length > 0 /* && !updatedTabs.includes(initiator) */) {
      setLayout((prevLayout) => {
        const newLayout = _.merge({}, prevLayout, zoomLayout);
        return newLayout;
      });
    }
  }, [zoomLayout]);

  return {
    handleRelayout: throttledRelayout,
  };
};

export default useHandleZoom;
