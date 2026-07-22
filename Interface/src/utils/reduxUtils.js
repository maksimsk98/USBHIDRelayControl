import { cloneDeep } from 'lodash';

export function pushSnapshot(state, sourceId, data, snapMeta = {}) {
  if (!state.snapshots) state.snapshots = {};
  if (!state.snapshots[sourceId]) state.snapshots[sourceId] = [];

  const { reason = 'unnamed' } = snapMeta;

  state.snapshots[sourceId].push({
    snapDate: Date.now(),
    reason,
    data: cloneDeep(data),
  });
}

export function handleCloneOrSnapshot(state, payload, defaultEntry) {
  const { sourceId, targetId, snapMeta } = payload;
  const source = state[sourceId];
  if (!source) return;

  if (targetId === 'selfSnap') {
    pushSnapshot(state, sourceId, source, snapMeta);
    return;
  }

  state[targetId] = {
    ...defaultEntry,
    ...cloneDeep(source),
  };
}
