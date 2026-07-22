// components/spectro/CorrectionSelector.jsx
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsTabInitialized, selectSpectroDetParams, selectSpectroPending, spectroStepsActions,
} from '../../../services/reduxImportDispatcher';
import { CORRECTION_MAP } from '../../../constants/stepFields';
import CustomSelectGroup from '../../custom/CustomSelectGroup';
import { changeSpectroCorrectionThunk } from '../../../services/thunks/spectroSteps/spectroStepsThunks';

function CorrectionSelector({ tabId }) {
  const dispatch = useDispatch();

  const isInitialized = useSelector((state) => selectIsTabInitialized(state, tabId));
  const isPending = useSelector(
    (state) => selectSpectroPending(state, tabId, 'changeCorrection'),
  );

  const params = useSelector((state) => selectSpectroDetParams(state, tabId));

  const { rawOptions, paramName, currentValue } = useMemo(() => {
    const paramName = 'correction';
    const rawOptions = Object.entries(CORRECTION_MAP).map(([value, label]) => ({
      value,
      label,
    }));
    const currentValue = params?.[paramName] ?? null;
    return { rawOptions, paramName, currentValue };
  }, [params]);

  const handleChange = useCallback(
    (e) => {
      const { value } = e.target;

      if (isInitialized) {
        dispatch(
          changeSpectroCorrectionThunk({
            tabId,
            correction: value,
          }),
        );
      } else {
        dispatch(
          spectroStepsActions.updateSpectroParam({
            tabId,
            name: 'correction',
            value,
          }),
        );
      }
    },
    [dispatch, tabId, isInitialized],
  );

  const labelStyle = { minWidth: '100px', whiteSpace: 'nowrap' };

  return (
    <CustomSelectGroup
      label="Коррекция:"
      name="correction"
      rawOptions={rawOptions}
      value={currentValue ?? rawOptions[0]?.value} // по умолчанию: "полная"
      onChange={handleChange}
      size="sm"
      labelStyle={labelStyle}
      selectStyle={{ width: '10rem' }}
      disabled={isPending}
    />
  );
}

export default CorrectionSelector;
