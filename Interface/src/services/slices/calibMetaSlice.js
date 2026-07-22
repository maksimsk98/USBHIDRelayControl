import { createSlice } from '@reduxjs/toolkit';

const initialEntry = {
  calibrationName: '',
  standardName: null, // может отсутствовать
  concentration: null, // может отсутствовать
  concentrationUnits: null, // может отсутствовать

  // NEW readonly fields
  response: null, // 'height' | 'width' | null
  calibrationType: null, // string | null

  reperPeak: null, // string | null
};

const initialState = {
  // [calibName]: initialEntry
};

const norm = (v) => (v === undefined ? null : v);

const calibMetaSlice = createSlice({
  name: 'calibMeta',
  initialState,
  reducers: {
    /**
     * Инициализация записи калибровки
     */
    initCalibration: (state, action) => {
      const { calibName } = action.payload;
      if (!state[calibName]) {
        state[calibName] = { ...initialEntry };
      }

      console.log('1', action.payload);
    },

    /**
     * Backend-authoritative updater
     * - undefined === null
     * - отсутствие поля === null
     * - всегда перебивает
     */
    setCalibrationData: (state, action) => {
      const {
        calibName,
        calibrationName,
        standardName,
        concentration,
        concentrationUnits,
        response,
        calibrationType,
        reperPeak,
      } = action.payload;

      console.log('2', action.payload);

      if (!state[calibName]) {
        state[calibName] = { ...initialEntry };
      }

      // calibrationName — ключ сущности, но backend может его нормализовать
      state[calibName].calibrationName = norm(calibrationName ?? calibName);

      state[calibName].standardName = norm(standardName);
      state[calibName].concentration = norm(concentration);
      state[calibName].concentrationUnits = norm(concentrationUnits);
      state[calibName].response = norm(response);
      state[calibName].calibrationType = norm(calibrationType);
      state[calibName].reperPeak = norm(reperPeak);
    },

    /**
     * Соло-ручка для концентрации
     * null допустим
     */
    setConcentration: (state, action) => {
      const { calibName, value } = action.payload;
      console.log('3', action.payload);
      if (!state[calibName]) {
        state[calibName] = { ...initialEntry };
      }
      state[calibName].concentration = value; // value может быть null
    },

    /**
     * Удалить калибровку
     */
    deleteCalibration: (state, action) => {
      const calibName = action.payload;
      console.log('4', action.payload);
      if (state[calibName]) {
        delete state[calibName];
      }
    },
  },
});

export const calibMetaActions = calibMetaSlice.actions;
export default calibMetaSlice.reducer;
