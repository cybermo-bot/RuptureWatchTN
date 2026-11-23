import {
  Activity,
  Bell,
  Download,
  Ellipsis,
  Inbox,
  ListChecks,
  Map,
  MessageCircle,
  Send,
  Split,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { NavIcon } from '@/lib/nav';

// One icon set for the whole product (Lucide). An icon always sits next to its word.
export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  report: Send,
  followed: ListChecks,
  alerts: Bell,
  more: Ellipsis,
  whatsapp: MessageCircle,
  requests: Inbox,
  national: Map,
  signals: Activity,
  export: Download,
  invite: UserPlus,
  split: Split,
};
