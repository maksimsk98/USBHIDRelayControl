// DownloadConsoleLog.jsx
import React from 'react';
import Button from 'react-bootstrap/Button';

/**
 * Универсальный хэндлер скачивания.
 * Принимает любой объект (логи, профайл, массив событий и т.д.)
 */
export function downloadConsoleLog(logBuffer) {
  try {
    const blob = new Blob(
      [JSON.stringify(logBuffer, null, 2)],
      { type: 'application/json' },
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'console-log.json';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[downloadConsoleLog] Failed:', err);
  }
}

/**
 * Полноценная кнопка, принимающая logBuffer через пропы.
 */
export default function DownloadConsoleLogButton({ logBuffer }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => downloadConsoleLog(logBuffer)}
    >
      Скачать лог консоли
    </Button>
  );
}
