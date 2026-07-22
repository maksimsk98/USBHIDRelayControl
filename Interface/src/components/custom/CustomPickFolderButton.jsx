import { Button } from 'react-bootstrap';
import { pickFolderAndSet } from '../../utils/electroFS';
import useElectronAPI from '../../hooks/useElectronAPI';

export function CustomPickFolderButton({ setFolder }) {
  const { isElectron } = useElectronAPI();

  const handleClick = () => {
    if (!isElectron) return;
    pickFolderAndSet(setFolder);
  };

  return (
    <Button
      size="sm"
      variant="outline-secondary"
      onClick={handleClick}
      disabled={!isElectron}
      style={{ whiteSpace: 'nowrap' }}
    >
      Выбрать папку
    </Button>
  );
}
