import CorrectionSelector from './CorrectionSelector';
import SensitivitySelector from './SesitivitySelector';
import { DETECTOR_TYPES } from '../../../constants/constants';
import AveragingSelector from './AveragingSelector';

function SpectroMeasParams({ tabId, detectorType }) {
  const isPanorama = detectorType === DETECTOR_TYPES.PANORAMA || detectorType === DETECTOR_TYPES.PANORAMA2;

  return (
    <div className="d-flex flex-column mt-1 mb-1">
      <AveragingSelector detectorType={detectorType} tabId={tabId} />
      {isPanorama && <SensitivitySelector tabId={tabId} />}
      {isPanorama && <CorrectionSelector tabId={tabId} />}
    </div>
  );
}

export default SpectroMeasParams;
