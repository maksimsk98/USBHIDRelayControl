import {  
  chromaMiscActions,
  passportActions,
  chromaPlotsActions,
  changeTrackerActions,
  peaksActions,
  plotViewActions,
  pumpProgramActions,
  reportActions,
  measurementActions,
  fileActions,
  warningActions,
  selectDetectorType,
  selectEffectiveDetectorType,
} from '../reduxImportDispatcher';
import { selectPermitedToDelete } from '../selectors/selectPermitedToDelete';
import { detectorProgramThunks } from './detectorAwareBranched/detectorAwareStateThunks';


export const combinedDeleteChromaIfPermited = (id) => (dispatch, getState) => {
  try {
    const state = getState();
    const isPermited = selectPermitedToDelete(state, { id });
    
    if (!isPermited) {
      console.warn('not permited to delete chroma');
      return;
    }

    const detectorType = selectEffectiveDetectorType(state, id );

    dispatch(detectorProgramThunks.deleteMeasurement({ detectorType, id }));

    dispatch(chromaMiscActions.deleteMeasurement(id));

    dispatch(passportActions.deleteMeasurement(id));

    dispatch(chromaPlotsActions.deleteMeasurement(id));

    dispatch(changeTrackerActions.deleteMeasurement(id));

    dispatch(peaksActions.deleteMeasurement(id));

    dispatch(plotViewActions.deleteMeasurement(id));

    dispatch(pumpProgramActions.deleteMeasurement(id));

    dispatch(reportActions.deleteMeasurement(id));

    dispatch(warningActions.clearWarningsForTab({ tabId: id }));

    dispatch(measurementActions.closeMeasurement(id));

    dispatch(fileActions.deleteEntryIfOrphan({ id }));

    console.log('CombinedDeleteChroma finished');
  } catch (error) {
    console.error('CombinedDeleteChroma ERROR ', error);
  }
};
