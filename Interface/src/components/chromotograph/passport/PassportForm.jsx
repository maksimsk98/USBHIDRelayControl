import React, {
  useState, useEffect,
} from 'react';

import { Container, Row, Col } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import { useDispatch, useSelector } from 'react-redux';

import {
  passportActions, selectPassportData, selectSampleName, selectTabMethod,
} from '../../../services/reduxImportDispatcher';

import { formatValueString, isConvertableToNumber, normalizeDecimalInput } from '../../../utils/validation.js';
import { selectStreamedIdAndMode } from '../../../services/selectors/selectStreamedIdAndMode.js';

const useFormState = (storedState) => {
  const [formState, setFormState] = useState(storedState);

  useEffect(() => {
    setFormState(storedState);
  }, [storedState]);

  const handleFloatInputChange = (e) => {
    const newValue = normalizeDecimalInput(e).trim();
    const { name } = e.target;
    let formattedValue = formatValueString(newValue);
    formattedValue = formattedValue === '' ? '0' : formattedValue;

    if (isConvertableToNumber(formattedValue)) {
      setFormState((prevState) => ({
        ...prevState,
        [name]: formattedValue,
      }));
    }
  };

  const handleStringInputChange = (e) => {
    const {
      name, value, type, checked,
    } = e.target;
    let newValue = value.trimStart();

    newValue = newValue.replace(/\s+/g, ' '); // Removing more than 1 space in a row

    setFormState((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : newValue,
    }));
  };

  const handleSampleNameChange = (sampleName) => {
    setFormState((prevState) => ({
      ...prevState,
      sampleName,
    }));
  };

  return {
    formState, handleFloatInputChange, handleStringInputChange, handleSampleNameChange,
  };
};

function PassportForm(props) {
  const { parentId } = props;

  const dispatch = useDispatch();
  const storedPasportData = useSelector((state) => selectPassportData(state, parentId));

  const {
    formState, handleFloatInputChange, handleStringInputChange, handleSampleNameChange,
  } = useFormState(storedPasportData);

  const method = useSelector((state) => selectTabMethod(state, parentId));

  const { streamedId, mode } = useSelector(selectStreamedIdAndMode);

  const isAutoMeas = streamedId === parentId && mode === 'auto'

  const floatInputNames = ['volume', 'dilution', 'particleSize', 'diameter', 'length', 'flow', 'pressure', 'temperature'];

  const handleBlur = (e) => {
    const { name } = e.target;
    let newValue;
    if (floatInputNames.includes(name)) {
      newValue = Number(formState[name]);
    } else {
      newValue = formState[name];
    }
    dispatch(passportActions.updateField({ tabId: parentId, name, value: newValue }));
  };

  const inputMaxWidth = 200;
  const unitMaxWidth = 75;
  const textMaxWidth = 100;
  const inputStyle = { minWidth: '100px', maxWidth: `${inputMaxWidth}px` };
  const textInputStyle = { minWidth: `${textMaxWidth}px` };
  const unitStyle = { width: `${unitMaxWidth}px` };

  const inputWithUnitStyle = { minWidth: '100px', maxWidth: `${inputMaxWidth - unitMaxWidth}px` };

  return (
    <Container fluid style={{ height: '100%', overflowY: 'auto' }}>
      <Row>
        <Col md="auto">
          <h5>Проба</h5>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Название</InputGroup.Text>
            <Form.Control
              name="sampleName"
              value={formState.sampleName}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
              style={inputStyle}
              readOnly={isAutoMeas}
            />
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <Form.Control
              name="extendedName"
              value={formState.extendedName}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
              style={{ maxWidth: `${inputMaxWidth + textMaxWidth}px` }}
            />
          </InputGroup>
          {/*           <InputGroup className="mb-2" size='sm'>
            <InputGroup.Checkbox
              name="calibration"
              checked={formState.calibration}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
            />
            <InputGroup.Text>Градиуровочная</InputGroup.Text>
          </InputGroup> */}
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Объем</InputGroup.Text>
            <Form.Control
              name="volume"
              value={formState.volume}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputWithUnitStyle}
            />
            <InputGroup.Text style={unitStyle}>мкл</InputGroup.Text>
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Разбавление</InputGroup.Text>
            <Form.Control
              name="dilution"
              value={formState.dilution}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputStyle}
            />
          </InputGroup>

          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Метод</InputGroup.Text>
            <Form.Control
              name="method"
              value={method ?? ''}
              readOnly
              disabled
              style={inputStyle}
            />
          </InputGroup>
        </Col>

        <Col md="auto">
          <h5>Колонка</h5>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Номер</InputGroup.Text>
            <Form.Control
              name="columnNum"
              value={formState.columnNum}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
              style={inputStyle}
            />
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Сорбент</InputGroup.Text>
            <Form.Control
              name="sorbent"
              value={formState.sorbent}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
              style={inputStyle}
            />
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Зернение</InputGroup.Text>
            <Form.Control
              name="particleSize"
              value={formState.particleSize}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputWithUnitStyle}
            />
            <InputGroup.Text style={unitStyle}>мкм</InputGroup.Text>
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Диаметр</InputGroup.Text>
            <Form.Control
              name="diameter"
              value={formState.diameter}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputWithUnitStyle}
            />
            <InputGroup.Text style={unitStyle}>мм</InputGroup.Text>
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Длина</InputGroup.Text>
            <Form.Control
              name="length"
              value={formState.length}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputWithUnitStyle}
            />
            <InputGroup.Text style={unitStyle}>мм</InputGroup.Text>
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Checkbox
              name="precolumn"
              checked={formState.precolumn}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
            />
            <InputGroup.Text>Предколонка</InputGroup.Text>
          </InputGroup>
        </Col>

        <Col md="auto">
          <h5>Элюент</h5>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>A</InputGroup.Text>
            <Form.Control
              name="eluentA"
              value={formState.eluentA}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
              style={inputStyle}
            />
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>B</InputGroup.Text>
            <Form.Control
              name="eluentB"
              value={formState.eluentB}
              onChange={handleStringInputChange}
              onBlur={handleBlur}
              style={inputStyle}
            />
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Поток</InputGroup.Text>
            <Form.Control
              name="flow"
              value={formState.flow}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputWithUnitStyle}
            />
            <InputGroup.Text style={unitStyle}>мкл/мин</InputGroup.Text>
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Давление</InputGroup.Text>
            <Form.Control
              name="pressure"
              value={formState.pressure}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputWithUnitStyle}
            />
            <InputGroup.Text style={unitStyle}>МПа</InputGroup.Text>
          </InputGroup>
          <InputGroup className="mb-2" size="sm">
            <InputGroup.Text style={textInputStyle}>Температура</InputGroup.Text>
            <Form.Control
              name="temperature"
              value={formState.temperature}
              onChange={handleFloatInputChange}
              onBlur={handleBlur}
              style={inputWithUnitStyle}
            />
            <InputGroup.Text style={unitStyle}>°C</InputGroup.Text>
          </InputGroup>
        </Col>
        <Col md>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h5>Комментарий</h5>
            <Form.Group controlId="comments" className="mb-2" style={{ minWidth: '300px', flexGrow: 1 }}>
              <Form.Control
                as="textarea"
                style={{ flexGrow: 1, resize: 'none', height: '100%' }}
                name="comment"
                value={formState.comment}
                onChange={handleStringInputChange}
                onBlur={handleBlur}
                size="sm"
              />
            </Form.Group>
          </div>
        </Col>
      </Row>

    </Container>
  );
}

export default PassportForm;
