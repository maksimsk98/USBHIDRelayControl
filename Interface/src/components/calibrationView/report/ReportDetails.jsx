import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useSelector } from 'react-redux';

import {
  selectActiveCompByTabId, selectBackendVersion, selectCalibDepFormData, selectCalibrationPassport,
  selectCalibrationReport,
} from '../../../services/reduxImportDispatcher';

import PointTable from '../sharedComponents/PointTable';
import CalibPlot from '../sharedComponents/CalibPlot';

import packageJson from '../../../../package.json';
import { safeToFixed } from '../../../utils/validation';

// Helper functions
const getDefinedPumps = (reportData) => {
  const pumps = [];
  
  for (let i = 1; i <= 4; i++) {
    const letter = reportData[`pumpLetter${i}`];
    const name = reportData[`pumpName${i}`];
    const number = reportData[`pumpNumber${i}`];
    
    if (letter && letter.trim() !== '') {
      pumps.push({
        letter,
        name: name || '',
        number: number || ''
      });
    }
  }
  
  return pumps;
};

// Section render helpers
const renderComponentSection = (component) => (
  <Row>
    <Col>
      <strong>Определяемый компонент:</strong>
      {' '}
      <span>{component?.data?.name}</span>
    </Col>
  </Row>
);

const renderOperatorSection = (passportData) => (
  <Row>
    <Col>
      <strong>Оператор:</strong>
      {' '}
      <span>{passportData?.operator}</span>
    </Col>
  </Row>
);

const renderCalibFileSection = (fileName) => (
  <Row>
    <Col>
      <strong>Файл градуировки:</strong>
      {' '}
      <span>{fileName}</span>
    </Col>
  </Row>
);

const renderInstrumentSection = (instrementFabricNumber) => (
  <Row>
    <Col>
      <strong>Хроматограф:</strong>
      {' '}
      <span>{}</span>
      {' '}
      <span>{`№ ${instrementFabricNumber}`}</span>
    </Col>
    <Col />
    <Col />
  </Row>
);

const renderDetectorSection = (detectorName, detectorFabricNumber) => (
  <Row>
    <Col>
      <strong>Детектор:</strong>
      {' '}
      <span>{detectorName}</span>
      {' '}
      <span>{`№ ${detectorFabricNumber}`}</span>
    </Col>
    <Col />
    <Col />
  </Row>
);

const renderPumpsSection = (reportData) => {
  const pumps = getDefinedPumps(reportData);
  
  if (pumps.length === 0) return null;
  
  return pumps.map((pump, index) => (
    <Row key={`pump-${index}`}>
      <Col>
        <strong>{`Насос ${pump.letter}:`}</strong>
        {' '}
        {pump.name && <span>{pump.name}</span>}
        {pump.name && pump.number && <span> </span>}
        {pump.number && <span>{`№ ${pump.number}`}</span>}
      </Col>
      <Col />
      <Col />
    </Row>
  ));
};

const renderThermostatSection = (reportData) => (
  <Row>
    <Col>
      <strong>Термостат колонок:</strong>
      {' '}
      <span>{reportData?.thermostatName}</span>
      {' '}
      <span>{`№ ${reportData?.thermstatNumber}`}</span>
    </Col>
    <Col />
    <Col />
  </Row>
);

const renderColumnSection = (reportData, passportData) => (
  <>
    <Row>
      <Col>
        <strong>Колонка</strong>
        {' '}
        <span>{passportData.column}</span>
      </Col>
      <Col>
        <span>Длина:</span>
        {' '}
        <span>
          {reportData?.columnLength}
          {' '}
          мм
        </span>
      </Col>
      <Col>
        <span>Диаметр:</span>
        {' '}
        <span>
          {reportData?.columnDiameter}
          {' '}
          мм
        </span>
      </Col>
    </Row>
    <Row>
      <Col>
        <span>Сорбент:</span>
        {' '}
        <span>{reportData?.columnSorbent}</span>
      </Col>
      <Col>
        <span>Размер зерна:</span>
        {' '}
        <span>
          {reportData?.columnGranulation}
          {' '}
          мкм
        </span>
      </Col>
      <Col />
    </Row>
  </>
);

const renderEluentSection = (reportData) => (
  <>
    <Row>
      {reportData?.eluentAName && 
        <Col>
          <strong>Элюент A:</strong>
          {' '}
          <span>{reportData?.eluentAName}</span>
        </Col>
      }
      {reportData?.eluentBName && 
        <Col>
          <strong>Элюент B:</strong>
          {' '}
          <span>{reportData?.eluentBName}</span>
        </Col>
      }
    </Row>
    <Row>
      <Col>
        <span>Поток:</span>
        {' '}
        <span>
          {reportData?.eluentFlow}
          {' '}
          мкл/мин
        </span>
      </Col>
    </Row>
  </>
  
);

const renderCalibTableSection = (parentId, component) => (
  <>
    <Row className='mt-2'>
      <Col><strong>Градуировочная таблица:</strong></Col>
    </Row>
    <Row>
      <Col><PointTable parentId={parentId} /></Col>
    </Row>
    <Row className='mb-2'>
      <Col>
        <strong>Время удерживания:</strong>
        {' '}
        <span>
          {component?.data?.retentionTime?.toFixed(2) ?? ''}
          {' '}
          мин
        </span>
      </Col>
    </Row>
  </>
);

const renderPlotSection = (parentId) => (
  <>
    <Row>
      <Col>
        <strong>График градуировочной зависимости:</strong>
      </Col>
    </Row>
    <Row className='mt-2 mb-2'>
      <Col>
        <div style={{ height: '450px', width: '100%' }}>
          <CalibPlot parentId={parentId} parentSubTab="calibReport" />
        </div>
      </Col>
    </Row>
  </>
);

const renderEquationSection = (calibDepData) => (
  <Row>
    <Col>
      <strong>Градуировочная функция:</strong>
      <span>{calibDepData?.equation}</span>
    </Col>
  </Row>
);

const renderQualityDisplaySection = (calibDepData) => (
  <>
    <Row>
      <Col>
        <strong>Показатели качества построения градуировочной зависимости:</strong>
      </Col>
    </Row>
    <Row>
      <Col>
        <span>Относительное СКО:</span>
        {' '}
        <span>
          {safeToFixed(calibDepData?.relError, 5)}
        </span>
      </Col>
    </Row>
    <Row>
      <Col>
        <span>Коэффициент корреляции:</span>
        {' '}
        <span>{safeToFixed(calibDepData?.corrCoef,5)}</span>
      </Col>
    </Row>
  </>
);

const renderCalibDateSection = (passportData) => (
  <Row>
    <Col>
      <strong>Дата построения файла:</strong>
      {' '}
      <span>{passportData?.time}</span>
    </Col>
  </Row>
);

const renderReportDateSection = (formattedDate) => (
  <Row>
    <Col>
      <strong>Дата создания отчёта:</strong>
      {' '}
      <span>{formattedDate}</span>
    </Col>
  </Row>
);

const renderSoftwareVersionSection = (backendVersion) => (
  <Row>
    <Col>
      <strong>Версия ПО "ПикЭксперт":</strong>
      {' '}
      <span>
        VB-
        {backendVersion || 'unknown'}
        {' '}
        VF-
        {packageJson.version}
      </span>
    </Col>
  </Row>
);

// Main component
function ReportDetails({ sections, parentId }) {
  const passportData = useSelector((state) => selectCalibrationPassport(state, parentId));
  const reportData = useSelector((state) => selectCalibrationReport(state, parentId));
  const component = useSelector((state) => selectActiveCompByTabId(state, parentId));
  const calibDepData = useSelector((state) => selectCalibDepFormData(state, parentId));
  const backendVersion = useSelector(selectBackendVersion);

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('ru-RU');

  const {
    fileName, 
    instrementFabricNumber,
    detectorName,
    detectorFabricNumber, 
  } = reportData || {};

  return (
    <Container fluid style={{ height: '100%', overflowY: 'auto' }}>
      {sections.calibFile && renderCalibFileSection(fileName)}
      {renderComponentSection(component)}
      {renderOperatorSection(passportData)}
      
      
      {sections.instrument && renderInstrumentSection(instrementFabricNumber)}
      {sections.detector && renderDetectorSection(detectorName, detectorFabricNumber)}
      {sections.pumps && renderPumpsSection(reportData)}
      {sections.thermostat && renderThermostatSection(reportData)}
      {sections.column && renderColumnSection(reportData, passportData)}
      {sections.eluent && renderEluentSection(reportData)}
      {sections.calibTable && renderCalibTableSection(parentId, component)}
      {sections.plot && renderPlotSection(parentId)}
      {sections.qualityDisplay && renderQualityDisplaySection(calibDepData)}
      {sections.equation && renderEquationSection(calibDepData)}      
      {sections.calibDate && renderCalibDateSection(passportData)}
      {sections.reportDate && renderReportDateSection(formattedDate)}
      {sections.softwareVersion && renderSoftwareVersionSection(backendVersion)}
    </Container>
  );
}

export default ReportDetails;