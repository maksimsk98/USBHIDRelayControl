import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useTernaryFork } from './useTernaryFork';
import { getFreshNeedsToConfirm } from '../services/thunks/tabs/tabsThunk';
import useElectronAPI from './useElectronAPI';

export const useConfirmOnExit = ({ onSave, onExit } = {}) => {
  const dispatch = useDispatch();

  const {
    showConfirmModal,
    message,
    labels,
    promptTernaryFork,
    handleConfirm,
    handleDecline,
    handleCancel,
  } = useTernaryFork();

  const stateRef = useRef({});
  stateRef.current = { onSave, onExit, promptTernaryFork };
  const { isElectron, getElectronAPI } = useElectronAPI();

  const handleAttemptClose = useCallback(async () => {
    const {
      promptTernaryFork,
      onSave,
      onExit,
    } = stateRef.current;

    if (document.activeElement) {
      document.activeElement.blur();
    }

    // Wait for any blur handlers to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Always re-fetch from stateRef after await
    const { needsConfirmation, changedNames } = await dispatch(getFreshNeedsToConfirm()).unwrap();

    if (!needsConfirmation) {
      onExit?.();
      if (isElectron) getElectronAPI().confirmClose(); // allow close
      return;
    }

    const choice = await promptTernaryFork({
      message: `Сохранить изменения перед выходом? ${
        changedNames?.length
          ? `\nНе сохраненные данные в: ${changedNames.join(', ')}`
          : ''
      }`,
      acceptLabel: 'Сохранить',
      declineLabel: 'Выйти без сохранения',
      cancelLabel: 'Отмена',
    });

    if (choice === 'accept') {
      const result = onSave?.();
      if (result instanceof Promise) await result;
      onExit?.();
      if (isElectron) getElectronAPI().confirmClose(); // allow close
    } else if (choice === 'decline') {
      onExit?.();
      if (isElectron) getElectronAPI().confirmClose(); // allow close
    } else {
      console.log('Закрытие отменено пользователем');
    }
  }, []);

  const handleBeforeUnload = useCallback(async (event) => {
    if (document.activeElement) {
      document.activeElement.blur();
    }

    // Wait for any blur handlers to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Always re-fetch from stateRef after await
    const { needsConfirmation, changedNames } = await dispatch(getFreshNeedsToConfirm()).unwrap();

    if (!needsConfirmation) return;
    event.preventDefault();
    event.returnValue = ''; // native browser confirm dialog
  }, []);

  useEffect(() => {
    // Electron branch
    if (isElectron) {
      const eAPI = getElectronAPI();
      eAPI.onAttemptClose(handleAttemptClose);
      return () => {
        eAPI.offAttemptClose?.(handleAttemptClose);
      };
    }

    // Browser branch
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleAttemptClose, handleBeforeUnload, isElectron, getElectronAPI]);

  return {
    showConfirmModal,
    message,
    labels,
    handleConfirm,
    handleDecline,
    handleCancel,
  };
};
