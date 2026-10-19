# AIB Camera

Independent, unofficial field camera for **Antincendio Boschivo (AIB)** volunteers: capture photos with date, time, GPS, altitude, heading, and place burned into the JPEG, then save or share — offline-first, usable in an emergency without GPS or network.

**Not affiliated with** Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any other public institution. Built by a volunteer for personal / volunteer use.

Bundle IDs: `dev.smnl.aibcamera` ([smnl.dev](https://smnl.dev)) · Default UI language: Italian · Timezone on stamps: `Europe/Rome`

## Features

- Live camera HUD (time, coords, accuracy, altitude, compass heading, place)
- Burn-in stamp via Skia (info block top, custom text bottom)
- Settings toggles for datetime, coordinates, place, accuracy, altitude, heading
- Locality-first place labels + persistent geocode cache for offline reuse
- In-app gallery (source of truth) + optional Photos album «AIB Camera»
- System share sheet (WhatsApp, Mail, …)
- Camera required; GPS optional — shutter works without location or cell coverage

## Stack

Expo SDK 57 · Expo Router · React Native · NativeWind · Skia · TypeScript

## Setup

```bash
npm install
npx expo start
```

Use a **physical device** for camera, GPS, compass, and Photos. After adding native modules, prefer a development build (`npx expo run:ios|android` or EAS) over Expo Go when needed.

```bash
npm run typecheck
npm run format
npm run smoke-checklist   # prints the device QA checklist
```

## Project layout

| Path          | Role                                                                |
| ------------- | ------------------------------------------------------------------- |
| `app/`        | Expo Router screens (tabs: camera, gallery, settings; review modal) |
| `components/` | UI (HUD, stamp preview, permissions, glass controls)                |
| `lib/`        | Geo, stamp, composite, storage, i18n, settings, media               |
| `assets/`     | Icons and splash                                                    |

## Emergency design notes

- **Camera** is the only hard permission. Location improves the stamp but is never required to shoot.
- Shutter uses live HUD geo when available so capture does not wait on a slow GPS fix.
- Reverse geocode is time-bounded; on failure the app uses the nearest cached place (~2.5 km).
- Save always persists to the in-app gallery; the system Photos album is best-effort.
- Screen stays awake on the camera tab.

## Agent guidance

See [AGENTS.md](./AGENTS.md) for Expo API rules, commands, and product constraints for contributors and coding agents.
