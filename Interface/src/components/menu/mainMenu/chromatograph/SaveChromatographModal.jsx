import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { SESSION_CHROMATOGRAPH_NAME } from '../../../../constants/fallbacks';

function SaveChromatographModal({
  show, onClose, nameAndSubmitConfig, chosenChromatograph,
}) {
  const formattedChromatographName = chosenChromatograph === SESSION_CHROMATOGRAPH_NAME ? '' : chosenChromatograph;
  const [chromatographName, setChromatographName] = useState(formattedChromatographName);
  const [invalidName, setInvalidName] = useState(false);

  const handleSave = () => {
    const trimmedName = chromatographName.trim();
    if (!trimmedName || trimmedName === SESSION_CHROMATOGRAPH_NAME) {
      setInvalidName(true);
      return;
    }

    nameAndSubmitConfig(trimmedName);
    onClose(); 
  };

  const handleClose = () => {
    onClose(); 
  };

  const blurAndSubmit = useCallback(() => {
    const active = document.activeElement;

    if (active && typeof active.blur === 'function') {
      active.blur();
    }

    requestAnimationFrame(() => handleSave());
  }, [chromatographName, nameAndSubmitConfig, onClose]);

  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e) => {
      if (e.key !== 'Enter') return;

      const active = document.activeElement;
      const tag = active?.tagName;

      // allow native behavior where it matters
      if (['TEXTAREA', 'BUTTON'].includes(tag)) return;

      e.preventDefault();
      blurAndSubmit();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, blurAndSubmit]);

  return (
    <Modal show={show} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Сохранить конфигурацию хроматографа</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="chromatographName">
            <Form.Label>Имя хроматографа</Form.Label>
            <Form.Control
              type="text"
              placeholder="Введите имя хроматографа"
              value={chromatographName}
              onChange={(e) => setChromatographName(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Отмена
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Да
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SaveChromatographModal;
