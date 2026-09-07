/**
 * The API surface the consumer apps use — web and phone alike.
 *
 * Lifted out of the phone app so the website is not a second, drifting copy of
 * the same 700 lines. Nothing here may import react-native: the browser build
 * has to resolve it too.
 */
export * from './api';
export * from './connectivity';
export * from './prefs';
export * from './auth';
