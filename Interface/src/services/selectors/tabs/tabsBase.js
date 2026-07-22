export const selectActiveTab = (state) => state.tabReducer.activeTab;
export const selectActiveSubTabByTab = (state, parentId) => state.tabReducer.activeSubTabMap[parentId] ?? null;
export const selectCloseHandlers = (state) => state.tabReducer.closeHandlers;
