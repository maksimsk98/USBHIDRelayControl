import { useSelector } from "react-redux";
import { DETECTOR_TYPES } from "../../../../constants/constants";
import { selectEffectiveDetectorType } from "../../../../services/reduxImportDispatcher";
import DADParams from "./DAD/DADParams";
import RIDParams from "./RID/RIDParams";

const DetectorParams = (props) => {
  const tabId = props.parentId;
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, tabId ));

  if (detectorType === DETECTOR_TYPES.DAD) {
    return <DADParams tabId={tabId} />;
  } else if (detectorType === DETECTOR_TYPES.RID) {
    return <RIDParams tabId={tabId} />
  }
  return null;
};

export default DetectorParams;