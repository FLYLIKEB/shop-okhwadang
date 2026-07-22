export const SESSION_KEYS = {
  CHECKOUT_ITEMS: 'checkoutItems',
  GUEST_ORDER_CONTEXT: 'guestOrderContext',
  TOSS_CONTEXT: 'tossPaymentContext',
  PAYPAL_CONTEXT: 'paypalPaymentContext',
  NAVERPAY_CONTEXT: 'naverpayPaymentContext',
  EXIMBAY_CONTEXT: 'eximbayPaymentContext',
  OAUTH_STATE: 'oauth_state',
} as const;

export const LOCAL_KEYS = {
  VIEW_MODE: 'products-view-mode',
  AUTH_SESSION_HINT: 'auth-session-hint',
} as const;
