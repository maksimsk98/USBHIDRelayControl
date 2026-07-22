/* export const selectIsSelectedTemplateValidById = createSelector(
  [selectFileEntry, selectTabMethod, selectGeneralMethods],
  (fileEntry, tabMethod, generalMethods) => {
    const frontCalcValidity = generalMethods?.includes(tabMethod)
    if (!fileEntry) return false;
    return fileEntry?.isSelectedTemplateValid ?? frontCalcValidity ??  false
  }
); */
