import { registerRootComponent } from 'expo';
import { initDatabase, closeDatabases } from './src/data/sqlite';
import App from './App';

// initialize SQLite tables once at startup
initDatabase();

// Ensure database connections are closed when the app exits.
const cleanup = () => {
  // closeDatabases returns a promise, but process exit handlers can't await.
  closeDatabases().catch(() => {});
};

if (typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('beforeunload', cleanup);
  globalThis.addEventListener('unload', cleanup);
}
if (typeof process !== 'undefined' && typeof (process as any).on === 'function') {
  (process as any).on('exit', cleanup);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
