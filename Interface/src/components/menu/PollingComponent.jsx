import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchStatusData } from '../../services/thunks/statusPollingThunk';
import { fetchNodes } from '../../services/thunks/nodes/nodesThunks';
import { fetchMethods } from '../../services/thunks/method/methodThunks';
import { fetchConfig } from '../../services/thunks/config/configThunks';
import { fetchErrors } from '../../services/thunks/errors/errorsThunks';
import { fetchAutoMeasurementData } from '../../services/thunks/autosampler/autoMeasurementThunks';
import { selectStreamedIdAndMode } from '../../services/selectors/selectStreamedIdAndMode';
import { fetchMeasurementPointsThunk } from '../../services/thunks/fetchMeasurementPointsThunk';
import { selectSessionId } from '../../services/selectors/session/sessionBase';
import { io } from 'socket.io-client';
import { configActions, nodeActions } from '../../services/reduxImportDispatcher';

function PollingComponent(props) {
  const dispatch = useDispatch();

  const sessionId = useSelector(selectSessionId)

  useEffect(() => { // we need available nodes, to apply config conditionally when only availabe nodes are sent by config, the same with methods
    const fetch = async () => {
      await dispatch(fetchNodes());
      await dispatch(fetchMethods());
      await dispatch(fetchConfig({initSetup: true}));
    };
    fetch();
  }, [dispatch]);

  useEffect(() => {
    let statusTimeout;
    let errorsTimeout;

    const pollStatus = async () => {
      await dispatch(fetchStatusData());
      statusTimeout = setTimeout(pollStatus, 1000); // Set the polling interval to 10 seconds
    };

    const pollErrors = async () => {
      await dispatch(fetchErrors());
      errorsTimeout = setTimeout(pollErrors, 10000); // Set the polling interval to 10 seconds
    };

    pollStatus();
    pollErrors();
    /* console.log('atached polling timout'); */

    // Cleanup interval on component unmount
    return () => {
      clearTimeout(statusTimeout);
      clearTimeout(errorsTimeout);
    };
  }, []);

  const { streamedId, mode } = useSelector(selectStreamedIdAndMode);

  useEffect(() => {
    let timeout = null;
    let interval = null;
    let didCancel = false;

    if (!streamedId) return;

    if (mode === 'manual') {
      const fetchMeasurementData = async () => {
        if (didCancel) return;
        await dispatch(fetchMeasurementPointsThunk(streamedId));
        if (didCancel) return;
        timeout = setTimeout(fetchMeasurementData, 1000);
      };

      fetchMeasurementData();
      console.log('Started manual polling for', streamedId);
    }

    if (mode === 'auto') {
      interval = setInterval(() => {
        dispatch(fetchAutoMeasurementData(streamedId));
      }, 1000);
      console.log('Started auto polling for', streamedId);
    }

    return () => {
      didCancel = true;
      if (timeout) {
        clearTimeout(timeout);
        console.log('Cleared manual polling timeout', streamedId);
      }
      if (interval) {
        clearInterval(interval);
        console.log('Cleared auto polling interval', streamedId);
      }
    };
  }, [streamedId, mode, dispatch]);

  useEffect(() => {
    if (sessionId == null) return;

    const socket = io("http://localhost:5000", {
      auth: { sessionId },
      transports: ["websocket"]
    });

    // handle live device updates
    socket.on("devices:update", (data) => {
      const { snapshot, sessions } = data;
      dispatch(
        nodeActions.setOwnersSnapshot(snapshot)
      );

      // annotate configs with session ownership
      dispatch(configActions.annotateChromatographs({ sessions: data.sessions }));
    });

    return () => socket.disconnect();
  }, [dispatch, sessionId]);

  return null;
}

export default PollingComponent;
