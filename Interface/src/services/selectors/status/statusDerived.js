import { createSelector } from '@reduxjs/toolkit';
import { selectIsThermostatChosen } from '../nodes/nodesBase';
import { selectIsThermostatConnected } from './statusBase';

export const selectIsThermostatReady = createSelector(
  [selectIsThermostatChosen, selectIsThermostatConnected],
  (isChosen, isConnected) => isChosen && isConnected,
);
