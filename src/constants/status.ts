import type { CarrierCode } from '@/lib/api';
import type { Locale } from '@/utils/currency';
import { localMessage } from '@/utils/localMessages';

export type StatusBadgeTone =
  | 'green'
  | 'red'
  | 'yellow'
  | 'blue'
  | 'purple'
  | 'indigo'
  | 'orange'
  | 'secondary';

export interface TypedStatusConfig {
  labelKey: string;
  tone: StatusBadgeTone;
  legacyLabel: string;
  legacyClassName: string;
}

export const ORDER_STATUS_CONFIG = {
  pending: {
    labelKey: 'admin.orders.status.pending',
    tone: 'yellow',
    legacyLabel: '결제 대기',
    legacyClassName: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200',
  },
  paid: {
    labelKey: 'admin.orders.status.paid',
    tone: 'blue',
    legacyLabel: '결제 완료',
    legacyClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  },
  preparing: {
    labelKey: 'admin.orders.status.preparing',
    tone: 'purple',
    legacyLabel: '상품 준비 중',
    legacyClassName: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200',
  },
  shipped: {
    labelKey: 'admin.orders.status.shipped',
    tone: 'indigo',
    legacyLabel: '배송 중',
    legacyClassName: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200',
  },
  delivered: {
    labelKey: 'admin.orders.status.delivered',
    tone: 'green',
    legacyLabel: '배송 완료',
    legacyClassName: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200',
  },
  completed: {
    labelKey: 'admin.orders.status.completed',
    tone: 'green',
    legacyLabel: '구매 확정',
    legacyClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  },
  cancelled: {
    labelKey: 'admin.orders.status.cancelled',
    tone: 'secondary',
    legacyLabel: '취소됨',
    legacyClassName: 'bg-muted text-muted-foreground',
  },
  refund_requested: {
    labelKey: 'admin.orders.status.refund_requested',
    tone: 'orange',
    legacyLabel: '환불 요청',
    legacyClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
  },
  refunded: {
    labelKey: 'admin.orders.status.refunded',
    tone: 'red',
    legacyLabel: '환불됨',
    legacyClassName: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  },
} as const satisfies Record<string, TypedStatusConfig>;

export type OrderStatus = keyof typeof ORDER_STATUS_CONFIG;

export const PRODUCT_STATUS_CONFIG = {
  active: { labelKey: 'admin.products.status.active', tone: 'green' },
  soldout: { labelKey: 'admin.products.status.soldout', tone: 'red' },
  draft: { labelKey: 'admin.products.status.draft', tone: 'secondary' },
  hidden: { labelKey: 'admin.products.status.hidden', tone: 'secondary' },
} as const satisfies Record<string, Pick<TypedStatusConfig, 'labelKey' | 'tone'>>;

export type ProductStatus = keyof typeof PRODUCT_STATUS_CONFIG;

export const INQUIRY_STATUS_CONFIG = {
  answered: { labelKey: 'statusBadge.inquiry.answered', tone: 'green' },
  pending: { labelKey: 'statusBadge.inquiry.pendingAdmin', tone: 'yellow' },
} as const satisfies Record<string, Pick<TypedStatusConfig, 'labelKey' | 'tone'>>;

export type InquiryStatus = keyof typeof INQUIRY_STATUS_CONFIG;

export const STATUS_BADGE_TONE_DOT_CLASSES: Record<StatusBadgeTone, string> = {
  green: 'bg-emerald-600',
  red: 'bg-red-600',
  yellow: 'bg-amber-600',
  blue: 'bg-blue-600',
  purple: 'bg-purple-600',
  indigo: 'bg-indigo-600',
  orange: 'bg-orange-600',
  secondary: 'bg-muted-foreground/70',
};

export const ORDER_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => [status, localMessage(config.labelKey)]),
) as Record<string, string>;

export const ORDER_STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => [status, config.legacyClassName]),
) as Record<string, string>;

export function getTypedStatusConfig<T extends Record<string, Pick<TypedStatusConfig, 'labelKey' | 'tone'>>>(
  config: T,
  status: string,
): T[keyof T] | null {
  return Object.prototype.hasOwnProperty.call(config, status) ? config[status as keyof T] : null;
}

export const CARRIER_NAMES: Record<CarrierCode, string> = {
  mock: 'Test carrier',
  cj: 'CJ Logistics',
  hanjin: 'Hanjin Express',
  lotte: 'Lotte Logistics',
};

const CARRIER_NAMES_EN: Record<CarrierCode, string> = {
  mock: 'Test carrier',
  cj: 'CJ Logistics',
  hanjin: 'Hanjin Express',
  lotte: 'Lotte Logistics',
};

export function getCarrierName(carrier: CarrierCode, locale: Locale | string): string {
  return locale === 'en' ? CARRIER_NAMES_EN[carrier] : CARRIER_NAMES[carrier];
}

export const CARRIER_TRACKING_URLS: Partial<Record<CarrierCode, string>> = {
  cj: 'https://trace.cjlogistics.com/next/tracking.html?wblNo=',
  hanjin: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wbl_num=',
  lotte: 'https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=',
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  user: 'Member',
  admin: 'Admin',
  super_admin: 'Super admin',
};
