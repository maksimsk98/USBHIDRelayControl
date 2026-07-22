import axios from 'axios';
import store from './store';
import { sessionActions } from './slices/sessionSlice';
import { selectSessionId } from './selectors/session/sessionBase';

// we need to be backwards compatible
let sessionId = '';

// This actually blocks module execution
await (async function initializeSession() {
  try {
    sessionId = window.electronAPI ? await window.electronAPI?.getSessionId?.() : '';
    console.log('[axios] sessionId to register:', sessionId);
    
    await axios.post('/api/session/register', { session_id: sessionId });
    store.dispatch(sessionActions.setSessionId(sessionId));
    console.log('[axios] Session registered:', sessionId);
  } catch (err) {
    console.error('[axios] Session registration failed:', err);
  }
})();

// 2. This code won't run until registration completes!
const axiosSession = axios.create({
  baseURL: '/',
});

axiosSession.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const currentSessionId = selectSessionId(state);
    
    if (currentSessionId == null) {
      console.error('SESSION INTERCEPTION FAILED')
      return config;
    }
    
    return {
      ...config,
      params: {
        ...(config.params || {}),
        sessionId: currentSessionId,
      },
    };
  },
  (error) => Promise.reject(error)
);

export { axiosSession };