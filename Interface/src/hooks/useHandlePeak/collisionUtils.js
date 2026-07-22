import { envAwareNotify } from '../../utils/debug';

export const findCollision = (shapeMap, draggedIndex, direction, borderLimit, plotData, convertersRef) => {
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
        ? (aIsRider ? -1 : 1) // Riders first
        : (aIsRider ? 1 : -1); // Riders last
    }

    // Fallback to center comparison if same type
    const aCenter = peakCenters[a.customData.parentPeakNum] ?? 0;
    const bCenter = peakCenters[b.customData.parentPeakNum] ?? 0;
    return aCenter - bCenter;
  };

  const isLeft = direction === 'left';
  const originX = originShape.coordX;
  const candidateShapes = shapeMap.filter((shape) => {
    const x = shape.coordX;
    return isLeft ? x <= originX : x >= originX;
  });
  let collisionCandidates = candidateShapes.sort(sortFunc)
    .filter((shape) => shape.customData.type !== 'contour');
  collisionCandidates = isLeft ? collisionCandidates.reverse() : collisionCandidates;

  const originData = originShape.customData;
  const originPeakNum = originData.parentPeakNum;

  for (const iObstc of collisionCandidates) {
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
        const isEdgeSharedWithMaster = iObstc.coordX === originX
          && iData.parentPeakNum === originData.ridesOnPeakNum
          && iData.location === originData.location;

        const isDraggingAwayFromMaster = iData.location === direction;

        if (isEdgeSharedWithMaster && !isDraggingAwayFromMaster) { // when rider border in the same place as master dissalow moving away from master, but allow inward
          continue;
        } else {
          svgXBorder = iObstc.dX;
          coordClamp = iObstc.coordX;
          break;
        }
      }

      if ((iData.parentPeakNum < originPeakNum && isLeft)
        || (iData.parentPeakNum > originPeakNum && !isLeft)) {
        // is valid collision
        const collisionShapeIndex = shapeMap.indexOf(iObstc);

        collision = {
          borderSVGX: iObstc.dX,
          origCoordX: iObstc.coordX,
          direction,
          elem: iObstc.elem,
          shapeIndex: collisionShapeIndex,
        };
      }
    }
  }

  return { collision, svgXBorder, coordClamp };
};

export const getGroupCollisionBoundaries = (shapeMap, borderIndices, direction, limit, plotData, convertersRef) => {
  let groupBoundary = direction === 'left' ? -Infinity : Infinity;
  let groupCoordClamp = direction === 'left' ? -Infinity : Infinity;
  
  borderIndices.forEach(borderIndex => {
    const result = findCollision(shapeMap, borderIndex, direction, limit, plotData, convertersRef);
    
    if (direction === 'left') {
      groupBoundary = Math.max(groupBoundary, result.svgXBorder);
      groupCoordClamp = Math.max(groupCoordClamp, result.coordClamp);
    } else {
      groupBoundary = Math.min(groupBoundary, result.svgXBorder);
      groupCoordClamp = Math.min(groupCoordClamp, result.coordClamp);
    }
  });
  
  return { svgXBorder: groupBoundary, coordClamp: groupCoordClamp };
};

export const findCollocatedShapesAtPosition = (shapeMap, x, epsilon = 0.001) => {
  return shapeMap.filter(shape => {
    if (shape.customData.type !== 'border' && shape.customData.type !== 'dragged') return false;
    return Math.abs(shape.coordX - x) < epsilon;
  });
};

export const findStuckBordersAtPosition = (shapeMap, x, epsilon = 0.001) => {
  const collocated = findCollocatedShapesAtPosition(shapeMap, x, epsilon);

  // Anomaly check - should only be 1 or 2
  if (collocated.length > 2) {
    envAwareNotify(`More than 2 collocated at single coord=${x} with epsilon ${0.001}`, collocated);
    return []; // Can't determine stuck pair
  }

  // If only 1 shape, no stuck borders
  if (collocated.length <= 1) return [];
  
  const [shape1, shape2] = collocated;
  
  // Check for same side anomaly
  if (shape1.customData?.location === shape2.customData?.location) {
    envAwareNotify(`Two ${shape1.customData?.location} borders collocated at ${x}`, collocated);
    return []; // Same side can't be stuck together
  }
  
  // Determine which is left and which is right partner, location is side of PEAK not pair
  const leftPartner = shape1.customData?.location === 'right'  ? shape1 : shape2;
  const rightPartner = shape1.customData?.location === 'left' ? shape1 : shape2;
  
  const leftPartnerBound = leftPartner.customData.pairedWithRightPeakIndex === rightPartner.customData.parentPeakNum
  const rightPartnerBound = rightPartner.customData.pairedWithLeftPeakIndex === leftPartner.customData.parentPeakNum
  
  // Check for one-way bind anomaly
  if (leftPartnerBound !== rightPartnerBound) {
    envAwareNotify(`One-sided pairing detected at ${x} leftBind=${leftPartnerBound}, rightBind=${rightPartnerBound}`);
  }
  
  // Only return as stuck if BOTH directions are paired
  const arePaired = leftPartnerBound && rightPartnerBound;
  
  return arePaired ? [shape1, shape2] : [];
};

export const getSeparationState = (stuckBorders, draggedCd, shapeMap, convertersRef) => {
  const separationThreshold = 0.01;
  const draggedX = shapeMap.find(b => 
    b.customData.parentPeakNum === draggedCd.parentPeakNum && 
    b.customData.location === draggedCd.location
  )?.coordX;
  
  if (!draggedX) return false;
  
  return stuckBorders.some(border => {
    if (border.customData.parentPeakNum === draggedCd.parentPeakNum && 
        border.customData.location === draggedCd.location) {
      return false;
    }
    const borderX = border.coordX;
    return Math.abs(borderX - draggedX) > separationThreshold;
  });
};