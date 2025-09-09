import { useEffect, useState } from "react";
import { getTabsOnTop, addTabsOnTopListener } from "../data/settings";

export default function useTabsOnTop() {
  const [tabsOnTop, setTabsOnTop] = useState(true);

  useEffect(() => {
    let mounted = true;
    getTabsOnTop().then((v) => {
      if (mounted) setTabsOnTop(!!v);
    });
    const sub = addTabsOnTopListener((v) => setTabsOnTop(!!v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return tabsOnTop;
}
