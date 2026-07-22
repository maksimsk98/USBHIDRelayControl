import { configureStore } from '@reduxjs/toolkit';


import pumpProgramReducer from './slices/pumpProgramSlice';
import chromaMiscReducer from './slices/chromaMiscSlice';
import measurementReducer from './slices/measurementSlice';
import passportReducer from './slices/passportSlice';
import nodesReducer from './slices/nodeSlice';
import chromaPlotsReducer from './slices/chromaPlotsSlice';
import thermostatReducer from './slices/thermostatSlice';
import statusReducer from './slices/statusSlice';
import tabReducer from './slices/tabSlice';
import plotViewReducer from './slices/plotViewSlice';
import changeTrackerReducer from './slices/changeTrackerSlice';
import reportReducer from './slices/reportSlice';
import peaksReducer from './slices/peaksSlice';
import filesReducer from './slices/fileSlice';
import calibrationReducer from './slices/calibrationSlice';
import methodReducer from './slices/methodSlice';
import configReducer from './slices/configSlice';
import errorsReducer from './slices/errorsSlice';
import mainIsocratReducer from './slices/mainIsocratSlice';
import warningsReducer from './slices/warningSlice';
import mainGradientReducer from './slices/mainGradientSlice';
import deggaserReducer from './slices/degasserSlice';
import autosamplerReducer from './slices/autosamplerSlice';
import packagesReducer from './slices/packagesSlice';
import appReducer from './slices/appSlice';
import spectroStepsReducer from './slices/spectroStepsSlice';
import spectroPlotsReducer from './slices/spectroPlotsSlice';
import spectroMiscReducer from './slices/spectroMiscSlice';
import calibMetaReducer from './slices/calibMetaSlice';
import sessionReducer from './slices/sessionSlice'

import stepReducer from './slices/detectorSlices/internalStepsSlice';
import DADReducer from './slices/detectorSlices/DADStepsSlice';
import RIDReducer from './slices/detectorSlices/RIDStepsSlice';

import changeOpenedTrackerMiddleware from './middlewares/changeTrackerMiddleware';
import { autoMeasurementListener } from './middlewares/autoMeasStatusListener';
import { autosamplerStatusListener } from './middlewares/autosamplerStatusListener';
import { measurementListener } from './middlewares/measStatusListener';
import { filesGCListener } from './middlewares/fileGC';
import { packagesGCListener } from './middlewares/packageGC';
import { methodListener } from './middlewares/methodListener';
import { detectorChangeListener } from './middlewares/detectorChangeListener';
import { autosamplerChangeListener } from './middlewares/autosamplerChangeListener';
import { deleteMeasListenerMiddleware } from './middlewares/deleteMeasMiddleware';

export default configureStore({
  reducer: {
    stepReducer,
    pumpProgramReducer,
    chromaMiscReducer,
    measurementReducer,
    passportReducer,
    nodesReducer,
    chromaPlotsReducer,
    thermostatReducer,
    statusReducer,
    tabReducer,
    plotViewReducer,
    changeTrackerReducer,
    reportReducer,
    peaksReducer,
    filesReducer,
    calibrationReducer,
    methodReducer,
    config: configReducer,
    errorsReducer,
    mainIsocratReducer,
    warningsReducer,
    mainGradientReducer,
    deggaserReducer,
    autosamplerReducer,
    packagesReducer,
    appReducer,
    spectroStepsReducer,
    spectroPlotsReducer,
    spectroMiscReducer,
    calibMetaReducer,
    sessionReducer,
    DADReducer,
    RIDReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
  }).prepend(
    changeOpenedTrackerMiddleware.middleware,
    measurementListener.middleware,
    autosamplerStatusListener.middleware,
    autoMeasurementListener.middleware,
    filesGCListener.middleware,
    packagesGCListener.middleware,
    methodListener.middleware,
    detectorChangeListener.middleware,
    autosamplerChangeListener.middleware,
    deleteMeasListenerMiddleware.middleware,
  ),
});
