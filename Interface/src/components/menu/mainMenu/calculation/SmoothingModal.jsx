import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Card, Form, Modal, ModalBody, ModalFooter, ModalHeader, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import CustomCheckboxGroup from '../../../custom/CustomCheckboxGroup';
import CustomInputGroup from '../../../custom/CustomInputGroup';
import { normalizeDecimalInput } from '../../../../utils/validation';
import { updateSmoothingParamsThunk } from '../../../../services/thunks/chromaMisc/chromaMiscThunks';
import { selectSmoothingParamsById } from '../../../../services/selectors/chromaMisc/chromaMiscBase';
import { floatSetter, intSetter } from '../../../../utils/setters';
import OverlayTooltip from '../../../custom/OverlayTooltip';

function SmoothingModal({
  show, activeTab, onClose, noPost,
}) {
  const dispatch = useDispatch();

  const slidingWindowRef = useRef(null);
  const [showMedianTooltip, setShowMedianTooltip] = useState(false);

  const {
    isSmoothingPulseChecked: deleteImpulseCheckStored = true,
    isSmoothingAdaptiveChecked: adaptiveSmoothingCheckStored = true,
    isSmoothingCubicChecked: cubicSmoothingCheckStored = true,
    isSmoothingDoubleChecked: doubleCheckStored = false,
    smoothingFactor: factorStored = 1,
    smoothingWindow: windowStored = 5,
    smoothingMinLevel: thresholdStored = null,
    alternativeFilters: alterFilterStored = 'none',
    useDriftCompensation: driftCompensationCheckStored = false,
    driftFrom: driftFromStored = null,
    driftTo: driftToStored = null,
  } = useSelector((state) => selectSmoothingParamsById(state, activeTab));

  const [deleteImpulseCheck, setDeleteImpulseCheck] = useState(deleteImpulseCheckStored);
  const [adaptiveSmoothingCheck, setAdaptiveSmoothingCheck] = useState(adaptiveSmoothingCheckStored);
  const [threshold, setThreshold] = useState(thresholdStored);
  const [factor, setFactor] = useState(factorStored);
  const [cubicSmoothingCheck, setCubicSmoothingCheck] = useState(cubicSmoothingCheckStored);
  const [doubleCheck, setDoubleCheck] = useState(doubleCheckStored);
  const [window, setWindow] = useState(windowStored);
  const [slidingWindow, setSlidingWindow] = useState(windowStored);
  const [alterFilter, setAlterFilter] = useState(alterFilterStored);
  const [driftCompensationCheck, setDriftCompensationCheck] = useState(driftCompensationCheckStored);
  const [driftFrom, setDriftFrom] = useState(driftFromStored);
  const [driftTo, setDriftTo] = useState(driftToStored);

  const [isDriftRangeInvalid, setIsDriftRangeInvalid] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const validateDriftRange = () => {
    const invalid = driftCompensationCheck
            && driftFrom != null
            && driftTo != null
            && Number(driftTo) <= Number(driftFrom);

    setIsDriftRangeInvalid(invalid);

    if (invalid) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000); // auto-hide after 3s
    } else {
      setShowTooltip(false);
    }
  };

  const isAlter = alterFilter !== 'none';

  const resetLocalState = useCallback(() => {
    setDeleteImpulseCheck(deleteImpulseCheckStored);
    setAdaptiveSmoothingCheck(adaptiveSmoothingCheckStored);
    setThreshold(thresholdStored);
    setFactor(factorStored);
    setCubicSmoothingCheck(cubicSmoothingCheckStored);
    setDoubleCheck(doubleCheckStored);
    setWindow(windowStored);
    setAlterFilter(alterFilterStored);
    setDriftCompensationCheck(driftCompensationCheckStored);
    setDriftFrom(driftFromStored);
    setDriftTo(driftToStored);
  }, [
    deleteImpulseCheckStored,
    adaptiveSmoothingCheckStored,
    thresholdStored,
    factorStored,
    cubicSmoothingCheckStored,
    doubleCheckStored,
    windowStored,
    alterFilterStored,
    driftCompensationCheckStored,
    driftFromStored,
    driftToStored,
  ]);

  useEffect(() => {
    resetLocalState();
  }, [resetLocalState, show]);

  const handleChangeInputInteger = (event) => {
    const { name } = event.target;
    const value = normalizeDecimalInput(event);
    intSetter({
      name,
      value,
      rangesMap: {
        threshold: [1, null, null],
      },
      setterDispatch: {
        threshold: setThreshold,
      },
    });
  };

  const handleChangeInputFloat = (event) => {
    const { name } = event.target;
    const value = normalizeDecimalInput(event);

    floatSetter({
      name,
      value,
      rangesMap: {
        factor: [4, 1],
        window: [4, 1],
        slidingWindow: [4, 1],
        driftFrom: [10, 2],
        driftTo: [10, 2],
      },
      setterDispatch: {
        factor: setFactor,
        window: setWindow,
        slidingWindow: setSlidingWindow,
        driftFrom: setDriftFrom,
        driftTo: setDriftTo,
      },
      formatConfig: {
        ifEmptyNull: true,
        ifInvalidFormatNull: false,
      },
    });
  };

  const handleAlterChange = (event) => {
    const { value } = event.target;
    const resetOptions = ['slidingAvg', 'median'];
    if (resetOptions.includes(value)) {
      setAdaptiveSmoothingCheck(false);
      setCubicSmoothingCheck(false);
    }
    setAlterFilter(value);

    validateMedianWindow({ // if median selected, validate immediately
      alterFilter: value, 
      slidingWindow,
      onClamp: setSlidingWindow,
      onFeedback: () => setShowMedianTooltip(true),
    });
  };

  const handleSubmit = () => {
    const params = {
      isSmoothingPulseChecked: deleteImpulseCheck,
      isSmoothingAdaptiveChecked: adaptiveSmoothingCheck,
      isSmoothingCubicChecked: cubicSmoothingCheck,
      isSmoothingDoubleChecked: doubleCheck,
      smoothingFactor: factor == null ? null : Number(factor),
      // this is forced cringe, lagacy used one input for two different things, so api uses one also
      smoothingWindow: window == null
        ? null
        : Number(alterFilter === 'slidingAvg' ? slidingWindow : window),
      smoothingMinLevel: threshold == null ? null : Number(threshold),
      alternativeFilters: alterFilter,
      useDriftCompensation: driftCompensationCheck,
      driftFrom: driftFrom == null ? null : Number(driftFrom),
      driftTo: driftTo == null ? null : Number(driftTo),
    };
    dispatch(updateSmoothingParamsThunk({
      tabId: activeTab,
      params,
      noPost,
    }));

    onClose();
  };

  const handleCubicChange = (event) => {
    const value = event.target.checked;
    if (!value) setDoubleCheck(false);
    setCubicSmoothingCheck(value);
  };

  const validateMedianWindow = ({
    alterFilter,
    slidingWindow,
    onClamp,
    onFeedback,
  }) => {
    if (alterFilter !== 'median') return;

    if (slidingWindow == null) return;

    const v = Number(slidingWindow);
    if (v < 2) {
      onClamp?.('2');
      onFeedback?.();
    }
  };


  const handleSlidingWindowBlur = () => {
    validateMedianWindow({
      alterFilter,
      slidingWindow,
      onClamp: setSlidingWindow,
      onFeedback: () => setShowMedianTooltip(true),
    });
  };


  return (
    <Modal show={show} onHide={onClose}>
      <ModalHeader closeButton>
        <Modal.Title>Параметры фильтрации шума</Modal.Title>
      </ModalHeader>
      <ModalBody>
        <CustomCheckboxGroup
          label="Удаление импульсных помех"
          checked={deleteImpulseCheck}
          onChange={(e) => setDeleteImpulseCheck(e.target.checked)}
          size="sm"
        />
        <Card>
          <Card.Body>
            <Card.Title>Сглаживание</Card.Title>
            <div className="d-flex justify-content-between">
              <div className="border border-secondary-subtle rounded p-2">
                <CustomCheckboxGroup
                  label="Адаптивное"
                  checked={adaptiveSmoothingCheck}
                  onChange={(e) => setAdaptiveSmoothingCheck(e.target.checked)}
                  size="sm"
                  labelStyle={{ width: '100px' }}
                  disabled={isAlter}
                />
                <CustomInputGroup
                  label="Порог"
                  value={threshold ?? ''}
                  name="threshold"
                  onChange={handleChangeInputInteger}
                  size="sm"
                  labelStyle={{ width: '70px' }}
                  disabled={!adaptiveSmoothingCheck || isAlter}
                />
                <CustomInputGroup
                  label="Фактор"
                  value={factor ?? ''}
                  name="factor"
                  onChange={handleChangeInputFloat}
                  size="sm"
                  groupClassName=""
                  labelStyle={{ width: '70px' }}
                  disabled={!adaptiveSmoothingCheck || isAlter}
                />
              </div>
              <div className="border border-secondary-subtle rounded p-2">

                <CustomCheckboxGroup
                  label="Кубическое"
                  checked={cubicSmoothingCheck}
                  onChange={handleCubicChange}
                  size="sm"
                  labelStyle={{ width: '100px' }}
                  disabled={isAlter}
                />
                <CustomCheckboxGroup
                  label="Двойное"
                  checked={doubleCheck}
                  onChange={(e) => setDoubleCheck(e.target.checked)}
                  size="sm"
                  labelStyle={{ width: '100px' }}
                  disabled={!cubicSmoothingCheck || isAlter}
                />
                <CustomInputGroup
                  label="Окно"
                  value={window ?? ''}
                  name="window"
                  onChange={handleChangeInputFloat}
                  size="sm"
                  groupClassName=""
                  labelStyle={{ width: '70px' }}
                  disabled={!cubicSmoothingCheck || isAlter}
                />
              </div>
            </div>

          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Card.Title>Альтернативные филтры</Card.Title>
            <div className="d-flex flex-column">
              <Form.Check
                inline
                type="radio"
                label="Не использовать"
                name="alterFilter"
                value="none"
                checked={alterFilter === 'none'}
                onChange={handleAlterChange}
              />

              <div className="d-flex justify-content-between">
                <Form.Check
                  inline
                  type="radio"
                  label="Скользящее среднее"
                  name="alterFilter"
                  value="slidingAvg"
                  checked={alterFilter === 'slidingAvg'}
                  onChange={handleAlterChange}
                />

                <CustomInputGroup
                  ref={slidingWindowRef}
                  label="Окно"
                  value={slidingWindow ?? ''}
                  name="slidingWindow"
                  onChange={handleChangeInputFloat}
                  onBlur={handleSlidingWindowBlur}
                  size="sm"
                  groupClassName=""
                  labelStyle={{ width: '70px' }}
                  disabled={alterFilter !== 'slidingAvg' && alterFilter !== 'median'}
                />

                {showMedianTooltip && (
                  <OverlayTooltip
                    message="Для медианного фильтра размер окна не может быть меньше 2"
                    targetRef={slidingWindowRef.current}
                    timeout={3000}
                    onTimeout={() => setShowMedianTooltip(false)}
                  />
                )}


              </div>

              <Form.Check
                inline
                type="radio"
                label="Медианный"
                name="alterFilter"
                value="median"
                checked={alterFilter === 'median'}
                onChange={handleAlterChange}
              />
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Card.Title>Компенсация дрейфа</Card.Title>
            <CustomCheckboxGroup
              label="Включить"
              checked={driftCompensationCheck}
              onChange={(e) => setDriftCompensationCheck(e.target.checked)}
              size="sm"
              labelStyle={{ width: '100px' }}
            />
            <CustomInputGroup
              label="От"
              value={driftFrom ?? ''}
              name="driftFrom"
              onChange={handleChangeInputFloat}
              onBlur={validateDriftRange}
              unit="мин"
              size="sm"
              labelStyle={{ width: '70px' }}
              unitStyle={{ width: '60px' }}
              disabled={!driftCompensationCheck}
              inputClassName={isDriftRangeInvalid ? 'bg-warning-subtle' : ''}
            />

            <OverlayTrigger
              placement="top"
              overlay={(
                <Tooltip id="driftToTooltip">
                  Значение "До" должно быть больше "От"
                                </Tooltip>
                              )}
              show={showTooltip}
            >
              <div style={{ width: 'fit-content' }}>
                <CustomInputGroup
                  label="До"
                  value={driftTo ?? ''}
                  name="driftTo"
                  onChange={handleChangeInputFloat}
                  onBlur={validateDriftRange}
                  unit="мин"
                  size="sm"
                  groupClassName=""
                  labelStyle={{ width: '70px' }}
                  unitStyle={{ width: '60px' }}
                  disabled={!driftCompensationCheck}
                  inputClassName={isDriftRangeInvalid ? 'bg-warning-subtle' : ''}
                />
              </div>
            </OverlayTrigger>

          </Card.Body>
        </Card>
      </ModalBody>
      <ModalFooter>
        <Button
          style={{ width: '100px' }}
          onClick={handleSubmit}
          disabled={isDriftRangeInvalid}
        >
          Ок
        </Button>
        <Button
          variant="secondary"
          style={{ width: '100px' }}
          onClick={onClose}
        >
          Отмена
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default SmoothingModal;
