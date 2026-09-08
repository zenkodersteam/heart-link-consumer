/**
 * Finds the Android SDK the way the Android tools themselves look for it:
 * ANDROID_HOME, then ANDROID_SDK_ROOT, then the default install path.
 *
 * Shared because a bare Gradle build fails with "SDK location not found" unless
 * something puts the path in front of it - `expo run:android` resolves the SDK
 * itself, `./gradlew` does not.
 */
import { existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const DEFAULTS = {
  darwin: join(homedir(), 'Library/Android/sdk'),
  linux: join(homedir(), 'Android/Sdk'),
  win32: join(homedir(), 'AppData/Local/Android/Sdk'),
};

export function androidSdk() {
  const candidate =
    process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || DEFAULTS[platform()];

  if (!candidate || !existsSync(candidate)) {
    console.error(
      'No Android SDK found.\n' +
        'Install it with Android Studio, or point ANDROID_HOME at an existing SDK.',
    );
    process.exit(1);
  }

  return candidate;
}

export const sdkTool = (relativePath) => join(androidSdk(), relativePath);
