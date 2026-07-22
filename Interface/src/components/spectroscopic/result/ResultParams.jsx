import { useCallback } from 'react';
import { Form } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import ResultOptionsOverlay from './ResultOptionsOverlay';
import {
  selectSpectroFactor, selectSpectroHasScaling, selectSpectroHasSmoothing, selectSpectroSelectedBackgroundIndex, selectSpectroThreshold,
} from '../../../services/selectors/spectroMisc/spectroMiscBase';
import { changeSpectroBackgroundThunk, changeSpectroScalingThunk, changeSpectroSmoothingThunk } from '../../../services/thunks/spectroMisc/spectroMiscThunks';
import { selectIsTabInitialized, selectSpectroTraceCountById, selectEffectiveDetectorType } from '../../../services/reduxImportDispatcher';
import { buildLetterOptions } from '../../../utils/indexes';
import CustomSelectGroup from '../../custom/CustomSelectGroup';
import { DETECTOR_TYPES } from '../../../constants/constants';

function ResultParams({ tabId }) {
  const dispatch = useDispatch();

  const isInitialized = useSelector((state) => selectIsTabInitialized(state, tabId));
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, tabId ));

  const hasBG = detectorType === DETECTOR_TYPES.SPHDETECTOR || detectorType === DETECTOR_TYPES.SPHDETECTOR2;

  const storedThreshold = useSelector((state) => selectSpectroThreshold(state, tabId));
  const storedFactor = useSelector((state) => selectSpectroFactor(state, tabId));

  const hasSmoothing = useSelector((state) => selectSpectroHasSmoothing(state, tabId));

  const hasScaling = useSelector((state) => selectSpectroHasScaling(state, tabId));

  const traceCount = useSelector((state) => selectSpectroTraceCountById(state, tabId));

  const bgIndex = useSelector((state) => selectSpectroSelectedBackgroundIndex(state, tabId));

  const options = buildLetterOptions(traceCount);

  const handleSmoothingChange = useCallback((e) => {
    const { checked } = e.target;

    dispatch(
      changeSpectroSmoothingThunk({
        tabId,
        isChecked: checked,
        threshold: storedThreshold,
        factor: storedFactor,
      }),
    );
  }, [tabId, storedThreshold, storedFactor]);

  const handleScalingChange = useCallback((e) => {
    const { checked } = e.target;

    dispatch(
      changeSpectroScalingThunk({
        tabId,
        isChecked: checked,
      }),
    );
  }, [tabId]);

  const handleChangeBgIndex = (e) => {
    const value = e.target.value === '' ? null : Number(e.target.value);
    dispatch(changeSpectroBackgroundThunk({ tabId, index: value }));
  };

  return (
    <div className="border border-secondary-subtle rounded p-2" style={{ width: 'fit-content' }}>
      <Form.Check
        type="checkbox"
        label="Сглаживание"
        name="smoothing"
        size="sm"
        checked={hasSmoothing}
        onChange={handleSmoothingChange}
        disabled={!isInitialized}
      />

      <Form.Check
        type="checkbox"
        label="Масштабирование"
        name="scaling"
        size="sm"
        checked={hasScaling}
        onChange={handleScalingChange}
        disabled={!isInitialized}
      />

      {hasBG && isInitialized && (
      <CustomSelectGroup
        label="Спектр фона"
        size="sm"
        rawOptions={options}
        name="selectedBackgroundIndex"
        value={bgIndex ?? ''}
        onChange={handleChangeBgIndex}
        labelStyle={{ width: 'fit-content' }}
        selectStyle={{ width: '100px' }}
        groupStyle={{ flexWrap: 'nowrap', width: 'fit-content' }}
      />
      )}

      <ResultOptionsOverlay tabId={tabId} disabled={!isInitialized || !hasSmoothing} hasSmoothing={hasSmoothing} />
    </div>
  );
}

export default ResultParams;
