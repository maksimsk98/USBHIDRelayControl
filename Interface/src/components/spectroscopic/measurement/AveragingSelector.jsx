import React, { useCallback, useMemo } from 'react';
import { InputGroup } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSpectroAveragingValue,
  spectroStepsActions,
  selectStreamedMeasurementId,
} from '../../../services/reduxImportDispatcher';
import { DETECTOR_TYPES } from '../../../constants/constants';
import CustomSelectGroup from '../../custom/CustomSelectGroup';

function AveragingSelector({ tabId, detectorType }) {
  const dispatch = useDispatch();

  const averaging = useSelector((s) => selectSpectroAveragingValue(s, tabId));
  const streamedId = useSelector(selectStreamedMeasurementId);

  const isRunning = streamedId === tabId;

  const { rawOptions, unit, paramName } = useMemo(() => {
    const isPanorama = detectorType === DETECTOR_TYPES.PANORAMA
      || detectorType === DETECTOR_TYPES.PANORAMA2;

    return isPanorama
      ? {
        rawOptions: ['(1)', '1', '5', '10', '25', '50'].map((v) => ({ label: v, value: v })),
        unit: 'вспышек',
        paramName: 'averagingFlashes',
      }
      : {
        rawOptions: ['(0.01)', '0.1', '0.5', '1.0', '2.0', '5.0'].map((v) => ({ label: v, value: v })),
        unit: 'сек.',
        paramName: 'averagingTime',
      };
  }, [detectorType]);

  const handleChange = useCallback(
    (e) => {
      const { value } = e.target;

      dispatch(
        spectroStepsActions.updateSpectroParam({
          tabId,
          name: paramName,
          value,
        }),
      );
    },
    [dispatch, tabId, paramName],
  );

  const labelStyle = { minWidth: '100px', whiteSpace: 'nowrap' };

  return (
    <CustomSelectGroup
      label="Усреднение:"
      name="averaging"
      rawOptions={rawOptions}
      value={averaging ?? rawOptions[0]?.value}
      onChange={handleChange}
      size="sm"
      labelStyle={labelStyle}
      siblings={[{ node: <InputGroup.Text key="unit">{unit}</InputGroup.Text>, side: 'right' }]}
      disabled={isRunning}
    />
  );
}

export default AveragingSelector;
