import React from 'react';
import {
  Form, Row, Col, Container,
} from 'react-bootstrap';

function CheckboxTable({ sections, handleCheckboxChange }) {
  return (
    <Container fluid>
      <Form>
        <h5>Разделы</h5>
        <Row>
          <Col>
            <Form.Check
              type="checkbox"
              label="Файл град. зав."
              checked={sections.calibFile}
              onChange={() => handleCheckboxChange('calibFile')}
            />
            <Form.Check
              type="checkbox"
              label="Прибор"
              checked={sections.instrument}
              onChange={() => handleCheckboxChange('instrument')}
            />
            <Form.Check
              type="checkbox"
              label="Детектор"
              checked={sections.detector}
              onChange={() => handleCheckboxChange('detector')}
            />
            <Form.Check
              type="checkbox"
              label="Насосы"
              checked={sections.pumps}
              onChange={() => handleCheckboxChange('pumps')}
            />
          </Col>
          <Col>
            <Form.Check
              type="checkbox"
              label="Термостат колонок"
              checked={sections.thermostat}
              onChange={() => handleCheckboxChange('thermostat')}
            />
            <Form.Check
              type="checkbox"
              label="Колонка"
              checked={sections.column}
              onChange={() => handleCheckboxChange('column')}
            />
            <Form.Check
              type="checkbox"
              label="Элюент"
              checked={sections.eluent}
              onChange={() => handleCheckboxChange('eluent')}
            />
            <Form.Check
              type="checkbox"
              label="Град. таблица"
              checked={sections.calibTable}
              onChange={() => handleCheckboxChange('calibTable')}
            />
          </Col>
          <Col>            
            <Form.Check
              type="checkbox"
              label="График"
              checked={sections.plot}
              onChange={() => handleCheckboxChange('plot')}
            />
            <Form.Check
              type="checkbox"
              label="Показ. качества"
              checked={sections.qualityDisplay}
              onChange={() => handleCheckboxChange('qualityDisplay')}
            />
            <Form.Check
              type="checkbox"
              label="Функция"
              checked={sections.equation}
              onChange={() => handleCheckboxChange('equation')}
            />
            <Form.Check
              type="checkbox"
              label="Дата град. зав."
              checked={sections.calibDate}
              onChange={() => handleCheckboxChange('calibDate')}
            />
          </Col>
          <Col>
            <Form.Check
              type="checkbox"
              label="Дата отчёта"
              checked={sections.reportDate}
              onChange={() => handleCheckboxChange('reportDate')}
            />
            <Form.Check
              type="checkbox"
              label="Версия ПО"
              checked={sections.softwareVersion}
              onChange={() => handleCheckboxChange('softwareVersion')}
            />
          </Col>
        </Row>
      </Form>
    </Container>

  );
}

export default CheckboxTable;
