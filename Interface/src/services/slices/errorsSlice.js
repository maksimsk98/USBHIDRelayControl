import { createSlice } from '@reduxjs/toolkit';
import { v1 as uuidv1 } from 'uuid';
import { ERROR_MESSAGES } from '../../constants/errorMessages';

// Initial state
const initialState = {
  errors: {},
};

const errorSlice = createSlice({
  name: 'errors',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.errors = {};
    },
    removeError: (state, action) => {
      const errorId = action.payload;
      delete state.errors[errorId];
    },
    markErrorHandled: (state, action) => {
      const errorId = action.payload;
      if (state.errors[errorId]) {
        state.errors[errorId].handled = true;
      }
    },
    addError: (state, action) => {
      const { fetchedError = {}, errorId = uuidv1() } = action.payload; // WATCHLIST see if it creates new each time

      const {
        device,
        faultyUnit,
        issue,
        errorLogFile,
        message,
        errorMessage,
      } = fetchedError;

      const resolvedMessage = message
        ?? errorMessage
        ?? ERROR_MESSAGES[errorId]
        ?? ERROR_MESSAGES.ui_unknown;

      if (state.errors.hasOwnProperty(errorId)) {
        // If the key exists, increment the occurrence counter
        state.errors[errorId].count += 1;
        state.errors[errorId].handled = false;
      } else {
        // If it's a new key, store the error details and start count at 1
        state.errors[errorId] = {
          device,
          faultyUnit,
          issue,
          errorLogFile,
          message: resolvedMessage,
          count: 1,
          handled: false,
        };
      }
    },
  },
});

export const errorsActions = errorSlice.actions;
export default errorSlice.reducer;
