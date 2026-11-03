import {
  AltArrowLeftIcon,
  AltArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  DangerTriangleIcon,
  FlashlightIcon,
  FlashlightOnIcon,
  GalleryIcon,
  InfoCircleIcon,
  MapPointIcon,
  MenuDotsIcon,
  SettingsIcon,
  ShareIcon,
  SquareArrowRightUpIcon,
  TargetIcon,
  TrashBinTrashIcon,
  Tuning2Icon,
} from '@solar-icons/react-native/linear'

const ICONS = {
  camera: CameraIcon,
  images: GalleryIcon,
  settings: SettingsIcon,
  ellipsis: MenuDotsIcon,
  check: CheckIcon,
  chevronLeft: AltArrowLeftIcon,
  chevronRight: AltArrowRightIcon,
  trash: TrashBinTrashIcon,
  share: ShareIcon,
  externalLink: SquareArrowRightUpIcon,
  flash: FlashlightOnIcon,
  flashOff: FlashlightIcon,
  sliders: Tuning2Icon,
  crosshair: TargetIcon,
  mapPin: MapPointIcon,
  close: CloseIcon,
  warning: DangerTriangleIcon,
  success: CheckCircleIcon,
  info: InfoCircleIcon,
} as const

export type AppIconName = keyof typeof ICONS

type Props = {
  name: AppIconName
  size?: number
  color: string
  strokeWidth?: number
}

export function AppIcon({ name, size = 22, color, strokeWidth = 1.5 }: Props) {
  const IconComponent = ICONS[name]
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />
}
