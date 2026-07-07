import type { CheckoutGatewayName } from '@/lib/api';
import { cn } from '@/components/ui/utils';

export type PaymentBrand = CheckoutGatewayName | 'visa' | 'mastercard' | 'amex';

interface PaymentBrandIconProps {
  brand: PaymentBrand;
  className?: string;
}

export function PaymentBrandIcon({ brand, className }: PaymentBrandIconProps) {
  const label = BRAND_LABELS[brand];

  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-11 items-center justify-center overflow-hidden rounded-sm border border-border bg-card shadow-sm',
        className,
      )}
      aria-label={label}
      role="img"
    >
      {brand === 'paypal' && <PayPalMark />}
      {brand === 'naverpay' && <NaverPayMark />}
      {brand === 'bank_transfer' && <BankTransferMark />}
      {brand === 'eximbay' && <CardMark />}
      {brand === 'visa' && <VisaMark />}
      {brand === 'mastercard' && <MastercardMark />}
      {brand === 'amex' && <AmexMark />}
    </span>
  );
}

const BRAND_LABELS: Record<PaymentBrand, string> = {
  paypal: 'PayPal',
  naverpay: 'Naver Pay',
  bank_transfer: 'Bank transfer',
  eximbay: 'Credit card',
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
};

function PayPalMark() {
  return (
    <svg viewBox="0 0 64 28" className="h-full w-16" aria-hidden="true">
      <rect width="64" height="28" rx="3" fill="#fff" />
      <text x="7" y="18" fill="#003087" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">Pay</text>
      <text x="29" y="18" fill="#009CDE" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">Pal</text>
    </svg>
  );
}

function NaverPayMark() {
  return (
    <svg viewBox="0 0 72 28" className="h-full w-18" aria-hidden="true">
      <rect width="72" height="28" rx="3" fill="#03C75A" />
      <path d="M10 8h5.3l4.7 6.7V8h5v12h-5.2l-4.8-6.8V20h-5V8Z" fill="#fff" />
      <text x="33" y="18" fill="#fff" fontSize="10" fontWeight="800" fontFamily="Arial, sans-serif">Pay</text>
    </svg>
  );
}


function BankTransferMark() {
  return (
    <svg viewBox="0 0 44 28" className="h-full w-11" aria-hidden="true">
      <rect x="5" y="9" width="34" height="13" rx="2" fill="currentColor" opacity="0.12" />
      <path d="M7 10.5 22 4l15 6.5H7Z" fill="currentColor" opacity="0.45" />
      <path d="M12 12v7M20 12v7M28 12v7M36 12v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function CardMark() {
  return (
    <svg viewBox="0 0 44 28" className="h-full w-11" aria-hidden="true">
      <rect x="4" y="6" width="36" height="16" rx="3" fill="currentColor" opacity="0.12" />
      <rect x="4" y="10" width="36" height="3" fill="currentColor" opacity="0.45" />
      <rect x="9" y="17" width="10" height="2" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="23" y="17" width="8" height="2" rx="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function VisaMark() {
  return (
    <svg viewBox="0 0 54 28" className="h-full w-14" aria-hidden="true">
      <rect width="54" height="28" rx="3" fill="#fff" />
      <text x="8" y="19" fill="#1A1F71" fontSize="15" fontStyle="italic" fontWeight="800" fontFamily="Arial, sans-serif">VISA</text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 54 28" className="h-full w-14" aria-hidden="true">
      <rect width="54" height="28" rx="3" fill="#fff" />
      <circle cx="22" cy="14" r="8" fill="#EB001B" />
      <circle cx="32" cy="14" r="8" fill="#F79E1B" fillOpacity="0.92" />
      <path d="M27 7.7a8 8 0 0 1 0 12.6 8 8 0 0 1 0-12.6Z" fill="#FF5F00" />
    </svg>
  );
}

function AmexMark() {
  return (
    <svg viewBox="0 0 54 28" className="h-full w-14" aria-hidden="true">
      <rect width="54" height="28" rx="3" fill="#2E77BB" />
      <text x="8" y="18" fill="#fff" fontSize="11" fontWeight="900" fontFamily="Arial, sans-serif">AMEX</text>
    </svg>
  );
}
