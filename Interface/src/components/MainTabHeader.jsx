import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectActiveTab, selectMeasurementProgress, selectStreamedMeasurementId, selectTabMeasurementType, selectTabType, tabActions,
} from '../services/reduxImportDispatcher';

import CloseModal from './custom/CloseModal';

import CustomTabHeader from './CustomTabHeader';

import styles from './CustomTabHeader.module.css';
import { useCloseFlow } from '../hooks/useCloseFlow';
import { usePermissions } from '../hooks/usePermissions';

const getTabClass = (tabType, tabMeasurementType, isActive) => {
  if (tabType === 'calibration') return isActive ? styles.calibActive : styles.calibInactive;
  if (tabMeasurementType === 'chroma') return isActive ? styles.chromaActive : styles.chromaInactive;
  if (tabMeasurementType === 'spectro') return isActive ? styles.spectroActive : styles.spectroInactive;
  if (tabType === 'package') return isActive ? styles.packageActive : styles.packageInactive;
};

function MainTabHeader(props) {
  const { api: panelAPI } = props;
  const { id: tabId } = panelAPI;
  const { containerApi } = props;
  const dispatch = useDispatch();

  const [title, setTitle] = useState(panelAPI.panel.title);
  useEffect(() => {
    const disposable = panelAPI.onDidTitleChange(() => {
      setTitle(panelAPI.panel.title);
    });

    return () => disposable.dispose();
  }, [panelAPI]);

  const activeTab = useSelector(selectActiveTab);
  const isActive = activeTab === tabId;
  const tabType = useSelector((state) => selectTabType(state, tabId));
  const tabMeasurementType = useSelector((state) => selectTabMeasurementType(state, tabId));
  const progressPercentage = useSelector((state) => selectMeasurementProgress(state, tabId));

  const { hasPermissionForAction } = usePermissions();
  const canCreateMethod = hasPermissionForAction('createMethod');

  const streamedId = useSelector(selectStreamedMeasurementId);

  const isThisStreaming = tabId === streamedId;

  const customTabRef = useRef(null); // lift ref to MainTabHeader

  const closeFlow = useCloseFlow({
    tabId,
    panelAPI,
    containerApi,
    dispatch,

    canCreateMethod,
  });

  const handleClose = closeFlow.start;

  useEffect(() => {
    dispatch(tabActions.registerCloseHandler({ tabId, handler: handleClose }));

    return () => {
      dispatch(tabActions.unregisterCloseHandler(tabId));
    };
  }, [dispatch, tabId, panelAPI, handleClose]);

  return (
    <>
      <CustomTabHeader
        ref={customTabRef}
        api={panelAPI}
        title={title}
        className={`${props.className || ''} ${getTabClass(tabType, tabMeasurementType, isActive)}`}
        closeHandler={closeFlow.start}
        style={{ '--progress': `${progressPercentage ?? 0}%` }} // Scoped progress per tab
        showProgress={isThisStreaming}
      />

      {closeFlow.currentStep?.type === 'prompt' && (
        <CloseModal
          show
          title={closeFlow.currentStep.modal.title}
          body={closeFlow.currentStep.modal.body}
          primaryLabel={closeFlow.currentStep.modal.primaryLabel}
          secondaryLabel={closeFlow.currentStep.modal.secondaryLabel}
          handlePrimaryAction={() => closeFlow.advance('confirm')}
          handleSecondaryAction={() => closeFlow.advance('cancel')}
          handleHide={closeFlow.reset}
        />
      )}
    </>
  );
}

export default MainTabHeader;
