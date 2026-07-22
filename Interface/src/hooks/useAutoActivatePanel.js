import { useEffect } from 'react';

export function useAutoActivatePanel(api, measurementStatus, statusToPanelMap) {
  useEffect(() => {
    if (!api) {
      /* console.warn("No api of meas"); */
      return;
    }

    const panelId = statusToPanelMap[measurementStatus];
    if (!panelId) return;

    const panel = api.getPanel(panelId);
    const panelApi = panel?.api;

    if (panelApi) {
      panelApi.setActive();
    } else {
      console.error(`No panel api for ${panelId}`, panel);
    }
  }, [api, measurementStatus, statusToPanelMap]);
}
