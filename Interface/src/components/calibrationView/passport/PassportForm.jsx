import React from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';

import { selectCalibrationPassport } from '../../../services/reduxImportDispatcher';

import CustomInputGroup from '../../custom/CustomInputGroup'; // Make sure to use the path to your CustomInputGroup file
import { READONLY_INPUT_STYLE } from '../../../constants/colors';

function CalibPassportForm({ parentId }) {
  const labelStyle = { minWidth: '110px' };
  const inputStyle = { minWidth: '100px', maxWidth: '250px', ...READONLY_INPUT_STYLE };

  const calibrationInfo = useSelector((state) => selectCalibrationPassport(state, parentId)) || {};

  return (
    <Container fluid style={{ height: '100%', overflowY: 'auto', overflowX: 'auto' }}>
      <Row>
        {/* First column with multiple inputs */}
        <Col md="auto">
          <CustomInputGroup
            label="Детектор:"
            value={calibrationInfo.detector || ''}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
          <CustomInputGroup
            label="Колонка:"
            value={calibrationInfo.column || ''}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
          <CustomInputGroup
            label="Оператор:"
            value={calibrationInfo.operator || ''}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
          <CustomInputGroup
            label="Создана:"
            value={calibrationInfo.time || ''}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
        </Col>

        {/* Second column with multiple inputs */}
        <Col md="auto">
          <CustomInputGroup
            label="Элюент A:"
            value={calibrationInfo.eluentA}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
          <CustomInputGroup
            label="Элюент B:"
            value={calibrationInfo.eluentB}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
          <CustomInputGroup
            label="Поток:"
            value={calibrationInfo.flow || ''}
            unit="мкл/мин"
            readOnly
            inputStyle={{ ...inputStyle, minWidth: '100px', maxWidth: '160px' }} // subtracting from max width width of unit
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
        </Col>

        {/* Third column with multiple inputs */}
        <Col md="auto">
          <CustomInputGroup
            label="Метод:"
            value={calibrationInfo.calibrationType || ''}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
          <CustomInputGroup
            label="Стандарт:"
            value={calibrationInfo.standard || ''}
            readOnly
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            groupClassName="mb-2"
            size="sm"
          />
        </Col>
      </Row>
    </Container>
  );
}

export default CalibPassportForm;
