import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal, Button, Tab, Nav, Row, Col, Form,
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import CustomInputGroup from '../../../custom/CustomInputGroup';
import CustomCheckboxGroup from '../../../custom/CustomCheckboxGroup';

import { measurementActions, methodActions, selectActiveTabType } from '../../../../services/reduxImportDispatcher';
// base
import { selectActiveTab } from '../../../../services/reduxImportDispatcher';
// derived
import { selectActiveTabMethodParams, selectActiveTabMethod } from '../../../../services/reduxImportDispatcher';

import { submitMethod } from '../../../../services/thunks/method/methodThunks';

import { EMPTY_OBJECT, TAB_TYPES } from '../../../../constants/constants';
import { normalizeDecimalInput, sanitize } from '../../../../utils/validation';
import { CustomPickFolderButton } from '../../../custom/CustomPickFolderButton';
import OverlayTooltip from '../../../custom/OverlayTooltip';
import { usePermissions } from '../../../../hooks/usePermissions';
import { intSetter } from '../../../../utils/setters';

function MeasurementMethodModal({ show, handleClose }) {
  const dispatch = useDispatch();
  const { hasPermissionForAction } = usePermissions();
  const canCreateMethod = hasPermissionForAction('createMethod');

  const activeTab = useSelector(selectActiveTab);
  const activeTabMethod = useSelector(selectActiveTabMethod);
  const activeTabType = useSelector(selectActiveTabType);

  const [activeField, setActiveField] = useState('method');
  const [newMethodName, setNewMethodName] = useState(activeTabMethod ?? '');

  const parameters = useSelector(selectActiveTabMethodParams);
  const { options = EMPTY_OBJECT, optionsSp = EMPTY_OBJECT } = parameters ?? EMPTY_OBJECT;

  const [chromatogramFolder, setChromatogramFolder] = useState(options.folder);
  const [chromatogramTemplate, setChromatogramTemplate] = useState(options.name);
  const [saveChromatogram, setSaveChromatogram] = useState(options.autoSave);
  const [labelPeaks, setLabelPeaks] = useState(options.autoMark);
  const [minMeasureTime, setMinMeasureTime] = useState(options.minimalTime);
  const [saveBackgroundChromatogram, setSaveBackgroundChromatogram] = useState(options.saveBackground);
  const [calibrationFolder, setCalibrationsFolder] = useState(options.calibrationFolder);

  const [spectraFolder, setSpectraFolder] = useState(optionsSp.folder);
  const [spectraTemplate, setSpectraTemplate] = useState(optionsSp.name);
  const [saveSpectraResult, setSaveSpectraResult] = useState(optionsSp.autoSave);

  const [invalidName, setInvalidName] = useState(false);
  const methodNameInputRef = useRef(null);

  const isInvalidMethodName = newMethodName == null
  || (typeof newMethodName === 'string' && newMethodName.trim() === '');

  const handleMethodNameBlur = () => {
    if (isInvalidMethodName) {
      setInvalidName(true);
    }
  };

  useEffect(() => {
    setNewMethodName(activeTabMethod ?? '');
    setChromatogramFolder(options.folder);
    setChromatogramTemplate(options.name);
    setSaveChromatogram(options.autoSave);
    setLabelPeaks(options.autoMark);
    setMinMeasureTime(options.minimalTime);
    setSaveBackgroundChromatogram(options.saveBackground);
    setCalibrationsFolder(options.calibrationFolder);

    setSpectraFolder(optionsSp.folder);
    setSpectraTemplate(optionsSp.name);
    setSaveSpectraResult(optionsSp.autoSave);
  }, [activeTabMethod, options, optionsSp]);

  const handleSave = async () => {
    const parameters = {
      options: {
        autoMark: labelPeaks,
        autoSave: saveChromatogram,
        calibrationFolder,
        folder: chromatogramFolder,
        minimalTime: minMeasureTime,
        name: chromatogramTemplate,
        saveBackground: saveBackgroundChromatogram,
      },
      optionsSp: {
        autoSave: saveSpectraResult,
        folder: spectraFolder,
        name: spectraTemplate,
      },
    };
    // this is hopeful realization, we assume that method was added on backend
    await dispatch(methodActions.updateMethodParams({ methodName: newMethodName, parameters }));
    if (activeTabMethod !== newMethodName) {
      dispatch(methodActions.addMethod(newMethodName));
/*       if (activeTabType === TAB_TYPES.MEASUREMENT) {
        dispatch(methodActions.setSelectedMethod(newMethodName));
        dispatch(measurementActions.changeMethodAndCheckCalib({ id: activeTab, method: newMethodName }));
      } */
    }

    try {
      await dispatch(submitMethod({ tabId: activeTab, methodName: newMethodName, sourceMethod: activeTabMethod })).unwrap();
    } catch (err) {
      console.error('Thunk failed:', err);
    }

    handleClose();
  };

  const handleMethodNameChange = (e) => {
    const raw = e.target.value;
    const sanitized = sanitize(raw, '');
    setNewMethodName(sanitized);

    if (invalidName) setInvalidName(false);
  };

  const setterDispatch = useMemo(() => ({
    minMeasureTime: setMinMeasureTime,
  }), [setMinMeasureTime]);

  const rangesMap = {
    minMeasureTime: [null, 0.1, null],
  };

  const handleMinimalTimeChange = (e) => {
    const { name, value } = e.target;
    const normalized = normalizeDecimalInput(value);
    intSetter({
      name,
      value: normalized,
      rangesMap,
      setterDispatch,
      config: {
        isSetAsNum: true,
      },
    });
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Метод измерения</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tab.Container activeKey={activeField} onSelect={(k) => setActiveField(k)}>
          <Row>
            <Col sm={3}>
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link eventKey="method">Метод</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="chromatograms">Хроматограммы</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="calibrations">Градуировки</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="spectra">Спектры</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
            <Col sm={9}>
              <Tab.Content>
                <Tab.Pane eventKey="method">
                  <CustomInputGroup
                    ref={methodNameInputRef}
                    label="Имя"
                    value={newMethodName}
                    name="methodName"
                    onChange={handleMethodNameChange}
                    onBlur={handleMethodNameBlur}
                    inputStyle={{ maxWidth: '300px', minWidth: '150px' }}
                    groupClassName="mb-2"
                  />

                  {invalidName && methodNameInputRef.current && (
                    <OverlayTooltip
                      message="Пустое имя метода недопустимо"
                      targetRef={methodNameInputRef.current}
                      timeout={3000}
                      onTimeout={() => setInvalidName(false)}
                    />
                  )}
                </Tab.Pane>
                <Tab.Pane eventKey="chromatograms">
                  <Form.Label className="mb-3">Имя файла</Form.Label>
                  <CustomInputGroup
                    label="Папка"
                    value={chromatogramFolder}
                    name="chromatogramFolder"
                    onChange={(e) => setChromatogramFolder(e.target.value)}
                    inputStyle={{ maxWidth: '300px', minWidth: '150px' }}
                    groupClassName="mb-2"
                    readOnly
                    disabled
                    siblings={
                      <CustomPickFolderButton setFolder={setChromatogramFolder} />
                    }
                  />
                  <CustomInputGroup
                    label="Шаблон"
                    value={chromatogramTemplate}
                    name="chromatogramTemplate"
                    onChange={(e) => setChromatogramTemplate(e.target.value)}
                    inputStyle={{ maxWidth: '300px', minWidth: '150px' }}
                    groupClassName="mb-2"
                  />
                  <Form.Label className="mb-3 mt-3">По окончании измерения</Form.Label>
                  <CustomCheckboxGroup
                    label="Сохранять хроматограмму в файл"
                    checked={saveChromatogram}
                    name="saveChromatogram"
                    onChange={(e) => setSaveChromatogram(e.target.checked)}
                    groupClassName="mb-2"
                  />
                  <CustomCheckboxGroup
                    label="Производить разметку пиков"
                    checked={labelPeaks}
                    name="labelPeaks"
                    onChange={(e) => setLabelPeaks(e.target.checked)}
                    groupClassName="mb-2"
                  />
                  <CustomInputGroup
                    label="Минимальное время измерения"
                    value={minMeasureTime ?? ''}
                    name="minMeasureTime"
                    unit="мин."
                    onChange={handleMinimalTimeChange}
                    groupClassName="mb-2"
                  />
                  <Form.Label className="mb-3 mt-3">Фоновая хроматограмма</Form.Label>
                  <CustomCheckboxGroup
                    label="Всегда сохранять в файл"
                    checked={saveBackgroundChromatogram} // Use proper state here if this option applies
                    name="saveBackgroundChromatogram"
                    onChange={(e) => setSaveBackgroundChromatogram(e.target.checked)}
                    groupClassName="mb-2"
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="calibrations">
                  <CustomInputGroup
                    label="Папка"
                    value={calibrationFolder}
                    name="calibrationFolder"
                    onChange={(e) => setCalibrationsFolder(e.target.value)}
                    inputStyle={{ maxWidth: '300px', minWidth: '150px' }}
                    groupClassName="mb-2"
                    siblings={
                      <CustomPickFolderButton setFolder={setCalibrationsFolder} />
                    }
                  />

                </Tab.Pane>
                <Tab.Pane eventKey="spectra">
                  <Form.Label className="mb-3">Имя файла</Form.Label>
                  <CustomInputGroup
                    label="Папка"
                    value={spectraFolder}
                    name="spectraFolder"
                    onChange={(e) => setSpectraFolder(e.target.value)}
                    inputStyle={{ maxWidth: '300px', minWidth: '150px' }}
                    groupClassName="mb-2"
                    siblings={
                      <CustomPickFolderButton setFolder={setSpectraFolder} />
                    }
                  />
                  <CustomInputGroup
                    label="Шаблон"
                    value={spectraTemplate}
                    name="spectraTemplate"
                    onChange={(e) => setSpectraTemplate(e.target.value)}
                    inputStyle={{ maxWidth: '300px', minWidth: '150px' }}
                    groupClassName="mb-2"
                  />
                  <Form.Label className="mb-3 mt-3">По окончании измерения</Form.Label>
                  <CustomCheckboxGroup
                    label="Сохранять результат в файл"
                    checked={saveSpectraResult}
                    name="saveSpectraResult"
                    onChange={(e) => setSaveSpectraResult(e.target.checked)}
                    groupClassName="mb-2"
                  />
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleSave} disabled={isInvalidMethodName || !canCreateMethod}>
          Сохранить
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Отмена
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MeasurementMethodModal;
