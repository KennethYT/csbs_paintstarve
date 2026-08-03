import { FaDiscord } from "react-icons/fa6";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiTrash2
} from "react-icons/fi";
import type { ModalIconKind } from "@/lib/types";

/**
 * 介面用到的圖示集中在這裡，避免各頁面各自從 react-icons 挑到不同風格。
 * 線條圖示統一用 Feather（fi），品牌圖示用 Font Awesome 6（fa6）。
 */
export {
  FaDiscord as DiscordIcon,
  FiAlertTriangle as AlertIcon,
  FiArrowLeft as BackIcon,
  FiCheck as CheckIcon,
  FiCheckCircle as SuccessIcon,
  FiChevronRight as BulletIcon,
  FiClock as ClockIcon,
  FiMapPin as LocationIcon,
  FiTrash2 as RemovedIcon
};

export function ModalIconGraphic({ icon }: Readonly<{ icon: ModalIconKind }>) {
  if (icon === "success") {
    return <FiCheckCircle aria-hidden="true" />;
  }

  if (icon === "waitlist") {
    return <FiClock aria-hidden="true" />;
  }

  return <FiTrash2 aria-hidden="true" />;
}
