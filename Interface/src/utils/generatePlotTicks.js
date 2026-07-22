import { tickGenerator } from './classes/TickGeneratorSingleton';

export const recalcRangeLayout = (layout, rangeEnd, timeUnit, rangeStart = 0) => {
  if (!rangeEnd || !timeUnit) return layout;
  const [ticksvals, ticktext] = tickGenerator.getTicks(rangeEnd, timeUnit, rangeStart);
  if (rangeEnd) { // if end exists that means xaxis too
    layout.xaxis.tickvals = ticksvals;
    layout.xaxis.ticktext = ticktext;
  }
  return layout;
};
