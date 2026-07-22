import { Modal, Button } from 'react-bootstrap';
import { DETECTOR_MISMATCH_WARNINGS } from '../../constants/warnings';

function WarningModal({ show, handleClose, measurementType }) {
  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static" data-testid="detector-mismatch-warning-modal">
      <Modal.Header closeButton>
        <Modal.Title>Внимание</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {DETECTOR_MISMATCH_WARNINGS[measurementType]}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleClose} data-testid="detector-mismatch-warning-modal-ok-button">
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default WarningModal;
