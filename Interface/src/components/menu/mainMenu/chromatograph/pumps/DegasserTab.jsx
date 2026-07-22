import React from 'react';
import {
  Form, InputGroup, Container, Button,
} from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';

import useResizeConstraints from '../../../../../hooks/useResizeConstraints.js';
import { selectDegasserState, selectIsDegasserOn } from '../../../../../services/reduxImportDispatcher.js';
import { toggleDegasser } from '../../../../../services/thunks/nodes/nodesControlThunks.js';
import { CONTROLABLE_DEGASSER_STATES, DEGASSER_STATE_MESSAGES } from '../../../../../constants/constants.js';

function DegasserTab(props) {
  const dispatch = useDispatch();
  /* const deggaserState = useSelector() */

  const isOn = useSelector(selectIsDegasserOn);
  const degasserState = useSelector(selectDegasserState);
  const isControlEnabled = CONTROLABLE_DEGASSER_STATES.includes(degasserState);

  useResizeConstraints({
    panelApi: props.api,
    maxHeight: props.params.maxFloatingHeight,
    maxWidth: props.params.maxFloatingWidth,
    minHeight: props.params.minFloatingHeight,
    minWidth: props.params.minFloatingWidth,
  });

  const handleToggleDegasser = () => {
    dispatch(toggleDegasser());
  };

  return (
    <Form style={{ height: '100%', overflow: 'hidden' }} classNames="mt-2">
      <Container style={{ maxWidth: '620px', height: '100%' }}>

        <InputGroup className="mb-3">
          <InputGroup.Text>Состояние</InputGroup.Text>
          <Form.Control
            value={DEGASSER_STATE_MESSAGES[degasserState]}
            readOnly
          />
          <Button
            variant="primary"
            id="degasserToggle"
            onClick={handleToggleDegasser}
            active={isOn}
            style={{ width: '120px' }}
            disabled={!isControlEnabled}
          >
            {isOn ? 'Выключить' : 'Включить'}
          </Button>
        </InputGroup>

      </Container>
    </Form>
  );
}

export default DegasserTab;
