import { createSelector } from "@reduxjs/toolkit";
import { selectSessionId } from "../session/sessionBase";
import { selectNodesData, selectOwnersSnapshot } from "./nodesBase";
import { buildSessionNodesView } from "../../../utils/session";
import { EMPTY_OBJECT } from "../../../constants/constants";
import { selectSelectedChromatograph } from "../config/configBase";

export const selectNodesForSession = createSelector(
  [selectOwnersSnapshot, selectSessionId],
  (ownersSnapshot, sessionId) => {
    const result = buildSessionNodesView(ownersSnapshot, sessionId);
    return result ?? EMPTY_OBJECT;
  }
);

// Effective config selector for posting
export const selectChromatographConfigForPost = createSelector(
  [selectNodesData, selectSelectedChromatograph],
  (nodesData, selectedChromatographName) => ({
    chromatograph: {
      name: selectedChromatographName ?? 'temporaryChromatograph', // fallback name, should not be used
      data: {
        withoutControl: nodesData.withoutControl,

        autosampler: {
          ip: nodesData.autosampler.ip,
          comPort: nodesData.autosampler.comPort,
          getIpAuto: nodesData.autosampler.getIpAuto,
          type: nodesData.autosampler.type,
        },

        detector: {
          portType: nodesData.detector.portType,
          type: nodesData.detector.type,
          chosenDetector: nodesData.detector.chosenDetector,
        },

        pumps: {
          count: nodesData.pumps.count,
          chosenPumps: nodesData.pumps.chosenPumps,
        },

        degasser: {
          chosenDegasser: nodesData.degasser.chosenDegasser,
        },

        thermostat: {
          chosenThermostat: nodesData.thermostat.chosenThermostat,
        },

        nodesPort: nodesData.nodesPort,
      },
    },
  }),
);