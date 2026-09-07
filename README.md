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
