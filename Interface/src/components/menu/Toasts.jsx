import React, { useEffect, useMemo, useState } from 'react';
import { Toast } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import Draggable from 'react-draggable';
import { MEASUREMENT_STATUSES, TOAST_MESSAGES } from '../../constants/constants';
import { errorsActions, selectIsBackendOnline } from '../../services/reduxImportDispatcher';
import { passPressedButtonToStart } from '../../services/thunks/measurement/measurementThunks';
import { selectErrors } from '../../services/selectors/errors/errorsBase';
import { ERROR_MESSAGES } from '../../constants/errorMessages';
import { selectStreamedIdAndMode } from '../../services/selectors/selectStreamedIdAndMode';

// Fixed height for each toast (in pixels) and margin between them.
const TOAST_BODY_HEIGHT = 120;
const TOAST_REST_HEIGHT = 50;
const TOAST_MARGIN = 20;

export function CustomToast({
  show, onClose, header, body, draggableId, defaultPosition,
}) {
  const toggleGlobalAndSpecificPointerEvents = (disable, specificClass) => {
    // Toggle global pointer events
    const globalContainer = document.getElementById('working-area');
    if (globalContainer) {
      globalContainer.style.pointerEvents = disable ? 'none' : 'auto';
    }

    // Toggle specific class pointer events
    if (specificClass) {
      const specificElements = document.querySelectorAll(`.${specificClass}`);
      specificElements.forEach((element) => {
        element.style.pointerEvents = disable ? 'none' : 'auto';
      });
    }
  };

  return (
    <Draggable
      bounds="parent"
      defaultPosition={defaultPosition}
      handle=".toast-header"
      onDrag={(e) => e.stopPropagation()}
      onStart={() => toggleGlobalAndSpecificPointerEvents(true, 'sash')} // Disable pointer events for interfering areas
      onStop={() => toggleGlobalAndSpecificPointerEvents(false, 'sash')} // Re-enable pointer events
    >
      <div
        id={draggableId}
        style={{
          position: 'fixed', // Ensure it doesn't affect layout
          zIndex: 1050, // Ensure it's above other elements
        }}
      >
        <Toast show={show} onClose={onClose}>
          <Toast.Header>
            <p className="me-auto">{header}</p>
          </Toast.Header>
          <Toast.Body style={{ height: TOAST_BODY_HEIGHT, overflow: 'auto' }}>
            {body}
          </Toast.Body>
        </Toast>
      </div>
    </Draggable>
  );
}

const manualMeasToastConfig = {
  [MEASUREMENT_STATUSES.AWAITING_BACKEND]: TOAST_MESSAGES.AWAITING_BACKEND,
  [MEASUREMENT_STATUSES.PRESTART]: TOAST_MESSAGES.PRESTART,
  [MEASUREMENT_STATUSES.PREPARE_PUMP]: TOAST_MESSAGES.PREPARE_PUMP,
  [MEASUREMENT_STATUSES.PREPARE_THERMO]: TOAST_MESSAGES.PREPARE_THERMO,
};

const autoMeasToastConfig = {
  [MEASUREMENT_STATUSES.AWAITING_BACKEND]: TOAST_MESSAGES.AWAITING_BACKEND,
  [MEASUREMENT_STATUSES.PRESTART]: TOAST_MESSAGES.AUTO_PRESTART,
  [MEASUREMENT_STATUSES.PREPARE_PUMP]: TOAST_MESSAGES.PREPARE_PUMP,
  [MEASUREMENT_STATUSES.PREPARE_THERMO]: TOAST_MESSAGES.PREPARE_THERMO,
};

const postStreamStatusesConfig = {
  [MEASUREMENT_STATUSES.MEASUREMENT_FINISHED]: TOAST_MESSAGES.MEASUREMENT_FINISHED,
};

function Toasts() {
  const dispatch = useDispatch();
  const measurementStatus = useSelector(
    (state) => state.measurementReducer.measurementStatus,
  );
  const isBackendOnline = useSelector(selectIsBackendOnline);
  const errors = useSelector(selectErrors);
  const { streamedId, mode } = useSelector(selectStreamedIdAndMode);

  const [activeStatusToast, setActiveStatusToast] = useState(null); // Mutually exclusive toast

  const handleStartMeasurementClick = () => {
    dispatch(passPressedButtonToStart());
    setActiveStatusToast(null);
  };

  // Configuration for mutually exclusive toasts
  const STATUS_TOAST_CONFIG = useMemo(() => {
    if (mode === 'auto') return autoMeasToastConfig;
    if (mode === 'manual') return manualMeasToastConfig;
    return postStreamStatusesConfig;
  }, [mode]);

  // Helper function to format an error object into a message string
  const formatErrorBody = (error) => {
    const parts = [];
    if (error.device) parts.push(ERROR_MESSAGES[error.device]);
    if (error.faultyUnit) parts.push(ERROR_MESSAGES[error.faultyUnit]);
    if (error.issue) parts.push(ERROR_MESSAGES[error.issue]);
    if (error.errorLogFile) parts.push(`Путь до лог файла: ${error.errorLogFile}.`);
    if (error.message) {
      parts.push(error.message);
    } else if (error.issue != null) {
      parts.push(`Код ошибки: ${error.issue} ${error.device ? `код прибора: ${error.device}` : ''} ${error.faultyUnit ? `код элемента прибора: ${error.faultyUnit}` : ''}`);
    }
    if (error.count && error.count > 1) parts.push(`(Количество возникновений ${error.count}).`);

    // Return each part on its own line using a <div> for separation.
    return parts.map((line, index) => <div key={index}>{line}</div>);
  };

  useEffect(() => {
    // Update the mutually exclusive toast based on measurement status
    let timer = null;
    if (STATUS_TOAST_CONFIG[measurementStatus]) {
      setActiveStatusToast(measurementStatus);
      if (measurementStatus === MEASUREMENT_STATUSES.MEASUREMENT_FINISHED) {
        timer = setTimeout(() => setActiveStatusToast(null), 3000);
      }
    } else {
      setActiveStatusToast(null);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [measurementStatus, STATUS_TOAST_CONFIG]);

  useEffect(() => {
    if (isBackendOnline === false) {
      dispatch(
        errorsActions.addError({
          errorId: -1,
          fetchedError: {
          // No numeric fields provided so key will be based on message (or default to empty values)
            message: 'Связь с модулем приборов потеряна',
          },
        }),
      );
    }
  }, [isBackendOnline, dispatch]);

  return (
    <>
      {activeStatusToast && (() => {
        const header = STATUS_TOAST_CONFIG[activeStatusToast]?.HEADER;
        const baseBody = STATUS_TOAST_CONFIG[activeStatusToast]?.BODY;
        const statusBody = activeStatusToast === MEASUREMENT_STATUSES.PRESTART && mode === 'manual' ? (
          <div>
            {baseBody}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-primary" onClick={handleStartMeasurementClick}>Начать измерение</button>
            </div>
          </div>
        ) : baseBody;

        return (
          <CustomToast
            show
            onClose={() => setActiveStatusToast(null)}
            header={header}
            body={statusBody}
            draggableId={`status-toast-${activeStatusToast}`}
            defaultPosition={{ x: window.innerWidth / 2 - 150, y: 50 }}
          />
        );
      })()}

      {Object.entries(errors).map(([key, errorObj], index) => {
        const body = formatErrorBody(errorObj);
        if (!body.length) return null;

        const y = window.innerHeight - (index + 1) * (TOAST_REST_HEIGHT + TOAST_BODY_HEIGHT + TOAST_MARGIN);
        // adjust on when too much added and no more vertical space available
        const adjustedY = (y - TOAST_REST_HEIGHT - TOAST_BODY_HEIGHT) < 0
          ? 0
          : y;
        return (
          <CustomToast
            key={key}
            show
            onClose={() => dispatch(errorsActions.removeError(key))}
            header="Ошибка"
            body={body}
            draggableId={`error-toast-${index}`}
            defaultPosition={{
              x: 0, // Fixed near the left edge
              y: adjustedY, // Stack upward from the bottom
            }}
          />
        );
      })}
    </>
  );
}

export default Toasts;
