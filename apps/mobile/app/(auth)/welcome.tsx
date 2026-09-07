import { Redirect } from 'expo-router';

/**
 * Legacy route retained so any stale bookmarks, cached deep links, or old app
 * redirects land on the new marketing homepage instead of the deprecated
 * welcome screen.
 */
export default function WelcomeRedirect() {
  return <Redirect href="/" />;
}
