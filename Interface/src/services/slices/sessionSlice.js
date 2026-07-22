import { createSlice } from '@reduxjs/toolkit';

// Initial state of the slice
const initialState = {
  sessionId: null,
};

// Creating the slice
/* eslint-disable no-param-reassign */
const sessionSlice = createSlice({
  name: 'tab',
  initialState,
  reducers: {
    setSessionId: (state, action) => {
      const sessionId = action.payload;
      state.sessionId = sessionId;
    },
  },
});
/* eslint-disable no-param-reassign */

export const sessionActions = sessionSlice.actions;
export default sessionSlice.reducer;
