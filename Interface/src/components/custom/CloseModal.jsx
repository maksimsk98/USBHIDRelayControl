import React from 'react';

import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

function CloseModal({
  show,
  handlePrimaryAction,
  handleSecondaryAction,
  handleHide,
  title,
  body,
  primaryLabel,
  secondaryLabel,
}) {
  return (
    <Modal show={show} onHide={handleHide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handlePrimaryAction}>
          {primaryLabel}
        </Button>
        <Button variant="secondary" onClick={handleSecondaryAction}>
          {secondaryLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CloseModal;
