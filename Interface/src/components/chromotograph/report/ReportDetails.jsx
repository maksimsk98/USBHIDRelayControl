import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useSelector } from 'react-redux';

import DetectorProgramTable from './DetectorProgramTable.jsx';
import CalibrationTable from './ReportCalibrationTable.jsx';
import ReportPeaksTable from './ReportPeakTable.jsx';

import styles from './ReportTable.module.css';
import NoiseReportBlock from './NoiseReportBlock.jsx';
import { selectCalibrationByTabId } from '../../../services/reduxImportDispatcher.js';
import ReportPlot from './ReportPlot.jsx';
import { axiosSession } from '../../../services/axiosConfig.js';

export const mockPeaks = [
  {
    peakNumber: 1,
    time: 125.4, // seconds
    height: 850.2,
    halfwidth: 2.35,
    area: 15200.5,
    component: 'Бензол',
    concentration: 1.23, // mg/L or whatever you use
    asymmetry: 1.05,
    efficiency: 5400,
    resolution: 2.10,
    relativeTime: 1.00,
    peakValley: 0.85,
  },
  {
    peakNumber: 2,
    time: 202.8,
    height: 1120.9,
    halfwidth: 3.15,
    area: 24500.3,
    component: 'Толуол',
    concentration: 0.87,
    asymmetry: 1.12,
    efficiency: 6100,
    resolution: 1.85,
    relativeTime: 1.62,
    peakValley: 0.67,
  },
  {
    peakNumber: 3,
    time: 318.6,
    height: 940.7,
    halfwidth: 2.95,
    area: 19850.0,
    component: 'Ксилол',
    concentration: 0.42,
    asymmetry: 0.98,
    efficiency: 5800,
    resolution: 3.20,
    relativeTime: 2.54,
    peakValley: 0.74,
  },
];

export const mockCalibrationSubstances = [
  {
    index: 1,
    name: 'Бензол',
    retentionTime: 2.14,
    coefficients: {
      k1: 0.123,
    },
    meanSquareDeviationAbs: 0.0042,
    correlationCoefficient: 0.9987,
  },
  {
    index: 2,
    name: 'Толуол',
    retentionTime: 3.87,
    coefficients: {
      k1: 0.256,
    },
    meanSquareDeviationAbs: 0.0061,
    correlationCoefficient: 0.9965,
  },
  {
    index: 3,
    name: 'Ксилол',
    retentionTime: 5.33,
    coefficients: {
      k1: 0.341,
    },
    meanSquareDeviationAbs: 0.0054,
    correlationCoefficient: 0.9923,
  },
];

function ReportDetails({
  passportData,
  checkboxes,
  parentId,
  peakTableParams,
  noiseData,
  docxMode = false,
  calibMetaData,
}) {
  const [username, setUsername] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [permissionsFlat, setPermissionsFlat] = useState({});

  const tabCalib = useSelector((state) => selectCalibrationByTabId(state, parentId));

  const {
    standardName,
    concentration,
    concentrationUnits,
    response,
    calibrationType,
  } = calibMetaData ?? {};

  const effectivelyUsedCalib = calibMetaData?.calibration || tabCalib;

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const { data } = await axiosSession.get('/api/user/current');
        // Handle both null and empty string cases
        if (data.username && data.username !== null && data.username !== 'null') {
          setUsername(data.username);
        } else {
          console.warn('Username is null or empty, user may not be authorized');
          setUsername('');
        }
        
      } catch (error) {
        console.error('Failed to fetch username:', error);
      }
    };

    fetchUsername();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data } = await axiosSession.get('/api/role/current');
          // Handle both null and empty object cases
          if (data.permissions && data.permissions !== null && data.permissions !== 'null') {
            setPermissions(data.permissions);

            // Build a flat list of all permissions
            const flattenPermissions = (node, result = {}) => {
              if (!node) return result;

              result[node.path] = {
                path: node.path,
                title: node.title,
                enabled: node.enabled,
              };

              if (node.children && Array.isArray(node.children)) {
                node.children.forEach((child) => {
                  flattenPermissions(child, result);
                });
              }

              return result;
            };

            const flat = flattenPermissions(data.permissions);
            setPermissionsFlat(flat);
          } else {
            console.warn('Permissions are null or empty, user may not be authorized');
            setPermissions(null);
            setPermissionsFlat({});
          }

      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    };

    fetchRoles();
  }, []);

  const [hiddenPeakCols, setHiddenPeakCols] = useState([]);

  if (docxMode) {
    return (
      <div style={{ width: '100%' }}>

        {checkboxes.chromatograph && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td>
                  <strong>Хроматограф:</strong>
                  {' '}
                  <span>{passportData?.metaData?.chromatographNumber ?? ''}</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.detector && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td>
                  <strong>Детектор:</strong>
                  {' '}
                  <span>
                    {passportData?.metaData?.detectorName ?? ''}
                    {' '}
                    {passportData?.metaData?.detectorFabricNumber ?? ''}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.pumps && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td>
                  <strong>Насос:</strong>
                  {' '}
                  {passportData?.metaData?.pumpName ?? ''}
                </td>
                {passportData?.metaData?.pumpNumber1 && (
                  <td>
                    <strong>Насос A1:</strong>
                    {' '}
                    {passportData.metaData.pumpNumber1}
                  </td>
                )}
                {passportData?.metaData?.pumpNumber2 && (
                  <td>
                    <strong>Насос B1:</strong>
                    {' '}
                    {passportData.metaData.pumpNumber2}
                  </td>
                )}
                {passportData?.metaData?.pumpNumber3 && (
                  <td>
                    <strong>Насос A2:</strong>
                    {' '}
                    {passportData.metaData.pumpNumber3}
                  </td>
                )}
                {passportData?.metaData?.pumpNumber4 && (
                  <td>
                    <strong>Насос B2:</strong>
                    {' '}
                    {passportData.metaData.pumpNumber4}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.thermostat && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td>
                  <strong>Термостат:</strong>
                  {' '}
                  {passportData?.metaData?.thermostatName ?? ''}
                  {' '}
                  {passportData?.metaData?.thermostatNumber ?? ''}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.sample && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td colSpan={2}>
                  <strong>Проба:</strong>
                  {' '}
                  {passportData.sampleName}
                </td>
              </tr>
              <tr>
                <td>Объем:</td>
                <td>
                  {passportData.volume}
                  {' '}
                  мкл
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.comment && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td>
                  <strong>Комментарий:</strong>
                  {' '}
                  {passportData.comment}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.column && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td>
                  <strong>Колонка:</strong>
                  {' '}
                  №
                  {' '}
                  {passportData.columnNum}
                </td>
                <td>
                  Длина:
                  {passportData.length}
                  {' '}
                  мм
                </td>
                <td>
                  Диаметр:
                  {passportData.diameter}
                  {' '}
                  мм
                </td>
              </tr>
              <tr>
                <td>
                  Сорбент:
                  {passportData.sorbent}
                </td>
                <td>
                  Размер зерна:
                  {passportData.particleSize}
                  {' '}
                  мкм
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.eluent && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td colSpan={3}>
                  <strong>Элюент A:</strong>
                  {' '}
                  {passportData.eluentA}
                </td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <strong>Элюент B:</strong>
                  {' '}
                  {passportData.eluentB}
                </td>
              </tr>
              <tr>
                <td>
                  Поток:
                  {passportData.flowRate}
                  {' '}
                  мкл/мин
                </td>
                <td>
                  Давление:
                  {passportData.pressure}
                  {' '}
                  МПа
                </td>
                <td>
                  Температура:
                  {passportData.temperature}
                  {' '}
                  °C
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.calibration && (
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td>
                  <strong>Градуировка:</strong>
                  {' '}
                  {effectivelyUsedCalib ?? '—'}
                </td>

                <td>
                  <strong>Метод:</strong>
                  {' '}
                  {calibrationType ?? '—'}
                </td>

                <td>
                  <strong>Отклик:</strong>
                  {' '}
                  {response
                    ? (response === 'height' ? 'Высота' : 'Площадь')
                    : '—'}
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Стандарт:</strong>
                  {' '}
                  {standardName ?? '—'}
                </td>

                <td>
                  <strong>Концентрация:</strong>
                  {' '}
                  {concentration ?? '—'}
                </td>

                <td>
                  <strong>Ед. изм.:</strong>
                  {' '}
                  {concentrationUnits ?? '—'}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.chromatogram && (
          <table style={{ width: '100%', marginBottom: 10 }}>
            <tbody>
              <tr>
                <td
                  style={{
                    width: 794, // A4 width in px
                    height: 250,
                    verticalAlign: 'top',
                  }}
                >
                  <ReportPlot
                    key={`plot-${parentId}`}
                    parentId={parentId}
                    parentTab="report"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {checkboxes.peakTable && (
          <div style={{ marginTop: 10 }}>
            <strong>
              Таблица пиков
              {hiddenPeakCols.length > 0 && (
                <span style={{ fontWeight: 'normal', color: '#6c757d' }}>
                  {' '}
                  (
                  отсутствуют данные по:
                  {hiddenPeakCols.join(', ')}
                  )
                </span>
              )}
            </strong>

            <ReportPeaksTable
              parentId={parentId}
              peakTableParams={peakTableParams}
              /* mockData={mockPeaks} */
              docxMode={docxMode}
              calibMetaData={calibMetaData}
            />
          </div>
        )}

        {checkboxes.calibrationTable && (
          <div style={{ marginTop: 10 }}>
            <strong>Таблица градуировки</strong>
            <CalibrationTable
              parentId={parentId}
              /* mockData={mockCalibrationSubstances} */
              docxMode={docxMode}
            />
          </div>
        )}

        {checkboxes.detectorProgram && (
          <div style={{ marginTop: 10 }}>
            <strong>Программа измерений</strong>
            <DetectorProgramTable parentId={parentId} docxMode={docxMode} />
          </div>
        )}

        {checkboxes.noiseEval && noiseData && (
          <NoiseReportBlock parentId={parentId} noiseData={noiseData} docxMode />
        )}

      </div>
    );
  }

  return (
    <Container fluid>
      {checkboxes.chromatograph && (
        <Row>
          <Col>
            <strong>Хроматограф:</strong>
            {' '}
            <span>{passportData?.metaData?.chromatographNumber ?? ''}</span>
          </Col>
        </Row>
      )}
      {checkboxes.detector && (
        <Row>
          <Col>
            <strong>Детектор:</strong>
            {' '}
            <span>
              {passportData?.metaData?.detectorName ?? ''}
              {' '}
              {passportData?.metaData?.detectorFabricNumber ?? ''}
            </span>
          </Col>
        </Row>
      )}
      {checkboxes.pumps && (
        <Row>
          <Col>
            <strong>Насос:</strong>
            {' '}
            <span>{passportData?.metaData?.pumpName ?? ''}</span>
          </Col>
          {passportData?.metaData?.pumpNumber1 && (
            <Col>
              <strong>Насос A1:</strong>
              {' '}
              <span>{passportData?.metaData?.pumpNumber1 ?? ''}</span>
            </Col>
          )}
          {passportData?.metaData?.pumpNumber2 && (
            <Col>
              <strong>Насос B1:</strong>
              {' '}
              <span>{passportData?.metaData?.pumpNumber2 ?? ''}</span>
            </Col>
          )}
          {passportData?.metaData?.pumpNumber3 && (
            <Col>
              <strong>Насос A2:</strong>
              {' '}
              <span>{passportData?.metaData?.pumpNumber3 ?? ''}</span>
            </Col>
          )}
          {passportData?.metaData?.pumpNumber4 && (
            <Col>
              <strong>Насос B2:</strong>
              {' '}
              <span>{passportData?.metaData?.pumpNumber4 ?? ''}</span>
            </Col>
          )}
        </Row>
      )}
      {checkboxes.thermostat && (
        <Row>
          <Col>
            <strong>Термостат:</strong>
            {' '}
            <span>
              {passportData?.metaData?.thermostatName ?? ''}
              {' '}
              {passportData?.metaData?.thermostatNumber ?? ''}
              {' '}
            </span>
          </Col>
        </Row>
      )}
      {checkboxes.sample && (
        <>
          <Row>
            <Col>
              <strong>Проба:</strong>
              {' '}
              <span>{passportData.sampleName}</span>
            </Col>
          </Row>
          <Row>
            <Col>
              <span>Объем:</span>
              {' '}
              <span>
                {passportData.volume}
                {' '}
                мкл
              </span>
            </Col>
            <Col />
            {' '}
            {/* Empty column for alignment */}
          </Row>
        </>
      )}
      {checkboxes.comment && (
      <Row className="mt-2">
        <Col>
          <strong>Комментарий:</strong>
          {' '}
          <span>{passportData.comment}</span>
        </Col>
        <Col />
        {' '}
        {/* Empty column for alignment */}
        <Col />
        {' '}
        {/* Empty column for alignment */}
      </Row>
      )}
      {username && (
        <Row className="mt-2">
          <Col>
            <strong>Оператор:</strong>
            {' '}
            <span>{username}</span>
          </Col>
        </Row>
      )}
      {/* Пример отображения ролей - для демонстрации */}
      {/* SemykinV 15.12.2025 11:03 */}
      {/* {Object.keys(permissionsFlat).length > 0 && (
        <Row className="mt-3">
          <Col>
            <strong>Права доступа (пример):</strong>
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '12px'
            }}>
              {Object.values(permissionsFlat).map((perm, index) => (
                <div key={index} style={{
                  marginBottom: '5px',
                  color: perm.enabled ? '#28a745' : '#dc3545'
                }}>
                  <strong>{perm.path}:</strong> {perm.title}
                  <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                    [{perm.enabled ? '✓ Разрешено' : '✗ Запрещено'}]
                  </span>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      )} */}
      {checkboxes.column && (
        <>
          <Row className="mt-2">
            <Col>
              <strong>Колонка:</strong>
              {' '}
              <span>
                №
                {passportData.columnNum}
              </span>
            </Col>
            <Col>
              <span>Длина:</span>
              {' '}
              <span>
                {passportData.length}
                {' '}
                мм
              </span>
            </Col>
            <Col>
              <span>Диаметр:</span>
              {' '}
              <span>
                {passportData.diameter}
                {' '}
                мм
              </span>
            </Col>
          </Row>
          <Row>
            <Col>
              <span>Сорбент:</span>
              {' '}
              <span>{passportData.sorbent}</span>
            </Col>
            <Col>
              <span>Размер зерна:</span>
              {' '}
              <span>
                {passportData.particleSize}
                {' '}
                мкм
              </span>
            </Col>
            <Col />
            {' '}
            {/* Empty column for alignment */}
          </Row>
        </>
      )}
      {checkboxes.eluent && (
        <>
          <Row className="mt-2">
            <Col>
              <strong>Элюент A:</strong>
              {' '}
              <span>{passportData.eluentA}</span>
            </Col>
            <Col />
            {' '}
            {/* Empty column for alignment */}
            <Col />
            {' '}
            {/* Empty column for alignment */}
          </Row>
          <Row>
            <Col>
              <strong>Элюент B:</strong>
              {' '}
              <span>{passportData.eluentB}</span>
            </Col>
            <Col />
            {' '}
            {/* Empty column for alignment */}
            <Col />
            {' '}
            {/* Empty column for alignment */}
          </Row>
          <Row className="mt-2">
            <Col>
              <span>Поток:</span>
              {' '}
              <span>
                {passportData.flowRate}
                {' '}
                мкл/мин
              </span>
            </Col>
            <Col>
              <span>Давление:</span>
              {' '}
              <span>
                {passportData.pressure}
                {' '}
                МПа
              </span>
            </Col>
            <Col>
              <span>Температура:</span>
              {' '}
              <span>
                {passportData.temperature}
                {' '}
                °C
              </span>
            </Col>
          </Row>
        </>
      )}

      {checkboxes.calibration && (
        <>
          <Row>
            <Col>
              <strong>Градуировка:</strong>
              {' '}
              {effectivelyUsedCalib ?? '—'}
            </Col>

            <Col>
              <strong>Метод:</strong>
              {' '}
              {calibrationType ?? '—'}
            </Col>

            <Col>
              <strong>Отклик:</strong>
              {' '}
              {response
                ? (response === 'height' ? 'Высота' : 'Площадь')
                : '—'}
            </Col>
          </Row>

          <Row>
            <Col>
              <strong>Стандарт:</strong>
              {' '}
              {standardName ?? '—'}
            </Col>

            <Col>
              <strong>Концентрация:</strong>
              {' '}
              {concentration ?? '—'}
            </Col>

            <Col>
              <strong>Ед. изм.:</strong>
              {' '}
              {concentrationUnits ?? '—'}
            </Col>
          </Row>
        </>
      )}

      {checkboxes.chromatogram && (
        <Row style={{ marginTop: '5px', marginBottom: '5px' }}>
          <Col>
            <div style={{ height: '250px' }}>
              <ReportPlot key={`plot-${parentId}`} parentId={parentId} parentTab="report" />
            </div>
          </Col>
        </Row>
      )}
      {checkboxes.peakTable && (
        <Row className="mt-4">
          <Col>
            <div className={styles.tableBlock}>
              <strong>
                Таблица пиков
                {hiddenPeakCols.length > 0 && (
                  <span style={{ fontWeight: 'normal', color: '#6c757d' }}>
                    {' '}
                    (
                    отсутствуют данные по:
                    {hiddenPeakCols.join(', ')}
                    )
                  </span>
                )}
              </strong>
              <ReportPeaksTable calibMetaData={calibMetaData} parentId={parentId} peakTableParams={peakTableParams} onHiddenColumnsChange={setHiddenPeakCols} /* mockData={mockPeaks} *//>
            </div>
          </Col>
        </Row>
      )}
      {checkboxes.calibrationTable && (
        <Row className="mt-4">
          <Col>
            <div className={styles.tableBlock}>
              <strong>Таблица градуировки</strong>
              <CalibrationTable parentId={parentId} /* mockData={mockCalibrationSubstances} */ />
            </div>
          </Col>
        </Row>
      )}
      {checkboxes.detectorProgram && (
        <Row className="mt-4">
          <Col>
            <div className={styles.tableBlock}>
              <strong>Программа измерений</strong>
              <DetectorProgramTable parentId={parentId} />
            </div>
          </Col>
        </Row>
      )}

      {checkboxes.noiseEval && (
        <NoiseReportBlock  parentId={parentId} noiseData={noiseData} />
      )}

    </Container>
  );
}

export default ReportDetails;
