import { useEffect, useState } from 'react';

export function useCommandAvailability(registry, commandId) {
  const [available, setAvailable] = useState(() => registry.isRegistered(commandId));

  useEffect(() => {
    // если ID поменялся, сразу обновить
    setAvailable(registry.isRegistered(commandId));

    const unsubscribe = registry.onRegistryChange.subscribe((ev) => {
      if (ev.id === commandId) {
        setAvailable(registry.isRegistered(commandId));
      }
    });

    return unsubscribe;
  }, [commandId, registry]);

  return available;
}
