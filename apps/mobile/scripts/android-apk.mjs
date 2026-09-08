/**
 * Builds an installable Android APK.
 *
 *   npm run apk          # release build, for sharing a test build
 *   npm run apk:debug    # debug build, needs a Metro server to run
 *
 * `android/` is generated rather than committed (only `ios/` is checked in), so
 * this runs prebuild first and the directory can be deleted at any time. It
 * also writes `local.properties`: Gradle will not start without the SDK path,
 * and unlike `expo run:android` it does not go looking for one.
 *
 * A release build here is signed with the debug keystore - that is the React
 * Native template's default, unchanged. It installs and it can be handed to a
 * tester, but it is not a Play Store artifact; that needs a real keystore and
 * `eas build -p android`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { androidSdk } from './android-sdk.mjs';

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(MOBILE, 'android');

const variant = process.argv[2] === 'debug' ? 'debug' : 'release';
const sdk = androidSdk();

function run(command, args, options = {}) {
  const { status } = spawnSync(command, args, {
    cwd: MOBILE,
    stdio: 'inherit',
    ...options,
    env: { ...process.env, ANDROID_HOME: sdk, LANG: 'en_US.UTF-8', ...options.env },
  });
  if (status !== 0) process.exit(status ?? 1);
}

run('npx', ['expo', 'prebuild', '--platform', 'android']);

writeFileSync(join(ANDROID, 'local.properties'), `sdk.dir=${sdk}\n`);

const task = variant === 'debug' ? 'assembleDebug' : 'assembleRelease';
run('./gradlew', [task], { cwd: ANDROID });

const apk = join(ANDROID, `app/build/outputs/apk/${variant}/app-${variant}.apk`);
if (!existsSync(apk)) {
  console.error(`Gradle finished but there is no APK at ${apk}.`);
  process.exit(1);
}

console.log(`\nAPK: ${apk}`);
console.log(`Install it with: adb install -r "${apk}"`);
