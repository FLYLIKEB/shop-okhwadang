import { PaymentGatewayType } from '../entities/payment.entity';

/**
 * 웹훅 멱등성 키 추출 유틸 (issue #725)
 *
 * PG 마다 web hook event identifier 가 다르므로, 다음 규칙으로 (gateway, eventId) 페어를 만든다.
 * DB UNIQUE 제약이 (gateway, event_id) 라서 PG 간 충돌은 자동으로 방지된다.
 *
 * - Toss: 우선 `eventId` (Toss 웹훅 v2). 없으면 `paymentKey + ':' + eventType` 으로 폴백.
 * - Stripe: `event.id` (예: `evt_xxx`). Stripe webhook 의 표준 필드.

 * - PayPal: webhook `id` 와 `event_type` 을 사용한다.
 * - KGInicis: `tid` 와 `eventType` 결합 (취소 / 승인 분리).
 * - Mock: `orderId + ':' + eventType` (테스트 용도).
 *
 * key 추출 실패 시 `null` 을 반환하면 호출 측은 처리를 거부 (FAILED 기록 가능).
 */
export interface WebhookIdempotencyKey {
  gateway: PaymentGatewayType;
  eventId: string;
  eventType: string;
}

export function extractWebhookIdempotencyKey(
  gateway: PaymentGatewayType,
  payload: unknown,
): WebhookIdempotencyKey | null {
  if (!isRecord(payload)) return null;

  const eventType = String(
    payload.eventType ?? payload.event_type ?? payload.status ?? payload.type ?? '',
  ).toUpperCase();

  switch (gateway) {
    case PaymentGatewayType.STRIPE: {
      const id = stringOf(payload.id);
      if (!id) return null;
      const stripeType = stringOf(payload.type) ?? eventType;
      return { gateway, eventId: id, eventType: stripeType };
    }
    case PaymentGatewayType.TOSS: {
      const eventId = stringOf(payload.eventId);
      return eventId && eventType ? { gateway, eventId, eventType } : null;
    }
    case PaymentGatewayType.PAYPAL: {
      const id = stringOf(payload.id);
      if (!id || !eventType) return null;
      return { gateway, eventId: id, eventType };
    }
    case PaymentGatewayType.EXIMBAY: {
      const id = stringOf(payload.eventId);
      return id && eventType ? { gateway, eventId: id, eventType } : null;
    }
    case PaymentGatewayType.INICIS: {
      const id = stringOf(payload.eventId);
      return id && eventType ? { gateway, eventId: id, eventType } : null;
    }
    case PaymentGatewayType.MOCK:
    default: {
      const id = stringOf(payload.eventId);
      return id && eventType ? { gateway, eventId: id, eventType } : null;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOf(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * MySQL ER_DUP_ENTRY 감지. (gateway, event_id) UNIQUE 위반을 멱등 처리로 변환.
 */
export function isDuplicateKeyError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  const driverError = (err as { driverError?: { code?: string } }).driverError;
  return code === 'ER_DUP_ENTRY' || driverError?.code === 'ER_DUP_ENTRY';
}
