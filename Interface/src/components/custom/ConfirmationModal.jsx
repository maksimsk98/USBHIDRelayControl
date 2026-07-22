import { Modal, Button } from 'react-bootstrap';

function ConfirmationModal({
  show, message, onConfirm, onCancel,
}) {
  return (
    <Modal show={show} onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Подтвердите операцию</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Отменить
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Подтвердить
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmationModal;
