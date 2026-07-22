import { Row, Col } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectDetectorUnit } from '../../../services/reduxImportDispatcher';

function NoiseReportBlock({ parentId, noiseData, docxMode = false }) {
  const {
    noise,
    from,
    to,
    averaging,
  } = noiseData ?? {};

  const hasData = noise != null;

  const unit = useSelector((state) => selectDetectorUnit(state, { tabId: parentId }));

  const fmt5 = (v) => (typeof v === 'number'
    ? Number(v.toFixed(5))
    : v);

  const renderContent = () => (
    <>
      Интервал: от {fmt5(from)} до {fmt5(to)} мин.&nbsp;&nbsp;
      Усреднение: {fmt5(averaging)} сек.&nbsp;&nbsp;
      Значение: {fmt5(noise)} {unit}
    </>
  );

  if (docxMode) {
    return (
      <table style={{ width: '100%', marginTop: 8 }}>
        <tbody>
          <tr>
            <td>
              <strong>Шум</strong>
            </td>
          </tr>

          <tr>
            <td>
              {hasData ? renderContent() : <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Нет данных</span>}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <Row className="mt-2">
      <Col>
        <strong>Шум</strong>
        <div style={{ marginTop: 4 }}>
          {hasData ? renderContent() : <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Нет данных</span>}
        </div>
      </Col>
    </Row>
  );
}

export default NoiseReportBlock;
