# AIB Camera

Independent, unofficial field camera for **Antincendio Boschivo (AIB)** volunteers: capture photos with date, time, GPS, altitude, heading, and place burned into the JPEG, then save or share — offline-first, usable in an emergency without GPS or network.

**Not affiliated with** Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any other public institution. Built by a volunteer for personal / volunteer use.

Bundle IDs: `dev.smnl.aibcamera` ([smnl.dev](https://smnl.dev)) · Default UI language: Italian · Timezone on stamps: `Europe/Rome`

User-facing version: `1.0.0` · iOS `buildNumber`: `6` · Android `versionCode`: `1` (bump iOS `buildNumber` before each App Store upload; bump Android `versionCode` when shipping Play)

Privacy policy source: [PRIVACY.md](./PRIVACY.md) — host at the URL in `app.json` → `extra.privacyPolicyUrl` before store submission (required by Apple/Google).

## Features

- Live stamp overlay on the camera (same fields, font size, and opacity as the burned-in stamp)
- Burn-in stamp via Skia (info block top, custom text bottom)
- JPEG EXIF after stamp: `Software` / `Artist`, `ImageUniqueID` (UUID), GPS tags, and a JSON `UserComment` for machine-readable use
- Per-capture UUID plus an on-device **capture log** (Settings) that keeps ID, date, and coords even after gallery deletes
- Settings toggles for datetime, coordinates, place, accuracy, altitude, heading
- Locality-first place labels + persistent geocode cache for offline reuse
- In-app gallery (source of truth) + optional Photos album «AIB Camera»
- Recent-shot thumbnail beside the shutter (opens photo detail)
- Deleting from the app also removes the copy in Photos when available; capture log stays
- System share sheet (WhatsApp, Mail, …)
- Camera required; GPS optional — shutter works without location or cell coverage

## Stack

Expo SDK 57 · Expo Router · React Native · NativeWind · Skia · TypeScript · jest-expo

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

| Path          | Role                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| `app/`        | Expo Router screens (tabs: camera, gallery, settings/*; `photo/[id]`; `audit-log`)        |
| `components/` | UI (stamp overlay, permissions, buttons, surfaces)                                        |
| `lib/`        | Geo, stamp, composite, EXIF, storage (gallery + audit log), i18n, settings, media, config |
| `tests/`      | jest-expo unit tests                                                                      |
| `assets/`     | Icons and splash                                                                          |

## Emergency design notes

- **Camera** is the only hard permission. Location improves the stamp but is never required to shoot.
- Shutter uses live HUD geo when available so capture does not wait on a slow GPS fix.
- Reverse geocode is time-bounded; on failure the app uses the nearest cached place (~2.5 km).
- Save always persists to the in-app gallery; the system Photos album is best-effort.
- Deleting a photo removes it from the in-app gallery and, when possible, from the system Photos album and local file; the capture log is not cleared.
- EXIF write is best-effort (skipped if the native module is missing); stamp, gallery, and capture log still succeed.
- The capture log is append-only locally and is not cleared when photos are deleted from the gallery.
- Screen stays awake on the camera tab.

## Store release notes

Before uploading binaries (local or EAS):

1. Host [PRIVACY.md](./PRIVACY.md) at `extra.privacyPolicyUrl` and paste that URL into App Store Connect / Play Console.
2. Prepare store screenshots (iPhone 6.9″ required; iPad not required — `supportsTablet: false`). Play also needs a 512×512 icon and 1024×500 feature graphic.
3. Answer App Privacy / Data safety honestly: location and photos processed **on device**; no developer-operated collection/tracking. Mention on-device EXIF and capture-log IDs if asked about identifiers.
4. Increment `version` for user-visible releases; increment `ios.buildNumber` for every App Store binary (and `android.versionCode` when shipping Play).
5. Run `npm run typecheck`, `npm test`, `npx expo-doctor`, and `npm run smoke-checklist` on a physical device.

## Agent guidance

See [AGENTS.md](./AGENTS.md) for Expo API rules, commands, and product constraints for contributors and coding agents.
