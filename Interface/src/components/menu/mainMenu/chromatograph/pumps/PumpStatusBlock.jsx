import React from 'react';
import {
  Col, Row, ProgressBar, Form, Button,
} from 'react-bootstrap';
import CustomInputGroup from '../../../../custom/CustomInputGroup.jsx';
import { NODE_STATUSES, PUMP_STATE_MESSAGES } from '../../../../../constants/constants.js';

function PumpStatusBlock({
  title,
  flowRate,
  pressure,
  volume,
  volumeMax,
  status,
  state,
  fillLabel = 'Заполнение объема',
  showReleaseButton = true,
  highlightRelease,
  onReleasePressure = null,
  wraperStyle = { width: 'fit-content' },
}) {
  const defaultValue = '-';
  const progress = Math.round((volume / volumeMax) * 100) || 0;

  const statusMessage = status !== NODE_STATUSES.CONNECTED
    ? 'Нет связи с насосом'
    : PUMP_STATE_MESSAGES[state] ?? 'Неизвестно';

  const showButton = showReleaseButton && pressure > 0 && typeof onReleasePressure === 'function';

  return (
    <div>
      <div className="mb-2 fw-bold">{title}</div>
      <div style={wraperStyle}>
        <Row>
          <Col xs={12}>
            <CustomInputGroup label="Расход" value={flowRate ?? defaultValue} unit="мкл/мин" disabled />
          </Col>
        </Row>
        <Row className="flex-nowrap">
          <Col>
            <CustomInputGroup
              label="Давление"
              value={pressure ?? defaultValue}
              unit="МПа"
              disabled
              unitStyle={{ width: 'auto' }}
              siblings={
                    showButton && (
                      <Button
                        onClick={onReleasePressure}
                        style={{ whiteSpace: 'nowrap' }}
                        active={highlightRelease}
                      >
                        Сброс
                      </Button>
                    )
                  }
            />
          </Col>
        </Row>
        <Row>
          <Col>
            <CustomInputGroup label="Объем" value={volume ?? defaultValue} unit="мкл" disabled unitStyle={{ width: 'auto' }} />
          </Col>
        </Row>

        <Row className="mb-1">
          <Col>
            <p className="mb-1" style={{ whiteSpace: 'nowrap' }}>
              {`${fillLabel}: ${progress}%`}
            </p>
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <ProgressBar now={progress} />
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Control readOnly value={statusMessage} />
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default PumpStatusBlock;
