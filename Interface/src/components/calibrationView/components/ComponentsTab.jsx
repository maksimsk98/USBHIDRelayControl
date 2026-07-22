import React from 'react';
import { Allotment } from 'allotment';

import ComponentTable from './ComponentTable.jsx';
import BottomPane from '../sharedComponents/BottomPane';

function CalibComponents(props) {
  const { parentId } = props.params;
  return (
    <div style={{ height: '100%', width: '100%', paddingTop: '5px' }}>
      <Allotment vertical defaultSizes={[80, 320]}>
        <Allotment.Pane minSize={25}>
          <ComponentTable parentId={parentId} />
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <BottomPane parentSubTab="calibComponents" />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default CalibComponents;
