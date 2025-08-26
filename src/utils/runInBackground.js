import { InteractionManager } from 'react-native';

export function runInBackground(task) {
  InteractionManager.runAfterInteractions(() => {
    setImmediate(task);
  });
}
