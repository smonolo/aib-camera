# AGENTS.md — AIB Camera

This is an Expo/React Native mobile app for **AIB (Antincendio Boschivo)** and wildfire-related field photography, made by an independent volunteer. Prioritize mobile-first patterns, performance, cross-platform compatibility, and **emergency usability**: anyone must be able to capture and share a stamped photo with or without GPS, network, or Photos library access.

## Product constraints

- **Public audience.** The app is for the **general public**, not only operators or a specific organization. Docs, privacy, terms, store copy, and the site must say so clearly (citizens reporting a fire, sharing via WhatsApp/Telegram, reading coords to 112, as well as volunteers who choose to use it). Never imply membership, affiliation, or restricted access.
- **Unofficial.** Never present the app as built by, endorsed by, or affiliated with Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any public institution. No official logos, seals, institutional names in defaults, bundle IDs, copy, or docs. Neutral placeholder wording only (e.g. custom-text like “Squadra Nord”).
- **Local-first.** Capture, stamp (Skia), in-app gallery, capture log, and share must work offline. Network is for reverse geocode (optional, cached) and optional Map-tab tiles (Apple Maps on iOS; Leaflet/OSM on Android — no Google Maps billing). Copy/share of location text must work without tiles.
- **Camera is required; location is optional.** Never block the camera behind GPS permission. Stamp unavailable fields with clear fallback copy.
- **Shutter must stay fast.** Prefer effective HUD geo (`getEffectiveGeoSnapshot` / live or locked aimed point) over waiting on a high-accuracy fix. Bound GPS/geocode/heading with short timeouts.
- **Aimed target (optional, app-level).** Users can lock estimated coords from observer GPS + compass heading + entered distance (`lib/geo-math` destination + `lib/geo-source`). Open the same aim sheet (`/aim-target`) from Camera (chrome or ~0.5 s viewfinder long-press) or Map (header crosshair). Shared Me ↔ Target control via `AimModeControl`. Distance presets 100 / 250 / 500 / 1000 m. On Map, dragging the red aimed pin calls `moveAimedTarget` (recomputes meters + bearing from live GPS). Aim and stamp-configuration both use `AppSheet` (`transparentModal`, full width, rounded, slide from bottom; dismiss with ✕ or tap outside — no drag). Aim is content-height; configuration is full-height. Stamp must label aimed coords as estimated. Never block the shutter if aim lock fails.
- **In-app gallery is the source of truth for photos.** System album «AIB Camera» is best-effort; save must succeed even if media-library permission is denied.
- **Gallery deletes also remove the system Photos copy** when an album asset id was stored; local JPEG cleanup is best-effort. Capture log entries always remain.
- **Capture log is append-only.** Each shot gets a UUID written to EXIF when possible and stored in the local audit log; gallery deletes must not remove audit entries. CSV export (`lib/audit-csv.ts`) shares a local file via the system sheet — no upload. Each app install has a stable local UUID (`lib/install-id.ts`), shown in Settings (tap version or install ID to copy) and included as `install_id` on every CSV row.
- **EXIF write is best-effort.** Missing native Exify (Expo Go / stale binary) must not fail capture; stamp + gallery + audit log still succeed.
- **Graceful degradation on older / constrained devices.** Never crash the UI or block the shutter for fonts, haptics, clipboard, share helpers, Photos album, or storage write failures. Stamp composite failure keeps the unstamped JPEG (`lib/persist-photo.ts`). Soft-fail helpers: `lib/soft.ts`, `lib/haptics.ts`, `lib/share.ts`, `lib/clipboard.ts`, gated Exify. Android `minSdkVersion` 24 via `expo-build-properties`.
- **Stamp timezone** is always `Europe/Rome`. UI language defaults to Italian (`lib/i18n`); English is selectable in Settings and persisted locally. Keep IT and EN catalogs in sync — EN should be natural product copy for the features, not a word-for-word rendering of Italian.
- **Shared glass tab bar.** Camera / Map / Photos / Settings use a custom floating capsule (`components/AppTabBar`) on both iOS and Android — icons only (i18n names stay on accessibility labels). Real Apple Liquid Glass is iOS-only; we approximate it cross-platform with `expo-blur` (`BlurTargetView` around tab screens + `BlurView` in the capsule; Android uses `dimezisBlurViewSdk31Plus`, soft-falls to a translucent wash below API 31). Bottom clearance (`lib/layout` `TAB_BAR` / `tabScrollBottomPad` / `cameraBottomChrome`) uses the full system inset on Android; iOS may trim slightly into the home-indicator area. Drag-to-select on the capsule.
- **Map tab.** Shows the effective geo point (Me or Aimed): iOS `react-native-maps` (Apple Maps); Android Leaflet in a WebView (OSM/CARTO tiles, no Google Maps key). Aimed pin is draggable; on drop `moveAimedTarget` recomputes distance + bearing from live GPS. Stamp-parity info, copy/share, open in system Maps. Same app-level Aim sheet as Camera. `react-native-maps` is autolink-disabled on Android (`react-native.config.js`). Never block copy/share if tiles fail.
- **Orientation.** `app.json` `orientation: default` (portrait + landscape; rebuild native after changing). Camera letterbox adapts (portrait top/bottom chrome; landscape side rails). Compass heading is corrected for screen orientation via `expo-screen-orientation` + `lib/use-heading-orientation.ts` so the stamp tracks camera-facing direction when rotating.
- **Shared icons.** UI icons use Solar (Linear) via `AppIcon` on both iOS and Android (one stroke set; no platform-specific icon fonts).
- **Do not** add cloud sync, auth, or regional dispatch integrations unless explicitly requested.
- **Always format** edited/generated code with Prettier before finishing (`npm run format` or `npx prettier --write` on touched paths; `npm run format:check` must pass). Enforced in `.cursor/rules/prettier-format.mdc`.
- **License.** Project source is [PolyForm Noncommercial 1.0.0](./LICENSE) (`PolyForm-Noncommercial-1.0.0`). Name, icons, and brand assets are not licensed for reuse in other products. Do not relicense as MIT/Apache or drop the Required Notice without an explicit owner request.

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
npm run format              # Prettier write
npm run format:check        # Prettier check (must pass for touched files)
npm run smoke-checklist     # print device QA checklist
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run format (`npm run format` / `format:check`), typecheck, and unit tests (and lint when configured) before declaring any task done. Verify camera/GPS/compass/EXIF changes on a **physical device** with a **development build** when native modules are involved.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in **`app/`** (not `src/app/`) — every file there is a screen; `_layout.tsx` files define navigators.
- Keep non-route code in `components/` and `lib/`. Unit tests live in **`tests/`**.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Key modules

| Area                                      | Where                                                                                                                                                                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geo snapshot, geocode cache, heading      | `lib/location.ts` (place sticky ~600 m; heading accuracy gate + circular smooth; screen-orientation offset so landscape matches camera facing), `lib/use-heading-orientation.ts`, `lib/use-live-geo.ts`, `lib/storage.ts`           |
| Aimed target (distance + bearing)         | `lib/geo-math.ts`, `lib/geo-source.ts`, `components/AimTargetControls.tsx`, `app/aim-target.tsx`                                                                                                                                    |
| Camera bottom sheets (aim + stamp config) | `components/AppSheet.tsx` + `SheetHeader.tsx`; routes `app/aim-target.tsx`, `app/configuration.tsx` (`transparentModal` in `app/_layout.tsx`)                                                                                       |
| Stamp lines / formatters                  | `lib/stamp.ts` (`stampReferenceSize` = short side; `stampLayoutMetrics`, `stampChromePad` for overlay ↔ burn-in parity)                                                                                                             |
| JPEG burn-in                              | `lib/composite.ts` (Geist SemiBold via `STAMP_FONT_ASSET` in `lib/fonts.ts`; scales from `stampReferenceSize`)                                                                                                                      |
| Capture finalize (stamp → EXIF → gallery) | `lib/capture.ts`                                                                                                                                                                                                                    |
| EXIF (post-stamp)                         | `lib/exif.ts` (`@lodev09/react-native-exify`, gated if native missing)                                                                                                                                                              |
| Capture UUID + gallery + audit log        | `lib/config.ts` (`newCaptureId`), `lib/storage.ts` (`recordCapture`), `lib/install-id.ts`, `lib/audit-csv.ts` (CSV export)                                                                                                          |
| System Photos save/delete + cleanup       | `lib/media.ts` (`saveToAibAlbum`, `deleteCaptures`)                                                                                                                                                                                 |
| Settings + persistence                    | `app/(tabs)/settings/` (language + permissions + about on one screen); stamp configuration is camera-only full-height `AppSheet` (`app/configuration.tsx`); `lib/settings-context.tsx`; UI locale via `lib/i18n` + `LocaleProvider` |
| Camera letterbox (preview + chrome bands) | `lib/layout.ts` (`cameraLetterboxLayout`: portrait top/bottom chrome, landscape side rails + fill leftover height); preview + stamp in `app/(tabs)/index.tsx` / `components/StampOverlay.tsx`                                       |
| Map tab (live point + copy/share)         | `app/(tabs)/map.tsx`, `components/FieldMap.tsx` (+ `.ios`), `lib/leaflet-map-html.ts`, `lib/location-share.ts`; iOS Apple Maps / Android Leaflet+OSM                                                                                |
| Gallery grid                              | `app/(tabs)/gallery.tsx` — 5-column day-grouped squares (`GALLERY_COLUMNS`)                                                                                                                                                         |
| Photo viewer                              | `app/photo/[id].tsx` — paged full image + bottom filmstrip; share/delete current; delete keeps neighbor or backs out if empty                                                                                                       |
| Shared glass tab bar (iOS + Android)      | `components/AppTabBar.tsx` + `app/(tabs)/_layout.tsx` (`expo-router/ui` + `expo-blur`); clearance in `lib/layout.ts` (`TAB_BAR`; iOS inset trim only)                                                                               |
| Icons (iOS + Android)                     | `components/AppIcon.tsx` — Solar Linear everywhere (same stroke set on both platforms)                                                                                                                                              |
| Permissions gate                          | `components/PermissionGate.tsx` (camera hard; location soft)                                                                                                                                                                        |
| App icon / splash                         | `assets/images/` (`icon.png`, adaptive layers, `splash-icon-light.png` / `splash-icon-dark.png`); brand red `#AF2525`, splash bg `#111111`                                                                                          |

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
2. **Marketing / public site** (sibling monorepo, if present locally): `../mono-lo-repo/apps/site/aib-camera` — especially `pages/aib-camera/` (`index.vue`, `guide.vue`, `privacy.vue`, `terms.vue`; `/aib-camera/guida` → 301 `/aib-camera/guide`), `content/` (`guida-operativa.md` IT + `guida-operativa.en.md` EN), `layouts/aib-camera.vue`, `components/aib/Navbar.vue`, locale copy in `utils/aib-camera-copy.ts` (IT default; EN via navbar / `?lang=en`, see `composables/useAibLocale.ts`), and related CSS/assets. Regenerate guide PDF + bundled body HTML with `npm run docs:aib-camera-guida` in `apps/site` (bodies live in `aib-camera/assets/` and are imported at build time — do not runtime-fetch them). Skip the site only if that path is missing; say so briefly when skipping.

Keep copy consistent across IT/EN where both exist, preserve the **unofficial** framing (no institutional affiliation), and keep the **public audience** clear (not operators-only). Do not leave docs or the site describing old behavior. (Also enforced in `.cursor/rules/docs-and-site-sync.mdc`.)

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code (including Exify), the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Do not commit secrets. Do not create git commits unless the user asks.
- Do not **add code comments** (`//`, `/* */`, JSDoc, `#`, JSX comments, narrating TODOs). Prefer clear names; do not introduce new comments when editing. (Also enforced in `.cursor/rules/no-code-comments.mdc`.)
- Do not leave **dead code, duplicates, or careless perf/privacy debt** in a diff. Clean as you go (`.cursor/rules/clean-codebase.mdc`).
