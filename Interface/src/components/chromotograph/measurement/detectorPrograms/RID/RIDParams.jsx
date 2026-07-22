import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import CustomInputGroup from '../../../../custom/CustomInputGroup.jsx';
import CustomCheckboxGroup from '../../../../custom/CustomCheckboxGroup.jsx';
import CustomSelectGroup from '../../../../custom/CustomSelectGroup.jsx';
import { ridActions, selectDetSpecParamsData } from '../../../../../services/reduxImportDispatcher.js';
import { selectRIDProgramData, selectRIDSlice } from '../../../../../services/selectors/RID/ridBase.js';
import { clampingBlur, intSetter } from '../../../../../utils/setters.js';
import { RID_RANGES } from '../../../../../constants/stepFields.js';

// Styles (adjust as needed)
const labelsStyles = { minWidth: '260px' };
const valueStyles = {};
const selectGroupsStyles = {};

function RIDParams({ tabId }) {
    const dispatch = useDispatch();
    const [showModal, setShowModal] = useState(false);

    // Store last temperature values when checkbox is unchecked
    const [lastTemperature, setLastTemperature] = useState(null);
    const [lastTemperatureTolerance, setLastTemperatureTolerance] = useState(null);

    // Get current params from Redux
    const ridSlice = useSelector(state => selectRIDSlice(state))
    console.log({ridSlice})
    const currentParams = useSelector(state => selectDetSpecParamsData(state, tabId));

    // Local state for edited values (defaults from the provided structure)
    const [localParams, setLocalParams] = useState(currentParams);

    // Local state for useThermostat checkbox (not dispatched)
    const [useThermostat, setUseThermostat] = useState(() => {
        // Initialize based on whether temperature values exist
        return currentParams?.temperature !== null && currentParams?.temperature !== undefined;
    });

    const handleUseThermostatChange = (e) => {
        const isChecked = e.target.checked;
        setUseThermostat(isChecked);
        
        if (!isChecked) {
            // Save current values before clearing
            setLastTemperature(localParams.temperature);
            setLastTemperatureTolerance(localParams.temperatureTolerance);
            // Set temperature fields to null
            handleParamChange('temperature', null);
            handleParamChange('temperatureTolerance', null);
        } else {
            // Restore last saved values, or use defaults if none
            const tempToRestore = lastTemperature !== null ? lastTemperature : 25;
            const toleranceToRestore = lastTemperatureTolerance !== null ? lastTemperatureTolerance : 1;
            handleParamChange('temperature', tempToRestore);
            handleParamChange('temperatureTolerance', toleranceToRestore);
        }
    };

    // When modal opens, load current params into local state
    useEffect(() => {
        if (showModal && currentParams) {
            setLocalParams(currentParams);
        }
    }, [showModal, currentParams]);

    const handleParamChange = (field, value) => {
        setLocalParams(prev => ({ ...prev, [field]: value }));
    };

    const setterDispatch = useMemo(() => ({
        sampleRate: (val) => handleParamChange('sampleRate', val),
        temperature: (val) => handleParamChange('temperature', val),
        temperatureTolerance: (val) => handleParamChange('temperatureTolerance', val),
    }), []);

    const handleNumberChange = (field) => (e) => {
        const { name, value } = e.target;
        
        intSetter({
        name,
        value,
        rangesMap: {
            temperature: [3, undefined, undefined],
            sampleRate: [2, undefined, undefined],
            temperatureTolerance: [1, undefined, undefined], 
        },
        setterDispatch,
        config: {
            isSetAsNum: true,
        },
        });
    };

    const handleNumberBlur = (field) => (e) => {
        const { name, value } = e.target;
        
        clampingBlur({
        name,
        value,
        rangesMap: RID_RANGES,
        setterDispatch,
        returnAs: 'num',
        });
    };

    const handleSave = () => {
        dispatch(ridActions.setParams({ tabId, params: localParams }));
        setShowModal(false);
    };

    const handleDecline = () => {
        setShowModal(false);
    };

    const sampleRateOptions = [10, 5, 2, 1, 0.5].map(value => ({
        value,
        label: value.toString()
    }));

    const polarityOptions = [
        { value: true, label: 'Положительная' },
        { value: false, label: 'Отрицательная' }
    ];

    useEffect(()=> {console.log('localParams', localParams)},[localParams])
    useEffect(()=> {console.log('currentParams', currentParams)},[currentParams])

    return (
        <>
            <Button className='mt-1' onClick={() => setShowModal(true)} data-testid="rid-params-open-button">
                Стартовые параметры
            </Button>

            <Modal show={showModal} onHide={handleDecline} backdrop="static" data-testid="rid-params-modal">
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: '18px' }} data-testid="rid-params-modal-title">Параметры детектора</Modal.Title>
                </Modal.Header>
                <Modal.Body data-testid="rid-params-modal-body">
                    <Form>
                        <CustomSelectGroup
                            label="Частота дискретизации (Гц)"
                            labelTestId="rid-params-sample-rate-label"
                            rawOptions={sampleRateOptions}
                            value={localParams.sampleRate}
                            onChange={(e) => handleParamChange('sampleRate', Number(e.target.value))}
                            labelStyle={labelsStyles}
                            selectStyle={valueStyles}
                            groupStyle={selectGroupsStyles}
                            selectTestId="rid-params-sample-rate-select"
                        />

                        <CustomSelectGroup
                            label="Полярность выходного сигнала"
                            labelTestId="rid-params-polarity-label"
                            rawOptions={polarityOptions}
                            value={localParams.polarity}
                            onChange={(e) => handleParamChange('polarity', e.target.value === 'true')}
                            labelStyle={labelsStyles}
                            selectStyle={valueStyles}
                            groupStyle={selectGroupsStyles}
                            selectTestId="rid-params-polarity-select"
                        />

                        <CustomCheckboxGroup
                            label="Использовать термостат"
                            labelTestId="rid-params-use-thermostat-label"
                            name="useThermostat"
                            onChange={handleUseThermostatChange}
                            checked={useThermostat}
                            groupClassName="mb-2"
                            checkboxTestId="rid-params-use-thermostat-checkbox"
                        />

                        <CustomInputGroup
                            label="Температура"
                            labelTestId="rid-params-temperature-label"
                            value={localParams.temperature ?? ''}
                            unit="°C"
                            name="temperature"
                            onChange={handleNumberChange('temperature')}
                            onBlur={handleNumberBlur('temperature')}
                            labelStyle={labelsStyles}
                            groupClassName="mb-1"                            
                            inputTestId="rid-params-temperature-input"
                            disabled={!useThermostat}
                        />

                        <CustomInputGroup
                            label="Отклонение температуры"
                            labelTestId="rid-params-temperature-tolerance-label"
                            value={localParams.temperatureTolerance ?? ''}
                            unit="°C"
                            name="temperatureTolerance"
                            onChange={handleNumberChange('temperatureTolerance')}
                            onBlur={handleNumberBlur('temperatureTolerance')}
                            labelStyle={labelsStyles}
                            groupClassName="mb-2"
                            inputTestId="rid-params-temperature-tolerance-input"
                            disabled={!useThermostat}
                        />

                        <CustomCheckboxGroup
                            label="Разрешить старт с любой температуры"
                            labelTestId="rid-params-wait-for-temperature-label"
                            name="waitForTemperature"
                            onChange={(e) => handleParamChange('waitForTemperature', !e.target.checked)}
                            checked={!localParams.waitForTemperature}
                            groupClassName="mb-1"
                            checkboxTestId="rid-params-wait-for-temperature-checkbox"
                        />

                        <CustomCheckboxGroup
                            label="Автоустановка нуля после старта"
                            labelTestId="rid-params-auto-zero-label"
                            name="autoZero"
                            onChange={(e) => handleParamChange('autoZero', e.target.checked)}
                            checked={localParams.autoZero}
                            groupClassName="mb-2"
                            checkboxTestId="rid-params-auto-zero-checkbox"
                        />
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleSave} style={{ width: '100px' }} data-testid="rid-params-ok-button">
                        ОК
                    </Button>
                    <Button variant="secondary" onClick={handleDecline} style={{ width: '100px' }} data-testid="rid-params-cancel-button">
                        Отмена
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default RIDParams;