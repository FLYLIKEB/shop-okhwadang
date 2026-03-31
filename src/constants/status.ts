import type { CarrierCode } from '@/lib/api';

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  preparing: '상품 준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '취소됨',
  refunded: '환불됨',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-red-100 text-red-800',
};

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  payment_confirmed: '결제 완료',
  preparing: '상품 준비중',
  shipped: '배송 시작',
  in_transit: '배송 중',
  delivered: '배송 완료',
};

export const CARRIER_NAMES: Record<CarrierCode, string> = {
  mock: '테스트 택배',
  cj: 'CJ대한통운',
  hanjin: '한진택배',
  lotte: '롯데택배',
};

export const CARRIER_TRACKING_URLS: Partial<Record<CarrierCode, string>> = {
  cj: 'https://www.doortodoor.co.kr/parcel/doortodoor.do?fsp_action=PARC_ACT_002&invc_no=',
  hanjin: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wbl_num=',
  lotte: 'https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=',
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  user: '일반 회원',
  admin: '관리자',
  super_admin: '超级管理员',
};
