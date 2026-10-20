export type TranslationKeys = {
  appName: string
  tabs: {
    camera: string
    photos: string
    settings: string
  }
  splash: {
    title: string
  }
  permissions: {
    title: string
    body: string
    camera: string
    location: string
    granted: string
    needed: string
    denied: string
    optional: string
    locationOptionalHint: string
    continue: string
    continueWithoutLocation: string
  }
  camera: {
    flash: string
    flashOn: string
    flashOff: string
    shutter: string
    zoom: string
    acquiringGps: string
    captureFailed: string
    captureFailedBody: string
  }
  stamp: {
    noCoordinates: string
    noAddress: string
  }
  photos: {
    title: string
    emptyHint: string
    empty: string
    share: string
    delete: string
    deleteTitle: string
    deleteBody: string
    deleteManyTitle: string
    deleteManyBody: string
    cancel: string
    select: string
    selectedCount: string
    actions: string
    deleted: string
    deletedMany: string
    deleteFailed: string
    shareFailed: string
    retrySoon: string
    back: string
    today: string
    yesterday: string
  }
  settings: {
    title: string
    general: string
    dateTime: string
    coordinates: string
    address: string
    accuracy: string
    altitude: string
    heading: string
    customText: string
    customPlaceholder: string
    previewInfo: string
    previewCustom: string
    dateFormat: string
    formatFull: string
    formatShort: string
    formatIso: string
    fontSize: string
    sizeSmall: string
    sizeMedium: string
    sizeLarge: string
    opacity: string
    albumBody: string
    about: string
    versionLabel: string
    disclaimerTitle: string
    disclaimerBody: string
    privacyTitle: string
    privacyBody: string
    privacyLink: string
    privacyOpenFailed: string
  }
  media: {
    permissionDenied: string
    shareDialogTitle: string
    shareTitle: string
  }
  notFound: {
    title: string
    back: string
  }
  composite: {
    loadFailed: string
    surfaceFailed: string
  }
}
