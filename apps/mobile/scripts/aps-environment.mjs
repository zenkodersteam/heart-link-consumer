#!/usr/bin/env node
/**
 * Switch the push entitlement between Apple's two APNs environments.
 *
 * `aps-environment` has to match the provisioning profile the build is signed
 * with: a development profile carries `development`, an App Store one carries
 * `production`. Get it wrong and either the build will not sign, or it signs
 * and registers against an environment nothing is sending to — which looks
 * exactly like push being broken.
 *
 * This edits the checked-in entitlements file rather than app.config, because
 * declaring entitlements in the config makes Expo's build phase rewrite the
 * file mid-build and Xcode then refuses to sign at all.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../ios/HeartLink/HeartLink.entitlements', import.meta.url);
const wanted = process.argv[2];

if (wanted !== 'development' && wanted !== 'production') {
  console.error('Usage: node scripts/aps-environment.mjs <development|production>');
  process.exit(1);
}

const before = readFileSync(FILE, 'utf8');
const after = before.replace(
  /(<key>aps-environment<\/key>\s*<string>)[^<]*(<\/string>)/,
  `$1${wanted}$2`,
);

if (after === before) {
  console.log(`aps-environment is already ${wanted}`);
} else {
  writeFileSync(FILE, after);
  console.log(`aps-environment set to ${wanted}`);
}
