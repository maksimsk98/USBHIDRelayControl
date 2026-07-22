import { detectorProgramThunks } from "./detectorAwareBranched/detectorAwareStateThunks";

export const detectorSwapThunk =
  ({ measurementId, oldDetectorType, newDetectorType }) =>
  (dispatch) => {

    dispatch(
      detectorProgramThunks.deleteMeasurement({
        detectorType: oldDetectorType,
        id: measurementId,
      })
    );

    dispatch(
        detectorProgramThunks.addChroma({ 
            detectorType: newDetectorType, 
            id: measurementId 
        })
    );


};