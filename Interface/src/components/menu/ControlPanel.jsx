import React from 'react';

import MainMenu from './mainMenu/MainMenu.jsx';

function ControlPanel(props) {
  const { api, activePanelId } = props;

  return (
    <div>
      <MainMenu api={api} />
    </div>
  );
}

export default ControlPanel;
