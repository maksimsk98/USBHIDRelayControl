import { useMemo } from 'react';
import { clampingBlur, intSetter } from '../../../../utils/setters';
import CustomIncrementInput from '../../../custom/CustomIncrementInput';
import CustomSelectGroup from '../../../custom/CustomSelectGroup';

const rangesMap = {
  shift: [3, 0, 100],
};

function ViewSettingsPanel({
  shiftY, setShiftY, timeUnit, setTimeUnit, siblings,
}) {
  const setterDispatch = useMemo(() => ({
    shift: setShiftY,
  }), [setShiftY]);

  const handleShiftChange = (e) => {
    const { name, value } = e.target;

    intSetter({
      name,
      value,
      rangesMap,
      setterDispatch,
      config: {
        isSetAsNum: true,
      },
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    clampingBlur({
      name,
      value,
      rangesMap,
      setterDispatch,
      returnAs: 'num',
    });
  };

  return (
    <fieldset className="border border-secondary-subtle rounded p-2">
      <legend className="w-auto" style={{ fontSize: '1rem' }}>Вид</legend>

      {/* Сдвиг */}
      <CustomIncrementInput
        value={shiftY}
        name="shift"
        step={1}
        min={rangesMap.shift[1]}
        max={rangesMap.shift[2]}
        onChange={handleShiftChange}
        onBlur={handleBlur}
        unit="%"
        integer // ← enables the safe integer handlers + arrows
        size="sm"
        label="Сдвиг"

        labelStyle={{ minWidth: '100px' }}
        unitStyle={{ width: '35px' }}
        inputStyle={{ width: '65px' }}
      />

      {/* Ед. времени */}
      <CustomSelectGroup
        label="Ед. времени"
        name="timeUnit"
        value={timeUnit}
        onChange={(e) => setTimeUnit(e.target.value)}
        rawOptions={[
          { value: 'min', label: 'мин.' },
          { value: 'sec', label: 'сек.' },
        ]}
        size="sm"
        selectStyle={{ width: '100px' }}
        labelStyle={{ minWidth: '100px' }}
      />

      {siblings}

    </fieldset>
  );
}

export default ViewSettingsPanel;
