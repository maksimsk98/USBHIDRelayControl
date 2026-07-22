import {
  useState, useEffect, useMemo,
} from 'react';
import _ from 'lodash';
import { tickGenerator } from '../utils/classes/TickGeneratorSingleton';

const getDefaultLayout = (zoomLayout, rangeEndSecX, tickvals, ticktext, xAxisTitle, yAxisTitle, tabId, useHover = true) => {
  const defaultLayout = {
    hovermode: useHover ? 'closest' : false,
    autosize: true,
    dragmode: 'zoom',
    margin: {
      t: 10,
      pad: 0,
    },
    xaxis: {
      showline: true,
      showgrid: false,
      ...(rangeEndSecX && { range: [0, rangeEndSecX] }),
      autorange: false,
      minallowed: 0,
      rangemode: 'tozero',
      title: {
        text: xAxisTitle,
      },
      tickvals,
      ticktext,
      ticks: 'outside',
      ticklen: 5,
      tickwidth: 2,
    },
    yaxis: {
      showline: true,
      zeroline: false,
      showgrid: false,
      tick0: 0.0,
      autorange: true,
      /* minallowed: 0, */
      rangemode: 'tozero',
      title: {
        text: yAxisTitle,
      },
      ticks: 'outside',
      ticklen: 5,
      tickwidth: 2,
    },
    showlegend: false,
    ...(tabId && { uirevision: tabId }),
  };

  const updatedDefault = _.merge({}, defaultLayout, zoomLayout); // we need to inject zoom state for newly added plots like toggled signals
  return updatedDefault;
};

const usePlotLayout = (rangeEndSec, timeUnit, zoomLayout, xAxisTitle, yAxisTitle, tabId, useHover) => {
  const [tickvals, ticktext] = useMemo(() => tickGenerator.getTicks(rangeEndSec, timeUnit), [rangeEndSec, timeUnit]);

  /*   useEffect(()=>{console.log('tickvals, ticktext identity')},[tickvals, ticktext]) */

  const [layout, setLayout] = useState(() => getDefaultLayout(
    zoomLayout,
    rangeEndSec,
    tickvals,
    ticktext,
    xAxisTitle,
    yAxisTitle,
    tabId,
    useHover,
  ));

  useEffect(() => {
    setLayout((prev) => {
      const next = { ...prev };

      // X-axis updates
      const newXAxis = {
        ...prev.xaxis,
        autorange: false,
        tickvals,
        ticktext,
        title: { text: `Время (${timeUnit === 'min' ? 'мин' : 'сек'})` },
        ...(rangeEndSec != null ? { range: [0, rangeEndSec] } : {}),
      };
      next.xaxis = newXAxis;

      // --- Y-axis update ---
      next.yaxis = {
        ...prev.yaxis,
        title: { text: yAxisTitle },
      };

      // --- Prevent redundant updates ---
      return _.isEqual(prev, next) ? prev : next;
    });
  }, [rangeEndSec, timeUnit, tickvals, ticktext, yAxisTitle]);

  return [layout, setLayout];
};

export default usePlotLayout;
