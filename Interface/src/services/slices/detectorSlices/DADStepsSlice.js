import { createStepProgramSlice } from "./createStepProgramSlice";

const LOG_DAD_ON = false;
const logDad = (...args) => {
  if (LOG_DAD_ON) console.log("[dadSlice]", ...args);
};

const CHANNELS = ["A","B","C","D","E","F","G","H"];

const defaultChannel = {
  sample_wl: 254,
  sample_bw: 8,
  reference_wl: 440,
  reference_bw: 50,
  reference_use: true  // as per MK advice prepera for future where they all use
};

class DadMeasurementCreator {
  constructor() {}

  createChannels() {
    return Object.fromEntries(
      CHANNELS.map(c => [c, { ...defaultChannel }])
    );
  }

  createParams() {
    return {
      autoZero: true,
      channels: this.createChannels()
    };
  }

  createSteps() {
    // Minimal default step for canonical shape
    return [{
      from: 0,
      to: 6,
      component: "",
      sample_wl	:	254,
      sample_bw	:	8,
      sample_rate	:	20,
      time_constant	:	10,
    }];
  }

  createFull() {
    return {
      steps: this.createSteps(),
      params: this.createParams(),
      isRedacting: false,
      focusedStep: 0,
      activeStep: null
    };
  }
}

export const dadMeasurementCreator = new DadMeasurementCreator();

const dadSlice = createStepProgramSlice({
  name: "dadSteps",

  helpers: {
    log: logDad,
    defaultMeasurementCreator: dadMeasurementCreator,
  },

  extraReducers: {
    updateChannelField(state, action) {

      const { tabId, channel, field, value } = action.payload;
      if (!state[tabId]) return;

      state[tabId].params.channels[channel][field] = value;

    },

    setReferenceChannel(state, action) {

      const { tabId, channel } = action.payload;
      const entry = state[tabId];
      if (!entry) return;

      const channels = entry.params.channels;
      const selected = channels[channel].reference_use;

      channels[channel].reference_use = !selected;

      console.log(`Channel ${channel} reference_use set to`, channels[channel].reference_use);
    },

    setAutoZero(state, action) {
      const { tabId, autoZero } = action.payload;
      const entry = state[tabId];
      if (!entry) return;

      entry.params.autoZero = autoZero
      
    }

  }

});

export default dadSlice.reducer;
export const dadActions = dadSlice.actions;