import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedMethod: null, // this is needed in case when no measurement opened and there is nothing to bind selection to
  availableMethods: [],
  openedFilesMethods: {}, // object that will hold file specific methods
  methodsData: {
    null: {
      options: {
        autoMark: true,
        autoSave: true,
        calibrationFolder: '%t\Градуировки',
        folder: '%t',
        minimalTime: 2,
        name: '%y%m%d_%H%M_%s',
        saveBackground: false,
      },
      optionsSp: {
        autoSave: false,
        folder: '%t\Спектры',
        name: 'Спектр_%c',
      },
    },
  },
  loading: false,
  error: null,
};

const methodSlice = createSlice({
  name: 'method',
  initialState,
  reducers: {
    setMethodOptions: (state, action) => {
      state.availableMethods = action.payload;
    },
    setSelectedMethod: (state, action) => {
      state.selectedMethod = action.payload;
    },
    addFileMethod: (state, action) => {
      const { fileId, newMethod } = action.payload;
      if (!state.availableMethods.includes(newMethod)) {
        state.openedFilesMethods[fileId] = newMethod;
      }
    },
    addMethod: (state, action) => {
      const newMethodName = action.payload;
      const methodList = state.availableMethods;
      if (!methodList.includes(newMethodName)) {
        state.availableMethods = [...methodList, newMethodName];
      }
    },
    setRawMethodParams: (state, action) => {
      const { methodName, parameters } = action.payload;
      if (parameters.options && parameters.optionsSp) {
        state.methodsData[methodName] = parameters;
      }
    },
    updateMethodParams: (state, action) => {
      const { methodName, parameters } = action.payload;
      if (parameters.options && parameters.optionsSp) {
        if (state.methodsData[methodName]) {
          state.methodsData[methodName] = {
            ...state.methodsData[methodName],
            ...parameters,
          };
        } else {
          state.methodsData[methodName] = parameters;
        }
      } else {
        console.warn(`Invalid parameters for method: ${methodName}`, parameters);
      }
    },
    clearMethodParams: (state, action) => {
      const { methodName } = action.payload;
      delete state.methodsData[methodName];
    },
  },
});

export const methodActions = methodSlice.actions;
export default methodSlice.reducer;
