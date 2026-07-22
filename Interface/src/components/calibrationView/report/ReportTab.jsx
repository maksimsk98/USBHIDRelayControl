import React, { useState } from 'react';
import { Allotment } from 'allotment';

import CheckboxTable from './CheckboxTable';
import ReportDetails from './ReportDetails';

function ReportTab(props) {
  const { parentId } = props.params;

  const [sections, setSections] = useState({
    calibFile: true,
    instrument: true,
    detector: true,
    pumps: true,
    column: true,
    thermostat: true,
    eluent: true,
    calibTable: true,
    qualityDisplay: true,
    reportDate: true,
    calibDate: true,
    plot: true,
    softwareVersion: true,
    equation: true,
  });

  const handleCheckboxChange = (section) => {
    setSections({
      ...sections,
      [section]: !sections[section],
    });
  };

  return (
    <div style={{ height: '100%', width: '100%', paddingTop: '5px' }}>
      <Allotment vertical defaultSizes={[80, 320]}>
        <Allotment.Pane minSize={25}>
          <CheckboxTable sections={sections} handleCheckboxChange={handleCheckboxChange} />
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <ReportDetails sections={sections} parentId={parentId} />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default ReportTab;
