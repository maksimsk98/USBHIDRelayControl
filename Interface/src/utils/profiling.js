export const logBuffer = [];

function patchConsole(method) {
  const original = console[method];
  console[method] = (...args) => {
    logBuffer.push({
      method,
      timestamp: Date.now(),
      args,
    });
    original.apply(console, args);
  };
}

/* ['log', 'warn', 'error', 'info'].forEach(patchConsole); */
