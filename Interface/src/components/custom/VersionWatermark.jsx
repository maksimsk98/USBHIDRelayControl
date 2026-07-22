import { useSelector } from 'react-redux';

import { selectBackendVersion } from '../../services/reduxImportDispatcher';

import styles from './VersionWatermark.module.css'; // Import the CSS module
import packageJson from '../../../package.json';
import { selectSessionId } from '../../services/selectors/session/sessionBase';

function Watermark() {
  const backendVersion = useSelector(selectBackendVersion);
  const sessionId = useSelector(selectSessionId)

  return (
    <div className={styles.watermark}>
      <p>
        VB-
        {backendVersion || 'unknown'}
        <br />
        VF-
        {packageJson.version}
        <br />
        Session-{sessionId || 'Single'}
      </p>
    </div>
  );
}

export default Watermark;
