import { v1 as uuidv1 } from 'uuid';

import { errorsActions } from '../../slices/errorsSlice';
import { axiosSession } from '../../axiosConfig';

export const fetchErrors = () => async (dispatch) => {
  try {
    const response = await axiosSession.get('/api/errors/fetchErrors');

    const fetchedError = response.data ?? null;

    if (fetchedError) {
      // Extract values and handle null cases
      const { device, faultyUnit, issue } = fetchedError;
      const idBase = `${device ?? 0}-${faultyUnit ?? 0}-${issue ?? 0}`;

      // Generate an ID based on available codes, fallback to UUID if all are null
      const errorId = idBase === '0-0-0' ? uuidv1() : idBase;

      dispatch(errorsActions.addError({ fetchedError, errorId }));
    }
  } catch (error) {
    console.log(error.response ? error.response.data.message : error.message);
  }
};
