import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardFooter,
  Col,
  Form,
  InputGroup,
  Row,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import CustomIncrementInput from '../custom/CustomIncrementInput';
import { clampingBlur, intSetter } from '../../utils/setters';
import { 
  autosamplerActions, 
  selectAutosamplerMethod, 
  selectAutosamplerType, 
  selectIsAutosamplerBusy,
} from '../../services/reduxImportDispatcher';
import CustomInputGroup from '../custom/CustomInputGroup';
import { readAutosamplerParams, writeAutosamplerParams } from '../../services/thunks/autosampler/autosamplerThunk';
import { AUTOSAMPLER_TYPES } from '../../constants/constants';

const rangesMap = {
  needleDepthSample: [2, 1, 35],
  needleDepthWash: [2, 1, 35],
  pumpH1SpeedSample: [3, 46, 100],
  pumpH2SpeedWash: [3, 46, 100],
  axisXSpeed: [3, 1, 100],
  axisYSpeed: [3, 1, 100],
  axisZSpeed: [3, 1, 100],
  sampleAspirations: [1, 1, 5],
  method: [1, 0, 9],
  loopVolume: [null, null, null],
  defaultValvePosition: [1, 0, 1],
  deadVolume: [null, null, null],
};

function AutosamplerParams(props) {
  const dispatch = useDispatch();
  const autosamplerType = useSelector(selectAutosamplerType)

  const isAS393 = autosamplerType === AUTOSAMPLER_TYPES.as393;
  const generalMethod = useSelector(selectAutosamplerMethod);
  const isAutosamplerBusy = useSelector(selectIsAutosamplerBusy);
  
  // Локальное состояние для отображения текущих значений
  const [params, setParams] = useState({
    needleDepthSample: '',
    needleDepthWash: '',
    pumpH1SpeedSample: '',
    pumpH2SpeedWash: '',
    axisXSpeed: '',
    axisYSpeed: '',
    axisZSpeed: '',
    loopVolume: '',
    sampleAspirations: '',
    defaultValvePosition: '',
    deadVolume: '',
    method: generalMethod
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setParams(prev => ({ ...prev, method: generalMethod }));
  }, [generalMethod]);

  // Загрузка параметров при монтировании компонента только для AS393
  useEffect(() => {
    if (isAS393) {
      handleRead();
    }
  }, [isAS393]);

  // Обновленный setterDispatch с правильными именами полей
  const setterDispatch = useMemo(() => ({
    method: (value) => setParams(prev => ({ ...prev, method: value })),
    needleDepthSample: (value) => setParams(prev => ({ ...prev, needleDepthSample: value })),
    needleDepthWash: (value) => setParams(prev => ({ ...prev, needleDepthWash: value })),
    pumpH1SpeedSample: (value) => setParams(prev => ({ ...prev, pumpH1SpeedSample: value })),
    pumpH2SpeedWash: (value) => setParams(prev => ({ ...prev, pumpH2SpeedWash: value })),
    axisXSpeed: (value) => setParams(prev => ({ ...prev, axisXSpeed: value })),
    axisYSpeed: (value) => setParams(prev => ({ ...prev, axisYSpeed: value })),
    axisZSpeed: (value) => setParams(prev => ({ ...prev, axisZSpeed: value })),
    loopVolume: (value) => setParams(prev => ({ ...prev, loopVolume: value })),
    sampleAspirations: (value) => setParams(prev => ({ ...prev, sampleAspirations: value })),
    defaultValvePosition: (value) => setParams(prev => ({ ...prev, defaultValvePosition: value })),
    deadVolume: (value) => setParams(prev => ({ ...prev, deadVolume: value })),
  }), []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (rangesMap[name]) {
      intSetter({
        name,
        value,
        rangesMap,
        setterDispatch,
      });
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    
    if (rangesMap[name]) {
      clampingBlur({
        name,
        value,
        rangesMap,
        setterDispatch,
      });
    }
  };

  // Чтение параметров
  const handleRead = async () => {
    if (!isAS393) return;
    
    try {
      setLoading(true);
      setMessage('');
      const result = await dispatch(readAutosamplerParams()).unwrap();
      
      // Преобразование API имен в имена компонента
      setParams({
        needleDepthSample: result.needleDepthSample || '',
        needleDepthWash: result.needleDepthWash || '',
        pumpH1SpeedSample: result.pumpH1SpeedSample || '',
        pumpH2SpeedWash: result.pumpH2SpeedWash || '',
        axisXSpeed: result.axisXSpeed || '',
        axisYSpeed: result.axisYSpeed || '',
        axisZSpeed: result.axisZSpeed || '',
        loopVolume: result.loopVolume || '',
        sampleAspirations: result.sampleAspirations || '',
        defaultValvePosition: result.defaultValvePosition?.toString() || '0',
        deadVolume: result.deadVolume || '',
        method: params.method // Сохраняем текущий метод
      });
      
    } catch (error) {
      console.error('Ошибка при чтении параметров:', error);
      setMessage('Ошибка при загрузке параметров');
    } finally {
      setLoading(false);
    }
  };

  // Запись параметров
  const handleWrite = async () => {
    if (!isAS393) return;
    
    try {
      setLoading(true);
      setMessage('');
      
      // Преобразование имен компонента в API имена
      const samplerSettings = {
        needleDepthSample: parseInt(params.needleDepthSample) || 1,
        needleDepthWash: parseInt(params.needleDepthWash) || 1,
        pumpH1SpeedSample: parseInt(params.pumpH1SpeedSample) || 46,
        pumpH2SpeedWash: parseInt(params.pumpH2SpeedWash) || 46,
        axisXSpeed: parseInt(params.axisXSpeed) || 1,
        axisYSpeed: parseInt(params.axisYSpeed) || 1,
        axisZSpeed: parseInt(params.axisZSpeed) || 1,
        loopVolume: parseInt(params.loopVolume) || 1,
        sampleAspirations: parseInt(params.sampleAspirations) || 1,
        defaultValvePosition: parseInt(params.defaultValvePosition) || 0,
        deadVolume: parseInt(params.deadVolume) || 0
      };
      
      const result = await dispatch(writeAutosamplerParams(samplerSettings)).unwrap();
      
      // Также обновляем локальные параметры в redux
      dispatch(autosamplerActions.setGeneralParams({ 
        params: {
          needleDepthSample: samplerSettings.needleDepthSample,
          needleDepthWash: samplerSettings.needleDepthWash,
          pumpH1SpeedSample: samplerSettings.pumpH1SpeedSample,
          pumpH2SpeedWash: samplerSettings.pumpH2SpeedWash,
          axisXSpeed: samplerSettings.axisXSpeed,
          axisYSpeed: samplerSettings.axisYSpeed,
          axisZSpeed: samplerSettings.axisZSpeed,
          loopVolume: samplerSettings.loopVolume,
          sampleAspirations: samplerSettings.sampleAspirations,
          defaultValvePosition: samplerSettings.defaultValvePosition,
          deadVolume: samplerSettings.deadVolume
        }
      }));
      
    } catch (error) {
      console.error('Ошибка при записи параметров:', error);
      setMessage('Ошибка при сохранении параметров');
    } finally {
      setLoading(false);
    }
  };

  // Комбинированная функция для кнопки "Применить"
  const handleSubmitParams = () => {
    // Сначала сохраняем в API (только для AS393)
    if (isAS393) {
      handleWrite();
    }
    
    // Затем обновляем локальные параметры (для всех типов)
    dispatch(autosamplerActions.setGeneralParams({ 
      params: {
        ...params,
        method: parseInt(params.method) || 0
      }
    }));
  };

  const handleRadioChange = (value) => {
    setParams(prev => ({ ...prev, defaultValvePosition: value }));
  };

  const unitStyle = {width: '45px'}

  return (
  <Card className="mb-3" style={{ 
    maxWidth: '100%', 
    maxHeight: '600px',
  }}>
    <Card.Header>Настройки сэмплера</Card.Header>
    <CardBody style={{overflowY: 'auto'}}>
      {message && (
        <div className={`alert alert-${message.includes('успех') ? 'success' : 'danger'} mb-3`}>
          {message}
        </div>
      )}
            
      <Form>
        <Row>
          {/* Глубина погружения иглы - ТОЛЬКО ДЛЯ AS393 */}
          {isAS393 && (
            <Col>
              <div className="mb-2">
                <small className="text-muted fw-bold">Глубина погружения иглы</small>
              </div>
              <CustomInputGroup
                label="при заборе пробы (1-35)"
                value={params.needleDepthSample}
                name="needleDepthSample"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                unit="мм"
                labelStyle={{ minWidth: '180px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
              <CustomInputGroup
                label="при промывке (1-35)"
                value={params.needleDepthWash}
                name="needleDepthWash"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                unit="мм"
                labelStyle={{ minWidth: '180px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
            </Col>
          )}

          {/* Скорость насосов - ТОЛЬКО ДЛЯ AS393 */}
          {isAS393 && (
            <Col>
              <div className="mb-2">
                <small className="text-muted fw-bold">Скорость насосов</small>
              </div>
              <CustomInputGroup
                label="Н1 при загрузке пробы (46-100)"
                value={params.pumpH1SpeedSample}
                name="pumpH1SpeedSample"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                unit="%"
                labelStyle={{ minWidth: '200px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
              <CustomInputGroup
                label="Н2 при промывке (46-100)"
                value={params.pumpH2SpeedWash}
                name="pumpH2SpeedWash"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                unit="%"
                labelStyle={{ minWidth: '200px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
            </Col>
          )}

          {/* Скорость каретки - ТОЛЬКО ДЛЯ AS393 */}
          {isAS393 && (
            <Col>
              <div className="mb-2">
                <small className="text-muted fw-bold">Скорость каретки</small>
              </div>
              <CustomInputGroup
                label="по оси X (1-100)"
                value={params.axisXSpeed}
                name="axisXSpeed"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                unit="%"
                labelStyle={{ minWidth: '140px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
              <CustomInputGroup
                label="по оси Y (1-100)"
                value={params.axisYSpeed}
                name="axisYSpeed"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                unit="%"
                labelStyle={{ minWidth: '140px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
              <CustomInputGroup
                label="по оси Z (1-100)"
                value={params.axisZSpeed}
                name="axisZSpeed"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                unit="%"
                labelStyle={{ minWidth: '140px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
            </Col>
          )}

          {/* Дополнительные параметры - ТОЛЬКО ДЛЯ AS393 */}
          {isAS393 && (
            <Col>
              <div className="mb-2">
                <small className="text-muted fw-bold">Параметры</small>
              </div>
              <CustomInputGroup
                label="Объем петли"
                value={params.loopVolume}
                name="loopVolume"
                onChange={handleInputChange}
                unit="мкл"
                labelStyle={{ minWidth: '120px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
              <CustomInputGroup
                label="Кратность забора пробы (1-5)"
                value={params.sampleAspirations}
                name="sampleAspirations"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                type="number"
                labelStyle={{ minWidth: '200px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
              <CustomInputGroup
                label="Мертвый объем тракта"
                value={params.deadVolume}
                name="deadVolume"
                onChange={handleInputChange}
                unit="мкл"
                labelStyle={{ minWidth: '180px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                unitStyle={unitStyle}
                size="sm"
                groupClassName='mb-1'
                disabled={!isAS393}
              />
            </Col>
          )}

          {/* Управление */}
          <Col>
            {/* Положение крана - ТОЛЬКО ДЛЯ AS393 */}
            {isAS393 && (
              <>
                <div className="mb-2">
                  <small className="text-muted fw-bold">Управление</small>
                </div>
                <div className="mb-3 d-flex align-items-center flex-wrap">
                  <div style={{ 
                    minWidth: '150px', 
                    marginRight: '1rem',
                    marginBottom: '0.5rem'
                  }}>
                    <small>Положение крана по умолчанию:</small>
                  </div>
                  <ToggleButtonGroup
                    type="radio"
                    name="defaultValvePosition"
                    value={params.defaultValvePosition}
                    onChange={handleRadioChange}
                    size="sm"
                    className="d-flex"
                  >
                    <ToggleButton
                      id="tbg-radio-1"
                      value="0"
                      variant="outline-primary"
                      style={{ minWidth: '80px' }}
                      size="sm"
                      disabled={!isAS393}
                    >
                      Промывка
                    </ToggleButton>
                    <ToggleButton
                      id="tbg-radio-2"
                      value="1"
                      variant="outline-primary"
                      style={{ minWidth: '80px' }}
                      size="sm"
                      disabled={!isAS393}
                    >
                      Загрузка
                    </ToggleButton>
                  </ToggleButtonGroup>
                </div>
              </>
            )}

            {/* Метод автосамплера - ДЛЯ ВСЕХ ТИПОВ */}
            <div className={isAS393 ? "mb-1" : "mt-3"}>
              <CustomIncrementInput
                min={1}
                max={9}
                step={1}
                label="Метод автосамплера"
                labelStyle={{ width: '155px' }}
                inputStyle={{ maxWidth: '80px', minWidth: '60px' }}
                value={params.method}
                name="method"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                size="sm"
                groupClassName='mb-1'
              />
            </div>
          </Col>
        </Row>
      </Form>
    </CardBody>
    <CardFooter className="d-flex justify-content-between">
      {/* Кнопка "Получить" - ТОЛЬКО ДЛЯ AS393 */}
      {isAS393 && (
        <Button
          variant="outline-secondary"
          size="sm"
          style={{ width: '120px' }}
          onClick={handleRead}
          disabled={loading || isAutosamplerBusy}
        >
          {loading ? 'Получение...' : 'Получить'}
        </Button>
      )}
      
      {/* Кнопка "Применить" - ДЛЯ ВСЕХ ТИПОВ */}
      <Button
        variant="primary"
        size="sm"
        style={{ width: '120px', marginLeft: !isAS393 ? 'auto' : '0' }}
        onClick={handleSubmitParams}
        disabled={loading || isAutosamplerBusy}
      >
        {loading ? 'Сохранение...' : 'Применить'}
      </Button>
    </CardFooter>
  </Card>
);
}

export default AutosamplerParams;