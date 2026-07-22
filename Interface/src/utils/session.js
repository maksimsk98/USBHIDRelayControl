export function buildSessionAvailableNodes(snapshot, sessionId = null) {
  if (!snapshot) return null;

  const extractValues = arr =>
    (arr || [])
      .filter(d => !d.owner || d.owner === sessionId)
      .map(d => d.value);

  const result = {};

  for (const key of Object.keys(snapshot)) {
    if (key === "detectors") {
      result.detectors = {};

      for (const model of Object.keys(snapshot.detectors || {})) {
        result.detectors[model] = extractValues(
          snapshot.detectors[model]
        );
      }
    } else {
      result[key] = extractValues(snapshot[key]);
    }
  }

  return result;
}

export const buildSessionNodesView = (snapshot, sessionId) => {
  if (!snapshot) return null;

  const mapOwnership = (arr = []) =>
    arr.map(d => {
      const ownership =
        d.owner === sessionId ? "mine" :
        d.owner ? "busy" :
        "free";

      return {
        value: d.value,
        owner: d.owner ?? null,
        ownership,
        isOwnedByMe: ownership === "mine",
        isBusy: ownership === "busy",
        isFree: ownership === "free"
      };
    });

  const result = {};

  for (const key of Object.keys(snapshot)) {
    if (key === "detectors") {
      result.detectors = {};

      for (const model of Object.keys(snapshot.detectors)) {
        result.detectors[model] = mapOwnership(
          snapshot.detectors[model]
        );
      }
    } else {
      result[key] = mapOwnership(snapshot[key]);
    }
  }

  return result;
};


