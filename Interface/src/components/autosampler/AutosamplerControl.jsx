import {
  Button, Card, CardBody, CardFooter, CardHeader, Col, Row,
} from 'react-bootstrap';

import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import InjectionTable from './InjectionTable';
import LabeledProgressBar from '../custom/CustomLabeledProgress';
import CustomInputGroup from '../custom/CustomInputGroup';
import CustomCheckboxGroup from '../custom/CustomCheckboxGroup';
import {
  selectActiveAutoStep, selectAutoControlProgram, selectCurrentInjection, selectFilteredAutoProgram, selectIsAutoControlOn, selectIsAutosamplerBusy, selectIsAutosamplerConnected,
  selectLocalAutoMode,
} from '../../services/selectors/autosampler/autosamplerBase';
import { switchAutoControlState, updateAutoControlProgram } from '../../services/thunks/autosampler/autosamplerThunk';
import {
  autosamplerActions, selectDetectorInitializingProgress, selectDetectorType, selectIsDetectorConnected, selectNodesIsLoading,
} from '../../services/reduxImportDispatcher';
import { filterValidProgramSteps, getEmptyControlRow } from '../../utils/autoSampler';
import { selectStreamedIdAndMode } from '../../services/selectors/selectStreamedIdAndMode';
import { AUTOSAMPLER_MODES } from '../../constants/constants';

function AutosamplerControl(props) {
  const activeStep = useSelector(selectActiveAutoStep);
  const currentInjection = useSelector(selectCurrentInjection);

  const chosenDetector = useSelector(selectDetectorType);
  const isDetectorChosen = !!chosenDetector;
  const isDetectorConnected = useSelector(selectIsDetectorConnected);
  const isDetectorInitializing = useSelector(selectDetectorInitializingProgress) != null;
  const isDetectorReady = (isDetectorChosen && isDetectorConnected && !isDetectorInitializing) || false;
  const autoSamplerMode = useSelector(selectLocalAutoMode);

  const dispatch = useDispatch();

  const storedProgramSteps = useSelector(selectAutoControlProgram);

  const isOn = useSelector(selectIsAutoControlOn);

  const isNodesUpdating = useSelector(selectNodesIsLoading);

  const isAutosamplerConnected = useSelector(selectIsAutosamplerConnected);
  const isAutosamplerBusy = useSelector(selectIsAutosamplerBusy);

  const [rows, setRows] = useState(storedProgramSteps);
  const [hideUnused, setHideUnused] = useState(false);

  useEffect(() => {
    console.log('stored rows', storedProgramSteps);
    setRows(storedProgramSteps);
  }, [storedProgramSteps]);

  useEffect(() => {
    if (isNodesUpdating) handleControlUpdate(); // push to redux so localy preset program can be processed and adjusted
  }, [isNodesUpdating]);

  const isEqualProgram = isEqual(storedProgramSteps, rows);

  const handleRowChange = useCallback((rowIdx, field, value) => {
    setRows((oldRows) => {
      const next = [...oldRows];
      const valueToAssign = value;
      next[rowIdx] = { ...next[rowIdx], [field]: valueToAssign };
      return next;
    });
  }, [setRows]);

  const clearRow = useCallback((vialIndex) => setRows((prev) => prev.map((row, rowIndex) => {
    if (rowIndex === vialIndex) return getEmptyControlRow(vialIndex);
    return row;
  })), [setRows]);

  const handleClear = useCallback(() => {
    dispatch(autosamplerActions.setClearSteps());
  }, [dispatch]);

  const handleControlToggle = () => {
    const programSteps = rows;
    dispatch(switchAutoControlState({ switchTo: !isOn, params: { programSteps } }));
  };

  const handleControlUpdate = () => {
    const newProgramSteps = rows;
    dispatch(updateAutoControlProgram({ params: { programSteps: newProgramSteps } }));
  };

  const { mode } = useSelector(selectStreamedIdAndMode);

  const validStoredSteps = useSelector(selectFilteredAutoProgram);

  const isAutoRunning = mode === 'auto';

  const validLocalSteps = useMemo(() => filterValidProgramSteps(rows), [rows]);

  const isToggleAvailable = isOn
    ? true
    : isDetectorReady && isAutosamplerConnected && validLocalSteps?.length > 0;

  const isPermissiveMode = useMemo(() => autoSamplerMode === AUTOSAMPLER_MODES.NONE || autoSamplerMode === AUTOSAMPLER_MODES.AUTOSAMPLER_PROGRAM, [autoSamplerMode]);

  return (
    <Card style={{ width: '100%' }} className="mb-3">
      <CardHeader>
        <Row>
          <Col xs="auto">
            <p className="mb-1">Программа автосамплера</p>
          </Col>
          <Col>
            {
                isAutoRunning && (
                <LabeledProgressBar
                  now={activeStep + 1 ?? '-'} // array index to phys number
                  max={validStoredSteps?.length ?? '-'}
                  variant="success"
                  striped
                  animated
                  size="sm"
                  labelFormatter={(n, m) => `${n}/${m}`}
                  groupStyle={{ display: 'flex', alignItems: 'stretch', width: '100%' }}
                />
                )
            }
          </Col>
          <Col xs="auto">
            <CustomInputGroup
              label="Выполняется инжекция"
              inputStyle={{ width: '50px' }}
              size="sm"
              value={currentInjection ?? '-'}
              readOnly
            />
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="p-0">
        <InjectionTable hideUnused={hideUnused} rows={rows} onRowChange={handleRowChange} clearRow={clearRow} />
      </CardBody>
      <CardFooter className="d-flex gap-4">
        <Button
          onClick={handleControlToggle}
          variant="primary"
          active={isOn}
          style={{ width: '120px' }}
          disabled={!isToggleAvailable || isNodesUpdating || isAutosamplerBusy || !isPermissiveMode}
        >
          {isOn ? 'Выключить' : 'Включить'}
        </Button>

        <Button
          onClick={handleControlUpdate}
          variant="primary"
          style={{ width: '120px' }}
          disabled={!isOn || isEqualProgram || !validLocalSteps?.length || isAutosamplerBusy || !isPermissiveMode}
        >
          Обновить
        </Button>

        <Button
          onClick={handleClear}
          variant="primary"
          style={{ width: '120px' }}
          disabled={isOn}
        >
          Сброс
        </Button>

        <CustomCheckboxGroup
          label="Скрыть незадействованные виалы"
          onChange={(e) => setHideUnused(e.target.checked)}
          checked={hideUnused}
          groupClassName="mb-2"
        />
      </CardFooter>
    </Card>

  );
}

export default AutosamplerControl;
