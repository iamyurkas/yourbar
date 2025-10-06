import { InteractionManager } from "react-native";

export const waitForInteractions = (): Promise<void> =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

export default waitForInteractions;
