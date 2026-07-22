import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';

import styles from '../../styles/ButtonIcons.module.css';

import {
  selectAutoControlSessionId, selectChosenDetector, selectDetectorInitializingProgress, selectDetectorType, selectIsActTabMeasurFinished, selectIsDetectorProgramComplete, selectIsMainStreaming, selectMeasurementName, selectUsedDetectorType,
} from '../../services/reduxImportDispatcher.js';

// base
import { selectIsDetectorConnected } from '../../services/reduxImportDispatcher.js';

import {
  stopChromaWithApiCall, closeChromaWithApiCall, startMeasurementOnActive, stopSpectroWithApiCall,
} from '../../services/thunks/measurement/measurementThunks';

import { ReactComponent as StartSvg } from '../../assets/icons/01_start.svg';
import { ReactComponent as StopSvg } from '../../assets/icons/02_stop.svg';
import SampleNameModal from './SampleNameModal';
import { TernaryForkModal, useTernaryFork } from '../../hooks/useTernaryFork.js';
import { INVALID_MEAS_PARAMS_FIX_MESSAGES, INVALID_MEAS_PARAMS_MESSAGES, MEASUREMENT_TYPES } from '../../constants/constants';
import { ConfirmationModal, useConfirmation } from '../../hooks/useConfirmation.js';
import { handleAutoMeasurementStopped } from '../../services/thunks/autosampler/autoMeasurementThunks.js';

const checkStartAvailable = (
  activeTab,
  isStreaming,
  isDetectorReady,
  isDetectorProgramComplete,
  isDetectorInitializing,
) => (
  activeTab
    && !isStreaming
    && isDetectorProgramComplete
    && isDetectorReady
    && !isDetectorInitializing
);

function StartStopControl(props) {
  const isDev = window?.electronAPI?.getDevMode() ?? false; // TODO: remove all isDev checks after testing

  const { api } = props;
  const dispatch = useDispatch();

  const { activeTab, activeSubTab } = useSelector((state) => state.tabReducer);
  const isStreaming = useSelector(selectIsMainStreaming);
  const chosenDetectorType = useSelector(selectDetectorType);
  const detectorIsSelected = useSelector(selectChosenDetector);

  const isDetectorChosen = !!detectorIsSelected;
  const usedDetector = useSelector((state) => selectUsedDetectorType(state, activeTab));
  const isDetectorConnected = useSelector(selectIsDetectorConnected);
  const isCorrectDetector = !usedDetector || chosenDetectorType === usedDetector; // either first launch and no used or the same as before

  const isDetectorReady = (isDetectorChosen && isDetectorConnected && isCorrectDetector) || isDev;

  const isDetectorProgramComplete = useSelector((state) => selectIsDetectorProgramComplete(state, { tabId: activeTab }));
  /* const {hasMissing: hasPumpsMismatch} = useSelector(selectAreAllPumpsChosen) */

  const isDetectorInitializing = useSelector(selectDetectorInitializingProgress) != null;
 
  const isStartAvailable = checkStartAvailable(activeTab, isStreaming, isDetectorReady, isDetectorProgramComplete, isDetectorInitializing);

  useEffect(()=>{
    console.log({activeTab, isStreaming, isDetectorReady, isDetectorProgramComplete, isDetectorInitializing})
  },[isStartAvailable])

  const isStopDisabled = !(activeTab && isStreaming);
  const measurementType = api?.getPanel(activeTab)?.params?.measurementType;
  const isActiveMeasFinished = useSelector(selectIsActTabMeasurFinished);
  const measurementName = useSelector((state) => selectMeasurementName(state, activeTab));
  const autoSessionId = useSelector(selectAutoControlSessionId);

  const {
    showConfirmModal: showTernaryConfirmModal,
    message: ternaryMessage,
    labels: ternaryLabels,
    promptTernaryFork,
    handleConfirm: handleTernaryConfirm,
    handleDecline: handleTernaryDecline,
    handleCancel: handleTernaryCancel,
  } = useTernaryFork();

  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  const getErrorModalMessageContent = (measurementName, errorCodes) => {
    const errMessages = errorCodes.map((errorCode) => INVALID_MEAS_PARAMS_MESSAGES[errorCode]);
    const fixMessages = errorCodes.map((errorCodes) => INVALID_MEAS_PARAMS_FIX_MESSAGES[errorCodes]);
    return (
      <>
        <p className="fw-bold">
          Параметры измерения
          {measurementName && `"${measurementName}"`}
          {' '}
          недопустимы при текущих подключенных узлах:
        </p>
        <ul className="mb-3">
          {errMessages.map((message, index) => (<li key={index}>{message}</li>))}
        </ul>
        <p className="fw-bold">Запустить, отключив недопустимые параметры?</p>
        <ul>
          {fixMessages.map((message, index) => (<li key={index}>{message}</li>))}
        </ul>
      </>
    );
  };

  const startMeasurement = async ({ sampleName, isWritingBaseline }) => {
    let onErrors = null;

    if (measurementType === 'chroma') {
      if (isActiveMeasFinished) {
        const result = await promptTernaryFork({
          message: `Сохранить изменения ${measurementName ? `в ${measurementName}` : ''} перед перезаписью?`,
          acceptLabel: 'Сохранить',
          declineLabel: 'Не сохранять',
          cancelLabel: 'Отмена',
        });

        if (result === 'cancel') return;

        if (result === 'accept' || result === 'decline') {
          await dispatch(closeChromaWithApiCall({
            measurementId: activeTab,
            needsToSave: result === 'accept',
            alteredData: null,
            removeStoreEnrty: false,
            wipeName: true,
          }));
        }
      }

      onErrors = async ({ errors }) => await promptConfirm(
        getErrorModalMessageContent(null, errors),
      );
    }

    console.log('measurementType on start', measurementType);
    dispatch(startMeasurementOnActive({
      measurementType, sampleName, isWritingBaseline, onErrors,
    }));
  };

  const handleSubmitModal = (sampleName, isWritingBaseline) => {
    startMeasurement({ sampleName, isWritingBaseline });
  };

  const handleStop = async () => {
    if (autoSessionId) {
      dispatch(handleAutoMeasurementStopped(autoSessionId));
    } else if (measurementType === MEASUREMENT_TYPES.chroma) {
      dispatch(stopChromaWithApiCall());
    } else if (measurementType === MEASUREMENT_TYPES.spectro) {
      dispatch(stopSpectroWithApiCall());
    } else {
      console.error(`No measurementType for ${activeTab} for stop handler`);
    }
  };

  const [showModal, setShowModal] = useState(false);

  const handleStartClick = () => {
    if (measurementType === MEASUREMENT_TYPES.chroma) {
      setShowModal(true);
    } else if (measurementType === MEASUREMENT_TYPES.spectro) {
      startMeasurement({ sampleName: null, isWritingBaseline: false });
    }
  };
  const handleCloseModal = () => setShowModal(false);

  return (
    <>
      <TernaryForkModal
        show={showTernaryConfirmModal}
        message={ternaryMessage}
        labels={ternaryLabels}
        onConfirm={handleTernaryConfirm}
        onDecline={handleTernaryDecline}
        onCancel={handleTernaryCancel}
      />

      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <SampleNameModal show={showModal} panelId={activeTab} onSubmit={handleSubmitModal} onClose={handleCloseModal} />
      <ButtonGroup className={`me-1 ${styles.controlPanel}`}>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleStartClick}
          className={styles.btnCustom}
          disabled={!isStartAvailable}
        >
          <StartSvg className={styles.icon} />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleStop} className={styles.btnCustom} disabled={isStopDisabled}>
          <StopSvg className={styles.icon} />
        </Button>
      </ButtonGroup>
    </>
  );
}

export default StartStopControl;
