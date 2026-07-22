import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: {
    isDegasserOn: false,
  },
};

const degasserSlice = createSlice({
  name: 'degasser',
  initialState,
  reducers: {
    setIsDegasserOn: (state, action) => {
      const isDegasserOn = action.payload;
      state.data.isDegasserOn = isDegasserOn;
    },
    toggleDegasser: (state, action) => {
      state.data.isDegasserOn = !state.data.isDegasserOn;
    },
  },
});

export const degasserActions = degasserSlice.actions;
export default degasserSlice.reducer;
