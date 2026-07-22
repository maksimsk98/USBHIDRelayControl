import { useState, useRef, useCallback } from 'react';

import { Modal, Button } from 'react-bootstrap';

function ConfirmationModal({
  show, message, onConfirm, onCancel,
}) {
  return (
    <Modal show={show} onHide={onCancel} backdrop="static">
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button onClick={onCancel}>Отменить</Button>
        <Button onClick={onConfirm}>Подтвердить</Button>
      </Modal.Footer>
    </Modal>
  );
}

const useConfirmation = () => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState('');
  const resolverRef = useRef(null);

  const promptConfirm = useCallback((msg) => {
    setMessage(msg);
    setShowConfirmModal(true);
    return new Promise((resolve) => {
      resolverRef.current = (result) => {
        resolve(result);
        setShowConfirmModal(false);
        setMessage('');
      };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
  }, []);

  return {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  };
};

export { useConfirmation, ConfirmationModal };
