const toStr = (v) => (v == null ? '' : String(v));

export const computeCalibKey = (method, calibration, chromaFileId) => {
  const m = toStr(method);
  const c = toStr(calibration);
  const f = toStr(chromaFileId ?? 'orphan');
  // format: <len>:<value><len>:<value><len>:<value>
  return `${m.length}:${m}:${c.length}:${c}:${f.length}:${f}`;
};
