import {
  Container, Spinner, Tab, Tabs,
} from 'react-bootstrap';
import { Allotment } from 'allotment';

import { useSelector } from 'react-redux';
import AutosamplerParams from './Parameters';
import SampleCooling from './SampleCooling';
import WashTab from './Wash';
import SingleInjectionTab from './SingleInjection';
import AutosamplerControl from './AutosamplerControl';
import {
  selectIsAutosamplerConnected, selectIsAutosamplerLoading, selectLocalAutoMode,
} from '../../services/selectors/autosampler/autosamplerBase';
import { AUTOSAMPLER_MODES } from '../../constants/constants';
import { selectIsAutosamplerChosen } from '../../services/reduxImportDispatcher';

function AutosamplerTab(props) {
  const isAutoLoading = useSelector(selectIsAutosamplerLoading);
  const mode = useSelector(selectLocalAutoMode);
  const autosamplerIsChosen = useSelector(selectIsAutosamplerChosen);
  const isAutosamplerConnected = useSelector(selectIsAutosamplerConnected);

  if (!autosamplerIsChosen) {
    return (
      <Container
        fluid
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ height: '100%', minHeight: '300px' }}
      >
        <div className="mt-3 fw-semibold text-muted">
          Автосемплер не выбран в подключении узлов
        </div>
      </Container>
    );
  }

  if (!isAutosamplerConnected) {
    return (
      <Container
        fluid
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ height: '100%', minHeight: '300px' }}
      >
        <div className="mt-3 fw-semibold text-muted">
          Потеря связи с автосамплером
        </div>
      </Container>
    );
  }

  if (isAutoLoading) {
    return (
      <Container
        fluid
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ height: '100%', minHeight: '300px' }}
      >
        <Spinner animation="border" role="status" variant="primary" />
        <div className="mt-3 fw-semibold text-muted">
          Автосемплер загружается, пожалуйста подождите…
        </div>
      </Container>
    );
  }

  const isNoneMode = mode === AUTOSAMPLER_MODES.NONE;

  const isConnectedAndInNoneOrMode = (targetMode) => isAutosamplerConnected && (isNoneMode || mode === targetMode);

  const disabledMap = {
    control: !isConnectedAndInNoneOrMode(AUTOSAMPLER_MODES.AUTOSAMPLER_PROGRAM),
    wash: !isConnectedAndInNoneOrMode(AUTOSAMPLER_MODES.WASH),
    singleInjection: !isConnectedAndInNoneOrMode(AUTOSAMPLER_MODES.SINGLE_INJECTION),
  };

  return (
    <Allotment>
      <Allotment.Pane minSize={600}>
        <Tabs
          defaultActiveKey={isNoneMode ? "control" : mode}
          className="mb-3"
        >

          <Tab eventKey="control" title="Управление" disabled={disabledMap.control}>
            <AutosamplerControl />
          </Tab>
          <Tab eventKey="wash" title="Промывка" disabled={disabledMap.wash}>
            <WashTab />
          </Tab>
          <Tab eventKey="singleInjection" title="Одна инжекция" disabled={disabledMap.singleInjection}>
            <SingleInjectionTab />
          </Tab>

        </Tabs>
      </Allotment.Pane>
      <Allotment.Pane preferredSize={400} minSize={350} snap>
        <div style={{
          padding: '0.5rem 1rem', display: 'flex', flexWrap: 'wrap', width: '100%', height: '100%'
        }}
        >
          <SampleCooling />
          <AutosamplerParams />
        </div>
      </Allotment.Pane>
    </Allotment>
  );
}

export default AutosamplerTab;
