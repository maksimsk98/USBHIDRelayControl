export async function pickFolderAndSet(setter) {
  if (typeof window === 'undefined' || !window.electronAPI || typeof window.electronAPI.pickFolder !== 'function') {
    console.warn('pickFolderAndSet: Electron API not available — noop');
    return;
  }

  try {
    const res = await window.electronAPI.pickFolder();
    if (!res || res.canceled) return;

    if (!res.writable) {
      console.warn('Rejected non-writable folder:', res.path);
      alert('Выбранная папка недоступна для записи');
      return;
    }

    setter(res.path);
  } catch (err) {
    console.error('pickFolderAndSet failed', err);
  }
}
