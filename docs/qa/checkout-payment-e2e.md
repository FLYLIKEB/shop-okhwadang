# Checkout ↔ PG confirmation E2E checklist

This checklist is the launch fallback when automated browser E2E cannot safely run because sandbox PG credentials or provider console access are unavailable in the repository. Do not write credentials in this file or in test output.

## Preconditions

- Local stack is running with `bash scripts/start-local.sh` or the target staging environment is healthy.
- Backend health returns 200: `curl http://localhost:3000/api/health`.
- Frontend responds: `curl -I http://localhost:5173/ko`.
- `CHECKOUT_ENABLED_GATEWAYS` / `NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS` match the provider(s) being tested.
- Enabled provider credentials exist only in local/staging env files or secret stores.
- Test product has enough stock and a non-free-shipping address is available.

## Success path per enabled provider

Run once for each enabled production provider: NaverPay, PayPal, Toss, Stripe, or Mock.

1. Log in as a test customer.
2. Add one product to cart with quantity that produces a non-zero shipping fee.
3. Open checkout and record:
   - product subtotal
   - shipping fee
   - coupon discount, if used
   - points discount, if used
   - displayed final payment amount
4. Select the provider under test.
5. Submit checkout and complete the provider sandbox approval/redirect.
6. Verify the success callback redirects to `/order/complete`.
7. Verify backend state:
   - order status is `paid`
   - payment status is `confirmed`
   - `payments.amount` equals `orders.total_amount`
   - shipping row exists with `payment_confirmed`
   - cart is cleared for the user
   - product stock decreased exactly by ordered quantity
8. Verify notifications/logs do not contain raw secrets, card numbers, or provider credentials.

## Failure / cancel path

For each provider that supports cancel/failure callbacks:

1. Start checkout with the same product/address setup.
2. Cancel or force a sandbox failure at provider approval.
3. Verify user returns to cart or receives a localized failure message.
4. Verify no confirmed payment exists.
5. Verify stock is restored or unchanged according to the provider path.
6. Verify abandoned `pending` orders do not issue first-purchase coupons.

## Evidence template

Record evidence in the release ticket or PR comment:

```text
Environment:
Provider:
Order number:
Displayed amount:
Order total_amount:
Payment amount:
Order status:
Payment status:
Cart cleared: yes/no
Stock delta:
Failure/cancel tested: yes/no/not supported
Notes:
```

## Automation follow-up

When sandbox credentials are available to CI, convert this checklist into browser E2E that stubs only provider-hosted pages and keeps real backend confirmation assertions.
