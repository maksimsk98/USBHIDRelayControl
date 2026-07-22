import { useState, useEffect, useRef } from 'react';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';

import { useSelector } from 'react-redux';
import { selectIsWritingBaseLine, selectSampleName } from '../../services/reduxImportDispatcher';
import { sanitize } from '../../utils/validation';

function SampleNameModal(props) {
  const {
    show, panelId, onSubmit, onClose,
  } = props;
  const [sampleName, setSampleName] = useState('');
  const inputRef = useRef(null);

  const storedIsWritingBaseline = useSelector((state) => selectIsWritingBaseLine(state, panelId));
  const [isWritingBaseline, setIsWritingBaseline] = useState(storedIsWritingBaseline);

  const handleNameChange = (e) => {
    const raw = e.target.value;
    const sanitized = sanitize(raw, '');
    setSampleName(sanitized);
  };
  const handleBaselineChange = (e) => setIsWritingBaseline(e.target.checked);
  const handleClose = () => onClose(false);
  const handleSubmit = (e) => {
    e?.preventDefault?.();
    onSubmit(sampleName, isWritingBaseline);
    onClose(false);
  };
  const reduxSampleName = useSelector((state) => selectSampleName(state, panelId));

  useEffect(() => {
    if (show) {
      setSampleName(reduxSampleName);
    }
  }, [show, reduxSampleName]);

  return (
    <Modal 
      show={show} onHide={handleClose} backdrop="static" 
      onEntered={() => {
        inputRef.current?.focus();
        inputRef.current?.select(); // выделяем текст для удобства замены
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '18px' }}>Запуск измерения</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <InputGroup style={{ flexWrap: 'nowrap' }} className="mb-1">
            <InputGroup.Text>Название пробы</InputGroup.Text>
            <Form.Control
              ref={inputRef}
              name="sampleName"
              placeholder=""
              value={sampleName}
              onChange={handleNameChange}
              /* style={{maxWidth: "80px", minWidth: "60px"}} */
            />
          </InputGroup>
          <InputGroup style={{ flexWrap: 'nowrap' }} className="mb-3">
            <InputGroup.Checkbox
              name="isAutoFill"
              checked={isWritingBaseline}
              onChange={handleBaselineChange}
            />
            <InputGroup.Text>Записывать базовую линию</InputGroup.Text>
          </InputGroup>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleSubmit}>
          Ок
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Отмена
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SampleNameModal;
