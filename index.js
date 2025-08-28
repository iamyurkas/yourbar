import { registerRootComponent } from 'expo';
import App from './App';
import { initDatabase } from './src/storage/sqlite';

// Ensure SQLite tables exist before launching the app. If initialization
// fails, log the error but still attempt to start the application so the user
// can see an error screen instead of a blank launch.
initDatabase()
  .catch((e) => console.error('Failed to initialize database', e))
  .finally(() => {
    // registerRootComponent calls AppRegistry.registerComponent('main', () => App);
    // It also ensures that whether you load the app in Expo Go or in a native build,
    // the environment is set up appropriately
    registerRootComponent(App);
  });
