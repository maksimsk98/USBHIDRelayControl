import React, { useEffect, useRef, useState } from 'react';
import { DockviewReact, DockviewDefaultTab } from 'dockview';
import { Allotment } from 'allotment';

import { useSelector } from 'react-redux';
import CalibDepenedencySubTab from './DependencySubTab.jsx';
import CheckSubTab from './CheckSubTab.jsx';
import CalibPlot from './CalibPlot.jsx';
import { useBottomPane } from './BottomPaneContext.jsx';
import { selectActiveSubTabByTab } from '../../../services/reduxImportDispatcher.js';

const headerComponents = {
  default: (props) => <DockviewDefaultTab hideClose {...props} />,
};

const components = {
  CalibDepenedencySubTab,
  CheckSubTab,
};

function BottomPane({ parentSubTab }) {
  const { parentId, splitSizes, setSplitSizes } = useBottomPane();
  const [api, setApi] = React.useState();
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, parentId));
  const prevTab = useRef(activeSubTab);
  const allotmentRef = React.useRef();
  const plotContainerRef = useRef();
  const [overflowY, setOverflowY] = useState('hidden');

  const onReady = (event) => {
    setApi(event.api);

    event.api.addPanel({
      id: 'CalibDepenedencySubTab',
      component: 'CalibDepenedencySubTab',
      renderer: 'always',
      title: 'Градуировочная зависимость',
      params: {
        parentId,
      },
    });
    event.api.addPanel({
      id: 'CheckSubTab',
      component: 'CheckSubTab',
      renderer: 'always',
      title: 'Проверка',
      params: {
        parentId,
      },
    });

    event.api.getPanel('CalibDepenedencySubTab').api.setActive();
  };

  useEffect(() => {
    if (allotmentRef.current && activeSubTab !== prevTab.current) {
      allotmentRef.current.resize(splitSizes);
      prevTab.current = activeSubTab; // 🔹 Update previous tab after resizing
    }
  }, [splitSizes, activeSubTab]);

  const minWidthOfPlot = 250;
  const minHeightOfPlot = 230;

  useEffect(() => {
    if (!plotContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height < minHeightOfPlot) {
          setOverflowY('auto');
        } else {
          setOverflowY('hidden');
        }
      }
    });

    observer.observe(plotContainerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Allotment
        ref={allotmentRef}
        vertical={false}
        defaultSizes={splitSizes}
        onChange={setSplitSizes} // Save split position on resize
      >
        <Allotment.Pane minSize={50}>
          <DockviewReact
            onReady={onReady}
            components={components}
            className="CalibComponentsSubTabs"
            defaultTabComponent={headerComponents.default}
          />
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <div
            ref={plotContainerRef}
            style={{ // this div ensures scroll of plot on min width, because pane doesn't pass style
              height: '100%',
              overflowY,
              overflowX: splitSizes[1] > minWidthOfPlot ? 'hidden' : 'auto',
              /* transition: 'overflow 0.2s ease-in-out', */
              width: '100%',
            }}
          >
            <div style={{
              minWidth: `${minWidthOfPlot}px`,
              minHeight: `${minHeightOfPlot}px`,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
            }}
            >
              <CalibPlot parentId={parentId} parentSubTab={parentSubTab} />
            </div>
          </div>

        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default BottomPane;
