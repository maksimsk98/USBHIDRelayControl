import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import useOnCanvasClick from '../useOnCanvasClick';
import { PEAK_WORK_MODES } from '../../constants/constants';
import { addPeak, changePeakProperty, deletePeak, moveBorders } from '../../services/thunks/peaks/peaksThunks';
import { useDragRectangleXY } from '../useDragRectangleXY';
import { generatePeakAnnotations } from '../../utils/peakUtils';
import { Plotly } from '../../utils/setupPlotly';
import { usePeakBordersSingleSource } from '../plotHooks/usePeakBorders';
import {
  applyFamilyLiveGeometry, BORDER_ROLES, buildPeakFamilies, canOverrideFamily, clampToRange, clearPathElems, createAndSetPath, createBorderPath, createDragState, createGetNewSelectedPeak, findCollision, findIntersections, getBorderHeight, getCurrentPeaksState, getCurrentPeakIndex, getDraggedPeakSeparationChange, getGroupCollisionBoundaries, getPairPeakNum, handleCollision, handleStuckBorderMovement, isInnerRole,
  parsePathD,
  reconcileChanges,
  updateFamilyOverrides,
  updateLayoutOnMouseUp,
} from '.';
import { canMergeFamilies, commitFamilyLayout, getFamilyEdgeOverrideForBorder, handleDivorce, handleMarriage } from './familyUtils';
import _ from 'lodash';
import { renderShapes } from './renderUtils';

// Sticky-slippy constants
const SNAP_THRESHOLD = 0.1; // Threshold for sticking borders together (in data units)

const batchDispatch = async (dispatch, thunks) => {
  const promises = thunks.map(thunk => dispatch(thunk));
  await Promise.all(promises);
};

// Helper to check if borders should stick together
export const shouldStick = (x1, x2) => Math.abs(x1 - x2) < SNAP_THRESHOLD;

export const pathsToShapeMap = (pathElems, eventTarget, regex) => 
  pathElems.map(item => {
    const [elem, coordX, customData] = item;
    
    if (!elem.getAttribute('d')?.match(regex)) return null;
    
    const isDragged = eventTarget === elem;
    const match = elem.getAttribute('d').match(regex);
    
    return {
      elem,
      coordX,
      customData: {
        ...customData,
        type: isDragged ? 'dragged' : customData.type,
      },
      dX: parseFloat(match[1]),
    };
  });

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
  layout,
  parentId,
) => {

  const onMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const { width, margin: { l: leftMargin } } = plotlyObj.el._fullLayout;
    const regex = /M(-?[\d.]+),/;

    const shapeMap = pathsToShapeMap(pathElems.current, event.target, regex);

    const initialDragState = createDragState(
      event, shapeMap, convertersRef, leftMargin, width, plotData
    );
    if (!initialDragState) return;

    // Capture initial families state
    const initialFamilies = _.cloneDeep(peakToFamilyRef.current);
    initialDragState.families = initialFamilies;

    // Also capture shapeMap state
    initialDragState.shapeMap = _.cloneDeep(shapeMap);

    let {
      currentDraggedShapeIndex,
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
    } = initialDragState;

    let latestCoordX = null;
    let collisionBorderX = null;
    let didCollisionHappened = false;

    let sessionPeakBorders = _.cloneDeep(peakBorders)

    const handleMouseMove = (moveEvent) => {
      if (processedEvents.has(moveEvent)) return;

      let newSVGX = convertersRef.current.xPixelToSVG(moveEvent.clientX);
      newSVGX = Math.max(leftBorder, Math.min(rightBorder, newSVGX));

      const newCoordX = convertersRef.current.pixelToX(
        convertersRef.current.xSVGToPixel(newSVGX)
      );
      
      const isCtrlPressedNow = moveEvent.ctrlKey;
      if (!stickyModeActive && isCtrlPressedNow) {
        //
        separationStartX = newCoordX
      }
      stickyModeActive = isCtrlPressedNow;
      
      // Handle stuck border movement
      let shouldDivorce = false;
      if (stuckBorders.length > 1) {
        const stuckResult = handleStuckBorderMovement(
          newSVGX,
          pathElem,
          stuckBorders,
          stuckBorderIndices,
          hasSeparated,
          stickyModeActive,
          separationStartX,
          newCoordX,
          convertersRef,
          shapeMap
        );
        hasSeparated = stuckResult.hasSeparated;
        shouldDivorce = stuckResult.shouldDivorce; // Note: returns shouldDevorce
        separationStartX = stuckResult.separationStartX;

      } else {
        createAndSetPath(newSVGX, pathElem)
      }

      let divorceResult = null;
      if (shouldDivorce) {
        divorceResult = handleDivorce({
          stuckBorders, 
          peakToFamilyRef, 
          separationStartX, 
          plotData, 
          peakBorders: sessionPeakBorders,  
          draggedBorderCurrentX: newCoordX, 
          collision,
          shapeMap,
          currentDraggedShapeIndex,
          leftMargin,
          width,
          convertersRef
        })
      }

      // Handle collision
      const collisionResult = handleCollision({
        draggedCd,
        collision,
        svgX: newSVGX,
        hasSeparated,
        stuckBorders,
        shapeMap,
        stickyModeActive,
        leftResult,
        rightResult,
        convertersRef,
        draggedShapeIndex: currentDraggedShapeIndex
      }) 
 
      didCollisionHappened = collisionResult.didCollisionHappened;
      collisionBorderX = collisionResult.collisionBorderX;
      const shouldMerge = collisionResult.shouldMerge;

      if (didCollisionHappened && collision?.shapeIndex != null) {
        const collisionShape = shapeMap[collision.shapeIndex];
        if (collisionShape && collisionShape.elem) {
          // Calculate Y position on signal curve
          const { y: signalY } = findIntersections(collisionBorderX, plotData[0].x, plotData[0].y);
          
          // For now, draw a short line at signalY (will be updated by family geometry)
          const halfHeight = getBorderHeight(layout) / 2;
          const y0 = signalY + halfHeight;
          const y1 = signalY - halfHeight;
          
          // Convert to SVG coordinates
          const xPx = convertersRef.current.xToPixel(collisionBorderX);
          const y0Px = convertersRef.current.yToPixel(y0);
          const y1Px = convertersRef.current.yToPixel(y1);
          
          const svgX = convertersRef.current.xPixelToSVG(xPx);
          const svgY0 = convertersRef.current.yPixelToSVG(y0Px);
          const svgY1 = convertersRef.current.yPixelToSVG(y1Px);
          
          // Update border element
          const newBorderD = `M${svgX},${svgY0}L${svgX},${svgY1}`;
          collisionShape.elem.setAttribute('d', newBorderD);
          
          // Update shape's coordinate in shapeMap
          collisionShape.coordX = collisionBorderX;
        }
      }
      
      let marriageResult = null;
      // Only check marriage if we DIDN'T just divorce
      if (shouldMerge && collision && !divorceResult) {
        // Get the colliding borders - the dragged border and the border it collided with
        const draggedShape = shapeMap[currentDraggedShapeIndex];
        const collisionShape = shapeMap[collision.shapeIndex];
        
        const mergingBorders = collision.direction === 'right' ? [draggedShape, collisionShape] : [collisionShape, draggedShape];
        
        // Check if we can merge these families
        if (canMergeFamilies(draggedShape, collisionShape, peakToFamilyRef.current)) {
          marriageResult = handleMarriage({
            mergingBorders,
            peakToFamilyRef,
            plotData,
            shapeMap,
            peakBorders: sessionPeakBorders
          });
          
          if (marriageResult) {
            // Update the merging borders to show they're now inner borders
            mergingBorders.forEach(border => {
              createAndSetPath(newSVGX, border.elem);
            });
            
            // Set hasSeparated to false since they're now merged
            hasSeparated = false;
            
            // Update stuckBorders to include both borders (they're now stuck together)
            stuckBorders = mergingBorders;

            // IMPORTANT: After marriage, we should NOT divorce
            shouldDivorce = false;
            
            // Apply geometry for the new merged family
            applyFamilyLiveGeometry({
              family: marriageResult.newFamily,
              shapeMap,
              peakBorders: sessionPeakBorders,
              convertersRef,
              borderHeight: getBorderHeight(layout),
              familyOverride: getFamilyEdgeOverrideForBorder(draggedCd, latestCoordX),
              plotData,
              draggedBorderCd: draggedCd,
              hasSeparated: false,
              separationStartX: null,
              activeBorder: {
                x: latestCoordX,
                peakNum: draggedCd.parentPeakNum,
                location: draggedCd.location,
                cd: draggedCd,
              },
              /* debugLog: 'after-marriage' */
            });
            
            // Clear collision flags since we've merged
            didCollisionHappened = false;
            collisionBorderX = null;
          }
        }
      }

      latestCoordX = clampToRange(
        convertersRef.current.pixelToX(convertersRef.current.xSVGToPixel(newSVGX)),
        draggedOrigCoordX,
        leftCoordClamp,
        rightCoordClamp,
      );

      // Update family overrides THIS SHOULD HAPPEN AFTER DEVORCE
      const { family, familyOverride, collisionFamilyCache, collisionFamilyOverride } =
        updateFamilyOverrides(
          peakToFamilyRef.current,
          shapeMap,
          draggedCd,
          latestCoordX,
          collision?.shapeIndex,
          collisionBorderX,
        );
      
      // AFTER divorce, update BOTH families

      if (divorceResult) {
        // Get the override for the dragged border
        const draggedFamilyOverride = getFamilyEdgeOverrideForBorder(draggedCd, latestCoordX);
        
        // Update dragged family
        applyFamilyLiveGeometry({
          family: divorceResult.draggedFamily,
          shapeMap,
          peakBorders: sessionPeakBorders,
          convertersRef,
          borderHeight: getBorderHeight(layout),
          familyOverride: draggedFamilyOverride, // Use the override for dragged border
          plotData,
          draggedBorderCd: draggedCd,
          hasSeparated,
          separationStartX,
          activeBorder: {
            x: latestCoordX,
            peakNum: draggedCd.parentPeakNum,
            location: draggedCd.location,
            cd: draggedCd,
          },
          /* debugLog: 'dragged in divorce' */
        });
        
        // Update left-behind family (no override, use its new boundaries)
        applyFamilyLiveGeometry({
          family: divorceResult.leftBehindFamily,
          shapeMap,
          peakBorders: sessionPeakBorders,
          convertersRef,
          borderHeight: getBorderHeight(layout),
          familyOverride: null, // No override for left-behind
          plotData,
          draggedBorderCd: null, // Not dragged
          hasSeparated: false,
          separationStartX: null,
          activeBorder: null,
          /* debugLog: 'left-behind in divorce' */
        });

        // CRITICAL: Recalculate collision boundaries after divorce
        // since family structures have changed
        const leftResult = findCollision(shapeMap, currentDraggedShapeIndex, 'left', leftMargin, plotData, convertersRef);
        const rightResult = findCollision(shapeMap, currentDraggedShapeIndex, 'right', width - leftMargin, plotData, convertersRef);
        
        

        // Update boundaries for the dragged border (now solo)
        leftBorder = leftResult.svgXBorder;
        rightBorder = rightResult.svgXBorder;
        leftCoordClamp = leftResult.coordClamp;
        rightCoordClamp = rightResult.coordClamp;
        
        // Also update the collision object
        collision = leftResult.collision || rightResult.collision;

      } else if (family) {
        applyFamilyLiveGeometry({
          family,
          shapeMap,
          peakBorders: sessionPeakBorders,
          convertersRef,
          borderHeight: getBorderHeight(layout),
          familyOverride,
          plotData,
          draggedBorderCd: draggedCd,
          hasSeparated,
          separationStartX,
          activeBorder: {
            x: latestCoordX,
            peakNum: draggedCd.parentPeakNum,
            location: draggedCd.location,
            cd: draggedCd,
          },
          /* debugLog: draggedCd.role === BORDER_ROLES.INNER ? 'inner-drag' : 'edge-drag' */
        });
      }

      if (didCollisionHappened && collisionFamilyCache && collisionFamilyCache !== family) {
        applyFamilyLiveGeometry({
          family: collisionFamilyCache,
          shapeMap,
          peakBorders: sessionPeakBorders,
          convertersRef,
          borderHeight: getBorderHeight(layout),
          familyOverride: collisionFamilyOverride, 
          plotData,
          draggedBorderCd: null,
          hasSeparated: false,
          separationStartX: null,
          /* debugLog: 'collision'   */
        });
        
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { capture: true });

    const onMouseUp = async () => {
      manualClickRef.current = false;

      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp);

      if (latestCoordX == null) return;

      const pairedBorderIndex = stuckBorderIndices.find(index => index != currentDraggedShapeIndex) ?? null

      // Capture initial state from sessionPeakBorders
      const initialState = getCurrentPeaksState(initialDragState.shapeMap, 
                                              initialDragState.families || new Map());

      //simplest move solo or paired                                       
      shapeMap[currentDraggedShapeIndex].coordX = latestCoordX
      if (!hasSeparated && pairedBorderIndex) {
        shapeMap[pairedBorderIndex].coordX = latestCoordX
      }

      // Capture final state from current state
      const finalState = getCurrentPeaksState(shapeMap, peakToFamilyRef.current);

      // First pass: build basic optimistic peak borders from peakEdges and families
      let optimisticPeakBorders = peakBorders.map((originalPeak, index) => {
        const edges = finalState.peakEdges[index];
        const sep = finalState.separationStatus[index];
        
        const leftX = edges?.borders[0] ?? originalPeak.borders[0];
        const rightX = edges?.borders[1] ?? originalPeak.borders[1];
        
        const isNotSeparatedLeft = sep ? !sep.isSeparatedLeft : false;
        const isNotSeparatedRight = sep ? !sep.isSeparatedRight : false;
        
        let pairedWithLeftPeakIndex = null;
        let pairedWithRightPeakIndex = null;
        
        const family = peakToFamilyRef.current.get(index);
        if (family && family.members.length > 1) {
          const memberIndex = family.members.indexOf(index);
          if (memberIndex > 0) pairedWithLeftPeakIndex = family.members[memberIndex - 1];
          if (memberIndex < family.members.length - 1) pairedWithRightPeakIndex = family.members[memberIndex + 1];
        }
        
        return {
          ...originalPeak,
          borders: [leftX, rightX],
          center: (leftX + rightX) / 2,
          isNotSeparatedLeft,
          isNotSeparatedRight,
          pairedWithLeftPeakIndex,
          pairedWithRightPeakIndex
        };
      });

      // Use the extracted renderShapes function for optimistic update
      const optimisticShapes = renderShapes({
        peakBorders: optimisticPeakBorders,
        selectedPeakNum,
        plotData,
        layout
      });

      // Update layout optimistically
      setLayout((prev) => ({
        ...prev,
        shapes: optimisticShapes.shapes
      }));

      // Reconcile changes
      const changes = reconcileChanges(initialState, finalState, {
        peakNum: draggedCd.parentPeakNum,
        location: draggedCd.location
      });

      // ACHTUNG WATCHLIST HACK: API asks only 1 of the pair be changed, and it is toggle style
      // So we only dispatch the dragged peak's separation change
      const draggedSeparationChange = getDraggedPeakSeparationChange(
        changes.separationChanges,
        draggedCd.parentPeakNum,
        draggedCd.location
      );

      const isSplit = draggedSeparationChange && draggedSeparationChange.value === true
      const isMerge = draggedSeparationChange && draggedSeparationChange.value === false
      const isNeutral = !draggedSeparationChange

        // Find dragged and other borders
      const draggedBorderMove = changes.movedBorders.find(move => 
        move.peakNum === draggedCd.parentPeakNum && 
        move.location === draggedCd.location
      );
      
      const otherMovedBorders = changes.movedBorders.filter(move => 
        !(move.peakNum === draggedCd.parentPeakNum && move.location === draggedCd.location)
      );

      const soloMove = changes.movedBorders.length === 1 && isNeutral
      const pairMove = changes.movedBorders.length === 2 && isNeutral
      const mergeMove = changes.movedBorders.length >= 1 && isMerge
      const splitMove = changes.movedBorders.length >= 1  && isSplit


      const thunksToDispatch = [];

      if (soloMove && draggedBorderMove) {
        console.log('solo move')
        thunksToDispatch.push(moveBorders({
          paramsToSend: {
            tabId: parentId,
            border: draggedBorderMove,
            collision: null,
            paired: null
          }
        }));
      } else if (pairMove && draggedBorderMove && otherMovedBorders.length === 1) {
        console.log('pair move')
        thunksToDispatch.push(moveBorders({
          paramsToSend: {
            tabId: parentId,
            border: draggedBorderMove,
            collision: null,
            paired: otherMovedBorders[0]
          }
        }));
      } else if (mergeMove && draggedBorderMove && otherMovedBorders.length === 1) {
        console.log('mergeMove')
        thunksToDispatch.push(moveBorders({
          paramsToSend: {
            tabId: parentId,
            border: draggedBorderMove,
            collision: otherMovedBorders[0],
            paired: null
          },
          suppressUpdate: true
        }));

        if (draggedSeparationChange) {
          thunksToDispatch.push(changePeakProperty({
            tabId: parentId,
            peakIndex: draggedSeparationChange.peakIndex,
            property: draggedSeparationChange.property,
            value: draggedSeparationChange.value
          }));
        }
      } else if (splitMove && draggedBorderMove) { // it is technically possible to split without affecting other
        console.log('split move')
        if (draggedSeparationChange) {
          thunksToDispatch.push(changePeakProperty({
            tabId: parentId,
            peakIndex: draggedSeparationChange.peakIndex,
            property: draggedSeparationChange.property,
            value: draggedSeparationChange.value,

            suppressUpdate: true // important for jitter
          }));
        }

        thunksToDispatch.push(moveBorders({
          paramsToSend: {
            tabId: parentId,
            border: draggedBorderMove,
            collision: otherMovedBorders[0] ? otherMovedBorders[0] : null,
            paired: null
          }
        }));
      } else {
        console.error('Dangerous peak operation fallback')
        // Fallback
        changes.movedBorders.forEach(move => {
          thunksToDispatch.push(moveBorders({
            paramsToSend: {
              tabId: parentId,
              border: move,
              collision: null,
              paired: null
            },
            suppressUpdate: true
          }));
        });
        
        if (draggedSeparationChange) {
          thunksToDispatch.push(changePeakProperty({
            tabId: parentId,
            peakIndex: draggedSeparationChange.peakIndex,
            property: draggedSeparationChange.property,
            value: draggedSeparationChange.value
          }));
        }
      }

      // Batch dispatch and wait for completion
      try {
        await batchDispatch(dispatch, thunksToDispatch);
      } catch (error) {
        console.error('Error dispatching thunks:', error);
      }
    };

    window.addEventListener('mouseup', onMouseUp);
    clearPathElems(pathElems, 'mup');
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
  workMode,
}) => {
  const [selectedPeakNum, setSelectedPeakNum] = useState(null);
  const { peakBorders, borderDispatch } = usePeakBordersSingleSource(peaks);

  const peakToFamilyRef = useRef(new Map());

  const shapesRef = useRef(layout.shapes);
  useEffect(() => { shapesRef.current = layout.shapes; }, [layout.shapes]);

  const activeBorderIndexes = useRef([]); // we track which indexes of array were made active to map to elements
  const pathElems = useRef([]);
  const prevPeakCount = useRef(peaks.length);
  const manualClickRef = useRef(false);

  useEffect(() => {
    // Always re-format when peaks array identity changes:
    borderDispatch({ type: 'set', payload: peaks });

    // If the number of peaks changed, clear selection + active borders:
    if (prevPeakCount.current !== peaks.length) {
      setSelectedPeakNum(null);
      activeBorderIndexes.current = [];
      clearPathElems(pathElems, 'peakCountmismatch');
    }
    prevPeakCount.current = peaks.length;
  }, [peaks]);

  const { x: clickX, y: clickY, ctrlKey: canvasClickControl } = useOnCanvasClick(plotlyObj, isInitialized);

  const dragLayer = plotlyObj?.el?.querySelector('.nsewdrag');
  const svgLayer = dragLayer?.closest('svg');

  const onDeleteDrag = useCallback(({
    left, right, top, bottom,
  }) => {
    manualClickRef.current = false;
    dispatch(deletePeak({
      tabId: parentId,
      leftPoint: { x: left, y: top }, // this order of x/y is important for backend
      rightPoint: { x: right, y: bottom },
      persistMode: canvasClickControl
    }));
  }, [parentId, dispatch, canvasClickControl]);

  const onDeleteClick = useCallback(({ x, y }) => {
    manualClickRef.current = false;
    dispatch(deletePeak({
      tabId: parentId,
      leftPoint: { x, y },
      rightPoint: null,
      persistMode: canvasClickControl
    }));
  }, [parentId, dispatch, canvasClickControl]);

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
  });

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
      manualClickRef.current
      && workMode === PEAK_WORK_MODES.ADD
      && clickX != null
    ) {
      manualClickRef.current = false; // consume the click

      const isCtrlPressed = window.event?.ctrlKey || false;
      console.log('IS CONTRL', isCtrlPressed)
      dispatch(addPeak({ tabId: parentId, xCoord: clickX, persistMode: canvasClickControl }));
    }
  }, [clickX, canvasClickControl, workMode]);

  // 2) SELECT a peak only when you click and are in NULL (inspect) mode

  const getNewSelectedPeak = useCallback((clickX) => createGetNewSelectedPeak(peakBorders, clickX), [peakBorders]);

  useEffect(() => {
    if (
      manualClickRef.current
      && workMode === null
      && clickX != null
    ) {
      manualClickRef.current = false; // consume the click

      const newSel = getNewSelectedPeak(clickX);
      if (newSel !== selectedPeakNum) {
        setSelectedPeakNum(newSel);
      }
    }
  }, [clickX, workMode, getNewSelectedPeak, selectedPeakNum]);

  // prevent relayout loop
  const needsToRerange = useRef(false);

  const annotations = useMemo(() => {
    if (!plotData[0]?.x?.length || !plotData[0]?.y?.length) return [];
    const result = generatePeakAnnotations(peakBorders, plotData[0], annotationsConfig);
    needsToRerange.current = true;
    return result;
  }, [plotData, peakBorders, annotationsConfig]);

  useEffect(() => {
    if (!layout?.yaxis?.autorange || !plotlyObj?.el || !needsToRerange.current) return;

    setTimeout(() => {
      needsToRerange.current = false;
      Plotly.relayout(plotlyObj.el, {
        'yaxis.autorange': true,
      });
    }, 0); // to allow 1 tick for plotly actual relayout
  }, [layout?.annotations, plotlyObj]);

  useEffect(() => {
    // 1) If no data at all, clear everything
    if (!plotData[0]?.x?.length || !plotData[0]?.y?.length) {
      clearPathElems(pathElems, 'no-data');
      setLayout((prev) => ({ ...prev, shapes: [], annotations: [] }));
      return;
    }

    const result = renderShapes({
      peakBorders,
      selectedPeakNum,
      plotData,
      layout
    });

    peakToFamilyRef.current = result.peakToFamily || new Map();
   
    clearPathElems(pathElems, 'merged-effect');
    setLayout((prev) => {
      const newLayout = {
        ...prev,
        hovermode: selectedPeakNum == null,
        shapes: result.shapes,
        annotations,
      };
      /* console.log('rebuild and react', result.shapes) */
      return newLayout;
    });
  }, [
    plotData,
    peakBorders,
    trueRanges,
    selectedPeakNum,
    annotations,
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
      mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Handle added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'path' && !processedPaths.has(node)) {
              processPath(node);
            }
          });

          // Handle removed nodes
          mutation.removedNodes.forEach((node) => {
            if (node.tagName === 'path') {
              removePath(node);
            }
          });
        }
      });
    });

    const processPath = (target) => {
      const shapeIndex = pathElems.current.length;
      processedPaths.add(target);

      const shape = shapesRef.current[shapeIndex];
      if (!shape) return;

      const isAcitve = shape.customData.active;
      const { type } = shape.customData;

      if (isAcitve) {
        target.style.cursor = 'ew-resize';
        target.classList.add('border', 'active-border');
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
          layout,
          parentId,
        );
      } else if (!isAcitve && type === 'border') {
        target.classList.add('border', 'passive-border');
      } else if (type === 'peak') {
        target.classList.add('border', 'passive-border');
      } else if (type === 'contour') {
        target.classList.add('contour', 'border-contour');
      }

      pathElems.current.push([target, shape.x0, shape.customData]);
    };

    const removePath = (target) => {
      pathElems.current = pathElems.current.filter(([elem]) => elem !== target);
    };

    const shapeLayers = plotlyObj.el.querySelectorAll('.layer-below > g, .layer-above > g, .layer-subplot > g');
    if (!shapeLayers.length) return;

    shapeLayers.forEach((layer) => {
      observer.observe(layer, {
        childList: true, attributes: true, subtree: true, attributeFilter: ['style'],
      });
    });

    return () => {
      observer.disconnect();
    };
  }, [
    plotlyObj,
    layout.shapes,
    trueRanges,
  ]);

  return { getNewSelectedPeak, selectedPeakNum };
};

export default useHandlePeak;
