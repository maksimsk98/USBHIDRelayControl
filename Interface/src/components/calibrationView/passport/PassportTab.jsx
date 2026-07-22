import React from 'react';
import { Allotment } from 'allotment';

import BottomPane from '../sharedComponents/BottomPane';
import PassportForm from './PassportForm';

function CalibPassportTab(props) {
  const { parentId } = props.params;
  return (
    <div style={{ height: '100%', width: '100%', paddingTop: '5px' }}>
      <Allotment vertical defaultSizes={[80, 320]}>
        <Allotment.Pane minSize={25}>
          <PassportForm parentId={parentId} />
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <BottomPane parentSubTab="calibPassport" />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default CalibPassportTab;
