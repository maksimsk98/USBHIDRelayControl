import {
  changeTrackerActions, fileActions, measurementActions, spectroMiscActions, spectroPlotsActions, spectroStepsActions, warningActions,
} from '../reduxImportDispatcher';
import { selectPermitedToDelete } from '../selectors/selectPermitedToDelete';

export const combinedDeleteSpectroIfPermited = (id) => (dispatch, getState) => {
  try {
    const isPermited = selectPermitedToDelete(getState(), { id });

    if (!isPermited) {
      console.warn('not permited to delete chroma');
      return;
    }
    dispatch(spectroStepsActions.deleteEntry(id));
    dispatch(spectroPlotsActions.deleteEntry(id));
    dispatch(spectroMiscActions.deleteEntry(id));

    dispatch(changeTrackerActions.deleteMeasurement(id));
    dispatch(warningActions.clearWarningsForTab({ tabId: id }));
    dispatch(measurementActions.closeMeasurement(id));
    dispatch(fileActions.deleteEntryIfOrphan({ id }));

    console.log(`CombinedDeleteSpectro finished ${id}`);
  } catch (error) {
    console.error('CombinedDeleteSpectro ERROR ', error);
  }
};
