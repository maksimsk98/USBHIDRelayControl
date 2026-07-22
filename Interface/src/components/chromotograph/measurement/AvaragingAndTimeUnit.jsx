import { useDispatch, useSelector } from 'react-redux';

import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import {
  chromaMiscActions, selectIsTabInitialized, selectLastXSecMeasured,
} from '../../../services/reduxImportDispatcher.js';

import { EMPTY_OBJECT } from '../../../constants/constants.js';
import { changeAveraging } from '../../../services/thunks/averangingChangeThunk.js';

const getTestId = (name, type) => `averaging-timeunit-${name}-${type}`

function AveragingAndTimeUnit({ parentId }) {
  const dispatch = useDispatch();

  const initialMiscData = useSelector((state) => state.chromaMiscReducer[parentId] ?? EMPTY_OBJECT);
  const { timeUnit, averaging } = initialMiscData;

  const handleTimeUnitChange = (event) => {
    const newTimeUnit = event.target.value;
    dispatch(chromaMiscActions.setTimeUnit({ id: parentId, newTimeUnit }));
  };

  const handleAveragingChange = (event) => {
    const newAveraging = Number(event.target.value);
    dispatch(chromaMiscActions.setAveraging({ id: parentId, newAveraging }));
    dispatch(changeAveraging({ id: parentId, averaging: newAveraging }));
  };

  const latestXSec = useSelector((state) => selectLastXSecMeasured(state, parentId));

  const averagingOptions = [0.2, 1, 2, 5, 10, 15, 20];

  const isInitialized = useSelector((state) => selectIsTabInitialized(state, parentId));

  return (
    <div className="d-flex flex-column mb-2">
      <Form.Group style={{ marginBottom: '43px' }}>
        <Form.Label>Усреднение</Form.Label>
        <InputGroup className="flex-nowrap" size="sm">
          <Form.Select 
            style={{ width: '70px', paddingRight: '30px' }} 
            value={averaging} 
            onChange={handleAveragingChange}
            data-testid={getTestId('averaging', 'select')}
          >
            {averagingOptions.map((opt) => (<option key={opt} disabled={opt > latestXSec && isInitialized} value={opt}>{opt}</option>))}
          </Form.Select>
          <InputGroup.Text>сек.</InputGroup.Text>
        </InputGroup>
      </Form.Group>
      <Form.Group>
        <Form.Label>Ед. времени</Form.Label>
        <Form.Select 
          size="sm" 
          style={{ width: '80px' }} 
          value={timeUnit} 
          onChange={handleTimeUnitChange}
          data-testid={getTestId('timeunit', 'select')}
        >
          <option value="sec">сек.</option>
          <option value="min">мин.</option>
        </Form.Select>
      </Form.Group>
    </div>
  );
}

export default AveragingAndTimeUnit;
