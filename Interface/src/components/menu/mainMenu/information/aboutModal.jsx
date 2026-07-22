import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectBuildInfo } from '../../../../services/reduxImportDispatcher';
import { APP_VERSION } from '../../../../version';

function AboutModal({ show, onClose }) {
  const { backendVersion, buildDate, fullVersion } = useSelector(selectBuildInfo);
  const frontendVersion = APP_VERSION;
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>О программе</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <p className="mb-1">Программа автоматизации</p>
        <p className="mb-3">хроматографического анализа</p>
        <p>
          <strong>ПикЭкспертВеб</strong>
        </p>
        <p>{`Версия модуля приборов ${backendVersion ?? 'не известна'}`}</p>
        <p>{`Версия интерфейса ${frontendVersion ?? 'не известна'}`}</p>
        <p>{`Версия сборки ${fullVersion ?? 'не известна'}`}</p>

        {(buildDate != null && <p>{buildDate}</p>)}
        <p>ООО "ЛММ"</p>
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="secondary" onClick={onClose}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AboutModal;
