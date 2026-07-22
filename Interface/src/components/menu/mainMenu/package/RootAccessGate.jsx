import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { restoreRootHandle } from '../../../../utils/recentHandlesStore';
import { appActions } from '../../../../services/reduxImportDispatcher';

export default function RootAccessGate({ onReady }) {
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const handle = await restoreRootHandle(); // queryPermission only

        if (handle?.path) dispatch(appActions.setRootPath(handle.path));
        if (!cancelled && handle) onReady?.(handle);
      } catch (e) {
        console.error('Error restoring handle', e);
      }
    })();
    return () => { cancelled = true; };
  }, [onReady]);

  return null; // headless
}
