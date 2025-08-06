import React, { createContext, useContext, useState } from "react";

const TabMemoryContext = createContext();

export const TabMemoryProvider = ({ children }) => {
  const [activeTabs, setActiveTabs] = useState({});

  const setTab = (groupKey, tabKey) => {
    setActiveTabs((prev) => ({ ...prev, [groupKey]: tabKey }));
  };

  const getTab = (groupKey) => {
    return activeTabs[groupKey] || null;
  };

  return (
    <TabMemoryContext.Provider value={{ setTab, getTab }}>
      {children}
    </TabMemoryContext.Provider>
  );
};

export const useTabMemory = () => useContext(TabMemoryContext);
