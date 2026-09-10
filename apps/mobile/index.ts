import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App),
// and sets the environment up the same way whether this runs in a dev client
// or a release build.
registerRootComponent(App);
