/**
 * Boots an Android emulator and waits until it is actually usable.
 *
 * `npm run android` will start an emulator by itself, but only if one is
 * already running or it can guess which AVD to use, and it returns before the
 * device has finished booting - which is why installs fail with "device
 * offline" on a cold machine. This picks an AVD, boots it detached, and blocks
 * until `sys.boot_completed` flips.
 *
 *   npm run android:emulator            # first AVD on the machine
 *   npm run android:emulator -- Pixel_7 # a named one
 *
 * The SDK is found the way the Android tools themselves look for it:
 * ANDROID_HOME, then ANDROID_SDK_ROOT, then the default install path.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SDK =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  join(homedir(), 'Library/Android/sdk');

const emulator = join(SDK, 'emulator/emulator');
const adb = join(SDK, 'platform-tools/adb');

if (!existsSync(emulator)) {
  console.error(
    `No Android emulator at ${emulator}.\n` +
      'Install one from Android Studio (Tools > Device Manager), or point ANDROID_HOME at your SDK.',
  );
  process.exit(1);
}

function sh(command, args) {
  const { status, stdout } = spawnSync(command, args, { encoding: 'utf8' });
  return status === 0 ? stdout.trim() : '';
}

const avds = sh(emulator, ['-list-avds']).split('\n').filter(Boolean);
if (avds.length === 0) {
  console.error('No AVDs on this machine. Create one in Android Studio > Device Manager.');
  process.exit(1);
}

const wanted = process.argv[2];
const avd = wanted ?? avds[0];
if (!avds.includes(avd)) {
  console.error(`No AVD called "${avd}". Available: ${avds.join(', ')}`);
  process.exit(1);
}

// Already up? Booting a second copy of the same AVD fails on a locked .lock
// file, and the usual reason to run this is "I just want a device".
const running = sh(adb, ['devices'])
  .split('\n')
  .slice(1)
  .some((line) => line.includes('device') && !line.includes('offline'));
if (running) {
  console.log('An Android device is already connected - leaving it alone.');
  process.exit(0);
}

console.log(`Booting ${avd}...`);
// Detached: the emulator outlives this script, which is the point - it is a
// device, not a build step.
spawn(emulator, ['-avd', avd], { detached: true, stdio: 'ignore' }).unref();

spawnSync(adb, ['wait-for-device']);
const deadline = Date.now() + 5 * 60_000;
while (sh(adb, ['shell', 'getprop', 'sys.boot_completed']) !== '1') {
  if (Date.now() > deadline) {
    console.error('The emulator did not finish booting within five minutes.');
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

console.log(`${avd} is booted. Run \`npm run android\` to build onto it.`);
