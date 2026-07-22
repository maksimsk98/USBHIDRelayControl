export const applyFamilyLiveGeometryDONOR = ({
  family,
  shapeMap,
  peakBorders,
  convertersRef,
  borderHeight,
  plotData,
  familyOverride, // { xLeft?, xRight? } | null
  activeBorder,   // { x, peakNum, location } | null
}) => {
  if (!family || typeof family.lineY !== 'function') return;

  const members = family.members;

  /* ───────── helper: resolve donor / acceptor ───────── */

  const resolveContourTransfer = () => {
    if (!activeBorder) return null;

    const { peakNum, location, x } = activeBorder;
    const peak = peakBorders[peakNum];
    if (!peak) return null;

    let donorPeakNum = null;
    let acceptorPeakNum = null;

    if (location === 'right' && peak.pairedWithRightPeakIndex != null) {
      donorPeakNum = peak.pairedWithRightPeakIndex;
      acceptorPeakNum = peakNum;
    }

    if (location === 'left' && peak.pairedWithLeftPeakIndex != null) {
      donorPeakNum = peak.pairedWithLeftPeakIndex;
      acceptorPeakNum = peakNum;
    }

    if (donorPeakNum == null || acceptorPeakNum == null) {
      return null; // family edge or invalid
    }

    const donorPeak = peakBorders[donorPeakNum];
    const acceptorPeak = peakBorders[acceptorPeakNum];
    if (!donorPeak || !acceptorPeak) return null;

    const donor = {
      peakNum: donorPeakNum,
      x0: donorPeak.borders[0],
      x1: donorPeak.borders[1],
    };

    const acceptor = {
      peakNum: acceptorPeakNum,
      x0: acceptorPeak.borders[0],
      x1: acceptorPeak.borders[1],
    };

    if (location === 'right') {
      donor.x0 = x;
      acceptor.x1 = x;
    } else {
      donor.x1 = x;
      acceptor.x0 = x;
    }

    return { donor, acceptor };
  };

  const transfer = resolveContourTransfer();

  /* ───────── contours (ONLY affected segments rebuilt) ───────── */

  for (const shape of shapeMap) {
    const cd = shape.customData;
    if (!cd || cd.type !== 'contour') continue;
    if (!members.includes(cd.parentPeakNum)) continue;

    let x0, x1;

    if (transfer && cd.parentPeakNum === transfer.donor.peakNum) {
      ({ x0, x1 } = transfer.donor);
    } else if (transfer && cd.parentPeakNum === transfer.acceptor.peakNum) {
      ({ x0, x1 } = transfer.acceptor);
    } else {
      const peak = peakBorders[cd.parentPeakNum];
      if (!peak) continue;
      x0 = peak.borders[0];
      x1 = peak.borders[1];
    }

    const y0 = family.lineY({ x: x0, ...familyOverride });
    const y1 = family.lineY({ x: x1, ...familyOverride });

    const x0Px = convertersRef.current.xToPixel(x0);
    const x1Px = convertersRef.current.xToPixel(x1);
    const y0Px = convertersRef.current.yToPixel(y0);
    const y1Px = convertersRef.current.yToPixel(y1);

    const svgX0 = convertersRef.current.xPixelToSVG(x0Px);
    const svgX1 = convertersRef.current.xPixelToSVG(x1Px);
    const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
    const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

    shape.elem.setAttribute(
      'd',
      `M${svgX0},${svgY0}L${svgX1},${svgY1}`
    );
  }

  /* ───────── inner borders (unchanged) ───────── */

  for (const shape of shapeMap) {
    const cd = shape.customData;
    if (!cd || cd.type !== 'border') continue;
    if (!members.includes(cd.parentPeakNum)) continue;

    if (cd.active) continue;

    const isInner =
      cd.pairedWithLeftPeakIndex != null ||
      cd.pairedWithRightPeakIndex != null;

    if (!isInner) continue;

    const x = shape.coordX;

    const { y: signalY } = findIntersections(
      x,
      plotData[0].x,
      plotData[0].y
    );

    const contourY = family.lineY({ x, ...familyOverride });

    const y0 = Math.min(signalY, contourY);
    const y1 = Math.max(signalY, contourY);

    const xPx  = convertersRef.current.xToPixel(x);
    const y0Px = convertersRef.current.yToPixel(y0);
    const y1Px = convertersRef.current.yToPixel(y1);

    const svgX  = convertersRef.current.xPixelToSVG(xPx);
    const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
    const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

    shape.elem.setAttribute(
      'd',
      `M${svgX},${svgY0}L${svgX},${svgY1}`
    );
  }
};

export const applyFamilyLiveGeometryEDGE_ORPHAN = ({
  family,
  shapeMap,
  peakBorders,
  convertersRef,
  borderHeight,
  plotData,
  familyOverride, // { xLeft?, xRight? } | null

  activeBorder, // { x, peakNum, location } | null
}) => {
  if (!family || typeof family.lineY !== 'function') return;

  const members = family.members;

  /* ───────── helpers ───────── */

  const memberIndex = (peakNum) =>
    members.findIndex((n) => n === peakNum);

  let leftPeak = null;
  let rightPeak = null;

  if (activeBorder) {
    const idx = memberIndex(activeBorder.peakNum);
    if (idx !== -1) {
      if (activeBorder.location === 'right') {
        leftPeak = members[idx];
        rightPeak = members[idx + 1] ?? null;
      } else {
        leftPeak = members[idx - 1] ?? null;
        rightPeak = members[idx];
      }
    }
  }

  /* ───────── contours ───────── */

  for (const shape of shapeMap) {
    const cd = shape.customData;
    if (!cd || cd.type !== 'contour') continue;
    if (!members.includes(cd.parentPeakNum)) continue;

    const peak = peakBorders[cd.parentPeakNum];
    if (!peak) continue;

    let x0 = familyOverride?.xLeft  ?? peak.borders[0];
    let x1 = familyOverride?.xRight ?? peak.borders[1];

    // ───── live inner-border stitching ─────
    if (activeBorder) {
      if (cd.parentPeakNum === leftPeak) {
        if (activeBorder.location === 'right') x1 = activeBorder.x;
        if (activeBorder.location === 'left')  x1 = x1;
      }

      if (cd.parentPeakNum === rightPeak) {
        if (activeBorder.location === 'right') x0 = activeBorder.x;
        if (activeBorder.location === 'left')  x0 = activeBorder.x;
      }
    }

    const y0 = family.lineY({ x: x0, ...familyOverride });
    const y1 = family.lineY({ x: x1, ...familyOverride });

    const x0Px = convertersRef.current.xToPixel(x0);
    const x1Px = convertersRef.current.xToPixel(x1);
    const y0Px = convertersRef.current.yToPixel(y0);
    const y1Px = convertersRef.current.yToPixel(y1);

    const svgX0 = convertersRef.current.xPixelToSVG(x0Px);
    const svgX1 = convertersRef.current.xPixelToSVG(x1Px);
    const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
    const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

    shape.elem.setAttribute(
      'd',
      `M${svgX0},${svgY0}L${svgX1},${svgY1}`
    );
  }

  /* ───────── inner borders ───────── */

  for (const shape of shapeMap) {
    const cd = shape.customData;
    if (!cd || cd.type !== 'border') continue;
    if (!members.includes(cd.parentPeakNum)) continue;

    // АКТИВНЫЕ — НИКОГДА НЕ ТРОГАЕМ
    if (cd.active) continue;

    const isInner =
      cd.pairedWithLeftPeakIndex != null ||
      cd.pairedWithRightPeakIndex != null;

    if (!isInner) continue;

    const x = shape.coordX;

    const { y: signalY } = findIntersections(
      x,
      plotData[0].x,
      plotData[0].y
    );

    const contourY = family.lineY({ x, ...familyOverride });

    const y0 = Math.min(signalY, contourY);
    const y1 = Math.max(signalY, contourY);

    const xPx  = convertersRef.current.xToPixel(x);
    const y0Px = convertersRef.current.yToPixel(y0);
    const y1Px = convertersRef.current.yToPixel(y1);

    const svgX  = convertersRef.current.xPixelToSVG(xPx);
    const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
    const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

    shape.elem.setAttribute(
      'd',
      `M${svgX},${svgY0}L${svgX},${svgY1}`
    );
  }
};

now check that border move to redux goes correct, and check all logic for errors take your time

import { useDispatch, useSelector } from "react-redux";
import useOnCanvasClick from "./useOnCanvasClick";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { EMPTY_ARRAY, PEAK_WORK_MODES } from "../constants/constants";
import _ from "lodash";
import { addPeak, deletePeak, moveBorders } from "../services/thunks/peaks/peaksThunks";
import { selectPeakWorkMode } from "../services/reduxImportDispatcher";
import { useDragRectangleXY } from "./useDragRectangleXY";
import { findYOfClosestPoint, generatePeakAnnotations } from "../utils/peakUtils";
import { Plotly } from "../utils/setupPlotly";
import { usePeakBordersSingleSource } from "./plotHooks/usePeakBorders";

const getFamilyEdgeOverrideForBorder = (borderCd, xCoord) => {
  const isLeftFamilyEdge =
    borderCd.location === 'left' &&
    borderCd.pairedWithLeftPeakIndex == null;

  const isRightFamilyEdge =
    borderCd.location === 'right' &&
    borderCd.pairedWithRightPeakIndex == null;

  if (isLeftFamilyEdge) return { xLeft: xCoord };
  if (isRightFamilyEdge) return { xRight: xCoord };
  return null;
};

export const commitFamilyLayout = ({
  prevShapes,
  family,
  familyOverride,
  peakBorders,
  plotData,
  activeBorder, // { x, peakNum, location } | null  <-- NEW
  borderHeight
}) => {
  if (!family || typeof family.lineY !== 'function') {
    console.error('[commitFamilyLayout] invalid family');
    return prevShapes;
  }

  const membersArr = family.members;
  const members = new Set(membersArr);

  /* ───────── donor / acceptor resolve (same as live) ───────── */

  const resolveContourTransfer = () => {
    if (!activeBorder) return null;

    const { peakNum, location, x } = activeBorder;
    const peak = peakBorders[peakNum];
    if (!peak) return null;

    let donorPeakNum = null;
    let acceptorPeakNum = null;

    if (location === 'right' && peak.pairedWithRightPeakIndex != null) {
      donorPeakNum = peak.pairedWithRightPeakIndex;
      acceptorPeakNum = peakNum;
    }

    if (location === 'left' && peak.pairedWithLeftPeakIndex != null) {
      donorPeakNum = peak.pairedWithLeftPeakIndex;
      acceptorPeakNum = peakNum;
    }

    if (donorPeakNum == null || acceptorPeakNum == null) return null;

    const donorPeak = peakBorders[donorPeakNum];
    const acceptorPeak = peakBorders[acceptorPeakNum];
    if (!donorPeak || !acceptorPeak) return null;

    const donor = {
      peakNum: donorPeakNum,
      x0: donorPeak.borders[0],
      x1: donorPeak.borders[1],
    };

    const acceptor = {
      peakNum: acceptorPeakNum,
      x0: acceptorPeak.borders[0],
      x1: acceptorPeak.borders[1],
    };

    if (location === 'right') {
      donor.x0 = x;
      acceptor.x1 = x;
    } else {
      donor.x1 = x;
      acceptor.x0 = x;
    }

    return { donor, acceptor };
  };

  const transfer = resolveContourTransfer();

  /* ───────── EDGE/ORPHAN neighbor resolve (same as live) ───────── */

  const memberIndex = (peakNum) => membersArr.findIndex(n => n === peakNum);

  let leftPeak = null;
  let rightPeak = null;

  if (!transfer && activeBorder) {
    const idx = memberIndex(activeBorder.peakNum);
    if (idx !== -1) {
      if (activeBorder.location === 'right') {
        leftPeak = membersArr[idx];
        rightPeak = membersArr[idx + 1] ?? null;
      } else {
        leftPeak = membersArr[idx - 1] ?? null;
        rightPeak = membersArr[idx];
      }
    }
  }

  return prevShapes.map(shape => {
    const cd = shape.customData;
    if (!cd || !members.has(cd.parentPeakNum)) return shape;

    // АКТИВНЫЕ — НИКОГДА НЕ ТРОГАЕМ (как было)
    if (cd.type === 'border' && cd.active) {
      return { ...shape, yref: 'paper', y0: 1, y1: 0 };
    }

    const peak = peakBorders[cd.parentPeakNum];
    if (!peak) return shape;

    /* ───────── contour (NOW WITH DRAG STATE) ───────── */
    if (cd.type === 'contour') {
      let x0, x1;

      // 1) donor/acceptor
      if (transfer && cd.parentPeakNum === transfer.donor.peakNum) {
        ({ x0, x1 } = transfer.donor);
      } else if (transfer && cd.parentPeakNum === transfer.acceptor.peakNum) {
        ({ x0, x1 } = transfer.acceptor);
      }

      // 2) EDGE/ORPHAN baseline + stitching
      else {
        x0 = familyOverride?.xLeft  ?? peak.borders[0];
        x1 = familyOverride?.xRight ?? peak.borders[1];

        if (activeBorder && !transfer) {
          if (cd.parentPeakNum === leftPeak && activeBorder.location === 'right') {
            x1 = activeBorder.x;
          }
          if (cd.parentPeakNum === rightPeak) {
            x0 = activeBorder.x;
          }
        }
      }

      return {
        ...shape,
        x0,
        x1,
        y0: family.lineY({ x: x0, ...familyOverride }),
        y1: family.lineY({ x: x1, ...familyOverride }),
      };
    }

    /* ───────── inner border (signal ↔ contour) ───────── */
    if (
      cd.type === 'border' &&
      (cd.pairedWithLeftPeakIndex != null || cd.pairedWithRightPeakIndex != null)
    ) {
      const x = shape.x0; // уже зафиксирован setLayout выше

      const { y: signalY } = findIntersections(x, plotData[0].x, plotData[0].y);
      const contourY = family.lineY({ x, ...familyOverride });

      return {
        ...shape,
        y0: Math.min(signalY, contourY),
        y1: Math.max(signalY, contourY),
      };
    }

        /* ───────── EDGE / ORPHAN border (signal-only) ───────── */
    if (
      cd.type === 'border' &&
      cd.active !== true &&
      cd.pairedWithLeftPeakIndex == null &&
      cd.pairedWithRightPeakIndex == null
    ) {
      const x = shape.x0;

      const { y: signalY } = findIntersections(
        x,
        plotData[0].x,
        plotData[0].y
      );

      const half = borderHeight / 2;

      return {
        ...shape,
        y0: signalY + half,
        y1: signalY - half,
      };
    }

    return shape;
  });
};


export const applyFamilyLiveGeometry = ({
  family,
  shapeMap,
  peakBorders,
  convertersRef,
  borderHeight,
  plotData,
  familyOverride, // { xLeft?, xRight? } | null
  activeBorder,   // { x, peakNum, location } | null
}) => {
  if (!family || typeof family.lineY !== 'function') return;

  const members = family.members;

  /* ───────── donor / acceptor resolve ───────── */

  const resolveContourTransfer = () => {
    if (!activeBorder) return null;
    const { peakNum, location, x } = activeBorder;
    const peak = peakBorders[peakNum];
    if (!peak) return null;

    let donorPeakNum = null;
    let acceptorPeakNum = null;

    if (location === 'right' && peak.pairedWithRightPeakIndex != null) {
      donorPeakNum = peak.pairedWithRightPeakIndex;
      acceptorPeakNum = peakNum;
    }

    if (location === 'left' && peak.pairedWithLeftPeakIndex != null) {
      donorPeakNum = peak.pairedWithLeftPeakIndex;
      acceptorPeakNum = peakNum;
    }

    if (donorPeakNum == null || acceptorPeakNum == null) return null;

    const donorPeak = peakBorders[donorPeakNum];
    const acceptorPeak = peakBorders[acceptorPeakNum];
    if (!donorPeak || !acceptorPeak) return null;

    const donor = {
      peakNum: donorPeakNum,
      x0: donorPeak.borders[0],
      x1: donorPeak.borders[1],
    };

    const acceptor = {
      peakNum: acceptorPeakNum,
      x0: acceptorPeak.borders[0],
      x1: acceptorPeak.borders[1],
    };

    if (location === 'right') {
      donor.x0 = x;
      acceptor.x1 = x;
    } else {
      donor.x1 = x;
      acceptor.x0 = x;
    }

    return { donor, acceptor };
  };

  const transfer = resolveContourTransfer();

  /* ───────── EDGE / ORPHAN helpers ───────── */

  const memberIndex = (peakNum) =>
    members.findIndex(n => n === peakNum);

  let leftPeak = null;
  let rightPeak = null;

  if (!transfer && activeBorder) {
    const idx = memberIndex(activeBorder.peakNum);
    if (idx !== -1) {
      if (activeBorder.location === 'right') {
        leftPeak = members[idx];
        rightPeak = members[idx + 1] ?? null;
      } else {
        leftPeak = members[idx - 1] ?? null;
        rightPeak = members[idx];
      }
    }
  }

  /* ───────── contours ───────── */

  for (const shape of shapeMap) {
    const cd = shape.customData;
    if (!cd || cd.type !== 'contour') continue;
    if (!members.includes(cd.parentPeakNum)) continue;

    let x0, x1;

    // 1) donor / acceptor
    if (transfer && cd.parentPeakNum === transfer.donor.peakNum) {
      ({ x0, x1 } = transfer.donor);
    }
    else if (transfer && cd.parentPeakNum === transfer.acceptor.peakNum) {
      ({ x0, x1 } = transfer.acceptor);
    }

    // 2) EDGE / ORPHAN
    else {
      const peak = peakBorders[cd.parentPeakNum];
      if (!peak) continue;

      x0 = familyOverride?.xLeft  ?? peak.borders[0];
      x1 = familyOverride?.xRight ?? peak.borders[1];

      if (activeBorder && !transfer) {
        if (cd.parentPeakNum === leftPeak && activeBorder.location === 'right') {
          x1 = activeBorder.x;
        }
        if (cd.parentPeakNum === rightPeak) {
          x0 = activeBorder.x;
        }
      }
    }

    const y0 = family.lineY({ x: x0, ...familyOverride });
    const y1 = family.lineY({ x: x1, ...familyOverride });

    const x0Px = convertersRef.current.xToPixel(x0);
    const x1Px = convertersRef.current.xToPixel(x1);
    const y0Px = convertersRef.current.yToPixel(y0);
    const y1Px = convertersRef.current.yToPixel(y1);

    const svgX0 = convertersRef.current.xPixelToSVG(x0Px);
    const svgX1 = convertersRef.current.xPixelToSVG(x1Px);
    const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
    const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

    shape.elem.setAttribute(
      'd',
      `M${svgX0},${svgY0}L${svgX1},${svgY1}`
    );
  }

  /* ───────── inner borders (общие) ───────── */

  for (const shape of shapeMap) {
    const cd = shape.customData;
    if (!cd || cd.type !== 'border') continue;
    if (!members.includes(cd.parentPeakNum)) continue;
    if (cd.active) continue;

    const isInner =
      cd.pairedWithLeftPeakIndex != null ||
      cd.pairedWithRightPeakIndex != null;

    if (!isInner) continue;

    const x = shape.coordX;

    const { y: signalY } = findIntersections(
      x,
      plotData[0].x,
      plotData[0].y
    );

    const contourY = family.lineY({ x, ...familyOverride });

    const y0 = Math.min(signalY, contourY);
    const y1 = Math.max(signalY, contourY);

    const xPx  = convertersRef.current.xToPixel(x);
    const y0Px = convertersRef.current.yToPixel(y0);
    const y1Px = convertersRef.current.yToPixel(y1);

    const svgX  = convertersRef.current.xPixelToSVG(xPx);
    const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
    const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

    shape.elem.setAttribute(
      'd',
      `M${svgX},${svgY0}L${svgX},${svgY1}`
    );
  }
};

// NOTE: getBorderYRange is initial-render-only.
// Live geometry MUST come from family.lineY.
const getBorderYRange = ({
  isActive,
  borderX,
  borderY,
  borderHeight,
  family,
  isInnerFamilyBorder,
}) => {
  const half = borderHeight / 2;

  // 1. Активный — как раньше
  if (isActive) {
    return {
      y0: borderY + half,
      y1: borderY - half,
    };
  }

  // 2. Сирота или край семейства — как раньше
  if (!isInnerFamilyBorder) {
    return {
      y0: borderY + half,
      y1: borderY - half,
    };
  }

  // 3. Неактивный ВНУТРЕННИЙ семейный — УМНО
  const familyY = family.lineY({x: borderX});

  if (familyY > borderY) {
    // контур выше сигнала
    return {
      y0: borderY - half,
      y1: familyY,
    };
  }

  // контур ниже сигнала
  return {
    y0: familyY,
    y1: borderY + half,
  };
};

const buildPeakFamilies = (peakBorders, plotData) => {
  const families = [];
  const used = new Set();

  for (let i = 0; i < peakBorders.length; i++) {
    if (used.has(i)) continue;

    const members = [i];
    used.add(i);

    let current = i;

    while (true) {
      const next = peakBorders[current].pairedWithRightPeakIndex;

      if (next == null) break;
      if (next <= current) break;
      if (used.has(next)) break;

      const back = peakBorders[next].pairedWithLeftPeakIndex;
      if (back !== current) break;

      members.push(next);
      used.add(next);
      current = next;
    }

    // ───────── hydratation ─────────

    const leftIdx = members[0];
    const rightIdx = members[members.length - 1];

    const xLeft = peakBorders[leftIdx].borders[0];
    const xRight = peakBorders[rightIdx].borders[1];

    const { y: yLeft } = findIntersections(xLeft, plotData[0].x, plotData[0].y);
    const { y: yRight } = findIntersections(xRight, plotData[0].x, plotData[0].y);

    const dx = xRight - xLeft;
    const k = dx !== 0 ? (yRight - yLeft) / dx : 0;

    const lineY = ({
      x,
      xLeft: overrideLeft,
      xRight: overrideRight,
    }) => {
      const effectiveLeft  = overrideLeft  ?? xLeft;
      const effectiveRight = overrideRight ?? xRight;

      const yL = overrideLeft
        ? findIntersections(effectiveLeft, plotData[0].x, plotData[0].y).y
        : yLeft;

      const yR = overrideRight
        ? findIntersections(effectiveRight, plotData[0].x, plotData[0].y).y
        : yRight;

      const dx = effectiveRight - effectiveLeft;
      if (dx === 0) return yL;

      const k = (yR - yL) / dx;
      return yL + (x - effectiveLeft) * k;
    };

    families.push({
      members,
      xLeft,
      xRight,
      lineY,
    });
  }

  return families;
};


const clearPathElems = (pathElems, message) => {
  pathElems.current = [];
  /* console.log('clearedPaths ', message) */
}

const createGetNewSelectedPeak = (peakBorders, clickX) => {
  for (let i = 0; i < peakBorders.length; i += 1) {
    const [left, right] = peakBorders[i].borders;
    
    if (clickX >= left && clickX <= right) {
      // Found a peak containing clickX, check if it's a rider peak
      const riders = peakBorders.filter((peak) => peak.ridesOnPeakNum === i)
      
      for (let j = 0; j < riders.length; j += 1) {
        const [nextLeft, nextRight] = riders[j].borders;

        const isTighter = // allow shared border with master
          (left <= nextLeft && nextRight < right) ||
          (left < nextLeft && nextRight <= right);
        const isClickInRange = clickX >= nextLeft && clickX <= nextRight;
        
        if (isTighter && isClickInRange) {
          return i+j+1;
        } 
      }
      
      return i;
    }
  }
  return null
}

const getBorderHeight = (layout) => {
  if (!layout?.yaxis?.range) return 0
  const [y_min, y_max] = layout.yaxis.range;
  
  return (y_max - y_min) * 0.05;
}

function getCurrentPeakIndex(shapeMap, selectedPeakNum) {
  return shapeMap.indexOf(shapeMap
    .find((shape) => shape.customData.type === 'peak' && shape.customData.parentPeakNum === selectedPeakNum))
}

const getActiveBorderLoc = (currentPeakIndex, currentShapeIndex) => {
  return currentPeakIndex > currentShapeIndex ? 'leftBorder' : 'rightBorder'
}

const borderLocPairMap = {
  leftBorder: 'rightBorder',
  rightBorder: 'leftBorder',
  left: 'right',
  right: 'left'
}

const getNewContourD = ({
  newContourYCoord,
  newSVGX,
  contourElem,
  borderLoc,
  convertersRef,
  reversed = false
}) => {
  const contourCommands = parsePathD(contourElem)      
  const newYContourPixel = convertersRef.current.yToPixel(newContourYCoord)
  const newYContourSVG = convertersRef.current.yPixelToSVG(newYContourPixel)

  let newD = null;
  const effectiveBorderLoc = reversed ? borderLocPairMap[borderLoc] : borderLoc;

  console.log('D',contourCommands, effectiveBorderLoc)
  if (!contourCommands) return newD;

  const isLeftValidCommands = contourCommands[1]?.x != null && contourCommands[1]?.y != null
  const isRightVaildCommands = contourCommands[0]?.x != null && contourCommands[0]?.y != null

  if (!isLeftValidCommands || !isRightVaildCommands) {
    console.error('Invalid D parsing of contour')
    return null //TODO WATCHLIST let contours fail and disappear but save from crash for now
  }

  if (effectiveBorderLoc === 'leftBorder' && isLeftValidCommands) {
    newD = `M${newSVGX},${newYContourSVG}L${contourCommands[1].x},${contourCommands[1].y}`;
  } else if (effectiveBorderLoc === 'rightBorder' && isRightVaildCommands) {
    newD = `M${contourCommands[0].x},${contourCommands[0].y}L${newSVGX},${newYContourSVG}`;
  }
  return newD;
}

const getPairPeakNum = (customData, selectedPeakNum) => {
  if (customData?.pairedWithRightPeakIndex ) return customData?.pairedWithRightPeakIndex ?? null;
  if (customData?.pairedWithLeftPeakIndex === selectedPeakNum) {
    return customData?.parentPeakNum // case when border is common and it references selected peak as paired on the left schema:{selPeak | pairPeak} and we need to return parentPeak of this border, because left borders in pairs are owned by peak themselves, and right goes to pair for ownership
  } else {
    return customData?.pairedWithLeftPeakIndex // case schema:{ pairPeak | selPeak }
  }
}

const findIntersections = (xBorder, xData, yData) => {  
  let left = 0, right = xData.length - 1;
  
  // Binary search to find the closest left index where xData[left] < xBorder < xData[left + 1]
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (xData[mid] < xBorder) left = mid;
    else right = mid;
  }

  // Ensure we have two valid points to interpolate
  if (xData[left] === xBorder) return { x: xBorder, y: yData[left] };
  if (xData[right] === xBorder) return { x: xBorder, y: yData[right] };

  // Linear interpolation to find y at xBorder
  const slope = (yData[right] - yData[left]) / (xData[right] - xData[left]);
  const yIntersection = yData[left] + slope * (xBorder - xData[left]);

  return { x: xBorder, y: yIntersection };
};


const defineShapeRoles = (peakBorders, selectedPeakNum) => {
  const roles = [];

  for (let i = 0; i < peakBorders.length; i++) {
    const peak = peakBorders[i];
    const isSelected = selectedPeakNum === i;

    // Always push left border, if paired with selected activate
    const pairedWithSelected = peak.pairedWithLeftPeakIndex === selectedPeakNum;

    roles.push([peak.borders[0], isSelected || pairedWithSelected ? 'ab' : 'b']);

    // Contour coord is always null
    roles.push([null, 'c']);

    // Peak center
    roles.push([peak.center, 'p']);

    // Only push right border if this peak is responsible for rendering it
    const ownsRightBorder = peak.pairedWithRightPeakIndex == null;
    
    if (ownsRightBorder) {
      roles.push([peak.borders[1], isSelected ? 'ab' : 'b']);
    }
  }

  return roles;
};

const snapToPrecision = (value, precision = 0.01) => 
  Math.round(value / precision) * precision;

const clampToRange = (coordX, startCoordX, leftBorder, rightBorder, gap = 0.2) => {
  if (coordX < startCoordX && coordX <= leftBorder + gap) {
    return snapToPrecision(leftBorder + gap);
  }

  if (coordX > startCoordX && coordX >= rightBorder - gap) {
    return snapToPrecision(rightBorder - gap);
  }

  return snapToPrecision(coordX);
};

const findCollision = (shapeMap, draggedIndex, direction, borderLimit, plotData, convertersRef) => {
  const step = direction === 'left' ? -1 : 1;
   
  let collision = null;
  let coordClamp = direction === 'left' ? plotData[0].x[0] : plotData[0].x.at(-1);
  let svgXBorder = Math.min(borderLimit, convertersRef.current.xPixelToSVG(convertersRef.current.xToPixel(coordClamp)));

  const originShape = shapeMap[draggedIndex];
  // Cache peak centers
  const peakCenters = {};
  shapeMap.forEach((shape) => {
    if (shape.customData.type === 'peak') {
      peakCenters[shape.customData.parentPeakNum] = shape.coordX;
    }
  });

  const sortFunc = (a, b) => {
    if (a.coordX !== b.coordX) return a.coordX - b.coordX;
  
    // For equal coordX, resolve tie based on direction
    const aIsRider = a.customData.ridesOnPeakNum != null;
    const bIsRider = b.customData.ridesOnPeakNum != null;
  
    if (aIsRider !== bIsRider) {      
      return direction === 'left'
        ? (aIsRider ? -1 : 1)  // Riders first
        : (aIsRider ? 1 : -1); // Riders last
    }
  
    // Fallback to center comparison if same type
    const aCenter = peakCenters[a.customData.parentPeakNum] ?? 0;
    const bCenter = peakCenters[b.customData.parentPeakNum] ?? 0;
    return aCenter - bCenter;
  };

  const isLeft = direction === 'left';
  const originX = originShape.coordX
  const candidateShapes = shapeMap.filter(shape => {
    const x = shape.coordX;
    return isLeft ? x <= originX : x >= originX;
  });
  let collisionCandidates = candidateShapes.sort(sortFunc)
    .filter((shape) => shape.customData.type !== 'contour');
  collisionCandidates = isLeft ? collisionCandidates.reverse() : collisionCandidates;
  
  const originData = originShape.customData;   
  const originPeakNum = originData.parentPeakNum;


  for (let iObstc of collisionCandidates) {
    if (iObstc === originShape) continue; // Don't collide with yourself

    const iData = iObstc.customData;
    
    if (iData.type === 'peak') {
      svgXBorder = iObstc.dX;
      coordClamp = iObstc.coordX;
      break;
    }

    if (iData.type === 'border') {
      if (iData.ridesOnPeakNum !== null && iData.ridesOnPeakNum !== undefined) { // is rider-border
        svgXBorder = iObstc.dX;
        coordClamp = iObstc.coordX;
        break;
      }
      
      if (originShape.customData.ridesOnPeakNum === iData.parentPeakNum) { // orig shape is rider, so horse-peak borders are limit
        const isEdgeSharedWithMaster =
          iObstc.coordX === originX &&
          iData.parentPeakNum === originData.ridesOnPeakNum &&
          iData.location === originData.location;

        const isDraggingAwayFromMaster = iData.location === direction;

        if (isEdgeSharedWithMaster && !isDraggingAwayFromMaster) { // when rider border in the same place as master dissalow moving away from master, but allow inward
          continue
        } else {
          svgXBorder = iObstc.dX;
          coordClamp = iObstc.coordX;
          break;
        }
        
      }

      if (
        (iData.parentPeakNum < originPeakNum && isLeft)
        || (iData.parentPeakNum > originPeakNum && !isLeft)
      ) {
        // is valid collision
        const collisionShapeIndex = shapeMap.indexOf(iObstc)
      
        collision = {
          borderSVGX: iObstc.dX,
          origCoordX: iObstc.coordX,
          direction,
          elem: iObstc.elem,
          shapeIndex: collisionShapeIndex,
        }
      }

    }
  }

  return { collision, svgXBorder, coordClamp };
}

const parsePathD = (pathElem) => {
  const d = pathElem.getAttribute("d");
  const regex = /([ML])([\d.]+),([\d.]+)/g;

  let commands = [];
  let match;
  while ((match = regex.exec(d)) !== null) {
    commands.push({
      command: match[1],  // "M" or "L"
      x: parseFloat(match[2]),  // Extracted x value
      y: parseFloat(match[3])   // Extracted y value
    });
  }
  return commands;
};

const attachHandlers = (
  pathElem, 
  processedEvents, 
  plotlyObj, 
  setLayout, 
  selectedPeakNum,
  pathElems,
  plotData,
  dispatch,
  convertersRef,
  manualClickRef,
  peakToFamilyRef,
  peakBorders,
  layout
  ) => {
  

  const onMouseDown = (event) => {
    event.preventDefault(); // Prevent default behavior
    event.stopPropagation(); // Stop event from propagating

    const {width, margin : {l: leftMargin}} = plotlyObj.el._fullLayout
    const regex = /M(-?[\d.]+),/;
        
    const shapeMap = pathElems.current.map(([elem, coordX, customData]) => {
      const isDragged = event.target === elem;
      const match = elem.getAttribute("d").match(regex);
      if (!match) return null

      let location = null;
      
      if (customData.type === 'border' && customData?.location != undefined && customData.pairedWithLeftPeakIndex === selectedPeakNum) { // for shapes that have location, meaning borders that are not peaks, and selected peak is paired to the one in this iteration
        console.groupCollapsed('loc def')
        console.log(selectedPeakNum, customData.parentPeakNum)
        const didDonateBorderToMerged  =  selectedPeakNum === customData.parentPeakNum - 1;   // means selected peak donated his right border to merged right peak, cause when not separated left peak donates his right border to the next
        location = didDonateBorderToMerged ? 'right' :  customData.location;
        console.log('redef loc ', location)
        console.log(customData)      
        console.groupEnd()
      }

      return {
        elem,
        coordX,
        customData: {
          ...customData,
          ...(location && {location}),
          type: isDragged ? 'dragged' : customData.type,
        },
        dX: parseFloat(match[1]),
      }

    })

    const currentDraggedShapeIndex = shapeMap.findIndex((border) => border.customData.type === 'dragged');

    const draggedOrigCoordX = shapeMap[currentDraggedShapeIndex].coordX;
    
    const currentPeakShapeIndex = getCurrentPeakIndex(shapeMap, selectedPeakNum);
    
    const borderLoc = getActiveBorderLoc(currentPeakShapeIndex, currentDraggedShapeIndex)
    const leftResult = findCollision(shapeMap, currentDraggedShapeIndex, 'left', leftMargin, plotData, convertersRef);
    const rightResult = findCollision(shapeMap, currentDraggedShapeIndex, 'right', width - leftMargin, plotData, convertersRef);

    let leftBorder = leftResult.svgXBorder;
    let rightBorder = rightResult.svgXBorder;
  
    let collision = leftResult.collision || rightResult.collision;

    const pairedPeakNum = getPairPeakNum(shapeMap[currentDraggedShapeIndex].customData, selectedPeakNum)

    let latestCoordX = null; // Store latest X coordinate of moving border
    let collisionBorder = { borderCoordX: null, shapeIndex: collision?.shapeIndex };
    let collisionFamilyCache = null;
    let didCollisionTouchOtherFamily = false;
    let didCollisionHappened = false;

    let familyOverride = null;
    let collisionFamilyOverride = null;


    const draggedData = shapeMap[currentDraggedShapeIndex].customData;
    const familyMap = peakToFamilyRef.current;
    const family = familyMap?.get(draggedData.parentPeakNum) ?? null;

    const handleMouseMove = (moveEvent) => {
      if (processedEvents.has(moveEvent)) return;
      
      let newSVGX = convertersRef.current.xPixelToSVG(moveEvent.clientX)
      if (newSVGX < leftBorder) {
        newSVGX = leftBorder;
      }
      if (newSVGX > rightBorder) {
        newSVGX = rightBorder;
      }

      
      const isCollisionLeft = collision?.direction === 'left' && newSVGX < collision.borderSVGX;
      const isCollisionRight = collision?.direction === 'right' && newSVGX > collision.borderSVGX;

      const borderCommands = parsePathD(pathElem)
      const newBorderD = `M${newSVGX},${borderCommands[0].y}L${newSVGX},${borderCommands[1].y}`; // Preserve y-coordinates
      pathElem.setAttribute("d", newBorderD); // Correct method
      
      if (isCollisionLeft || isCollisionRight) {
        collision.elem.setAttribute("d", newBorderD);
        collision.borderSVGX = newSVGX;
        didCollisionHappened = true;
        collisionBorder.borderCoordX = clampToRange(
          convertersRef.current.pixelToX(convertersRef.current.xSVGToPixel(collision.borderSVGX)),
          collision.origCoordX,
          leftResult.coordClamp, 
          rightResult.coordClamp
        )
      }

      latestCoordX = clampToRange(
        convertersRef.current.pixelToX(convertersRef.current.xSVGToPixel(newSVGX)), 
        draggedOrigCoordX,
        leftResult.coordClamp, 
        rightResult.coordClamp
      )

      const isLeftFamilyEdge =
        draggedData.location === 'left' &&
        draggedData.pairedWithLeftPeakIndex == null;

      const isRightFamilyEdge =
        draggedData.location === 'right' &&
        draggedData.pairedWithRightPeakIndex == null;

      if (isLeftFamilyEdge && isRightFamilyEdge) {
        console.error('[family edge] impossible state', draggedData);
      }

      familyOverride =
        family
          ? {
              ...(isLeftFamilyEdge  && { xLeft:  latestCoordX }),
              ...(isRightFamilyEdge && { xRight: latestCoordX }),
            }
          : null;

      if (family) {
        applyFamilyLiveGeometry({
          family,
          shapeMap,
          peakBorders,
          convertersRef,
          borderHeight: getBorderHeight(layout),
          familyOverride,
          plotData,

          activeBorder: {
            x: latestCoordX,
            peakNum: draggedData.parentPeakNum,
            location: draggedData.location,
          },
        });
      }

      const collisionPeakNum =
        collision?.shapeIndex != null
          ? shapeMap[collision.shapeIndex]?.customData?.parentPeakNum
          : null;

      const collisionFamily =
        collisionPeakNum != null ? familyMap?.get(collisionPeakNum) ?? null : null;

      collisionFamilyCache = collisionFamily;

      const isCollisionInSameFamily =
        !!family && !!collisionFamily && family === collisionFamily;

      if (didCollisionHappened && !isCollisionInSameFamily && collisionFamily) {
          didCollisionTouchOtherFamily = true;

          const collisionShape = shapeMap[collision.shapeIndex];
          const collisionCd = collisionShape?.customData;

          collisionFamilyOverride =
            collisionCd
              ? getFamilyEdgeOverrideForBorder(collisionCd, collisionBorder.borderCoordX)
              : null;

          applyFamilyLiveGeometry({
            family: collisionFamily,
            shapeMap,
            peakBorders,
            convertersRef,
            borderHeight: getBorderHeight(layout),
            familyOverride: collisionFamilyOverride,
            plotData
          });

        didCollisionHappened = false;
      }
      
    };

    window.addEventListener('mousemove', handleMouseMove, { capture: true });

    const onMouseUp = () => {
      manualClickRef.current = false;

      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp);

      if (latestCoordX == null) return;

      /* ───────── prepare move params ───────── */

      const borderMoveParams = {
        peakNum: selectedPeakNum,
        location: shapeMap[currentDraggedShapeIndex].customData.location,
        xCoord: latestCoordX,
      };

      const pairedMoveParams =
        pairedPeakNum != null
          ? {
              peakNum: pairedPeakNum,
              location:
                borderLocPairMap[
                  shapeMap[currentDraggedShapeIndex].customData.location
                ],
              xCoord: latestCoordX,
            }
          : null;

      let collisionMoveParams = null;
      const movedCollision = collisionBorder.borderCoordX != null;

      if (movedCollision) {
        const collisionShape = shapeMap[collisionBorder.shapeIndex];

        collisionMoveParams = {
          peakNum: collisionShape.customData.parentPeakNum,
          location: collisionShape.customData.location,
          xCoord: collisionBorder.borderCoordX,
        };
      }

      /* ───────── commit layout ───────── */
      const draggedCd = shapeMap[currentDraggedShapeIndex].customData;
      
      setLayout(prev => {
        let shapes = prev.shapes.map((shape, index) => {
          if (index === currentDraggedShapeIndex) {
            return { ...shape, x0: latestCoordX, x1: latestCoordX };
          }

          if (
            movedCollision &&
            index === collisionBorder.shapeIndex
          ) {
            return {
              ...shape,
              x0: collisionBorder.borderCoordX,
              x1: collisionBorder.borderCoordX,
            };
          }

          return shape;
        });

          /* ───────── dragged family ───────── */

        if (family) {
          const draggedOverride =
            getFamilyEdgeOverrideForBorder(draggedCd, latestCoordX);

          shapes = commitFamilyLayout({
            prevShapes: shapes,
            family,
            familyOverride: draggedOverride,
            peakBorders,
            plotData,

            borderHeight: getBorderHeight(layout),

            activeBorder: {
              x: latestCoordX,
              peakNum: draggedCd.parentPeakNum,
              location: draggedCd.location,
            },
          });
        }

         /* ───────── collision family (if different) ───────── */
        if (movedCollision && collisionFamilyCache && collisionFamilyCache !== family) {
          const collisionShape = shapeMap[collisionBorder.shapeIndex];
          const collisionCd = collisionShape?.customData;

          const isCollisionInner =
            collisionCd?.pairedWithLeftPeakIndex != null ||
            collisionCd?.pairedWithRightPeakIndex != null;

          shapes = commitFamilyLayout({
            prevShapes: shapes,
            family: collisionFamilyCache,
            familyOverride: collisionFamilyOverride,
            peakBorders,
            plotData,

            borderHeight: getBorderHeight(layout),

            activeBorder: isCollisionInner
              ? {
                  x: collisionBorder.borderCoordX,
                  peakNum: collisionCd.parentPeakNum,
                  location: collisionCd.location,
                }
              : null,
          });
        }

        return { ...prev, shapes };
      });

      /* ───────── redux ───────── */

      dispatch(
        moveBorders({
          border: borderMoveParams,
          collision: collisionMoveParams,
          paired: pairedMoveParams,
        })
      );
    };


    window.addEventListener('mouseup', onMouseUp);

    clearPathElems(pathElems, 'mup') // it seems thatt adding event listeners triggers mutationObserver for style with nulls as changes, weird 
  };

  pathElem.addEventListener('mousedown', onMouseDown, { capture: true });

  // Cleanup
  return () => {
    pathElem.removeEventListener('mousedown', onMouseDown, { capture: true });
  };
};

const useHandlePeak = ({
  plotlyObj,
  isInitialized,
  setLayout,
  peaks,
  layout,
  plotData,
  dispatch,
  parentId,
  convertersRef,
  trueRanges,
  annotationsConfig,
  workMode
}) => {
  const [selectedPeakNum, setSelectedPeakNum] = useState(null);
  const {peakBorders, borderDispatch} = usePeakBordersSingleSource(peaks)

  const peakToFamilyRef = useRef(new Map());

  const shapesRef = useRef(layout.shapes);
  useEffect(() => { shapesRef.current = layout.shapes }, [layout.shapes]);
    
  const activeBorderIndexes = useRef([]) // we track which indexes of array were made active to map to elements
  const pathElems = useRef([])
  const prevPeakCount = useRef(peaks.length);
  const manualClickRef = useRef(false)

  useEffect(()=>{
    // Always re-format when peaks array identity changes:
    borderDispatch({type: 'set', payload: peaks})

    // If the number of peaks changed, clear selection + active borders:
    if (prevPeakCount.current !== peaks.length) {
      setSelectedPeakNum(null);
      activeBorderIndexes.current = [];
      clearPathElems(pathElems, 'peakCountmismatch')
    }
    prevPeakCount.current = peaks.length;
  },[peaks])
  
  const [clickX,clickY] = useOnCanvasClick(plotlyObj, isInitialized)

  const dragLayer = plotlyObj?.el?.querySelector('.nsewdrag');
  const svgLayer = dragLayer?.closest("svg")

  const onDeleteDrag = useCallback(({ left, right, top, bottom }) => {
    manualClickRef.current = false;
    dispatch(deletePeak({
      tabId: parentId,
      leftPoint: {x: left, y: top}, // this order of x/y is important for backend
      rightPoint: {x: right, y: bottom}
    }))
  }, [parentId,dispatch])
  
  const onDeleteClick = useCallback(({ x, y }) => {
    manualClickRef.current = false;
    dispatch(deletePeak({
      tabId: parentId,
      leftPoint: {x, y}, 
      rightPoint: null,
    }))
  }, [parentId,dispatch])

  useDragRectangleXY({
    isActive: workMode === 'delete',
    layout,
    setLayout,
    svgLayer,
    convertersRef,
    minWidth: 5,
    minHeight: 5,
    onDragEnd: onDeleteDrag, 
    onClick: onDeleteClick,
  })
  
  // A) whenever we switch into ADD mode, clear any selection
  useEffect(() => {
    if (workMode === PEAK_WORK_MODES.ADD || workMode === PEAK_WORK_MODES.DELETE) {
      setSelectedPeakNum(null);
    }
  }, [workMode]);

  // 0) whenever click coordinates update, assume it's a real click
  useEffect(() => {
    if (clickX != null && clickY != null) {
      manualClickRef.current = true;
    }
  }, [clickX, clickY]);

  // 1) ADD a peak only when you click and are in ADD mode
  useEffect(() => {
    if (
      manualClickRef.current &&
      workMode === PEAK_WORK_MODES.ADD &&
      clickX != null
    ) {
      manualClickRef.current = false;   // consume the click
      dispatch(addPeak({ tabId: parentId, xCoord: clickX }));
    }
  }, [clickX, workMode]);

  // 2) SELECT a peak only when you click and are in NULL (inspect) mode

  const getNewSelectedPeak = useCallback((clickX) => {
    return createGetNewSelectedPeak(peakBorders, clickX)
  }, [peakBorders]);  

  useEffect(() => {
    if (
      manualClickRef.current &&
      workMode === null &&
      clickX != null
    ) {
      manualClickRef.current = false;   // consume the click

      const newSel = getNewSelectedPeak(clickX);
      if (newSel !== selectedPeakNum) {
        setSelectedPeakNum(newSel);
      }
    }
  }, [clickX, workMode, getNewSelectedPeak, selectedPeakNum]);

  // prevent relayout loop
  const needsToRerange = useRef(false)

  const annotations = useMemo(() => {
    if (!plotData[0]?.x?.length || !plotData[0]?.y?.length) return [];
    const result = generatePeakAnnotations(peakBorders, plotData[0], annotationsConfig);
    needsToRerange.current = true
    return result
  }, [plotData, peakBorders, annotationsConfig]);

  useEffect(()=> {
    if (!layout?.yaxis?.autorange || !plotlyObj?.el || !needsToRerange.current) return
    
    setTimeout(()=>{
      needsToRerange.current = false
      Plotly.relayout(plotlyObj.el, {
        'yaxis.autorange': true
      }); 
    },0) // to allow 1 tick for plotly actual relayout
    
  },[layout?.annotations, plotlyObj])

  useEffect(() => {
    // 1) If no data at all, clear everything
    if (!plotData[0]?.x?.length || !plotData[0]?.y?.length) {
      clearPathElems(pathElems, 'no-data');
      setLayout(prev => {
        return { ...prev, shapes: [], annotations: [] }
      });
      return;
    }
  
    const families = buildPeakFamilies(peakBorders, plotData);

    const peakToFamily = new Map();
    families.forEach(f => {
      f.members.forEach(idx => peakToFamily.set(idx, f));
    });

    peakToFamilyRef.current = peakToFamily;
    

    const baseShapes = peakBorders.flatMap((peak, index) => {
      const borderHeight = getBorderHeight(layout);
      const { y: leftBorderY } = findIntersections(peak.borders[0], plotData[0].x, plotData[0].y);
      const { y: peakY }       = findIntersections(peak.center,    plotData[0].x, plotData[0].y);
      const { y: rightBorderY}= findIntersections(peak.borders[1], plotData[0].x, plotData[0].y);
      const needsToRenderRight = peak.pairedWithRightPeakIndex == null;

      const family = peakToFamily.get(index);
     
      const isActive = peak.peakNumber === selectedPeakNum;

      const lineColor = isActive
        ? 'red'      // активный
        : 'rgba(160, 160, 160, 0.6)' // неактивный

      const lineWidth = isActive ? 2 : 1;

      const { y0: ly0, y1: ly1 } = getBorderYRange({
        isActive,
        borderX: peak.borders[0],
        borderY: leftBorderY,
        borderHeight,
        family,
        isInnerFamilyBorder: peak.pairedWithLeftPeakIndex != null,
      });

       const { y0: ry0, y1: ry1 } = getBorderYRange({
        isActive,
        borderX: peak.borders[1],
        borderY: rightBorderY,
        borderHeight,
        family,
        isInnerFamilyBorder: peak.pairedWithRightPeakIndex != null,
      });
  
      const result = ([
        {
          type: "line",
          x0: peak.borders[0],
          x1: peak.borders[0],
          y0: ly0,
          y1: ly1,
          line: {
            color: lineColor,
            width: lineWidth,
          },
          layer: "above",
          customData: {
            active: false,
            type: 'border',
            parentPeakNum: index,
            location: 'left',
            ...(peak.ridesOnPeakNum != null && {ridesOnPeakNum: peak.ridesOnPeakNum}),
            ...(peak.ridesWing != null && {ridesWing: peak.ridesWing}),
            ...(peak.pairedWithLeftPeakIndex !== null && { pairedWithLeftPeakIndex: peak.pairedWithLeftPeakIndex }),
          }
        },
        {
          xref: "x", // Use 'x' for actual data reference
          yref: "y", // Use 'y' for actual data reference
          type: "line",    
          x0: peak.borders[0],
          x1: peak.borders[1],
          y0: family.lineY({x: peak.borders[0]}),
          y1: family.lineY({x: peak.borders[1]}),
          line: {
            color: lineColor,
            width: lineWidth,
          },
          layer: "above",
          customData: {
            active: false,
            type: 'contour',
            parentPeakNum: index,
            ...(peak.ridesOnPeakNum != null && {ridesOnPeakNum: peak.ridesOnPeakNum}),
            ...(peak.ridesWing != null && {ridesWing: peak.ridesWing}),
          }
        },
        {
          type: "line",
          x0: peak.center,
          x1: peak.center,
          y0: peakY + borderHeight/3,
          y1: peakY - borderHeight/3,
          line: { color: 'transparent', width: 1 }, // rudiment of logic, need to refactor later
          layer: "above",
          customData: {
            active: false,
            type: 'peak',
            parentPeakNum: index,
            location: 'center',
            ...(peak.ridesOnPeakNum != null && {ridesOnPeakNum: peak.ridesOnPeakNum}),
            ...(peak.ridesWing != null && {ridesWing: peak.ridesWing}),
          }
        },
        ...(needsToRenderRight ? [{
          type: "line",
          x0: peak.borders[1],
          x1: peak.borders[1],
          y0: ry0,
          y1: ry1,
          line: {
            color: lineColor,
            width: lineWidth,
          },
          layer: "above",
          customData: {
            active: false,
            type: 'border',
            parentPeakNum: index,
            location: 'right',
            ...(peak.ridesOnPeakNum != null && {ridesOnPeakNum: peak.ridesOnPeakNum}),
            ...(peak.ridesWing != null && {ridesWing: peak.ridesWing}),
            ...(peak.pairedWithRightPeakIndex !== null && { pairedWithRightPeakIndex: peak.pairedWithRightPeakIndex }),
          }
        }] : []),
      ])
      return result;
    });
  
    // 3) Overlay “active” styling
    const roles = defineShapeRoles(peakBorders, selectedPeakNum);
    const finalShapes = baseShapes.map((shape, idx) => {
      if (shape.customData.type === 'contour') return shape; // never style contours here
      if (roles[idx][1] === 'ab') {
        return {
          ...shape,
          line: { color: 'rgb(255,0,0)', width: 2 },
          yref: 'paper', y0: 1, y1: 0,
          layer: 'above',
          customData: { ...shape.customData, active: true }
        };
      }
      // else leave as “inactive”:
      return shape;
    });
  
    // 4) Commit once
    clearPathElems(pathElems, 'merged-effect');
    setLayout((prev) => {
      const result = {
        ...prev,
        hovermode: selectedPeakNum != null ? false : true,
        shapes: finalShapes,
        annotations
        }
      /* console.log('rebuild and react', result.shapes) */
      return result
    });
  }, [
    plotData,
    peakBorders,
    trueRanges,
    selectedPeakNum,
    annotations
  ]);

  const prevShapeCount = useRef(0);

  // Whenever the number of shapes changes, reset pathElems
  useEffect(() => {
    const count = shapesRef.current?.length ?? 0;
    if (count !== prevShapeCount.current) {
      clearPathElems(pathElems, 'shape-count-changed');
      prevShapeCount.current = count;
    }
  }, [layout.shapes]);

  useEffect(() => {
    if (!plotlyObj || !shapesRef.current) return;
       
    const processedPaths = new WeakSet();
    const processedEvents = new WeakSet();
    
    const observer = new MutationObserver((mutationsList) => {
      mutationsList.forEach(mutation => {
        if (mutation.type === "childList") {
          // Handle added nodes
          mutation.addedNodes.forEach(node => {
            if (node.tagName === "path" && !processedPaths.has(node)) {
              processPath(node);
            }
          });
  
          // Handle removed nodes
          mutation.removedNodes.forEach(node => {
            if (node.tagName === "path") {
              removePath(node);
            }
          });
        }
      });
    });
  
    const processPath = (target) => {
      let shapeIndex = pathElems.current.length;
      processedPaths.add(target);
      
      const shape = shapesRef.current[shapeIndex];
      if (!shape) return;
  
      const isAcitve = shape.customData.active;
      const type = shape.customData.type;

      if (isAcitve) {
        target.style.cursor = "ew-resize";
        target.classList.add("border", "active-border");
        target.setAttribute('pointer-events', 'stroke');
        attachHandlers(
          target, 
          processedEvents, 
          plotlyObj, 
          setLayout, 
          selectedPeakNum, 
          pathElems, 
          plotData, 
          dispatch, 
          convertersRef, 
          manualClickRef,
          peakToFamilyRef,
          peakBorders,
          layout
        );
      } else if (!isAcitve && type === 'border') {
        target.classList.add("border", "passive-border");
      } else if (type === 'peak') {
        target.classList.add("border", "passive-border");
      } else if (type === 'contour') {
        target.classList.add("contour", "border-contour");
      }
  
      pathElems.current.push([target, shape.x0, shape.customData]);
    };
  
    const removePath = (target) => {
      pathElems.current = pathElems.current.filter(([elem]) => elem !== target);
    };
  
    const shapeLayers = plotlyObj.el.querySelectorAll(".layer-below > g, .layer-above > g, .layer-subplot > g");
    if (!shapeLayers.length) return;
  
    shapeLayers.forEach(layer => {
      observer.observe(layer, { childList: true, attributes: true, subtree: true, attributeFilter: ["style"] });
    });
  
    return () => {
      observer.disconnect();
    };
  }, [
    plotlyObj,
    layout.shapes,
    trueRanges
  ]);
  
  return {getNewSelectedPeak, selectedPeakNum}
}

export default useHandlePeak;