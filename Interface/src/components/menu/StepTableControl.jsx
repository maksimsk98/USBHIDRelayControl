import React from 'react';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';

import { useDispatch, useSelector } from 'react-redux';
import {
  selectActiveTab, selectActiveSubTabByTab,  
  selectTabMeasurementType,
  spectroStepsActions,
  selectSpectroStepsCount,  
  selectIsPeaksRedacting,
  peaksActions,
  selectEffectiveDetectorType,
  selectIsMeasurementSubTabRedacting,
  selectDetectorSpecificStepsCount,
} from '../../services/reduxImportDispatcher.js';

import styles from '../../styles/ButtonIcons.module.css';
import { ReactComponent as EditSvg } from '../../assets/icons/06_red_tab.svg';
import { ReactComponent as AddStepSvg } from '../../assets/icons/07_add.svg';
import { ReactComponent as DeleteStepSvg } from '../../assets/icons/08_del.svg';
import { detectorProgramThunks } from '../../services/thunks/detectorAwareBranched/detectorAwareStateThunks.js';

function StepTableControl(props) {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);

  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, activeTab));

  const measurementType = useSelector((state) => selectTabMeasurementType(state, activeTab));
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, activeTab ));

  const subTabCtx = (() => {
    switch (activeSubTab) {
      case 'peaks':
        return 'peaks';

      case 'measurement':
      case 'spectroMeasurement':
        return 'measurement';

      default:
        return 'unknown';
    }
  })();

  const isRedacting = useSelector((state) => {
    switch (subTabCtx) {
      case 'peaks':
        return selectIsPeaksRedacting(state, activeTab);

      case 'measurement':
        return selectIsMeasurementSubTabRedacting(state, activeTab);

      default:
        return false;
    }
  });

  const stepsCount = useSelector((state) => {
    if (measurementType === 'chroma') {
      return selectDetectorSpecificStepsCount(state, { tabId: activeTab });
    } if (measurementType === 'spectro') {
      return selectSpectroStepsCount(state, activeTab);
    }
  });

  const activePanelId = useSelector(selectActiveTab);

  const addStep = (event) => {
    if (measurementType === 'chroma') {
      dispatch(detectorProgramThunks.addStep({ detectorType, tabId: activePanelId }));
    } else if (measurementType === 'spectro') {
      dispatch(spectroStepsActions.addStep(activePanelId));
    }
    console.log('add step');
    event.stopPropagation();
  };

  const deleteStep = (event) => {
    if (measurementType === 'chroma') {
      dispatch(detectorProgramThunks.deleteFocusedStep({ detectorType, tabId: activePanelId }));
    } else if (measurementType === 'spectro') {
      dispatch(spectroStepsActions.deleteFocusedStep(activePanelId));
    }
    console.log('delete step');
    event.stopPropagation();
  };

  const toggleRedacting = (event) => {
    event.stopPropagation();

    switch (subTabCtx) {
      case 'peaks':
        dispatch(
          peaksActions.setPeaksRedacting({
            tabId: activePanelId,
            value: !isRedacting,
          }),
        );
        return;

      case 'measurement':
        if (measurementType === 'chroma') {
          dispatch(detectorProgramThunks.setReadacting({detectorType, tabId: activePanelId, value: !isRedacting }));
          return;
        }

        if (measurementType === 'spectro') {
          dispatch(
            spectroStepsActions.setReadacting({
              tabId: activePanelId,
              value: !isRedacting,
            }),
          );
        }

      default:
    }
  };

  const canRedact = subTabCtx === 'measurement' || subTabCtx === 'peaks';

  const canEditSteps = subTabCtx === 'measurement' && isRedacting;

  return (
    <ButtonGroup className={`me-1 ${styles.controlPanel}`}>
      <Button
        id="control-step-redact-button"
        size="sm"
        variant="secondary"
        onClick={toggleRedacting}
        disabled={!canRedact}
        className={`${styles.btnCustom} ${isRedacting ? styles.toggled : ''}`}
      >
        <EditSvg className={styles.icon} />
      </Button>
      <Button id="control-step-add-button" size="sm" variant="secondary" onClick={addStep} disabled={!canEditSteps} className={styles.btnCustom}>
        <AddStepSvg className={styles.icon} />
      </Button>
      <Button id="control-step-delete-button" size="sm" variant="secondary" onClick={deleteStep} disabled={!canEditSteps || stepsCount <= 1} className={styles.btnCustom}>
        <DeleteStepSvg className={styles.icon} />
      </Button>
    </ButtonGroup>
  );
}

export default StepTableControl;
