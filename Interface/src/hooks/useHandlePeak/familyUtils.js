import { envAwareNotify } from '../../utils/debug';
import { findIntersections } from './mathUtils';
import { BORDER_ROLES, canOverrideFamily, isInnerRole, resolveSharedBorderPeaks } from './borderUtils';
import { calculateIndependentContour } from './geometryUtils';
import { findCollision } from './collisionUtils';
import { createAndSetPath } from './stickySlippyUtils';
import _ from 'lodash';

export const createFamilyLineY = (xLeft, xRight, plotData) => {
  // Calculate the initial intersection points at the boundaries
  const { y: yLeft } = findIntersections(xLeft, plotData[0].x, plotData[0].y);
  const { y: yRight } = findIntersections(xRight, plotData[0].x, plotData[0].y);
  
  // Return a function that calculates y at any x, with optional overrides
  return ({
    x,
    xLeft: overrideLeft,
    xRight: overrideRight,
  }) => {
    const effectiveLeft = overrideLeft ?? xLeft;
    const effectiveRight = overrideRight ?? xRight;

    // Recalculate y at the boundaries if overrides are provided
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
};

export const buildPeakFamilies = (peakBorders, plotData) => {
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
      if (back !== current) {
        envAwareNotify('Family chain broken: asymmetric pairing');
        break;
      }

      members.push(next);
      used.add(next);
      current = next;
    }

    const leftIdx = members[0];
    const rightIdx = members[members.length - 1];

    const xLeft = peakBorders[leftIdx].borders[0];
    const xRight = peakBorders[rightIdx].borders[1];

    const lineY = createFamilyLineY(xLeft, xRight, plotData);

    families.push({
      members,
      xLeft,
      xRight,
      lineY,
    });
  }

  return families;
};

export const getEffectiveContourXRangeForMember = ({
  family,
  peakNum,
  peak,
  familyOverride,
}) => {
  let x0 = peak.borders[0];
  let x1 = peak.borders[1];

  if (!family || !familyOverride) return { x0, x1 };

  const { members } = family;
  const leftMost = members[0];
  const rightMost = members[members.length - 1];

  if (familyOverride.xLeft != null && peakNum === leftMost) {
    x0 = familyOverride.xLeft;
  }
  if (familyOverride.xRight != null && peakNum === rightMost) {
    x1 = familyOverride.xRight;
  }

  return { x0, x1 };
};

export const getFamilyEdgeOverrideForBorder = (cd, xCoord) => {
  /* console.groupCollapsed('getFamilyEdgeOverrideForBorder');
  console.log('Input CD:', cd);
  console.log('Input xCoord:', xCoord); */
  
  if (!cd) {
/*     console.log('Returning null: CD is null');
    console.groupEnd(); */
    return null;
  }
  
  if (!canOverrideFamily(cd)) {
/*     console.log('Returning null: cannot override family', {
      parentPeakNum: cd.parentPeakNum,
      location: cd.location,
      role: cd.role
    });
    console.groupEnd(); */
    return null;
  }

  let result = null;
  if (cd.location === 'left') {
    result = { xLeft: xCoord };
  } else if (cd.location === 'right') {
    result = { xRight: xCoord };
  }
  
/*   console.log('Returning:', result);
  console.groupEnd(); */
  return result;
};

export const resolveInnerContourTransfer = ({
  activeBorder,
  peakBorders,
}) => {
  if (!activeBorder || !isInnerRole(activeBorder.cd)) return null;

  const shared = resolveSharedBorderPeaks(activeBorder.cd);

  if (!shared) {
    envAwareNotify('resolveInnerContourTransfer: inner border but shared not resolved');
    return null;
  }

  const { leftPeak, rightPeak } = shared;
  const { x } = activeBorder;

  const left = peakBorders[leftPeak];
  const right = peakBorders[rightPeak];
  if (!left || !right) return null;

  return {
    left: {
      peakNum: leftPeak,
      x0: left.borders[0],
      x1: x,
    },
    right: {
      peakNum: rightPeak,
      x0: x,
      x1: right.borders[1],
    },
  };
};

export const updateFamilyOverrides = (
  familyMap,
  shapeMap,
  draggedCd,
  latestCoordX,
  collisionShapeIndex,
  collisionBorderX,
) => {
  const family = familyMap?.get(draggedCd.parentPeakNum) ?? null;
  let familyOverride = null;
  let collisionFamilyOverride = null;
  let collisionFamilyCache = null;

  /* console.groupCollapsed('updateFamilyOverrides DEBUG');
  console.log('Inputs:', {
    draggedCdParentPeakNum: draggedCd.parentPeakNum,
    latestCoordX,
    collisionShapeIndex,
    collisionBorderX,
    familyMapKeys: Array.from(familyMap?.keys() || [])
  }); */

  if (family && canOverrideFamily(draggedCd)) {
    familyOverride = {
      ...(draggedCd.location === 'left' && { xLeft: latestCoordX }),
      ...(draggedCd.location === 'right' && { xRight: latestCoordX }),
    };
    /* console.log('Dragged family override:', familyOverride); */
  }

  const collisionPeakNum = collisionShapeIndex != null
    ? shapeMap[collisionShapeIndex]?.customData?.parentPeakNum
    : null;

  /* console.log('Collision peak num:', collisionPeakNum); */
  
  const collisionFamily = collisionPeakNum != null ? familyMap?.get(collisionPeakNum) ?? null : null;
  collisionFamilyCache = collisionFamily;
  
  /* console.log('Collision family:', collisionFamily?.members); */

  if (collisionBorderX != null && collisionFamily) {
    /* console.log('Calculating collision override...'); */
    
    const collisionShape = shapeMap[collisionShapeIndex];
    /* console.log('Collision shape:', collisionShape); */
    
    const collisionCd = collisionShape?.customData;
    /* console.log('Collision CD:', collisionCd); */
    
/*     if (collisionCd) {
      console.log('Can override family?', canOverrideFamily(collisionCd));
      console.log('Collision CD location:', collisionCd.location);
    } */
    
    collisionFamilyOverride = collisionCd
      ? getFamilyEdgeOverrideForBorder(collisionCd, collisionBorderX)
      : null;
    
    /* console.log('Resulting collisionFamilyOverride:', collisionFamilyOverride); */
  } else {
    /* console.log('Skipping collision override because:', {
      collisionBorderX,
      collisionFamilyExists: !!collisionFamily
    }); */
  }

/*   console.log('Returning:', {
    family: family?.members,
    familyOverride,
    collisionFamilyCache: collisionFamilyCache?.members,
    collisionFamilyOverride
  });
  console.groupEnd(); */

  return { family, familyOverride, collisionFamilyCache, collisionFamilyOverride };
};
// new for sticky-slippy

const updateBorderPosition = (border, newCoordX, convertersRef) => {
  border.coordX = newCoordX;
  
  // Convert coordX (data coordinate) to dX (SVG coordinate)
  const pixelX = convertersRef.current.xToPixel(newCoordX);
  const svgX = convertersRef.current.xPixelToSVG(pixelX);
  border.dX = svgX;
  
  // Also update the border element's visual position immediately
  createAndSetPath(svgX, border.elem);
  
  console.log(`Updated border ${border.customData.location} of peak ${border.customData.parentPeakNum}: coordX=${newCoordX}, dX=${svgX}`);
};

export const handleDivorce = ({
  stuckBorders, 
  peakToFamilyRef, 
  separationStartX, 
  plotData, 
  peakBorders, 
  draggedBorderCurrentX, 
  collision,
  shapeMap,
  currentDraggedShapeIndex,
  leftMargin,
  width,
  convertersRef
}) => {
  console.groupCollapsed('Divorce')

  const [leftBorder, rightBorder] = stuckBorders
  const leftBorderCd = leftBorder.customData;
  const rightBorderCd = rightBorder.customData;

  const smaller = leftBorderCd.parentPeakNum;
  const bigger = rightBorderCd.parentPeakNum;

  const draggedBorder = stuckBorders.find(border => border.customData.type === 'dragged') 

  if (!draggedBorder) {
    console.warn('No dragged border found in stuck borders');
    return null;
  }

  const activePeakNum = draggedBorder.customData.parentPeakNum;
  const familyMap = peakToFamilyRef.current
  const familyToSplit = familyMap.get(smaller)

  const isDraggedLeft = draggedBorder.customData === leftBorderCd;

  console.log(isDraggedLeft, leftBorder, rightBorder)
  console.log('separationStartX', separationStartX, 'draggedBorderCurrentX',  draggedBorderCurrentX)

  console.log('in', _.cloneDeep(shapeMap))

  if (isDraggedLeft) {
    // Left border is dragged (right border is left-behind)
    // Update right border of smaller peak (dragged) to draggedBorderCurrentX
    if (peakBorders[smaller]) {
      peakBorders[smaller].borders[1] = draggedBorderCurrentX;
      // Clear right pairing (remove the property)
      delete peakBorders[smaller].pairedWithRightPeakIndex;
      // Update flags
      peakBorders[smaller].isNotSeparatedRight = false;
    }
    // Update left border of bigger peak (left-behind) to separationStartX
    if (peakBorders[bigger]) {
      peakBorders[bigger].borders[0] = separationStartX;
      // Clear left pairing (remove the property)
      delete peakBorders[bigger].pairedWithLeftPeakIndex;
      // Update flags
      peakBorders[bigger].isNotSeparatedLeft = false;
    }
    
    // Update shapeMap for both borders (A - B) not the same as (B - A)
    updateBorderPosition(leftBorder, draggedBorderCurrentX, convertersRef);   // Dragged border
    updateBorderPosition(rightBorder, separationStartX, convertersRef);       // Left-behind border
    
  } else {
    // Right border is dragged (left border is left-behind)
    // Update left border of bigger peak (dragged) to draggedBorderCurrentX
    if (peakBorders[bigger]) {
      peakBorders[bigger].borders[0] = draggedBorderCurrentX;
      // Clear left pairing (remove the property)
      delete peakBorders[bigger].pairedWithLeftPeakIndex;
      // Update flags
      peakBorders[bigger].isNotSeparatedLeft = false;
    }
    // Update right border of smaller peak (left-behind) to separationStartX
    if (peakBorders[smaller]) {
      peakBorders[smaller].borders[1] = separationStartX;
      // Clear right pairing (remove the property)
      delete peakBorders[smaller].pairedWithRightPeakIndex;
      // Update flags
      peakBorders[smaller].isNotSeparatedRight = false;
    }
    
    // Update shapeMap for both borders (B - A) not the same as (A - B)
    updateBorderPosition(rightBorder, draggedBorderCurrentX, convertersRef);   // Dragged border
    updateBorderPosition(leftBorder, separationStartX, convertersRef);         // Left-behind border
  }

  console.log('Updated peak borders:', peakBorders[smaller], peakBorders[bigger])

  // Check if familyToSplit exists
  if (!familyToSplit) {
    console.warn('No family found for smaller peak', smaller);
    return null;
  }

  const origMemebers = familyToSplit.members

  const splitIndex = origMemebers.indexOf(bigger)

  if (splitIndex === -1) {
    console.warn('Bigger peak not found in family members');
    return null;
  }

  const part1 = origMemebers.slice(0, splitIndex);  // Elements before bigger
  const part2 = origMemebers.slice(splitIndex);     // bigger and elements after

  const newLeftRole = part1.length < 2 
    ? BORDER_ROLES.SOLO_EDGE
    : BORDER_ROLES.FAMILY_EDGE

  leftBorder.customData.role = newLeftRole
  
  const newRightRole = part2.length < 2 
    ? BORDER_ROLES.SOLO_EDGE
    : BORDER_ROLES.FAMILY_EDGE

  rightBorder.customData.role = newRightRole

  const family1 = {
    lineY: createFamilyLineY(familyToSplit.xLeft, separationStartX, plotData),
    members: part1,
    xLeft: familyToSplit.xLeft,
    xRight: separationStartX
  } 
  
  const family2 = {
    lineY: createFamilyLineY(separationStartX, familyToSplit.xRight, plotData),
    members: part2,
    xLeft: separationStartX,
    xRight: familyToSplit.xRight,
  } 

  const adjustFamilyMap = (elems, family, familyMap) => elems.forEach(element => {
    familyMap.set(element, family)
  });

  adjustFamilyMap(part1, family1, familyMap)
  adjustFamilyMap(part2, family2, familyMap)

  // Determine which family has the dragged border
  const isDraggedInFamily1 = part1.includes(activePeakNum);

  // Update collision information
  let updatedCollision = null;
  if (shapeMap && currentDraggedShapeIndex != null && leftMargin != null && width != null && convertersRef) {
    // Recalculate collision for the dragged border after divorce
    const leftResult = findCollision(shapeMap, currentDraggedShapeIndex, 'left', leftMargin, plotData, convertersRef);
    const rightResult = findCollision(shapeMap, currentDraggedShapeIndex, 'right', width - leftMargin, plotData, convertersRef);
    
    updatedCollision = leftResult.collision || rightResult.collision;
    console.log('Updated collision after divorce:', updatedCollision);
  }

  console.log('out', _.cloneDeep(shapeMap))

  console.groupEnd()

  return {
    family1,
    family2,
    draggedFamily: isDraggedInFamily1 ? family1 : family2,
    leftBehindFamily: isDraggedInFamily1 ? family2 : family1,
  };
}

export const handleMarriage = ({mergingBorders, peakToFamilyRef, plotData, shapeMap, peakBorders  }) => {
  console.groupCollapsed('handleMarriage');

  console.log('in', _.cloneDeep(shapeMap))
  
  // Extract the two borders to merge (could be edge borders, not necessarily stuck)
  const [border1, border2] = mergingBorders;
  const cd1 = border1.customData;
  const cd2 = border2.customData;
  
  console.log('Border1 premarriage:', {role: cd1.role, parentPeakNum: cd1.parentPeakNum, location: cd1.location});
  console.log('Border2 premarriage:', {role: cd2.role, parentPeakNum: cd2.parentPeakNum, location: cd2.location});
  
  // Get families for both borders
  const familyMap = peakToFamilyRef.current;
  const family1 = familyMap.get(cd1.parentPeakNum);
  const family2 = familyMap.get(cd2.parentPeakNum);
  
  console.log('Family1:', family1);
  console.log('Family2:', family2);
  
  if (!family1 || !family2) {
    console.warn('One or both families not found for marriage');
    console.groupEnd();
    return null;
  }
  
  // Check if we're merging the same family (shouldn't happen)
  if (family1 === family2) {
    console.warn('Attempting to merge the same family');
    console.groupEnd();
    return null;
  }
  
  // Get all members from both families and sort them
  const newMembers = [...new Set([...family1.members, ...family2.members])].sort((a, b) => a - b);
  
  // New family geometry uses outermost borders
  const xLeft = Math.min(family1.xLeft, family2.xLeft);
  const xRight = Math.max(family1.xRight, family2.xRight);
  
  console.log('New family:', {members: newMembers, xLeft, xRight});
  
  // Create new family
  const newFamily = {
    members: newMembers,
    xLeft,
    xRight,
    lineY: createFamilyLineY(xLeft, xRight, plotData),
  };
  
  // Determine which peak is left and which is right based on their positions
  const isCd1LeftOfCd2 = cd1.location === 'right' && cd2.location === 'left';

  if (!isCd1LeftOfCd2) envAwareNotify('Wrong order in marriage')

  const leftPeakForConnection = cd1.parentPeakNum;
  const rightPeakForConnection = cd2.parentPeakNum;
  
  console.log('leftyRighty', isCd1LeftOfCd2, leftPeakForConnection, rightPeakForConnection)
  
  // Update the two connecting borders to become INNER roles in shapeMap
  cd1.role = BORDER_ROLES.INNER;
  cd2.role = BORDER_ROLES.INNER;

  const leftPeakBorder = peakBorders[leftPeakForConnection]
  const rightPeakBorder = peakBorders[rightPeakForConnection]

  console.log('Marriage connection:', {leftPeakForConnection, rightPeakForConnection}, leftPeakBorder, rightPeakBorder);

  // CRITICAL: WE NEED TO UPDATE BOTH shapeMap and peakBorders
  // Update peakBorders for the two connecting borders
  if (leftPeakBorder) {
    // Update right border of left peak
    leftPeakBorder.pairedWithRightPeakIndex = rightPeakForConnection;
    leftPeakBorder.isNotSeparatedRight = true;
  }
  if (rightPeakBorder) {
    // Update left border of right peak
    rightPeakBorder.pairedWithLeftPeakIndex = leftPeakForConnection;
    rightPeakBorder.isNotSeparatedLeft = true;
  }

  console.log('out peaks', _.cloneDeep(leftPeakBorder), _.cloneDeep(rightPeakBorder))
  
  // Update pairedWith indices for connecting borders in shapeMap
  cd1.pairedWithRightPeakIndex = rightPeakForConnection;
  cd2.pairedWithLeftPeakIndex = leftPeakForConnection;

  console.log('out shapes', _.cloneDeep(cd1), _.cloneDeep(cd2))
  
  // Update family map for all members
  newMembers.forEach(member => {
    familyMap.set(member, newFamily);
  });
  
  console.log('Border1 postmarriage:', {role: cd1.role, parentPeakNum: cd1.parentPeakNum, location: cd1.location});
  console.log('Border2 postmarriage:', {role: cd2.role, parentPeakNum: cd2.parentPeakNum, location: cd2.location});

  console.log('New family created with updated shapeMap pairings:', newFamily);

  console.log('out', _.cloneDeep(shapeMap))
  console.groupEnd();
  
  return {
    newFamily,
    originalFamily1: family1,
    originalFamily2: family2,
    connection: {
      leftPeak: leftPeakForConnection,
      rightPeak: rightPeakForConnection,
    },
  };
};

export const canMergeFamilies = (border1, border2, familyMap) => {
  if (!border1 || !border2) return false;
  
  const cd1 = border1.customData;
  const cd2 = border2.customData;
  
  // Don't merge if they're the same peak
  if (cd1.parentPeakNum === cd2.parentPeakNum) return false;
  
  const family1 = familyMap.get(cd1.parentPeakNum);
  const family2 = familyMap.get(cd2.parentPeakNum);
  
  if (!family1 || !family2) return false;
  
  // Check if families are already the same
  if (family1 === family2) return false;
  
  // Check if borders are at the edges of their families
  const isCd1AtEdge = 
    (cd1.location === 'right' && family1.members[family1.members.length - 1] === cd1.parentPeakNum) ||
    (cd1.location === 'left' && family1.members[0] === cd1.parentPeakNum);
  
  const isCd2AtEdge = 
    (cd2.location === 'right' && family2.members[family2.members.length - 1] === cd2.parentPeakNum) ||
    (cd2.location === 'left' && family2.members[0] === cd2.parentPeakNum);
  
  // Check if they form a valid edge-to-edge connection
  const isLeftRightPair = 
    (cd1.location === 'right' && cd2.location === 'left') ||
    (cd1.location === 'left' && cd2.location === 'right');
  
  return isCd1AtEdge && isCd2AtEdge && isLeftRightPair;
};