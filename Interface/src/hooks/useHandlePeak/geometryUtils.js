import { envAwareNotify } from '../../utils/debug';
import { findIntersections } from './mathUtils';
import { BORDER_ROLES, isInnerRole, canOverrideFamily } from './borderUtils';
import { getEffectiveContourXRangeForMember, resolveInnerContourTransfer } from './familyUtils';

export const calculateIndependentContour = (peak, leftX, rightX, plotData) => {
  const { y: leftY } = findIntersections(leftX, plotData[0].x, plotData[0].y);
  const { y: rightY } = findIntersections(rightX, plotData[0].x, plotData[0].y);
  
  const slope = (rightY - leftY) / (rightX - leftX);
  
  return {
    lineY: ({ x }) => leftY + (x - leftX) * slope,
    leftX,
    rightX,
    leftY,
    rightY
  };
};

export const commitFamilyLayout = ({
  prevShapes,
  family,
  familyOverride,
  peakBorders,
  plotData,
  activeBorder, // { x, peakNum, location, cd } | null
  borderHeight,
  hasSeparated = false, // NEW
  separationStartX = null, // NEW
}) => {
  if (!family || typeof family.lineY !== 'function') {
    envAwareNotify('[commitFamilyLayout] invalid family');
    return prevShapes;
  }

  const membersArr = family.members;
  const members = new Set(membersArr);

  // ВАЖНО: внутренняя активная граница НЕ имеет override
  const effectiveFamilyOverride = activeBorder && isInnerRole(activeBorder.cd) ? null : familyOverride;

  /* ───────── donor / acceptor (только для inner) ───────── */
  const transfer = resolveInnerContourTransfer({
    activeBorder,
    peakBorders,
  });

  /* ───────── EDGE stitching (только для edge/solo, не для inner) ───────── */
  const memberIndex = (peakNum) => membersArr.findIndex((n) => n === peakNum);

  let leftPeak = null;
  let rightPeak = null;

  if (!transfer && activeBorder && canOverrideFamily(activeBorder.cd)) {
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

  /* ───────── NEW: Handle separated borders ───────── */
  const isDraggedInner = activeBorder && isInnerRole(activeBorder.cd);
  let pairedPeakNum = null;
  if (isDraggedInner) {
    if (activeBorder.location === 'left' && activeBorder.cd.pairedWithLeftPeakIndex !== undefined) {
      pairedPeakNum = activeBorder.cd.pairedWithLeftPeakIndex;
    } else if (activeBorder.location === 'right' && activeBorder.cd.pairedWithRightPeakIndex !== undefined) {
      pairedPeakNum = activeBorder.cd.pairedWithRightPeakIndex;
    }
  }

  return prevShapes.map((shape) => {
    const cd = shape.customData;
    if (!cd || !members.has(cd.parentPeakNum)) return shape;

    // АКТИВНЫЕ — НИКОГДА НЕ ТРОГАЕМ (полный график)
    if (cd.type === 'border' && cd.active) {
      return {
        ...shape, yref: 'paper', y0: 1, y1: 0,
      };
    }

    const peakNum = cd.parentPeakNum;
    const peak = peakBorders[peakNum];
    if (!peak) return shape;

    /* ───────── contour ───────── */
    if (cd.type === 'contour') {
      let x0; let x1;
      let y0; let y1;

      // SPECIAL CASE: Separated borders
      if (hasSeparated && isDraggedInner && (peakNum === activeBorder.peakNum || peakNum === pairedPeakNum)) {
        let leftX, rightX;
        
        if (peakNum === activeBorder.peakNum) {
          // Dragged peak
          if (activeBorder.location === 'left') {
            leftX = activeBorder.x;
            rightX = peak.borders[1];
          } else {
            leftX = peak.borders[0];
            rightX = activeBorder.x;
          }
        } else if (peakNum === pairedPeakNum) {
          // Paired peak (left behind)
          if (activeBorder.location === 'left') {
            leftX = peak.borders[0];
            rightX = separationStartX;
          } else {
            leftX = separationStartX;
            rightX = peak.borders[1];
          }
        }
        
        // Calculate independent contour for separated peak
        const independentContour = calculateIndependentContour(peak, leftX, rightX, plotData);
        x0 = leftX;
        x1 = rightX;
        y0 = independentContour.leftY;
        y1 = independentContour.rightY;
        
      } else {
        // 1) donor/acceptor (inner drag)
        if (transfer?.left && peakNum === transfer.left.peakNum) {
          ({ x0, x1 } = transfer.left);
        } else if (transfer?.right && peakNum === transfer.right.peakNum) {
          ({ x0, x1 } = transfer.right);
        } else { // 2) edge/solo baseline + override только на крайних сегментах
          ({ x0, x1 } = getEffectiveContourXRangeForMember({
            family,
            peakNum,
            peak,
            familyOverride: effectiveFamilyOverride,
          }));

          // локальная "стыковка" только для edge/solo (если надо)
          if (activeBorder && canOverrideFamily(activeBorder.cd) && !transfer) {
            if (peakNum === leftPeak && activeBorder.location === 'right') {
              x1 = activeBorder.x;
            }
            if (peakNum === rightPeak) {
              x0 = activeBorder.x;
            }
          }
        }
        
        y0 = family.lineY({ x: x0, ...effectiveFamilyOverride });
        y1 = family.lineY({ x: x1, ...effectiveFamilyOverride });
      }

      return {
        ...shape,
        x0,
        x1,
        y0,
        y1,
      };
    }

    /* ───────── border rendering (inner → edge when separated) ───────── */
    if (cd.type === 'border') {
      const x = shape.x0;

      // Check if this is a paired border that was separated
      if (hasSeparated && isDraggedInner && 
          ((activeBorder.location === 'left' && 
            activeBorder.cd.pairedWithLeftPeakIndex === cd.parentPeakNum && 
            cd.location === 'right') ||
           (activeBorder.location === 'right' && 
            activeBorder.cd.pairedWithRightPeakIndex === cd.parentPeakNum && 
            cd.location === 'left'))) {
        // This is the left-behind border, render as edge (short line)
        const { y: signalY } = findIntersections(x, plotData[0].x, plotData[0].y);
        const half = borderHeight / 2;
        return {
          ...shape,
          y0: signalY + half,
          y1: signalY - half,
        };
      }

      // Normal inner border (signal ↔ contour)
      if (isInnerRole(cd) && cd.active !== true) {
        const { y: signalY } = findIntersections(x, plotData[0].x, plotData[0].y);
        
        let contourY;
        if (hasSeparated && isDraggedInner && (cd.parentPeakNum === activeBorder.peakNum || cd.parentPeakNum === pairedPeakNum)) {
          // Use independent contour calculation for separated peaks
          const peak = peakBorders[cd.parentPeakNum];
          let leftX, rightX;
          
          if (cd.parentPeakNum === activeBorder.peakNum) {
            if (activeBorder.location === 'left') {
              leftX = activeBorder.x;
              rightX = peak.borders[1];
            } else {
              leftX = peak.borders[0];
              rightX = activeBorder.x;
            }
          } else {
            if (activeBorder.location === 'left') {
              leftX = peak.borders[0];
              rightX = separationStartX;
            } else {
              leftX = separationStartX;
              rightX = peak.borders[1];
            }
          }
          
          const independentContour = calculateIndependentContour(peak, leftX, rightX, plotData);
          contourY = independentContour.lineY({ x });
        } else {
          // Use family lineY for non-separated peaks
          contourY = family.lineY({ x, ...effectiveFamilyOverride });
        }

        return {
          ...shape,
          y0: Math.min(signalY, contourY),
          y1: Math.max(signalY, contourY),
        };
      }

      // solo-edge / family-edge border (signal-only)
      if (cd.active !== true && canOverrideFamily(cd)) {
        const { y: signalY } = findIntersections(x, plotData[0].x, plotData[0].y);
        const half = borderHeight / 2;

        return {
          ...shape,
          y0: signalY + half,
          y1: signalY - half,
        };
      }
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
  familyOverride = null,
  activeBorder = null,
  draggedBorderCd = null,
  hasSeparated = false,
  separationStartX = null,
  debugLog = null,
}) => {
  if (!family || typeof family.lineY !== 'function') {
    envAwareNotify('applyFamilyLiveGeometry: family without lineY');
    return;
  }

  if (debugLog) {
    console.groupCollapsed(`applyFamilyLiveGeometry [${debugLog}]`);
    console.log('INPUT PARAMETERS:');
    console.log('  Family:', {
      xLeft: family.xLeft,
      xRight: family.xRight,
      members: family.members,
      hasLineY: typeof family.lineY === 'function',
    });
    console.log('  Overrides:', {
      familyOverride,
      hasSeparated,
      separationStartX,
      activeBorder: activeBorder ? {
        x: activeBorder.x,
        peakNum: activeBorder.peakNum,
        location: activeBorder.location,
        role: activeBorder.cd?.role,
      } : null,
      draggedBorderCd: draggedBorderCd ? {
        parentPeakNum: draggedBorderCd.parentPeakNum,
        location: draggedBorderCd.location,
        role: draggedBorderCd.role,
      } : null,
    });
  }

  const { members } = family;

  // Inner active border cannot override
  const effectiveFamilyOverride = activeBorder && isInnerRole(activeBorder.cd) ? null : familyOverride;
  
  if (debugLog) {
    console.log('  Effective Override:', effectiveFamilyOverride);
    console.log('  Active Border is Inner?', activeBorder ? isInnerRole(activeBorder.cd) : 'N/A');
  }

  /* ───────── donor / acceptor (only inner) ───────── */
  const transfer = resolveInnerContourTransfer({
    activeBorder,
    peakBorders,
  });

  if (debugLog) {
    console.log('Active Border:', activeBorder);
    console.log('Is inner?', activeBorder ? isInnerRole(activeBorder.cd) : 'N/A');
    console.log('Transfer result:', transfer);
    console.log('Family members:', members);
  }

  /* ───────── EDGE stitching (only edge/solo) ───────── */
  const memberIndex = (peakNum) => members.findIndex((n) => n === peakNum);

  let leftPeak = null;
  let rightPeak = null;

  if (!transfer && activeBorder && canOverrideFamily(activeBorder.cd)) {
    const idx = memberIndex(activeBorder.peakNum);
    if (idx !== -1) {
      if (activeBorder.location === 'right') {
        leftPeak = members[idx];
        rightPeak = members[idx + 1] ?? null;
      } else {
        leftPeak = members[idx - 1] ?? null;
        rightPeak = members[idx];
      }
      if (debugLog) {
        console.log('EDGE Stitching:', { leftPeak, rightPeak });
      }
    }
  }

  /* ───────── contours ───────── */
  for (const shape of shapeMap) {
    const cd = shape.customData;
    if (!cd || cd.type !== 'contour') continue;
    if (!members.includes(cd.parentPeakNum)) continue;

    const peakNum = cd.parentPeakNum;
    const peak = peakBorders[peakNum];
    if (!peak) continue;

    let x0, x1;

    // 1) donor/acceptor
    if (transfer?.left && peakNum === transfer.left.peakNum) {
      ({ x0, x1 } = transfer.left);
      if (debugLog) console.log(`Peak ${peakNum}: DONOR LEFT`, { x0, x1 });
    } else if (transfer?.right && peakNum === transfer.right.peakNum) {
      ({ x0, x1 } = transfer.right);
      if (debugLog) console.log(`Peak ${peakNum}: DONOR RIGHT`, { x0, x1 });
    } else { // 2) edge/solo baseline (+ override only on extreme segments)
      ({ x0, x1 } = getEffectiveContourXRangeForMember({
        family,
        peakNum,
        peak,
        familyOverride: effectiveFamilyOverride,
      }));

      

      if (activeBorder && canOverrideFamily(activeBorder.cd) && !transfer) {
        if (peakNum === leftPeak && activeBorder.location === 'right') {
          x1 = activeBorder.x;
          if (debugLog) console.log(`Peak ${peakNum}: OVERRIDE X1`, x1);
        }
        if (peakNum === rightPeak) {
          x0 = activeBorder.x;
          if (debugLog) console.log(`Peak ${peakNum}: OVERRIDE X0`, x0);
        }
      }

      if (debugLog) {
        console.log(`Peak ${peakNum}: edge/solo`, { x0, x1 });
      }
    }


    const y0 = family.lineY({ x: x0, ...effectiveFamilyOverride });
    const y1 = family.lineY({ x: x1, ...effectiveFamilyOverride });

    if (Number.isNaN(y0) || Number.isNaN(y1)) {
      envAwareNotify('family.lineY produced NaN');
      return shape;
    }

    if (debugLog) {
      console.log(`  → Calculated Y values: y0=${y0.toFixed(4)}, y1=${y1.toFixed(4)}`);
    }

    const x0Px = convertersRef.current.xToPixel(x0);
    const x1Px = convertersRef.current.xToPixel(x1);
    const y0Px = convertersRef.current.yToPixel(y0);
    const y1Px = convertersRef.current.yToPixel(y1);

    const svgX0 = convertersRef.current.xPixelToSVG(x0Px);
    const svgX1 = convertersRef.current.xPixelToSVG(x1Px);
    const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
    const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

    shape.elem.setAttribute('d', `M${svgX0},${svgY0}L${svgX1},${svgY1}`);
  }

  /* ───────── ALL borders (signal ↔ contour for inner, signal-only for edge) ───────── */
  for (const shape of shapeMap) {
    const cd = shape.customData;

    if (!cd || cd.type !== 'border') {
      continue;
    }
    if (!members.includes(cd.parentPeakNum)) continue;
    if (cd.active) continue;

    // Skip if this is the dragged border or a stuck border being moved together
    if (draggedBorderCd && 
        cd.parentPeakNum === draggedBorderCd.parentPeakNum && 
        cd.location === draggedBorderCd.location) {
      continue;
    }

    // Skip the border that's paired with the dragged border
    if (draggedBorderCd && isInnerRole(draggedBorderCd)) {
      // Check if this border is the pair of the dragged border
      if (
        (draggedBorderCd.location === 'left' && 
        draggedBorderCd.pairedWithLeftPeakIndex === cd.parentPeakNum && 
        cd.location === 'right') 
        || 
        (draggedBorderCd.location === 'right' && 
        draggedBorderCd.pairedWithRightPeakIndex === cd.parentPeakNum && 
        cd.location === 'left')
      ) {
        continue;
      }
    }

    const x = shape.coordX;

    // Handle DIFFERENT border types:
    if (isInnerRole(cd)) {
      // INNER border: connect signal to contour
      const { y: signalY } = findIntersections(x, plotData[0].x, plotData[0].y);
      const contourY = family.lineY({ x, ...effectiveFamilyOverride });

      const y0 = Math.min(signalY, contourY);
      const y1 = Math.max(signalY, contourY);

      const xPx = convertersRef.current.xToPixel(x);
      const y0Px = convertersRef.current.yToPixel(y0);
      const y1Px = convertersRef.current.yToPixel(y1);

      const svgX = convertersRef.current.xPixelToSVG(xPx);
      const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
      const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

      const newD = `M${svgX},${svgY0}L${svgX},${svgY1}`;
      shape.elem.setAttribute('d', newD);
    } 
    else if (canOverrideFamily(cd)) {  // SOLO_EDGE or FAMILY_EDGE
      const { y: signalY } = findIntersections(x, plotData[0].x, plotData[0].y);
      const halfHeight = borderHeight / 2;
      const y0 = signalY + halfHeight;
      const y1 = signalY - halfHeight;

      const xPx = convertersRef.current.xToPixel(x);
      const y0Px = convertersRef.current.yToPixel(y0);
      const y1Px = convertersRef.current.yToPixel(y1);

      const svgX = convertersRef.current.xPixelToSVG(xPx);
      const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
      const svgY1 = convertersRef.current.yPixelToSVG(y1Px);

      const newD = `M${svgX},${svgY0}L${svgX},${svgY1}`;
      shape.elem.setAttribute('d', newD);
    }
    // Note: We don't "continue" for edge borders anymore!
  }

  if (debugLog) {
    console.groupEnd();
  }
};

export const getBorderYRange = ({
  isActive,
  borderX,
  borderY,
  borderHeight,
  family,
  role,
}) => {
  const half = borderHeight / 2;

  if (isActive) {
    return { y0: borderY + half, y1: borderY - half };
  }

  if (role !== BORDER_ROLES.INNER) {
    return { y0: borderY + half, y1: borderY - half };
  }

  const familyY = family.lineY({ x: borderX });

  if (familyY > borderY) {
    return { y0: borderY - half, y1: familyY };
  }
  return { y0: familyY, y1: borderY + half };
};

export const getBorderHeight = (layout) => {
  if (!layout?.yaxis?.range) return 0;
  const [y_min, y_max] = layout.yaxis.range;

  return (y_max - y_min) * 0.05;
};