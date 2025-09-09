import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";

const TabMemoryContext = createContext();

export const TabMemoryProvider = ({ children }) => {
  const activeTabsRef = useRef({});

  const setTab = useCallback((groupKey, tabKey) => {
    if (activeTabsRef.current[groupKey] === tabKey) return;
    activeTabsRef.current[groupKey] = tabKey;
  }, []);

  const getTab = useCallback((groupKey) => {
    return activeTabsRef.current[groupKey] || null;
  }, []);

  const value = useMemo(() => ({ setTab, getTab }), [setTab, getTab]);

  return (
    <TabMemoryContext.Provider value={value}>
      {children}
    </TabMemoryContext.Provider>
  );
};

export const useTabMemory = () => useContext(TabMemoryContext);
