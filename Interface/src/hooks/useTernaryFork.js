import { useState, useRef, useCallback } from 'react';
import { Modal, Button } from 'react-bootstrap';

function TernaryForkModal({
  show,
  message,
  labels,
  onConfirm,
  onDecline,
  onCancel,
}) {
  return (
    <Modal show={show} onHide={onCancel} backdrop="static">
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button onClick={onConfirm}>{labels.accept}</Button>
        <Button onClick={onDecline}>{labels.decline}</Button>
        <Button onClick={onCancel}>{labels.cancel}</Button>
      </Modal.Footer>
    </Modal>
  );
}

const useTernaryFork = () => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState('');
  const [labels, setLabels] = useState({
    accept: 'Да',
    decline: 'Нет',
    cancel: 'Отмена',
  });

  const resolverRef = useRef(null);

  const promptTernaryFork = useCallback(({
    message, acceptLabel, declineLabel, cancelLabel,
  }) => {
    setMessage(message);
    setLabels({
      accept: acceptLabel || 'Да',
      decline: declineLabel || 'Нет',
      cancel: cancelLabel || 'Отмена',
    });
    setShowConfirmModal(true);

    return new Promise((resolve) => {
      resolverRef.current = (result) => {
        resolve(result);
        resolverRef.current = null;
        setShowConfirmModal(false);
        setMessage('');
      };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.('accept');
  }, []);

  const handleDecline = useCallback(() => {
    resolverRef.current?.('decline');
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.('cancel');
  }, []);

  return {
    showConfirmModal,
    message,
    labels,
    promptTernaryFork,
    handleConfirm,
    handleDecline,
    handleCancel,
  };
};

export { useTernaryFork, TernaryForkModal };
