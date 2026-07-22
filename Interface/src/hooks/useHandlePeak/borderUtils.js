import { envAwareNotify } from '../../utils/debug';

export const BORDER_ROLES = {
  SOLO_EDGE: 'solo-edge',
  FAMILY_EDGE: 'family-edge',
  INNER: 'inner',
};

export const canOverrideFamily = (cd) => cd?.role === BORDER_ROLES.SOLO_EDGE
  || cd?.role === BORDER_ROLES.FAMILY_EDGE;

export const isInnerRole = (cd) => cd?.role === BORDER_ROLES.INNER;

export const getPairPeakNum = (customData, selectedPeakNum) => {
  if (!customData || !isInnerRole(customData)) return null;
  
  if (customData.location === 'left' && customData.pairedWithLeftPeakIndex != null) {
    return customData.pairedWithLeftPeakIndex;
  }
  
  if (customData.location === 'right' && customData.pairedWithRightPeakIndex != null) {
    return customData.pairedWithRightPeakIndex;
  }

  return null
};

export const resolveSharedBorderPeaks = (cd) => {
  if (!isInnerRole(cd)) return null;

  /* console.log('Resolving shared border peaks for:', cd); */

  if (cd.location === 'left' && cd.pairedWithLeftPeakIndex != null) {
    return { 
      leftPeak: cd.pairedWithLeftPeakIndex, 
      rightPeak: cd.parentPeakNum 
    };
  } else if (cd.location === 'right' && cd.pairedWithRightPeakIndex != null) {
    return { 
      leftPeak: cd.parentPeakNum, 
      rightPeak: cd.pairedWithRightPeakIndex 
    };
  }

  envAwareNotify('Illegal inner border: no valid pairing detected');
  return null;
};



// Helper to extract border state from shapeMap and families
export const getCurrentPeaksState = (shapeMap, families) => {
  const peakEdges = shapeMap.reduce((acc, shape) => {
    const coordX = shape.coordX
    const {location, parentPeakNum} = shape.customData;

    if (!acc[parentPeakNum]) acc[parentPeakNum] = {borders: [null, null]}
    if (location === 'left') {
      acc[parentPeakNum].borders[0] = coordX
    } 
    if (location === 'right') {
      acc[parentPeakNum].borders[1] = coordX 
    }
    return acc
  }, {})

  // Analyze families to determine separation status
  const separationStatus = {};
  
  families.forEach((family, peakNum) => {
    if (!family.members || family.members.length === 0) return;
    
    const isLeftMost = family.members[0] === peakNum;
    const isRightMost = family.members[family.members.length - 1] === peakNum;
    
    separationStatus[peakNum] = {
      isSeparatedLeft: isLeftMost,
      isSeparatedRight: isRightMost
    };
  });

  return { peakEdges, separationStatus };
};

export const reconcileChanges = (initialState, finalState) => {
  const changes = {
    movedBorders: [],
    separationChanges: [],
    createdBorders: [],
    deletedBorders: []
  };

  const initialPeakEdges = initialState.peakEdges || {};
  const finalPeakEdges = finalState.peakEdges || {};

  const allPeakNums = new Set([
    ...Object.keys(initialPeakEdges).map(Number),
    ...Object.keys(finalPeakEdges).map(Number)
  ]);

  allPeakNums.forEach(peakNum => {
    const initialEdges = initialPeakEdges[peakNum];
    const finalEdges = finalPeakEdges[peakNum];

    if (initialEdges && finalEdges) {
      // Check left border movement
      if (Math.abs(finalEdges.borders[0] - initialEdges.borders[0]) > 0.001) {
        changes.movedBorders.push({
          peakNum,
          location: 'left',
          xCoord: finalEdges.borders[0]
        });
      }
      // Check right border movement
      if (Math.abs(finalEdges.borders[1] - initialEdges.borders[1]) > 0.001) {
        changes.movedBorders.push({
          peakNum,
          location: 'right',
          xCoord: finalEdges.borders[1]
        });
      }
    } else if (finalEdges) {
      // New peak created (shouldn't happen in drag, but safety)
      changes.createdBorders.push(
        { peakNum, location: 'left', xCoord: finalEdges.borders[0] },
        { peakNum, location: 'right', xCoord: finalEdges.borders[1] }
      );
    } else if (initialEdges) {
      // Peak deleted (shouldn't happen in drag)
      changes.deletedBorders.push(
        { peakNum, location: 'left' },
        { peakNum, location: 'right' }
      );
    }
  });

  // Separation status changes
  const initialSep = initialState.separationStatus || {};
  const finalSep = finalState.separationStatus || {};

  const allPeaksForSep = new Set([
    ...Object.keys(initialSep).map(Number),
    ...Object.keys(finalSep).map(Number)
  ]);

  allPeaksForSep.forEach(peakNum => {
    const initial = initialSep[peakNum];
    const final = finalSep[peakNum];

    if (initial && final) {
      if (initial.isSeparatedLeft !== final.isSeparatedLeft) {
        changes.separationChanges.push({
          peakIndex: peakNum,
          property: 'isSeparatedLeft',
          value: final.isSeparatedLeft
        });
      }
      if (initial.isSeparatedRight !== final.isSeparatedRight) {
        changes.separationChanges.push({
          peakIndex: peakNum,
          property: 'isSeparatedRight',
          value: final.isSeparatedRight
        });
      }
    } else if (final) {
      // New peak gained separation status
      changes.separationChanges.push(
        { peakIndex: peakNum, property: 'isSeparatedLeft', value: final.isSeparatedLeft },
        { peakIndex: peakNum, property: 'isSeparatedRight', value: final.isSeparatedRight }
      );
    }
  });

  return changes;
};

export const getDraggedPeakSeparationChange = (separationChanges, peakNum, location) => {
  const property = location === 'left' ? 'isSeparatedLeft' : 'isSeparatedRight';
  return separationChanges.find(
    change => change.peakIndex === peakNum && change.property === property
  );
};