export const selectErrors = (state) => state.errorsReducer.errors;

export const selectUnhandledCriticalPressureErrorId = (state) => {
  const entries = Object.entries(state.errorsReducer.errors);
  for (const [errorId, err] of entries) {
    if (
      err.device === 12500
        && err.faultyUnit === 12560
        && err.issue === 12570
        && err.handled !== true
    ) {
      return errorId;
    }
  }
  return null;
};
