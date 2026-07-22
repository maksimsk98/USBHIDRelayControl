import {
  Button, Card, CardBody, CardFooter, CardHeader, InputGroup,
} from 'react-bootstrap';
import {
  useEffect, useMemo, useRef, useState,
} from 'react';

import { useDispatch, useSelector } from 'react-redux';
import CustomSelectGroup from '../custom/CustomSelectGroup';
import CustomIncrementInput from '../custom/CustomIncrementInput';
import { intSetter } from '../../utils/setters';
import { clampValue, isNonNegIntStr } from '../../utils/validation';
import CustomTypeaheadGroup from '../custom/CustomTypeaheadGroup';
import {
  selectAutosamplerMethod, selectIsAutosamplerBusy, selectIsAutosamplerConnected, selectIsSingleInjectionOn, selectLocalAutoMode, selectPreWashSolvents, selectSingleInjectionParams,
} from '../../services/selectors/autosampler/autosamplerBase';
import { switchSingleInjectionState } from '../../services/thunks/autosampler/autosamplerThunk';
import { AUTOSAMPLER_MODES } from '../../constants/constants';

const rangesMap = {
  individualMethod: [1, 0, 9],
};

function SingleInjectionTab(props) {
  const dispatch = useDispatch();

  const generalMethod = useSelector(selectAutosamplerMethod);
  const isOn = useSelector(selectIsSingleInjectionOn);
  const storedParams = useSelector(selectSingleInjectionParams);
  const preWashSolvents = useSelector(selectPreWashSolvents); // i don't know why postwash solvents are the same here as prewash, but it is what it is
  const isAutosamplerConnected = useSelector(selectIsAutosamplerConnected);
  const isAutosamplerBusy = useSelector(selectIsAutosamplerBusy);
  const autoSamplerMode = useSelector(selectLocalAutoMode);

  const [individualMethod, setIndividualMethod] = useState(generalMethod);
  const [vialId, setVialId] = useState('0');
  const [preWashSolvent, setPreWashSolvent] = useState(null); // for some reason i was told to label solvent in labels as solution
  const [postWashSolvent, setPostWashSolvent] = useState(null);
  const [useIndividualMethod, setUseIndividualMethod] = useState(false);

  useEffect(() => {
    if (!useIndividualMethod) setIndividualMethod(generalMethod);
  }, [generalMethod, useIndividualMethod]);

  useEffect(() => {
    const {
      method, vialId, preWashSolvent, postWashSolvent, useIndividualMethod,
    } = storedParams;
    setIndividualMethod(method);
    setVialId(String(vialId)); // typeahead need str
    setPreWashSolvent(preWashSolvent);
    setPostWashSolvent(postWashSolvent);
    setUseIndividualMethod(useIndividualMethod);
  }, [storedParams]);

  const setterDispatch = useMemo(() => ({
    individualMethod: setIndividualMethod,
  }), [setIndividualMethod]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    intSetter({
      name,
      value,
      rangesMap,
      setterDispatch,
    });
  };

  const handleInjectingToggle = () => {
    const params = {
      useIndividualMethod,
      method: useIndividualMethod ? individualMethod : generalMethod,
      vialId: Number(vialId),
      preWashSolvent,
      postWashSolvent,
    };
    dispatch(switchSingleInjectionState({ switchTo: !isOn, params }));
  };

  const labelsStyles = { width: '220px' };
  const valueStyles = { width: '140px' };
  const selectGroupsStyles = { flexWrap: 'nowrap', width: 'fit-content' };

  const rawSamplesOptions = Array.from({ length: 121 }, (_, i) => i + 1).map((i)=> String(i));


  const vialIdTARef = useRef(null);

  const handleTypeaheadInput = (input) => {
  // Разрешаем ввод, даже если это не полное число
  // Проверяем, что ввод - это строка, которая может стать числом
  if (input === '' || /^\d*$/.test(input)) {
      setVialId(input);
    } else {
      // Если ввод содержит недопустимые символы, возвращаем предыдущее значение
      vialIdTARef.current?.setState({ text: vialId });
    }
  };


  useEffect(() => {
    if (vialIdTARef.current) {
      vialIdTARef.current.setState({ text: vialId });
    }
  }, [vialId]);

  const handleVialIdBlur = () => {
    // Проверяем, что vialId не пустая строка
    if (vialId === '') {
      setVialId('1'); // Значение по умолчанию
    } else {
      const numeric = clampValue(Number(vialId), 1, 121);
      setVialId(String(numeric));
    }
  };

  const handleMethodBlur = () => {
    const numeric = clampValue(Number(individualMethod), rangesMap.individualMethod[1], rangesMap.individualMethod[2]);
    setIndividualMethod(String(numeric));
  };

  const isPermissiveMode = useMemo(() => autoSamplerMode === AUTOSAMPLER_MODES.NONE || autoSamplerMode === AUTOSAMPLER_MODES.SINGLE_INJECTION, [autoSamplerMode]);

  return (
    <Card>
      <CardHeader>Параметры одной инжекции</CardHeader>
      <CardBody>
        <div className="d-flex flex-column" style={{ width: 'fit-content' }}>
          <CustomIncrementInput
            siblingPosition="before"
            siblings={(
              <InputGroup.Checkbox
                {...{
                  name: 'useIndividualMethod',
                  checked: useIndividualMethod,
                  onChange: (e) => setUseIndividualMethod(e.target.checked),
                  disabled: isOn,
                }}
                style={{ padding: '0.25rem 0.5rem' }}
              />
                    )}
            label="Использовать отличный от настроек метод"
            value={individualMethod}
            name="individualMethod"
            onChange={handleInputChange}
            onBlur={handleMethodBlur}
            step={1}
            min={rangesMap.individualMethod[1]}
            max={rangesMap.individualMethod[2]}
            size="sm"
            inputStyle={{
              width: '50px', minWidth: '0', flexGrow: 1, flexShrink: 1,
            }} // spinners of incrementor have fat paddings so we force it to squish, min-content is polite, 1ch is rough
            groupStyle={{ width: '100%', flexWrap: 'nowrap', display: 'flex' }}
            labelStyle={{ width: 'min-content' }}
            disabled={!useIndividualMethod || isOn}
            labelTooltip="Использовать индивидуальный метод автосамплера вместо заданного в настройках — только в режиме одной инжекции"
          />

          <CustomTypeaheadGroup
            ref={vialIdTARef}
            label="Номер виалы"
            name="vialId"
            options={rawSamplesOptions}
            selected={vialId ? [vialId] : []}
            onChange={(selected) => {
              if (selected.length > 0) {
                setVialId(selected[0]);
              }
            }}
            onBlur={handleVialIdBlur}
            onInputChange={(input) => handleTypeaheadInput(input)}
            placeholder="Введите или выберите..."
            size="sm"
            labelStyle={labelsStyles}
            inputStyle={valueStyles}
            groupStyle={selectGroupsStyles}
            disabled={isOn}
          />

          <CustomSelectGroup
            label="Предпромывочный раствор"
            rawOptions={preWashSolvents}
            value={preWashSolvent ?? ''}
            onChange={(e) => setPreWashSolvent(e.target.value)}
            size="sm"
            labelStyle={labelsStyles}
            selectStyle={valueStyles}
            groupStyle={selectGroupsStyles}
            disabled={isOn}
          />
          <CustomSelectGroup
            label="Постпромывочный раствор"
            rawOptions={preWashSolvents}
            value={postWashSolvent ?? ''}
            onChange={(e) => setPostWashSolvent(e.target.value)}
            size="sm"
            labelStyle={labelsStyles}
            selectStyle={valueStyles}
            groupStyle={selectGroupsStyles}
            disabled={isOn}
          />
        </div>
      </CardBody>
      <CardFooter>
        <Button
          onClick={handleInjectingToggle}
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

export default SingleInjectionTab;
