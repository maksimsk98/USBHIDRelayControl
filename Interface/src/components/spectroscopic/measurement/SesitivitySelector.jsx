import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSpectroDetParams,
  selectStreamedMeasurementId,
  spectroStepsActions,
} from '../../../services/reduxImportDispatcher';
import CustomSelectGroup from '../../custom/CustomSelectGroup';
import { SENSITIVITY_OPTIONS_PER_DET } from '../../../constants/stepFields';

function SensitivitySelector({ tabId }) {
  const dispatch = useDispatch();

  const params = useSelector((state) => selectSpectroDetParams(state, tabId));

  const streamedId = useSelector(selectStreamedMeasurementId);

  const isRunning = streamedId === tabId;

  const { rawOptions, paramName, currentValue } = useMemo(() => {
    const paramName = 'sensitivity';

    const rawOptions = SENSITIVITY_OPTIONS_PER_DET.PANORAMA2;

    const currentValue = params?.[paramName] ?? null;

    return { rawOptions, paramName, currentValue };
  }, [params]);

  const handleChange = useCallback(
    (e) => {
      dispatch(
        spectroStepsActions.updateSpectroParam({
          tabId,
          name: paramName,
          value: e.target.value,
        }),
      );
    },
    [dispatch, tabId, paramName],
  );

  const labelStyle = { minWidth: '136px', whiteSpace: 'nowrap' };

  return (
    <CustomSelectGroup
      label="Чувствительность:"
      name="sensitivity"
      rawOptions={rawOptions}
      value={currentValue ?? rawOptions[0]?.value}
      onChange={handleChange}
      size="sm"
      labelStyle={labelStyle}
      disabled={isRunning}
    />
  );
}

export default SensitivitySelector;
