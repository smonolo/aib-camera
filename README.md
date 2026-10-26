# AIB Camera

Independent, unofficial field camera for **Antincendio Boschivo (AIB)** and wildfire-related photography: capture photos with date, time, GPS, altitude, heading, and place burned into the JPEG, then save or share — offline-first, usable in an emergency without GPS or network.

**Open to anyone** — not limited to a specific organization, squad, or professional role. Citizens can use it to document a wildfire, share a stamped photo (WhatsApp, Telegram, Mail, …), or read coordinates and stamp details to emergency services (e.g. 112). Volunteers and operators may use it too; that does not make the app exclusive to them.

**Not affiliated with** Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any other public institution. Built by a volunteer; available to the general public.

Bundle IDs: `dev.smnl.aibcamera` ([smnl.dev](https://smnl.dev)) · Default UI language: Italian · Timezone on stamps: `Europe/Rome`

User-facing version: `1.0.0` · iOS `buildNumber`: `6` · Android `versionCode`: `1` (bump iOS `buildNumber` before each App Store upload; bump Android `versionCode` when shipping Play)

Privacy policy source: [PRIVACY.md](./PRIVACY.md) — host at the URL in `app.json` → `extra.privacyPolicyUrl` before store submission (required by Apple/Google).

Terms of use source: [TERMS.md](./TERMS.md) — host at `extra.termsOfUseUrl` (`https://smnl.dev/aib-camera/terms`).

## Features

- Letterboxed camera preview with black chrome; flash top-left, **Aim** next to flash, stamp configuration top-right, zoom bottom-right, shutter center; live stamp overlay (same fields, font size, and opacity as the burned-in stamp)
- **Aimed point:** open via the **Aim** chrome button or by pressing and holding the viewfinder (~0.5 s); content-height full-width bottom sheet (dismiss with ✕ or tap outside); enter distance (presets or meters), lock estimated coordinates from GPS + compass heading; toggle **Here ↔ Aimed** without losing the sticky point; stamp labels aimed coords as estimated
- **Stamp configuration:** camera tune control opens a full-height full-width bottom sheet (same chrome as Aim; dismiss with ✕ or tap outside)
- Burn-in stamp via Skia in Geist (info block top, custom text bottom)
- JPEG EXIF after stamp: `Software` / `Artist`, `ImageUniqueID` (UUID), GPS tags, and a JSON `UserComment` for machine-readable use
- Per-install UUID plus an on-device **capture log** (capture ID, date, coords) that survives gallery deletes; Settings → About shows version and install ID (tap either to copy); export the full log as CSV (includes `install_id`) via the share sheet
- Settings toggles for datetime, coordinates, place, accuracy, altitude, heading
- Locality-first place labels + persistent geocode cache for offline reuse
- In-app gallery (source of truth) + optional Photos album «AIB Camera»
- Recent-shot thumbnail beside the shutter (opens photo detail)
- Deleting from the app also removes the copy in Photos when available; capture log stays
- System share sheet (WhatsApp, Mail, …)
- Camera required; GPS optional — shutter works without location or cell coverage

## Stack

Expo SDK 58 · Expo Router · React Native · NativeWind · Skia · TypeScript · jest-expo

## Setup

```bash
npm install
npx expo start
```

Use a **physical device** for camera, GPS, compass, and Photos. After adding native modules (e.g. `@lodev09/react-native-exify`), use a development build (`npx expo run:ios|android` or EAS) — Expo Go will not include them.

```bash
npm run typecheck
npm test                  # unit tests in tests/
npm run format
npm run smoke-checklist   # prints the device QA checklist
```

## Project layout

| Path             | Role                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `app/`           | Expo Router screens (tabs: camera, gallery, settings; root: `configuration`, `photo/[id]`, `audit-log`) |
| `components/`    | UI (stamp overlay, permissions, buttons, surfaces, `AppSheet`)                                          |
| `lib/`           | Geo, stamp, composite, EXIF, storage (gallery + audit log), i18n, settings, media, config               |
| `tests/`         | jest-expo unit tests                                                                                    |
| `assets/images/` | App icon, adaptive icon layers, splash, favicon                                                         |

## Emergency design notes

- **Camera** is the only hard permission. Location improves the stamp but is never required to shoot.
- Shutter uses live HUD geo (or a locked aimed point) when available so capture does not wait on a slow GPS fix.
- Aimed-point mode needs GPS + compass; without them Lock soft-fails and the shutter still uses Me / unavailable copy. Aimed coords are a flat-ground estimate along heading — not a GNSS fix on the fire.
- Reverse geocode is time-bounded; on failure the app uses the nearest cached place (~2.5 km).
- Save always persists to the in-app gallery; the system Photos album is best-effort.
- Deleting a photo removes it from the in-app gallery and, when possible, from the system Photos album and local file; the capture log is not cleared.
- EXIF write is best-effort (skipped if the native module is missing); stamp, gallery, and capture log still succeed.
- The capture log is append-only locally and is not cleared when photos are deleted from the gallery; CSV export is offline via the system share sheet and includes the install ID.
- Settings: tap **Version** or **Install ID** to copy the value; stamp configuration is only from the camera tune control (full-height `AppSheet`, not the Settings tab).
- Screen stays awake on the camera tab.
- Camera preview sits in black chrome between top chrome and shutter (grows to fill leftover height); zoom chips show live magnification above 2× like the system Camera.

## Device compatibility & fallbacks

Target floor: **Android 7+ (API 24)** and **iOS 16.4+** (Expo SDK 58). Non-critical native features must never block capture:

| Area                                | Fallback when unavailable                                 |
| ----------------------------------- | --------------------------------------------------------- |
| GPS / compass / geocode             | Stamp shows clear “unavailable” copy; shutter still fires |
| Stamp compositing (Skia)            | Unstamped JPEG is kept in the in-app gallery              |
| EXIF native module                  | Skipped; photo + gallery + capture log still succeed      |
| Photos library                      | In-app gallery only                                       |
| Custom Geist fonts                  | System typefaces                                          |
| Haptics / clipboard / share helpers | Silent no-op or RN `Share` fallback                       |
| Capture at full JPEG quality        | Retry at lower quality without shutter sound              |
| AsyncStorage writes                 | In-memory state kept for the session; warn and continue   |

## Store release notes

### Local EAS workflow (no cloud builds)

Use EAS CLI for credentials and store upload; build on your machine so Free-plan build quotas are unused.

```bash
npx eas-cli@latest login
npx eas-cli@latest init                    # once: link Expo project / projectId
npx eas-cli@latest credentials             # once: Android keystore + iOS certs (stored on Expo, free)
npm run build:android:local   # AAB → builds/
npm run submit:android:internal   # Play Internal testing (draft)
# or: npm run submit:android   # Play closed testing / alpha (draft)
# iOS (needs Mac + Xcode + Apple Developer):
npm run build:ios:local       # IPA → builds/
npm run submit:ios
```

- **Always pass `--local`** on `eas build` (the npm scripts do). Omitting it starts a **cloud** build and uses Free quota (15 Android / 15 iOS per month).
- Local build artifacts are copied to **`builds/`** (`EAS_LOCAL_BUILD_ARTIFACTS_DIR`; folder is gitignored).
- `eas submit` and `eas credentials` do not consume build credit. Play submit profiles use `releaseStatus: draft` — finish rollout in Play Console. `submit:android:internal` → track `internal`; `submit:android` → track `alpha` (closed testing).
- You still need Android SDK (and Xcode for iOS) installed locally.
- Optional fallback without EAS Build: `android/keystore.properties` + `./gradlew bundleRelease` (see `android/app/build.gradle`).

Before uploading binaries:

1. Host [PRIVACY.md](./PRIVACY.md) at `extra.privacyPolicyUrl` and [TERMS.md](./TERMS.md) at `extra.termsOfUseUrl`; paste the privacy URL into App Store Connect / Play Console as required.
2. Prepare store screenshots (iPhone 6.9″ required; iPad not required — `supportsTablet: false`). Play also needs a 512×512 icon and 1024×500 feature graphic.
3. Answer App Privacy / Data safety honestly: location and photos processed **on device**; no developer-operated collection/tracking. Mention on-device EXIF and capture-log IDs if asked about identifiers. If Apple asks whether the app is for a specific organization or set of people: **no** — it is for the general public (see Privacy / Terms / site).
4. Increment `version` for user-visible releases; increment `ios.buildNumber` for every App Store binary (and `android.versionCode` when shipping Play).
5. Run `npm run typecheck`, `npm test`, `npx expo-doctor`, and `npm run smoke-checklist` on a physical device.

## Agent guidance

See [AGENTS.md](./AGENTS.md) for Expo API rules, commands, and product constraints for contributors and coding agents.
