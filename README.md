# HeartLink — client applications

All client work lives here. The API lives in the `heart-link` repo.

```
apps/mobile    Expo app (iOS/Android)
apps/web       Next.js consumer site
apps/admin     Next.js staff console
packages/      API contract, API client, and the slice of domain the UI needs
```

## Running

```bash
npm install          # once, from the root
npm run mobile:dev   # Expo
npm run web          # consumer site, :3000
npm run admin        # staff console, :3001
```

### The phone app on Android

`android/` is generated, not committed - only `ios/` is checked in - so every
command below runs prebuild first and the directory can be deleted at any time.
From `apps/mobile`:

```bash
npm run android:emulator   # boot an AVD and wait for it to finish booting
npm run android            # build onto the emulator or a device, with Metro
npm run android:only       # same, against a Metro that is already running
npm run android:logs       # native + JS logs from the device
npm run apk                # release APK, for handing to a tester
npm run apk:debug          # debug APK
```

Both APK builds print where the file landed. `npm run apk` is signed with the
debug keystore, which is the React Native default: fine to install and share,
not a Play Store artifact. That needs a real keystore and `eas build -p
android`.

## Deploying

Two Vercel projects from this one repo, each with its own **Root Directory**:

| Project | Root Directory |
| --- | --- |
| consumer web | `apps/web` |
| staff console | `apps/admin` |

## Shared packages

`packages/api-contract` and `packages/api-client` are copies of the API repo's
packages. `packages/domain` carries only the intake-form schema and the
application state machine — the two pieces the admin UI needs. The rest of that
package is server business logic and deliberately stays on the server.

They are kept in step by hand. Change the contract in `heart-link` and it must
be copied here.
