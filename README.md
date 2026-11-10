# AIB Camera

Independent, unofficial field camera for **Antincendio Boschivo (AIB)** and wildfire-related photography: capture photos and short videos with date, time, GPS, altitude, heading, wind (when online), and place burned into the JPEG or MP4, then save or share — offline-first, usable in an emergency without GPS or network.

**Open to anyone** — not limited to a specific organization, squad, or professional role. Citizens can use it to document a wildfire, share a stamped photo or video (WhatsApp, Telegram, Mail, …), or read coordinates and stamp details to emergency services (e.g. 112). Volunteers and operators may use it too; that does not make the app exclusive to them.

**Not affiliated with** Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any other public institution. Built by a volunteer; available to the general public.

Bundle IDs: `dev.smnl.aibcamera` ([smnl.dev](https://smnl.dev)) · UI languages: Italian (default) and English · Timezone on stamps: `Europe/Rome`

User-facing version: `1.3.1` · iOS `buildNumber`: `19` · Android `versionCode`: `10` (bump iOS `buildNumber` before each App Store upload; bump Android `versionCode` when shipping Play)

Privacy policy source: [PRIVACY.md](./PRIVACY.md) — host at the URL in `app.json` → `extra.privacyPolicyUrl` before store submission (required by Apple/Google).

Terms of use source: [TERMS.md](./TERMS.md) — host at `extra.termsOfUseUrl` (`https://aib.smnl.dev/camera/terms`).

Public changelog (markdown-backed on the marketing site): [aib.smnl.dev/camera/changelog](https://aib.smnl.dev/camera/changelog) — edit `../aib-site/content/camera/changelog.md` (+ `.en.md`) and run `npm run docs:camera-changelog` from `aib-site`.

## Features

- Letterboxed camera preview with black chrome (portrait and landscape). Portrait: flash top-left; **Aim**, Me/Target (when sticky), and stamp configuration top-right; shutter center; last-shot thumb left; **zoom** and **Photo/Video** icons side by side bottom-right (each with a menu). Landscape: flash / Aim / Me-Target / stamp settings on the left rail; thumb / shutter / zoom+mode stacked on the right. Live stamp overlay matches the burned-in stamp.
- **Video (optional mic):** up to **60 s** clips with audio when microphone is allowed (mute if denied); geo is snapped at record start; after stop a full-frame Skia stamp PNG is burned into the MP4 via native overlay (`react-native-video-pipeline` + **Nitro Modules** — requires a **development/production native rebuild**, not Expo Go and not a JS-only reload); soft-fail keeps the unstamped clip if Nitro is missing. A poster JPEG is always extracted for the recent thumb / gallery (real frame when possible, placeholder otherwise). The viewer plays with `expo-video`.
- **Aimed target (app-level):** same sheet from **Camera** (Aim chrome top-right beside stamp settings, or ~0.5 s viewfinder long-press) or **Map** (header: Aim then stamp settings); content-height full-width bottom sheet (dismiss with ✕ or tap outside); enter distance (presets 1 / 2 / 5 / 10 km or custom meters with an `m` suffix), lock estimated coordinates from GPS + compass heading; toggle **Me ↔ Target** (IT: Qui ↔ Mirato) on Camera and Map; on Map, drag the red aimed pin to update locked coords and distance; stamp and map label aimed coords as estimated
- **Stamp configuration:** camera tune control opens a full-height full-width bottom sheet (same chrome as Aim; dismiss with ✕ or tap outside); date format and **coordinate format** (N/E, decimal, DMS)
- Burn-in stamp via Skia in Geist (info block top, custom text bottom)
- JPEG EXIF after stamp: `Software` / `Artist`, `ImageUniqueID` (UUID), GPS tags, and a JSON `UserComment` for machine-readable use
- Per-install UUID plus an on-device **capture log** (capture ID, date, coords) that survives gallery deletes; Settings → About shows version and install ID (tap either to copy); export the full log as CSV (includes `install_id`) via the share sheet
- Settings toggles for datetime, coordinates, place, accuracy, altitude, heading, wind
- Optional current wind (Open-Meteo) on the Camera/Map stamp for the effective point (Me or Aimed); cached; omitted offline; never blocks the shutter
- UI language: Italian (default) or English, switchable in Settings (stored on device)
- Locality-first place labels + persistent geocode cache for offline reuse
- **Map tab:** taller live map of the effective point (Me or Aimed) with the same live stamp overlay as Camera; **Copy** stamp info, **Maps**, and **Save as photo** (map + pins + stamped coords into the in-app gallery / capture log, same path as Camera). **iOS and Android** use Leaflet + OpenStreetMap HOT in a WebView (no Google Maps SDK / API key / billing); returning to the tab calls Leaflet `invalidateSize` so tiles redraw if the WebView went stale. Aimed red pin is draggable — drop updates locked coords and distance from your GPS
- In-app gallery (source of truth, 3-column day grid in portrait / 5 in landscape; newest day first, oldest→newest within each day) + optional Photos album «AIB Camera»; open a shot for the **viewer** (photos + videos; swipe or bottom filmstrip, share/delete current)
- Recent-capture thumbnail left of the shutter (opens the viewer; videos use a poster). On the right: zoom and Photo/Video icons side by side, each opening a short menu.
- Deleting from the app also removes the copy in Photos when available; capture log stays
- System share sheet (WhatsApp, Mail, …) for JPEG and MP4
- Camera required; GPS, Photos library, and microphone optional (mic only for video sound; requested when entering Video mode) — shutter/record still work without them or cell coverage

## Stack

Expo SDK 58 · Expo Router · React Native · NativeWind · Skia · Solar Icons · TypeScript · jest-expo

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

| Path             | Role                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `app/`           | Expo Router screens (tabs: camera, map, gallery, settings; root: `configuration`, `photo/[id]`, `audit-log`) |
| `components/`    | UI (stamp overlay, permissions, buttons, surfaces, `AppSheet`, shared glass `AppTabBar`)                     |
| `lib/`           | Geo, stamp, composite, EXIF, storage (gallery + audit log), i18n, settings, media, config                    |
| `tests/`         | jest-expo unit tests                                                                                         |
| `assets/images/` | App icon, adaptive icon layers, splash, favicon                                                              |

## Emergency design notes

- **Camera** is the only hard permission. Location and Photos library are optional but requested early (GPS on the stamp; sync to the «AIB Camera» album) and never required to shoot. Microphone is optional for video audio (mute recording if denied).
- Shutter uses live HUD geo (or a locked aimed point) when available so capture does not wait on a slow GPS fix.
- Aimed-point mode needs GPS + compass; without them Lock soft-fails and the shutter still uses Me / unavailable copy. Aimed coords are a flat-ground estimate along heading — not a GNSS fix on the fire.
- Reverse geocode is time-bounded; the place label stays sticky until you move ~600 m (avoids flipping between neighboring towns on a highway); on failure the app uses the nearest cached place (~2.5 km). Same behavior on iOS and Android.
- Live compass heading is accuracy-gated and lightly smoothed (iOS and Android) so portrait magnetometer jitter does not thrash the HUD/stamp degrees. Screen-orientation compensation keeps the stamped direction aligned with the camera when rotating into landscape.
- Save always persists to the in-app gallery; the system Photos album is best-effort.
- Deleting a photo removes it from the in-app gallery and, when possible, from the system Photos album and local file; the capture log is not cleared.
- EXIF write is best-effort (skipped if the native module is missing); stamp, gallery, and capture log still succeed.
- The capture log is append-only locally and is not cleared when photos are deleted from the gallery; CSV export is offline via the system share sheet and includes the install ID.
- Settings: choose **Language** (Italiano / English; default Italian); tap **Version** or **Install ID** to copy the value; stamp configuration is only from the camera tune control (full-height `AppSheet`, not the Settings tab).
- Screen stays awake on the camera tab.
- Camera preview sits in black chrome (portrait: between top chrome and shutter, grows to fill leftover height; landscape: between side rails, fills leftover height). Live and burned-in stamps scale from the short frame side so they match. Zoom chips show live magnification above 2× like the system Camera. Rotation uses `orientation: default` (rebuild native binary after changing it). Floating tab bar respects the full Android system nav inset; iOS may sit slightly into the home-indicator area.

## Device compatibility & fallbacks

Target floor: **Android 7+ (API 24)** and **iOS 16.4+** (Expo SDK 58). Non-critical native features must never block capture:

| Area                                | Fallback when unavailable                                 |
| ----------------------------------- | --------------------------------------------------------- |
| GPS / compass / geocode             | Stamp shows clear “unavailable” copy; shutter still fires |
| Stamp compositing (Skia)            | Unstamped JPEG is kept in the in-app gallery              |
| Video stamp overlay                 | Unstamped MP4 is kept in the in-app gallery               |
| EXIF native module                  | Skipped; photo + gallery + capture log still succeed      |
| Photos library                      | In-app gallery only                                       |
| Microphone                          | Video records muted                                       |
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
3. Answer App Privacy / Data safety honestly: location and photos processed **on device**; no developer-operated collection/tracking. Map tiles may load from OpenStreetMap (HOT) via Leaflet when the Map tab is open — no Google Maps API key. Mention on-device EXIF and capture-log IDs if asked about identifiers. If Apple asks whether the app is for a specific organization or set of people: **no** — it is for the general public (see Privacy / Terms / site).
4. Increment `version` for user-visible releases; increment `ios.buildNumber` for every App Store binary (and `android.versionCode` when shipping Play).
5. Run `npm run typecheck`, `npm test`, `npx expo-doctor`, and `npm run smoke-checklist` on a physical device.

## License

Source code is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE) ([SPDX: `PolyForm-Noncommercial-1.0.0`](https://spdx.org/licenses/PolyForm-Noncommercial-1.0.0.html)): noncommercial use, modification, and redistribution are allowed; commercial use of the software is not.

The name **AIB Camera**, app icons, splash art, and other brand assets are **not** licensed under those terms. Do not use them for other apps, stores, or products without written permission. Third-party libraries and fonts keep their own licenses.

## Agent guidance

See [AGENTS.md](./AGENTS.md) for Expo API rules, commands, and product constraints for contributors and coding agents.
