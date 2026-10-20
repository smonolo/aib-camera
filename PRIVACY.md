# Privacy Policy — AIB Camera

**Last updated:** 20 October 2026

AIB Camera is an independent, unofficial mobile app for Antincendio Boschivo (AIB) field photography. It is **not** affiliated with, endorsed by, or built by Protezione Civile, Vigili del Fuoco, Regione Lombardia, or any other public institution.

This policy describes how the app handles data on your device.

## Summary

- The app works **offline-first**. Photos, settings, and the in-app gallery stay on your device.
- There is **no account**, **no analytics SDK**, and **no cloud sync** operated by the developer.
- **Camera** is required to take photos.
- **Location** is optional and used only to stamp coordinates, altitude, heading, and place on the photo (and in JPEG metadata when available).
- **Photos library** access is optional and used only to save stamped photos to an album named «AIB Camera».
- Network is used only for **optional reverse geocoding** (turning GPS into a place label) when a connection is available. Nearby place labels may be cached on device for offline reuse.

## Data the app processes

| Data                                         | Where it stays                                     | Why                                    |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| Camera image                                 | On device (app storage; optionally Photos/Gallery) | Capture and share stamped field photos |
| Date & time                                  | Burned into the JPEG stamp (`Europe/Rome`)         | Operational context on the photo       |
| GPS coordinates, accuracy, altitude, heading | On device; burned into stamp / EXIF when available | Location context on the photo          |
| Place label (reverse geocode)                | On device; optional network lookup; local cache    | Human-readable place on the stamp      |
| Custom stamp text you type                   | On device (settings)                               | Squad / shift notes on the photo       |
| App settings                                 | On device (local storage)                          | Remember stamp preferences             |

The developer does **not** operate a backend that receives your photos, location, or settings.

## Permissions

- **Camera** — required to take photos.
- **Location (when in use)** — optional. If denied, you can still shoot; geo lines on the stamp show as unavailable.
- **Photo library / media** — optional, write-oriented: save stamped photos to the «AIB Camera» album. The in-app gallery remains the source of truth even if this permission is denied.

## Sharing

If you use the system share sheet (WhatsApp, Mail, Files, etc.), the shared photo leaves the app under the rules of the app or service you choose. That is outside this app’s control.

## Children’s privacy

The app is not directed at children and does not knowingly collect personal data from children.

## Changes

If this policy changes in a material way, the “Last updated” date above will be revised. Continued use of the app after an update means you accept the revised policy.

## Contact

Developer site: [smnl.dev](https://smnl.dev) · Policy URL: [smnl.dev/aib-camera/privacy](https://smnl.dev/aib-camera/privacy)

For privacy questions about AIB Camera, email [stefano@smnl.dev](mailto:stefano@smnl.dev).
