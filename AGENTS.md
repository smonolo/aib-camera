# AGENTS.md — AIB Camera

This is an Expo/React Native mobile app for **AIB (Antincendio Boschivo)** field photography, made by an independent volunteer. Prioritize mobile-first patterns, performance, cross-platform compatibility, and **emergency usability**: anyone must be able to capture and share a stamped photo with or without GPS, network, or Photos library access.

## Product constraints

- **Unofficial.** Never present the app as built by, endorsed by, or affiliated with Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any public institution. No official logos, seals, institutional names in defaults, bundle IDs, copy, or docs. Neutral volunteer wording only (e.g. default stamp `AIB Camera`, placeholders like “Squadra Nord”).
- **Local-first.** Capture, stamp (Skia), in-app gallery, capture log, and share must work offline. Network is only for reverse geocode (optional, cached).
- **Camera is required; location is optional.** Never block the camera behind GPS permission. Stamp unavailable fields with clear fallback copy.
- **Shutter must stay fast.** Prefer live HUD geo (`getSharedGeoSnapshot`) over waiting on a high-accuracy fix. Bound GPS/geocode/heading with short timeouts.
- **In-app gallery is the source of truth for photos.** System album «AIB Camera» is best-effort; save must succeed even if media-library permission is denied.
- **Gallery deletes also remove the system Photos copy** when an album asset id was stored; local JPEG cleanup is best-effort. Capture log entries always remain.
- **Capture log is append-only.** Each shot gets a UUID written to EXIF when possible and stored in the local audit log; gallery deletes must not remove audit entries.
- **EXIF write is best-effort.** Missing native Exify (Expo Go / stale binary) must not fail capture; stamp + gallery + audit log still succeed.
- **Stamp timezone** is always `Europe/Rome`. Default locale copy is Italian (`lib/i18n`); keep IT and EN catalogs in sync.
- **Do not** add cloud sync, auth, or regional dispatch integrations unless explicitly requested.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently **57**).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This repo uses **npm** (`package-lock.json`). Use `bunx` instead of `npx` only if a `bun.lock` is present.

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint (may require ESLint setup)
npx tsc --noEmit            # typecheck
npm run typecheck           # same
npm test                    # unit tests (jest-expo, tests/)
npm run test:watch          # watch mode
npm run format              # Prettier
npm run smoke-checklist     # print device QA checklist
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run typecheck and unit tests (and lint when configured) before declaring any task done. Verify camera/GPS/compass/EXIF changes on a **physical device** with a **development build** when native modules are involved.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in **`app/`** (not `src/app/`) — every file there is a screen; `_layout.tsx` files define navigators.
- Keep non-route code in `components/` and `lib/`. Unit tests live in **`tests/`**.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Key modules

| Area                                 | Where                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Geo snapshot, geocode cache, heading | `lib/location.ts`, `lib/use-live-geo.ts`, `lib/storage.ts`                            |
| Stamp lines / formatters             | `lib/stamp.ts`                                                                        |
| JPEG burn-in                         | `lib/composite.ts`                                                                    |
| EXIF (post-stamp)                    | `lib/exif.ts` (`@lodev09/react-native-exify`, gated if native missing)                |
| Capture UUID + gallery + audit log   | `lib/config.ts` (`newCaptureId`), `lib/storage.ts` (`recordCapture`)                  |
| System Photos save/delete + cleanup  | `lib/media.ts` (`saveToAibAlbum`, `deleteCaptures`)                                   |
| Settings + persistence               | `app/(tabs)/settings/` hub + permissions/appearance/about; `lib/settings-context.tsx` |
| Permissions gate                     | `components/PermissionGate.tsx` (camera hard; location soft)                          |

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `npx eas-cli@latest <command>` (or `bunx eas-cli` if using Bun); substitute that for bare `eas` in docs examples.

Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code (including Exify), the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Keep markdown docs (`README.md`, `PRIVACY.md`, `AGENTS.md`) aligned when product behavior changes.
- Do not commit secrets. Do not create git commits unless the user asks.
