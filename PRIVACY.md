# Privacy Policy — AIB Camera

**Last updated:** 26 October 2026

AIB Camera is an independent, unofficial mobile app for Antincendio Boschivo (AIB) and wildfire-related field photography. It is **open to anyone** — not limited to a specific organization, squad, or set of professionals. Anyone can download it to take stamped, geolocalized photos (for example to share with local civil protection via WhatsApp or Telegram, or to read coordinates and other stamp details to emergency services such as 112). It is **not** affiliated with, endorsed by, or built by Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any other public institution.

This policy describes how the app handles data on your device.

## Summary

- The app works **offline-first**. Photos, settings, the in-app gallery, and the capture log stay on your device.
- There is **no account**, **no analytics SDK**, and **no cloud sync** operated by the developer.
- **Camera** is required to take photos.
- **Location** is optional and used only to stamp coordinates, altitude, heading, and place on the photo, and to write matching fields into JPEG EXIF when possible. You may also lock an **aimed point** (your GPS + compass heading + a distance you enter); those estimated coordinates can be stamped instead of your own position until you clear them.
- **Photos library** access is optional and used to save stamped photos to an album named «AIB Camera», and to remove those copies when you delete photos in the app.
- Network is used only for **optional reverse geocoding** (turning GPS into a place label) when a connection is available. Nearby place labels may be cached on device for offline reuse.

## Data the app processes

| Data                                         | Where it stays                                                      | Why                                            |
| -------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| Camera image                                 | On device (app storage; optionally Photos/Gallery)                  | Capture and share stamped field photos         |
| Date & time                                  | Burned into the JPEG stamp (`Europe/Rome`); also EXIF DateTime      | Operational context on the photo               |
| GPS coordinates, accuracy, altitude, heading | On device; burned into stamp / EXIF when available                  | Location context on the photo                  |
| Aimed-point estimate (distance + heading)    | On device (session sticky); may be stamped / logged / EXIF GPS      | Stamp coords of what you are pointing at       |
| Place label (reverse geocode)                | On device; optional network lookup; local cache; may appear in EXIF | Human-readable place on the stamp              |
| Capture ID (UUID)                            | On device (capture log); EXIF `ImageUniqueID` / `UserComment` JSON  | Identify which photos were taken with this app |
| Install ID (UUID)                            | On device (local storage); Settings (tap to copy); CSV              | Correlate capture-log exports from one install |
| Custom stamp text you type                   | On device (settings); may appear in EXIF description / comment      | Optional notes on the photo                    |
| App settings                                 | On device (local storage)                                           | Remember stamp preferences and UI language     |

### Capture log

Each successful capture is recorded in a local **capture log** (ID, date/time, and coordinates when available). The log stays on the device even if you delete the photo from the in-app gallery or the system Photos album. It is not uploaded. You can open it from Settings, copy an ID to match a shared JPEG’s EXIF, or export the full log as a CSV file through the system share sheet.

Each app install also has a local **install ID** (UUID). Under **Settings**, you can tap **Version** or **Install ID** to copy those values. The install ID is written as the `install_id` column in CSV exports so logs from several devices can be told apart. Reinstalling the app creates a new install ID. The version string is the app/build label only (not a tracking identifier).

### EXIF metadata

After the visual stamp is applied, the app attempts to write standard EXIF tags into the saved JPEG (for example `Software`, `Artist`, `ImageUniqueID`, GPS fields, and a JSON `UserComment`). If the device build cannot write EXIF, the photo is still saved with the visual stamp and the local capture log entry. If stamp compositing itself fails on a constrained device, the unstamped JPEG is still kept in the in-app gallery so the shot is not lost.

The developer does **not** operate a backend that receives your photos, location, settings, capture IDs, or install IDs.

## Permissions

- **Camera** — required to take photos.
- **Location (when in use)** — optional. If denied, you can still shoot; geo lines on the stamp show as unavailable, and GPS EXIF fields are omitted.
- **Photo library / media** — optional: save stamped photos to the «AIB Camera» album and delete those copies when you remove photos in the app. The in-app gallery remains the source of truth even if this permission is denied.

## Sharing

If you use the system share sheet (WhatsApp, Mail, Files, etc.), the shared photo (including any EXIF written into the file) or an exported capture-log CSV leaves the app under the rules of the app or service you choose. That is outside this app’s control.

## Children’s privacy

The app is not directed at children and does not knowingly collect personal data from children.

## Changes

If this policy changes in a material way, the “Last updated” date above will be revised. Continued use of the app after an update means you accept the revised policy.

## Contact

Developer site: [smnl.dev](https://smnl.dev) · Policy URL: [smnl.dev/aib-camera/privacy](https://smnl.dev/aib-camera/privacy) · Terms: [smnl.dev/aib-camera/terms](https://smnl.dev/aib-camera/terms)

For privacy questions about AIB Camera, email [stefano@smnl.dev](mailto:stefano@smnl.dev).
