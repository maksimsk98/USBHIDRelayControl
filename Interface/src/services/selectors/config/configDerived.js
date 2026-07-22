import { createSelector } from "@reduxjs/toolkit";
import { selectSessionId } from "../session/sessionBase";
import { selectChromatographConfigs } from "./configBase";
import { selectChromatographOwnership } from "./configBase";

export const selectChromatographConfigsForUI = createSelector(
  [selectChromatographConfigs, selectChromatographOwnership, selectSessionId],
  (configs, ownership, sessionId) => {
    if (!configs) return {};

    return Object.entries(configs).reduce((acc, [name, data]) => {
      const owner = ownership?.[name] ?? null;

      acc[name] = {
        ...data,
        owner,
        isTaken: owner && owner !== sessionId,
        isMine: owner === sessionId
      };

      return acc;
    }, {});
  }
);

export const selectIsChromatographMine = createSelector(
  [
    selectChromatographOwnership,
    (state, name) => name,
    (state) => selectSessionId(state),
  ],
  (ownership, name, sessionId) => {
    const owner = ownership?.[name] ?? null;
    return owner === sessionId;
  }
);

export const selectChromatographIsMineOrFree = createSelector(
  [
    selectChromatographOwnership,
    (state, name) => name,
    selectSessionId,
  ],
  (ownership, name, sessionId) => {
    const owner = ownership?.[name] ?? null;

    return owner === null || owner === sessionId;
  }
);