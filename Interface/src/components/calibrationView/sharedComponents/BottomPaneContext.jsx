import React, { createContext, useContext } from 'react';

const BottomPaneContext = createContext(null);

export function BottomPaneProvider({ children, value }) {
  return <BottomPaneContext.Provider value={value}>{children}</BottomPaneContext.Provider>;
}

export const useBottomPane = () => useContext(BottomPaneContext);
