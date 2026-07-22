import { findStuckBordersAtPosition, findCollision, getGroupCollisionBoundaries, getSeparationState } from './collisionUtils';
import { BORDER_ROLES, getPairPeakNum } from './borderUtils';
import { canOverrideFamily, isInnerRole } from './borderUtils';
import { clampToRange } from './mathUtils';
import { parsePathD } from './svgUtils';
import { commitFamilyLayout } from './geometryUtils';
import { getBorderHeight } from './geometryUtils';
import { getFamilyEdgeOverrideForBorder, handleDivorce } from './familyUtils';
import _ from 'lodash';

export const SNAP_THRESHOLD = 0.1;
export const VISUAL_OFFSET_RATIO = 0;
export const STICKY_MODE_KEY = 'Control';

export const shouldStick = (x1, x2) => Math.abs(x1 - x2) < SNAP_THRESHOLD;

export const createAndSetPath = (svgX, elem) => {
  const newBorderD = createBorderPath(svgX, elem);
  elem.setAttribute('d', newBorderD);
}

const updateAndReturnState = (svgX, borderElem, newHasSeparated) => {
  createAndSetPath(svgX, borderElem)
  return newHasSeparated;
};

const updateBordersTogether = (svgX, borders) => {
  borders.forEach(border => 
    updateAndReturnState(svgX, border.elem, false)
  );
};

const shouldSeparate = (separationStartX, currentX, draggedCd, partnerCd) => {
  // Determine if partner is to the left or right of dragged border
  // We can check from pairedWith indices or by comparing peak numbers
  let isPartnerToRight = false;
  
  if (draggedCd.pairedWithRightPeakIndex === partnerCd.parentPeakNum) {
    // Partner is explicitly paired as right neighbor
    isPartnerToRight = true;
  } else if (draggedCd.pairedWithLeftPeakIndex === partnerCd.parentPeakNum) {
    // Partner is explicitly paired as left neighbor
    isPartnerToRight = false;
  } else {
    // Fallback: compare peak numbers (not perfect but works for adjacent peaks)
    console.warn('DANGEROUS FALLBACK OF shouldSeparate',  draggedCd, partnerCd)
    isPartnerToRight = draggedCd.parentPeakNum < partnerCd.parentPeakNum;
  }
  
  // Calculate effectDelta: positive means moving AWAY from partner
  let effectDelta;
  if (isPartnerToRight) {
    // Partner is to the right, so moving LEFT (decreasing X) is AWAY
    effectDelta = separationStartX - currentX; // Positive when moving left
  } else {
    // Partner is to the left, so moving RIGHT (increasing X) is AWAY
    effectDelta = currentX - separationStartX; // Positive when moving right
  }
  
  return effectDelta > SNAP_THRESHOLD;
};
// helpers end

export const createDragState = (event, shapeMap, convertersRef, leftMargin, width, plotData, selectedPeakNum) => {
  const currentDraggedShapeIndex = shapeMap.findIndex((border) => border.customData.type === 'dragged');
  const draggedShape = shapeMap[currentDraggedShapeIndex];
  
  if (!draggedShape) return null;

  const draggedCd = draggedShape.customData;
  const draggedOrigCoordX = shapeMap[currentDraggedShapeIndex].coordX;

  // Find all borders at the same position (stuck borders)
  const stuckBorders = findStuckBordersAtPosition(shapeMap, draggedOrigCoordX);
  const stuckBorderIndices = stuckBorders.map(border => shapeMap.indexOf(border));

  // Track separation state
  const hasSeparated = getSeparationState(stuckBorders, draggedCd, shapeMap, convertersRef);
  const separationStartX = draggedOrigCoordX;
  
  // Track control key state
  const isCtrlPressed = event.ctrlKey;
  const stickyModeActive = isCtrlPressed;

  // Calculate individual collision boundaries
  const leftResult = findCollision(shapeMap, currentDraggedShapeIndex, 'left', leftMargin, plotData, convertersRef);
  const rightResult = findCollision(shapeMap, currentDraggedShapeIndex, 'right', width - leftMargin, plotData, convertersRef);
  
  let leftBorder = leftResult.svgXBorder;
  let rightBorder = rightResult.svgXBorder;
  let leftCoordClamp = leftResult.coordClamp;
  let rightCoordClamp = rightResult.coordClamp;

  // Calculate group boundaries if borders are NOT separated AND Control is pressed
  if (!hasSeparated && stickyModeActive && stuckBorders.length > 1) {
    const leftGroupResult = getGroupCollisionBoundaries(shapeMap, stuckBorderIndices, 'left', leftMargin, plotData, convertersRef);
    const rightGroupResult = getGroupCollisionBoundaries(shapeMap, stuckBorderIndices, 'right', width - leftMargin, plotData, convertersRef);
    leftBorder = leftGroupResult.svgXBorder;
    rightBorder = rightGroupResult.svgXBorder;
    leftCoordClamp = leftGroupResult.coordClamp;
    rightCoordClamp = rightGroupResult.coordClamp;
  }

  const collision = leftResult.collision || rightResult.collision;
  const pairedPeakNum = getPairPeakNum(shapeMap[currentDraggedShapeIndex].customData, selectedPeakNum);

  return {
    currentDraggedShapeIndex,
    draggedShape,
    draggedCd,
    draggedOrigCoordX,
    stuckBorders,
    stuckBorderIndices,
    hasSeparated,
    separationStartX,
    isCtrlPressed,
    stickyModeActive,
    leftBorder,
    rightBorder,
    leftCoordClamp,
    rightCoordClamp,
    collision,
    pairedPeakNum,
    leftResult,
    rightResult
  };
};

export const createBorderPath = (svgX, pathElem) => {
  const borderCommands = parsePathD(pathElem);
  return `M${svgX},${borderCommands[0].y}L${svgX},${borderCommands[1].y}`;
};

export const handleStuckBorderMovement = (
  svgX,
  draggedPathElem,
  stuckBorders,
  stuckBorderIndices,
  hasSeparated,
  stickyModeActive,
  separationStartX,
  coordX,
  convertersRef,
  shapeMap
) => {
  if (hasSeparated) {
    createAndSetPath(svgX, draggedPathElem)
    return {hasSeparated: true, shouldDivorce: false, separationStartX}
  }

  if (stuckBorders.length < 2) {
    createAndSetPath(svgX, draggedPathElem)
    return {hasSeparated: false, shouldDivorce: false, separationStartX};
  }

  // Find dragged border and its stuck partner
  const draggedBorder = stuckBorders.find(b => b.customData.type === 'dragged');
  const partnerBorder = stuckBorders.find(b => b !== draggedBorder);
  
  if (!draggedBorder || !partnerBorder) {
    createAndSetPath(svgX, draggedPathElem)
    return {hasSeparated: false, shouldDivorce: false, separationStartX};
  }

  const draggedCd = draggedBorder.customData;
  const partnerCd = partnerBorder.customData;

  // Check if we should separate (moving away from partner)
  const shouldSeparateNow = stickyModeActive && 
    shouldSeparate(separationStartX, coordX, draggedCd, partnerCd, convertersRef);

  if (shouldSeparateNow) {
    // Start separating - dragged border moves, partner stays
    createAndSetPath(svgX, draggedPathElem)
    return {hasSeparated: true, shouldDivorce: true, separationStartX};
  } else {
    // Stay together - update both borders
    stuckBorders.forEach(border => {
      createAndSetPath(svgX, border.elem);
    });
    
    // If in sticky mode and moving together, update separationStartX
    // This allows the "separation threshold" to move with the stuck borders
    let newSeparationStartX = separationStartX;
    if (stickyModeActive) {
      newSeparationStartX = coordX;
    }
    
    return {hasSeparated: false, shouldDivorce: false, separationStartX: newSeparationStartX};
  }
};

export const handleCollision = ({
  draggedCd,
  collision,
  svgX,
  hasSeparated,
  stuckBorders,
  shapeMap,
  stickyModeActive,
  leftResult,
  rightResult,
  convertersRef,
  draggedShapeIndex
}) => {
  if (!collision) return { didCollisionHappened: false, collisionBorderX: null, shouldMerge: false };

  // Get the dragged and collision shapes
  const draggedShape = shapeMap[draggedShapeIndex];
  const collisionShape = shapeMap[collision.shapeIndex];
  
  if (draggedShape && collisionShape) {
    const draggedCd = draggedShape.customData;
    const collisionCd = collisionShape.customData;    
    // Check if these borders are already inner borders that are paired
    const areAlreadyPairedInnerBorders = 
      draggedCd.role === BORDER_ROLES.INNER && 
      collisionCd.role === BORDER_ROLES.INNER &&
      ((draggedCd.pairedWithLeftPeakIndex === collisionCd.parentPeakNum && 
        collisionCd.pairedWithRightPeakIndex === draggedCd.parentPeakNum) ||
       (draggedCd.pairedWithRightPeakIndex === collisionCd.parentPeakNum && 
        collisionCd.pairedWithLeftPeakIndex === draggedCd.parentPeakNum));
    
    if (areAlreadyPairedInnerBorders) {
      // Already inner borders in the same family - skip collision logic
      return { didCollisionHappened: false, collisionBorderX: null, shouldMerge: false };
    }
  }

  const isCollisionLeft = collision.direction === 'left' && svgX < collision.borderSVGX;
  const isCollisionRight = collision.direction === 'right' && svgX > collision.borderSVGX;
  let collisionBorderX = null;

  if (isCollisionLeft || isCollisionRight) {
    collision.elem.setAttribute('d', createBorderPath(svgX, collision.elem));
    collision.borderSVGX = svgX;

    collisionBorderX = clampToRange(
      convertersRef.current.pixelToX(convertersRef.current.xSVGToPixel(collision.borderSVGX)),
      collision.origCoordX,
      leftResult.coordClamp,
      rightResult.coordClamp,
    );

    if (stickyModeActive) {
      return { didCollisionHappened: false, collisionBorderX, shouldMerge: true };
    } 

    return { didCollisionHappened: true, collisionBorderX, shouldMerge: false };
  }

  return { didCollisionHappened: false, collisionBorderX: null, shouldMerge: false };
};

export const createMoveParams = (draggedCd, latestCoordX, stickyFlags) => ({
  peakNum: draggedCd.parentPeakNum,
  location: draggedCd.location,
  xCoord: latestCoordX,
  stickyFlags,
});

export const updateLayoutOnMouseUp = (
  setLayout,
  shapeMap,
  currentDraggedShapeIndex,
  latestCoordX,
  stuckBorders,
  stuckBorderIndices,
  hasSeparated,
  collisionShapeIndex,
  collisionBorderX,
  family,
  draggedCd,
  collisionFamilyCache,
  collisionFamilyOverride,
  peakBorders,
  plotData,
  layout
) => {
  setLayout((prev) => {
    let shapes = prev.shapes.map((shape, index) => {
      if (index === currentDraggedShapeIndex) {
        return { ...shape, x0: latestCoordX, x1: latestCoordX };
      }

      // Update other stuck borders only if we're NOT separated
      if (stuckBorders.length > 1 && !hasSeparated && stuckBorderIndices.includes(index)) {
        return { ...shape, x0: latestCoordX, x1: latestCoordX };
      }

      if (collisionBorderX != null && index === collisionShapeIndex) {
        return {
          ...shape,
          x0: collisionBorderX,
          x1: collisionBorderX,
        };
      }

      return shape;
    });

    // Update dragged family
    if (family) {
      const draggedOverride = getFamilyEdgeOverrideForBorder(draggedCd, latestCoordX);
      shapes = commitFamilyLayout({
        prevShapes: shapes,
        family,
        familyOverride: draggedOverride,
        peakBorders,
        plotData,
        borderHeight: getBorderHeight(layout),
        hasSeparated,
        separationStartX: latestCoordX,
        activeBorder: {
          x: latestCoordX,
          peakNum: draggedCd.parentPeakNum,
          location: draggedCd.location,
          cd: draggedCd,
        },
      });
    }

    // Update collision family if different
    if (collisionBorderX != null && collisionFamilyCache && collisionFamilyCache !== family) {
      const collisionShape = shapeMap[collisionShapeIndex];
      const collisionCd = collisionShape?.customData;
      const isCollisionInner = isInnerRole(collisionCd);

      shapes = commitFamilyLayout({
        prevShapes: shapes,
        family: collisionFamilyCache,
        familyOverride: collisionFamilyOverride,
        peakBorders,
        plotData,
        borderHeight: getBorderHeight(layout),
        activeBorder: isCollisionInner
          ? {
            x: collisionBorderX,
            peakNum: collisionCd.parentPeakNum,
            location: collisionCd.location,
            cd: collisionCd,
          }
          : null,
      });
    }

    return { ...prev, shapes };
  });
};