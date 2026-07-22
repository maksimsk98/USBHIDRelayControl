import {
  useRef, useCallback,
} from 'react';

export const createCoordinateConverters = (gd, svg, drag, boundingBox) => {
  const xAxis = gd._fullLayout.xaxis;
  const yAxis = gd._fullLayout.yaxis;

  return {
    pixelToX: (xPixel) => xAxis.p2c(xPixel - boundingBox.left),
    xToPixel: (xData) => xAxis.c2p(xData) + boundingBox.left,
    pixelToY: (yPixel) => yAxis.p2c(yPixel - boundingBox.top),
    yToPixel: (yData) => yAxis.c2p(yData) + boundingBox.top,
    xSVGToPixel: (xSVG) => {
      const point = svg.createSVGPoint();
      point.x = xSVG;
      return point.matrixTransform(svg.getScreenCTM()).x;
    },
    ySVGToPixel: (ySVG) => {
      const point = svg.createSVGPoint();
      point.y = ySVG;
      return point.matrixTransform(svg.getScreenCTM()).y;
    },
    xPixelToSVG: (xPixel) => {
      const point = svg.createSVGPoint();
      point.x = xPixel;
      return point.matrixTransform(svg.getScreenCTM().inverse()).x;
    },
    yPixelToSVG: (yPixel) => {
      const point = svg.createSVGPoint();
      point.y = yPixel;
      return point.matrixTransform(svg.getScreenCTM().inverse()).y;
    },
    sourceElements: {
      graphDiv: gd,
      svg,
      dragLayer: drag,
      boundingBox,
    },
  };
};

export function useConverters(parentRef) {
  const convertersRef = useRef(null);

  const onRelayout = useCallback(() => {
    if (!parentRef?.current) return;
    const gd = parentRef.current.querySelector('.js-plotly-plot');
    if (!gd) return;
    const drag = parentRef.current.querySelector('.nsewdrag');
    const svg = parentRef.current.querySelector('svg');
    if (!drag || !svg) return;

    const boundingBox = drag.getBoundingClientRect();
    convertersRef.current = createCoordinateConverters(gd, svg, drag, boundingBox);
  }, []);

  return { convertersRef, onRelayout };
}
