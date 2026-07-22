import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

import { useDispatch, useSelector } from 'react-redux';
import { selectConfigFolders } from '../../../../services/reduxImportDispatcher';
import { CustomPickFolderButton } from '../../../custom/CustomPickFolderButton';
import CustomInputGroup from '../../../custom/CustomInputGroup';
import { saveFoldersThunk } from '../../../../services/thunks/config/configThunks';

function FoldersModal({
  show,
  onClose,
}) {
  const dispatch = useDispatch();
  const foldersFromStore = useSelector(selectConfigFolders);

  const [results, setResults] = useState('');
  const [templates, setTemplates] = useState('');
  const [temporary, setTemporary] = useState('');

  useEffect(() => {
    if (!show) return;

    setResults(foldersFromStore.results);
    setTemplates(foldersFromStore.templates);
    setTemporary(foldersFromStore.temporary);
  }, [show, foldersFromStore]);

  const handleSave = async () => {
    await dispatch(
      saveFoldersThunk({
        results,
        templates,
        temporary,
      }),
    );

    onClose();
  };

  const onResultsChange = (e) => setResults(e.target.value);
  const onTemplatesChange = (e) => setTemplates(e.target.value);
  const onTemporaryChange = (e) => setTemporary(e.target.value);

  const GROUP_STYLE = { flexWrap: 'nowrap', width: '100%' };
  const LABEL_STYLE = { flex: '0 0 360px', justifyContent: 'flex-start' };
  const INPUT_STYLE = { flex: '1 1 auto', minWidth: 0 }; // важно: minWidth 0 чтобы инпут нормально ужимался
  const SIBLING_WRAP_STYLE = { flex: '0 0 auto', marginLeft: 8 };

  return (
    <Modal size="xl" show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Выбор папок для хранения файлов</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <CustomInputGroup
          label="Папка для хранения результатов измерения:"
          value={results}
          onChange={onResultsChange}
          groupClassName="mb-3"
          groupStyle={GROUP_STYLE}
          labelStyle={LABEL_STYLE}
          inputStyle={INPUT_STYLE}
          siblings={(
            <div style={SIBLING_WRAP_STYLE}>
              <CustomPickFolderButton setFolder={setResults} />
            </div>
          )}
        />

        <CustomInputGroup
          label="Папка для хранения методов:"
          value={templates}
          onChange={onTemplatesChange}
          groupClassName="mb-3"
          groupStyle={GROUP_STYLE}
          labelStyle={LABEL_STYLE}
          inputStyle={INPUT_STYLE}
          siblings={(
            <div style={SIBLING_WRAP_STYLE}>
              <CustomPickFolderButton setFolder={setTemplates} />
            </div>
          )}
        />

        <CustomInputGroup
          label="Папка для создания временных файлов:"
          value={temporary}
          onChange={onTemporaryChange}
          groupClassName="mb-3"
          groupStyle={GROUP_STYLE}
          labelStyle={LABEL_STYLE}
          inputStyle={INPUT_STYLE}
          siblings={(
            <div style={SIBLING_WRAP_STYLE}>
              <CustomPickFolderButton setFolder={setTemporary} />
            </div>
          )}
        />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" onClick={handleSave}>
          OK
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FoldersModal;
