import { Form, Row, Col } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './AdditionalStep.module.css';
import { selectAdditionalStepRaw, selectAdditionalStepValid, selectEffectiveDetectorType, stepActions } from '../../../../../services/reduxImportDispatcher';
import { normalizeDecimalInput } from '../../../../../utils/validation';
import { INVALID_FORMAT } from '../../../../../constants/constants';
import { floatSetter } from '../../../../../utils/setters';
import { detectorProgramThunks } from '../../../../../services/thunks/detectorAwareBranched/detectorAwareStateThunks';

function AdditionalStep({ tabId, isRedacting }) {
  const dispatch = useDispatch();

  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, tabId ));
  
  const rawStep = useSelector((state) => selectAdditionalStepRaw(state, tabId));
  const { maxDuration: rawMax, window: rawWindow, threshold: rawThreshold } = rawStep;

  const validStep = useSelector((state) => selectAdditionalStepValid(state, tabId));

  const [maxDuration, setMaxDuration] = useState(rawMax);
  const [windowVal, setWindowVal] = useState(rawWindow);
  const [threshold, setThreshold] = useState(rawThreshold);

  useEffect(() => {
    setMaxDuration(rawMax);
    setWindowVal(rawWindow);
    setThreshold(rawThreshold);
  }, [rawMax, rawWindow, rawThreshold, tabId]);

  const localSetters = {
    maxDuration: setMaxDuration,
    window: setWindowVal,
    threshold: setThreshold,
  };

  const rangesMap = {
    maxDuration: [3, 1, 0, 9999],
    window: [3, 1, 0, 9999],
    threshold: [3, 1, 0, 9999],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const normalized = normalizeDecimalInput(value);
    console.log(value, 'Normalized value:', normalized);

    const result = floatSetter({
      name,
      value: normalized,
      rangesMap,
      setterDispatch: localSetters,
      formatConfig: {
        ifEmptyNull: true,
        ifInvalidFormatNull: false,
      },
    });

    // INVALID_FORMAT → ничего не делаем
    if (result === INVALID_FORMAT) {

    }
  };

  const handleFocusEnableEdit = () => {
    if (!isRedacting) {
      dispatch(detectorProgramThunks.setReadacting({ detectorType, tabId, value: true }));
    }
  };

  const commit = () => {
    if (
      rawMax !== maxDuration
      || rawWindow !== windowVal
      || rawThreshold !== threshold
    ) {
      console.log('commit')
      dispatch(
        stepActions.setAdditionalStep({ // only lumex detector have so it is fine to call in specific component not wraped
          tabId,
          maxDuration: maxDuration == null ? null : Number(maxDuration),
          window: windowVal == null ? null : Number(windowVal),
          threshold: threshold == null ? null : Number(threshold),
        }),
      );
    }
  };

  const isVisible = isRedacting || validStep;

  if (!isVisible) return null; // UI hidden, but effects and sync logic still alive

  return (
    <div className="border rounded p-2 mt-2">
      <div style={{ fontSize: '12px' }} className="fw-bold mb-2">
        Дополнительный этап
        {isRedacting ? (
          <span className="ms-1 text-info">(редактируется)</span>
        ) : (
          validStep && <span className="ms-1 text-success">(активен)</span>
        )}
      </div>
      <Form style={{ fontSize: '12px' }}>
        <Row className="align-items-center gy-2">
          <Col xs="auto" className="d-flex align-items-center">
            <Form.Label className="mb-0 me-2">Макс. длительность</Form.Label>
            <Form.Control
              className={styles.noSpinner}
              size="sm"
              min="0"
              style={{ width: '70px' }}
              name="maxDuration"
              value={maxDuration ?? ''}
              onChange={handleChange}
              onFocus={handleFocusEnableEdit}
              onBlur={commit}
            />
            <span className="ms-1">мин.</span>
          </Col>

          <Col xs="auto" className="d-flex align-items-center">
            <Form.Label className="mb-0 me-2">Окно</Form.Label>
            <Form.Control
              className={styles.noSpinner}
              size="sm"
              min="0"
              style={{ width: '70px' }}
              name="window"
              value={windowVal ?? ''}
              onChange={handleChange}
              onFocus={handleFocusEnableEdit}
              onBlur={commit}
            />
            <span className="ms-1">мин.</span>
          </Col>

          <Col xs="auto" className="d-flex align-items-center">
            <Form.Label className="mb-0 me-2">Порог</Form.Label>
            <Form.Control
              className={styles.noSpinner}
              size="sm"
              min="0"
              style={{ width: '70px' }}
              name="threshold"
              value={threshold ?? ''}
              onChange={handleChange}
              onFocus={handleFocusEnableEdit}
              onBlur={commit}
            />
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default AdditionalStep;
