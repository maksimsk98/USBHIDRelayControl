import React, { useState } from 'react';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';

import { useDispatch, useSelector } from 'react-redux';

import styles from '../../styles/ButtonIcons.module.css';
import { ReactComponent as AutoMarkSVG } from '../../assets/icons/13_auto_raz_white.svg';
import { ReactComponent as AddPeakSVG } from '../../assets/icons/15_add_pick.svg';
import { ReactComponent as DeletePeakSVG } from '../../assets/icons/16_cancel_pick.svg';
import { ReactComponent as UndoPeaksSVG } from '../../assets/icons/17_o.svg';
import { ReactComponent as RedoPeaksSVG } from '../../assets/icons/18_v.svg';

import AutoMarkModal from './mainMenu/calculation/AutoMarkModal.jsx';
import {
  peaksActions, selectActiveTab, selectIsActiveTabFinished, selectPeakWorkMode, selectPeakHistoryMove, selectActiveSubTabByTab, selectIsPeakFuncsDisabled,
} from '../../services/reduxImportDispatcher.js';
import { PEAK_WORK_MODES } from '../../constants/constants.js';
import { movePeakHistory } from '../../services/thunks/peaks/peaksThunks.js';

function PeakControl(props) {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, activeTab));
  const isNotPeakSubTab = activeSubTab !== 'peaks';

  const isDisabledPeakFuncs = useSelector((state) => selectIsPeakFuncsDisabled(state, activeTab));

  const workMode = useSelector((state) => selectPeakWorkMode(state, activeTab));
  const isAdd = workMode === PEAK_WORK_MODES.ADD;
  const isDelete = workMode === PEAK_WORK_MODES.DELETE;

  const { isUndoEnabled, isRedoEnabled } = useSelector((state) => selectPeakHistoryMove(state, activeTab));

  const [showAutoMark, setShowAutoMark] = useState(false);

  const handleShowAutoMarkModal = () => setShowAutoMark(true);
  const handleCloseAutoMarkModal = () => setShowAutoMark(false);

  const toggleAddPeak = (event) => {
    dispatch(peaksActions.setPeakWorkMode({ tabId: activeTab, workMode: PEAK_WORK_MODES.ADD }));
  };

  const toggleDeletePeak = (event) => {
    dispatch(peaksActions.setPeakWorkMode({ tabId: activeTab, workMode: PEAK_WORK_MODES.DELETE }));
  };

  const handleMoveHistoryPeak = (event) => {
    const { name } = event.currentTarget;
    dispatch(movePeakHistory({ tabId: activeTab, command: name }));
  };

  const isFinished = useSelector(selectIsActiveTabFinished);

  return (
    <>
      <AutoMarkModal
        show={showAutoMark}
        onClose={handleCloseAutoMarkModal}
      />

      <ButtonGroup className={`me-1 ${styles.controlPanel}`}>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleShowAutoMarkModal}
          disabled={!isFinished || isDisabledPeakFuncs}
          className={styles.btnCustom}
        >
          <AutoMarkSVG className={styles.icon} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          name="addPeak"
          onClick={toggleAddPeak}
          disabled={!isFinished || isNotPeakSubTab || isDisabledPeakFuncs}
          className={`${styles.btnCustom} ${isAdd ? styles.toggled : ''}`}
        >
          <AddPeakSVG className={styles.icon} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          name="deletePeak"
          onClick={toggleDeletePeak}
          disabled={!isFinished || isNotPeakSubTab || isDisabledPeakFuncs}
          className={`${styles.btnCustom} ${isDelete ? styles.toggled : ''}`}
        >
          <DeletePeakSVG className={styles.icon} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          name="undoPeak"
          onClick={handleMoveHistoryPeak}
          disabled={!isUndoEnabled || isNotPeakSubTab}
          className={`${styles.btnCustom}`}
        >
          <UndoPeaksSVG className={styles.icon} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          name="redoPeak"
          onClick={handleMoveHistoryPeak}
          disabled={!isRedoEnabled || isNotPeakSubTab}
          className={`${styles.btnCustom} ${isDelete ? styles.toggled : ''}`}
        >
          <RedoPeaksSVG className={styles.icon} />
        </Button>
      </ButtonGroup>
    </>
  );
}

export default PeakControl;
