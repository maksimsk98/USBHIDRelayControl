import React, { useState, useRef } from 'react';
import {
  Overlay, Popover, Button, Form,
} from 'react-bootstrap';

function ChromatogramOptionsOverlay({
  disabled, setOrientation, setNamingMode,
  label = 'Настройки',
}) {
  const [show, setShow] = useState(false);
  const target = useRef(null);

  return (
    <>
      <Button
        style={{ width: '100%' }}
        ref={target}
        onClick={() => setShow(!show)}
        size="sm"
        disabled={disabled}
      >
        {label}
      </Button>

      <Overlay
        target={target.current}
        show={show}
        placement="right"
        onHide={(e) => setShow(false)}
        rootClose
      >
        <Popover>
          <Popover.Body>
            <Form.Group className="mb-2">
              <Form.Label>Название</Form.Label>
              <Form.Select
                size="sm"
                onChange={(e) => setNamingMode(e.target.value)}
              >
                <option value="number">Номер пика</option>
                <option value="time">Время выхода</option>
                <option value="component">Имя компонента</option>
                <option value="component_concentration">Имя и концентрация</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Расположение</Form.Label>
              <Form.Select
                size="sm"
                onChange={(e) => setOrientation(e.target.value)}
              >
                <option value="vertical">Вертикально</option>
                <option value="horizontal">Горизонтально</option>
              </Form.Select>
            </Form.Group>
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
}

export default ChromatogramOptionsOverlay;
