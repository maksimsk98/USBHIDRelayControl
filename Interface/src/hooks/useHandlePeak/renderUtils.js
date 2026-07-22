import { BORDER_ROLES } from "./borderUtils";
import { buildPeakFamilies } from "./familyUtils";
import { getBorderHeight, getBorderYRange } from "./geometryUtils";
import { findIntersections } from "./mathUtils";
import { defineActiveShapeStyles } from "./selectionUtils";

// EXTRACTED FUNCTION: Shape rendering logic (shapes only)
export const renderShapes = ({
  peakBorders,
  selectedPeakNum,
  plotData,
  layout
}) => {
  if (!plotData[0]?.x?.length || !plotData[0]?.y?.length) {
    return { shapes: [], hovermode: selectedPeakNum == null };
  }

  const families = buildPeakFamilies(peakBorders, plotData);
  const peakToFamily = new Map();
  families.forEach((f) => {
    f.members.forEach((idx) => peakToFamily.set(idx, f));
  });

  const baseShapes = peakBorders.flatMap((peak, index) => {
    const borderHeight = getBorderHeight(layout);

    const { y: leftBorderY } = findIntersections(peak.borders[0], plotData[0].x, plotData[0].y);
    const { y: peakY } = findIntersections(peak.center, plotData[0].x, plotData[0].y);
    const { y: rightBorderY } = findIntersections(peak.borders[1], plotData[0].x, plotData[0].y);

    const family = peakToFamily.get(index);
    const membersLen = family?.members?.length ?? 1;

    const isActive = peak.peakNumber === selectedPeakNum;

    const leftRole = membersLen === 1
      ? BORDER_ROLES.SOLO_EDGE
      : (peak.pairedWithLeftPeakIndex != null ? BORDER_ROLES.INNER : BORDER_ROLES.FAMILY_EDGE);

    const rightRole = membersLen === 1
      ? BORDER_ROLES.SOLO_EDGE
      : (peak.pairedWithRightPeakIndex != null ? BORDER_ROLES.INNER : BORDER_ROLES.FAMILY_EDGE);

    const lineColor = isActive ? 'red' : 'blue';
    const lineWidth = isActive ? 2 : 1;

    const { y0: ly0, y1: ly1 } = getBorderYRange({
      isActive,
      borderX: peak.borders[0],
      borderY: leftBorderY,
      borderHeight,
      family,
      role: leftRole,
    });

    const { y0: ry0, y1: ry1 } = getBorderYRange({
      isActive,
      borderX: peak.borders[1],
      borderY: rightBorderY,
      borderHeight,
      family,
      role: rightRole,
    });

    return ([
      {
        type: 'line',
        x0: peak.borders[0],
        x1: peak.borders[0],
        y0: ly0,
        y1: ly1,
        line: { color: lineColor, width: lineWidth },
        layer: 'above',
        customData: {
          active: false,
          type: 'border',
          role: leftRole,
          parentPeakNum: index,
          location: 'left',
          ...(peak.ridesOnPeakNum != null && { ridesOnPeakNum: peak.ridesOnPeakNum }),
          ...(peak.ridesWing != null && { ridesWing: peak.ridesWing }),
          ...(peak.pairedWithLeftPeakIndex != null && { pairedWithLeftPeakIndex: peak.pairedWithLeftPeakIndex }),
          ...(peak.pairedWithRightPeakIndex != null && { pairedWithRightPeakIndex: peak.pairedWithRightPeakIndex }),
        },
      },
      {
        xref: 'x',
        yref: 'y',
        type: 'line',
        x0: peak.borders[0],
        x1: peak.borders[1],
        y0: family.lineY({ x: peak.borders[0] }),
        y1: family.lineY({ x: peak.borders[1] }),
        line: { color: lineColor, width: lineWidth },
        layer: 'above',
        customData: {
          active: false,
          type: 'contour',
          parentPeakNum: index,
          ...(peak.ridesOnPeakNum != null && { ridesOnPeakNum: peak.ridesOnPeakNum }),
          ...(peak.ridesWing != null && { ridesWing: peak.ridesWing }),
        },
      },
      {
        type: 'line',
        x0: peak.center,
        x1: peak.center,
        y0: peakY + borderHeight / 3,
        y1: peakY - borderHeight / 3,
        line: { color: 'transparent', width: 1 },
        layer: 'above',
        customData: {
          active: false,
          type: 'peak',
          parentPeakNum: index,
          location: 'center',
          ...(peak.ridesOnPeakNum != null && { ridesOnPeakNum: peak.ridesOnPeakNum }),
          ...(peak.ridesWing != null && { ridesWing: peak.ridesWing }),
        },
      },
      {
        type: 'line',
        x0: peak.borders[1],
        x1: peak.borders[1],
        y0: ry0,
        y1: ry1,
        line: { color: lineColor, width: lineWidth },
        layer: 'above',
        customData: {
          active: false,
          type: 'border',
          role: rightRole,
          parentPeakNum: index,
          location: 'right',
          ...(peak.ridesOnPeakNum != null && { ridesOnPeakNum: peak.ridesOnPeakNum }),
          ...(peak.ridesWing != null && { ridesWing: peak.ridesWing }),
          ...(peak.pairedWithLeftPeakIndex != null && { pairedWithLeftPeakIndex: peak.pairedWithLeftPeakIndex }),
          ...(peak.pairedWithRightPeakIndex != null && { pairedWithRightPeakIndex: peak.pairedWithRightPeakIndex }),
        },
      }
    ]);
  });

  // Overlay "active" styling
  const roles = defineActiveShapeStyles(peakBorders, selectedPeakNum);
  const finalShapes = baseShapes.map((shape, idx) => {
    if (shape.customData.type === 'contour') return shape;
    if (roles[idx][1] === 'ab') {
      return {
        ...shape,
        line: { color: 'rgb(255,0,0)', width: 2 },
        yref: 'paper',
        y0: 1,
        y1: 0,
        layer: 'above',
        customData: { ...shape.customData, active: true },
      };
    }
    return shape;
  });

  return {
    shapes: finalShapes,
    peakToFamily
  };
};

