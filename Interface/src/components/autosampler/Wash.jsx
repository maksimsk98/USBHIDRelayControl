import {
  Button, Card, CardBody, CardFooter, CardHeader,
} from 'react-bootstrap';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { isNumber } from 'lodash';
import CustomSelectGroup from '../custom/CustomSelectGroup';
import CustomIncrementInput from '../custom/CustomIncrementInput';
import { clampingBlur, intSetter } from '../../utils/setters';
import { switchWashState } from '../../services/thunks/autosampler/autosamplerThunk';
import {
  selectIsAutosamplerBusy, selectIsAutosamplerConnected, selectIsWashOn, selectLocalAutoMode, selectPostWashSolvents, selectPreWashSolvents, selectWashParams,
} from '../../services/selectors/autosampler/autosamplerBase';
import { selectAutosamplerType } from '../../services/reduxImportDispatcher';
import { AUTO_WASH_VOLUME_MAP, AUTOSAMPLER_MODES, AUTOSAMPLER_TYPES } from '../../constants/constants';
import { clampValue } from '../../utils/validation';

// [maxDigit, min, max]
const volumeRangeMap = {
  las: [2, ...AUTO_WASH_VOLUME_MAP.las],
  hta: [3, ...AUTO_WASH_VOLUME_MAP.hta],
  [AUTOSAMPLER_TYPES.as393]: [5, 0, 65535] 
};

function WashTab(props) {
  const dispatch = useDispatch();

  const autosamplerType = useSelector(selectAutosamplerType);
  const isOn = useSelector(selectIsWashOn);
  const storedParams = useSelector(selectWashParams);
  const preWashSolvents = useSelector(selectPreWashSolvents);
  const postWashSolvents = useSelector(selectPostWashSolvents);
  const isAutosamplerConnected = useSelector(selectIsAutosamplerConnected);
  const isAutosamplerBusy = useSelector(selectIsAutosamplerBusy);
  const autoSamplerMode = useSelector(selectLocalAutoMode);

  const [solvent, setSolvent] = useState('A');
  const [volume, setVolume] = useState(1); // внешняя поверхность иглы или объем it is not my idea 
  const [volumeInternal, setVolumeInternal] = useState(1); // внутренняя поверхность иглы
  const [washObject, setWashObject] = useState('waste');
  const [wasteVial, setWasteVial] = useState('W');

  const rangesMap = useMemo(() => ({
    volume: volumeRangeMap[autosamplerType],
    volumeInternal: volumeRangeMap[autosamplerType]  // TODO MSK needs to give them to me
  }), [autosamplerType]);

  useEffect(() => {
    // on detector change reclamp to keep in bounds
    const min = rangesMap.volume[1];
    const max = rangesMap.volume[2];
    if (!isNumber(min) || !isNumber(max)) return console.error('wrong wash range', min, max);
    const reclamp = clampValue(volume, min, max);
    setVolume(reclamp);
  }, [autosamplerType]);

  useEffect(() => {
    const {
      solvent, volume, volumeInternal, washObject, wasteVial,
    } = storedParams;
    setSolvent(solvent);
    setVolume(volume);
    setWashObject(washObject);
    setWasteVial(wasteVial);
  }, [storedParams]);

  const setterDispatch = useMemo(() => ({
    volume: setVolume,
    volumeInternal: setVolumeInternal,
  }), [setVolume, setVolumeInternal]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    intSetter({
      name,
      value,
      rangesMap,
      setterDispatch,
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

  const handleWashToggle = () => {
    const washParams = {
      solvent,
      volume,
      volumeInternal: autosamplerType === AUTOSAMPLER_TYPES.as393 ? volumeInternal : null, 
      washObject,
      wasteVial,
    };
    dispatch(switchWashState({ switchTo: !isOn, params: washParams }));
  };

  const labelsStyles = { width: '140px' };
  const valueStyles = { width: '140px' };
  const selectGroupsStyles = { flexWrap: 'nowrap', width: 'fit-content' };

  const isPermissiveMode = useMemo(() => autoSamplerMode === AUTOSAMPLER_MODES.NONE || autoSamplerMode === AUTOSAMPLER_MODES.WASH, [autoSamplerMode]);

  return (
    <Card>
      <CardHeader>Параметры промывки</CardHeader>
      <CardBody>
        <CustomSelectGroup
          label="Растворитель"
          rawOptions={preWashSolvents}
          value={solvent ?? ''}
          onChange={(e) => setSolvent(e.target.value)}
          size="sm"
          labelStyle={labelsStyles}
          selectStyle={valueStyles}
          groupStyle={selectGroupsStyles}
          disabled={isOn}
        />

        <CustomIncrementInput
          label={autosamplerType === AUTOSAMPLER_TYPES.as393 ? "Внешняя поверхность иглы, мкл" : "Объем"}
          value={volume ?? ''}
          name={"volume"}
          onChange={handleInputChange}
          onBlur={handleBlur}
          step={1}
          min={autosamplerType === AUTOSAMPLER_TYPES.as393 ? rangesMap?.volumeInternal?.[1] : rangesMap?.volume?.[1] ?? 1}
          max={autosamplerType === AUTOSAMPLER_TYPES.as393 ? rangesMap?.volumeInternal?.[2] : rangesMap?.volume?.[2] ?? 100}
          /* unitStyle={{width: '50px'}} */
          size="sm"
          labelStyle={autosamplerType === AUTOSAMPLER_TYPES.as393 ? {width: '250px'} : labelsStyles}
          inputStyle={autosamplerType === AUTOSAMPLER_TYPES.as393 ? {width: '80px'} : valueStyles}
          disabled={isOn}
          integer
        />

        {autosamplerType === AUTOSAMPLER_TYPES.as393 && <CustomIncrementInput
          label="Внутренняя поверхность иглы, мкл"
          value={volumeInternal ?? ''}
          /* unit={'мкл'} */
          name="volumeInternal"
          onChange={handleInputChange}
          onBlur={handleBlur}
          step={1}
          min={rangesMap?.volumeInternal?.[1] ?? 1}
          max={rangesMap?.volumeInternal?.[2] ?? 100}
          size="sm"
          labelStyle={{width: '250px'} }
          inputStyle={{width: '80px'}}
          /* unitStyle={{width: '50px'}} */
          disabled={isOn}
          integer
        />}
        <CustomSelectGroup
          label="Объект промывки"
          rawOptions={[
            { label: 'Отходы', value: 'waste' },
            { label: 'Петля', value: 'loop' },
            { label: 'Порт', value: 'port' },
          ]}
          value={washObject}
          onChange={(e) => setWashObject(e.target.value)}
          size="sm"
          labelStyle={labelsStyles}
          selectStyle={valueStyles}
          groupStyle={selectGroupsStyles}
          disabled={isOn}
        />
        <CustomSelectGroup
          label="Пробирка отходов"
          rawOptions={postWashSolvents}
          value={wasteVial ?? ''}
          onChange={(e) => setWasteVial(e.target.value)}
          size="sm"
          labelStyle={labelsStyles}
          selectStyle={valueStyles}
          groupStyle={selectGroupsStyles}
          disabled={isOn}
        />
      </CardBody>
      <CardFooter>
        <Button
          onClick={handleWashToggle}
          variant="primary"
          active={isOn}
          style={{ width: '120px' }}
          disabled={!isAutosamplerConnected || isAutosamplerBusy || !isPermissiveMode}
        >
          {isOn ? 'Выключить' : 'Включить'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default WashTab;
