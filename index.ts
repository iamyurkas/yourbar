import { registerRootComponent } from 'expo';
import { initDatabase } from './src/data/sqlite';
import { runMigrations } from './src/data/migrationRunner';
import { bootstrapFlagsFromPersistence } from './src/state/ingredients.store';
import App from './App';

// initialize SQLite tables once at startup
initDatabase()
  .then(() => runMigrations())
  .then(() => bootstrapFlagsFromPersistence())
  .catch((error) => {
    console.warn('[bootstrap] failed to initialize persistence', error);
  });

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
