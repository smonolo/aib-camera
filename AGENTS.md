# AGENTS.md — AIB Camera

This is an Expo/React Native mobile app for **AIB (Antincendio Boschivo)** and wildfire-related field photography, made by an independent volunteer. Prioritize mobile-first patterns, performance, cross-platform compatibility, and **emergency usability**: anyone must be able to capture and share a stamped photo with or without GPS, network, or Photos library access.

## Product constraints

- **Public audience.** The app is for the **general public**, not only operators or a specific organization. Docs, privacy, terms, store copy, and the site must say so clearly (citizens reporting a fire, sharing via WhatsApp/Telegram, reading coords to 112, as well as volunteers who choose to use it). Never imply membership, affiliation, or restricted access.
- **Unofficial.** Never present the app as built by, endorsed by, or affiliated with Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any public institution. No official logos, seals, institutional names in defaults, bundle IDs, copy, or docs. Neutral placeholder wording only (e.g. custom-text like “Squadra Nord”).
- **Local-first.** Capture, stamp (Skia), in-app gallery, capture log, and share must work offline. Network is only for reverse geocode (optional, cached).
- **Camera is required; location is optional.** Never block the camera behind GPS permission. Stamp unavailable fields with clear fallback copy.
- **Shutter must stay fast.** Prefer effective HUD geo (`getEffectiveGeoSnapshot` / live or locked aimed point) over waiting on a high-accuracy fix. Bound GPS/geocode/heading with short timeouts.
- **Aimed target (optional).** Users can lock estimated coords from observer GPS + compass heading + entered distance (`lib/geo-math` destination + `lib/geo-source`). Sticky Me ↔ Target toggle; stamp must label aimed coords as estimated. Never block the shutter if aim lock fails.
- **In-app gallery is the source of truth for photos.** System album «AIB Camera» is best-effort; save must succeed even if media-library permission is denied.
- **Gallery deletes also remove the system Photos copy** when an album asset id was stored; local JPEG cleanup is best-effort. Capture log entries always remain.
- **Capture log is append-only.** Each shot gets a UUID written to EXIF when possible and stored in the local audit log; gallery deletes must not remove audit entries. CSV export (`lib/audit-csv.ts`) shares a local file via the system sheet — no upload. Each app install has a stable local UUID (`lib/install-id.ts`), shown in Settings (tap version or install ID to copy) and included as `install_id` on every CSV row.
- **EXIF write is best-effort.** Missing native Exify (Expo Go / stale binary) must not fail capture; stamp + gallery + audit log still succeed.
- **Graceful degradation on older / constrained devices.** Never crash the UI or block the shutter for fonts, haptics, clipboard, share helpers, Photos album, or storage write failures. Stamp composite failure keeps the unstamped JPEG (`lib/persist-photo.ts`). Soft-fail helpers: `lib/soft.ts`, `lib/haptics.ts`, `lib/share.ts`, `lib/clipboard.ts`, gated Exify. Android `minSdkVersion` 24 via `expo-build-properties`.
- **Stamp timezone** is always `Europe/Rome`. Default locale copy is Italian (`lib/i18n`); keep IT and EN catalogs in sync.
- **Do not** add cloud sync, auth, or regional dispatch integrations unless explicitly requested.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently **58**).
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

| Area                                      | Where                                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geo snapshot, geocode cache, heading      | `lib/location.ts`, `lib/use-live-geo.ts`, `lib/storage.ts`                                                                                                |
| Aimed target (distance + bearing)         | `lib/geo-math.ts`, `lib/geo-source.ts`, `components/AimTargetControls.tsx`                                                                                |
| Stamp lines / formatters                  | `lib/stamp.ts`                                                                                                                                            |
| JPEG burn-in                              | `lib/composite.ts` (Geist SemiBold via `STAMP_FONT_ASSET` in `lib/fonts.ts`)                                                                              |
| Capture finalize (stamp → EXIF → gallery) | `lib/capture.ts`                                                                                                                                          |
| EXIF (post-stamp)                         | `lib/exif.ts` (`@lodev09/react-native-exify`, gated if native missing)                                                                                    |
| Capture UUID + gallery + audit log        | `lib/config.ts` (`newCaptureId`), `lib/storage.ts` (`recordCapture`), `lib/install-id.ts`, `lib/audit-csv.ts` (CSV export)                                |
| System Photos save/delete + cleanup       | `lib/media.ts` (`saveToAibAlbum`, `deleteCaptures`)                                                                                                       |
| Settings + persistence                    | `app/(tabs)/settings/` (permissions + about on one screen); stamp configuration is root `app/configuration.tsx` (camera only); `lib/settings-context.tsx` |
| Camera letterbox (preview + chrome bands) | `lib/layout.ts` (`cameraLetterboxLayout`); preview + stamp in `app/(tabs)/index.tsx` / `components/StampOverlay.tsx`                                      |
| Permissions gate                          | `components/PermissionGate.tsx` (camera hard; location soft)                                                                                              |
| App icon / splash                         | `assets/images/` (`icon.png`, adaptive layers, `splash-icon-light.png` / `splash-icon-dark.png`); brand red `#AF2525`, splash bg `#111111`                |

## Building with EAS (local-first, Free plan)

Prefer **EAS CLI** for credentials + submit, but **do not use cloud builds** (those consume Free-plan quotas: 15 Android / 15 iOS per month). Run EAS CLI as `npx eas-cli@latest <command>` (or `bunx eas-cli` if using Bun).

| Use                                         | Command                                                             | Counts against Free build quota? |
| ------------------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| Local store binary                          | `npm run build:android:local` / `build:ios:local` (→ `builds/`)     | No                               |
| Upload to Play / App Store Connect          | `npm run submit:android` / `submit:android:internal` / `submit:ios` | No                               |
| Manage keystores / certs                    | `eas credentials`                                                   | No                               |
| Cloud build (`eas build` without `--local`) | avoid                                                               | **Yes**                          |
| EAS Update                                  | optional; Free includes 1K MAUs                                     | MAU limit, not build credit      |

Config: `eas.json`. Versions stay local (`cli.appVersionSource: "local"` → bump `app.json` yourself). Android submit profiles use `releaseStatus: draft`: `submit:android:internal` → track `internal`; `submit:android` → track `alpha` (closed testing). Docs: https://docs.expo.dev/eas/index.md · local builds: https://docs.expo.dev/build-reference/local-builds/

## Docs & site sync (required on every product change)

Whenever you change app behavior, UX, permissions, privacy, capture/stamp/gallery/settings, or release/build notes — **before declaring the task done** — update all user- and agent-facing docs that the change affects:

1. **In-repo markdown** (this repo): `README.md`, `PRIVACY.md`, `AGENTS.md`, and any other `*.md` that describes the changed behavior.
2. **Marketing / public site** (sibling monorepo, if present locally): `../mono-lo-repo/apps/site` — especially `pages/aib-camera/` (`index.vue`, `guide.vue`, `privacy.vue`, `terms.vue`; `/aib-camera/guida` → 301 `/aib-camera/guide`), `content/aib-camera/` (`guida-operativa.md` IT + `guida-operativa.en.md` EN), `layouts/aib-camera.vue`, `components/aib/Navbar.vue`, locale copy in `utils/aib-camera-copy.ts` (IT default, EN via navbar switch), and related CSS/assets. Regenerate guide PDF + bundled body HTML with `npm run docs:aib-camera-guida` in `apps/site` (bodies live in `assets/aib-camera/` and are imported at build time — do not runtime-fetch them). Skip the site only if that path is missing; say so briefly when skipping.

Keep copy consistent across IT/EN where both exist, preserve the **unofficial** framing (no institutional affiliation), and keep the **public audience** clear (not operators-only). Do not leave docs or the site describing old behavior.

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code (including Exify), the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Do not commit secrets. Do not create git commits unless the user asks.
