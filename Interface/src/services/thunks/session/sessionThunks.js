import { createAsyncThunk } from "@reduxjs/toolkit";
import { selectSessionId } from "../../selectors/session/sessionBase";
import { sessionActions } from "../../slices/sessionSlice";
import { axiosSession } from "../../axiosConfig";

export const registerSession = createAsyncThunk(
  'session/register',
  async ( sessionId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(sessionActions.setSessionId(sessionId))
      const response = await axiosSession.post('/api/session/register', { session_id: sessionId });
      return response;
    } catch (e) {
      console.error('Error registering session', e);
      rejectWithValue('Error registering session');
    }
  },
);

export const unregisterSession = createAsyncThunk(
  'session/unregister',
  async ( sessionId, { dispatch, rejectWithValue, getState }) => {
    const effectiveSessionId = sessionId ?? selectSessionId(getState())
    try {
      const response = await axiosSession.post('/api/session/unregister', { session_id: effectiveSessionId });
      dispatch(sessionActions.setSessionId(null))
      return response;
    } catch (e) {
      console.error('Error unregistering session', e);
      rejectWithValue('Error unregistering session');
    }
  },
);