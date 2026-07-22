import React from 'react';
import {
  Table, Form, Row, Col,
} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { NoiseEvalWrapper } from './NoiseEvalWrapper';
import { selectIsPeakFuncsDisabled } from '../../../services/reduxImportDispatcher';

function CheckboxTable({
  checkboxes, peakTableParams, handleCheckboxChange, handlePeakTableCheckboxChange,
  noiseEvalHandler, parentId,
  canShowRRT,
  canShowPeakValley,
}) {
  const noiseDisabled = useSelector((state) => selectIsPeakFuncsDisabled(state, parentId));

  return (
    <Table bordered style={{ width: '100%', marginBottom: '0px', tableLayout: 'auto' }}>
      <thead>
        <tr>
          <th>Разделы</th>
          <th>Таблица пиков</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <Row style={{ margin: '0px 0px' }}>
              <Col xs="auto">
                <Form.Check
                  type="checkbox"
                  label="Заголовок"
                  name="header"
                  checked={checkboxes.header}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Хроматограф"
                  name="chromatograph"
                  checked={checkboxes.chromatograph}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Детектор"
                  name="detector"
                  checked={checkboxes.detector}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Насосы"
                  name="pumps"
                  checked={checkboxes.pumps}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Термостат"
                  name="thermostat"
                  checked={checkboxes.thermostat}
                  onChange={handleCheckboxChange}
                />
              </Col>
              <Col xs="auto">
                <Form.Check
                  type="checkbox"
                  label="Проба"
                  name="sample"
                  checked={checkboxes.sample}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Комментарий"
                  name="comment"
                  checked={checkboxes.comment}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Колонка"
                  name="column"
                  checked={checkboxes.column}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Элюент"
                  name="eluent"
                  checked={checkboxes.eluent}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Градуировка"
                  name="calibration"
                  checked={checkboxes.calibration}
                  onChange={handleCheckboxChange}
                />
              </Col>
              <Col xs="auto">
                <Form.Check
                  type="checkbox"
                  label="Хроматограмма"
                  name="chromatogram"
                  checked={checkboxes.chromatogram}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Таблица пиков"
                  name="peakTable"
                  checked={checkboxes.peakTable}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Град. таблица"
                  name="calibrationTable"
                  checked={checkboxes.calibrationTable}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Программа изм."
                  name="detectorProgram"
                  checked={checkboxes.detectorProgram}
                  onChange={handleCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Программа насосов"
                  name="pumpProgram"
                  checked={checkboxes.pumpProgram}
                  onChange={handleCheckboxChange}
                />
                <NoiseEvalWrapper
                  parentId={parentId}
                  checked={checkboxes.noiseEval}
                  onChange={noiseEvalHandler}
                  disabled={noiseDisabled}
                />
              </Col>
            </Row>
          </td>
          <td>
            <Row style={{ margin: '0px 0px' }}>
              <Col xs="auto">
                <Form.Check
                  type="checkbox"
                  label="Номер"
                  name="number"
                  checked={peakTableParams.number}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Время выхода"
                  name="exitTime"
                  checked={peakTableParams.exitTime}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Имя компонента"
                  name="componentName"
                  checked={peakTableParams.componentName}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Концентрация"
                  name="concentration"
                  checked={peakTableParams.concentration}
                  onChange={handlePeakTableCheckboxChange}
                />
                {/*                 <Form.Check
                  type="checkbox"
                  label="Реф. конц."
                  name="concentrationRef"
                  checked={peakTableParams.concentrationRef}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Выч. конц."
                  name="concentrationCalc"
                  checked={peakTableParams.concentrationCalc}
                  onChange={handlePeakTableCheckboxChange}
                /> */}
                <Form.Check
                  type="checkbox"
                  label="Высота"
                  name="height"
                  checked={peakTableParams.height}
                  onChange={handlePeakTableCheckboxChange}
                />
              </Col>
              <Col xs="auto">
                <Form.Check
                  type="checkbox"
                  label="Площадь"
                  name="area"
                  checked={peakTableParams.area}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Полуширина"
                  name="halfWidth"
                  checked={peakTableParams.halfWidth}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Асимметрия"
                  name="asymmetry"
                  checked={peakTableParams.asymmetry}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Эффективность"
                  name="efficiency"
                  checked={peakTableParams.efficiency}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Разрешение"
                  name="resolution"
                  checked={peakTableParams.resolution}
                  onChange={handlePeakTableCheckboxChange}
                />
              </Col>
              <Col xs="auto">
                <Form.Check
                  type="checkbox"
                  label="Время отн."
                  name="relativeTime"
                  disabled={!canShowRRT}
                  checked={peakTableParams.relativeTime}
                  onChange={handlePeakTableCheckboxChange}
                />
                <Form.Check
                  type="checkbox"
                  label="Пик/долина"
                  name="peakValley"
                  disabled={!canShowPeakValley}
                  checked={peakTableParams.peakValley}
                  onChange={handlePeakTableCheckboxChange}
                />
              </Col>
            </Row>
          </td>
        </tr>
      </tbody>
    </Table>
  );
}

export default CheckboxTable;
