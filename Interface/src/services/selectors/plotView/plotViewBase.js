import { EMPTY_ARRAY } from '../../../constants/constants';

export const selectPlotView = (state, { parentId }) => state.plotViewReducer[parentId];
export const selectPlotViewPrev = (state, { parentId }) => state.plotViewReducer[parentId]?.prevLayouts ?? EMPTY_ARRAY;
