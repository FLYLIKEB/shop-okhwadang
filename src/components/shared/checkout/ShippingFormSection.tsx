'use client';

import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface AddressSearchResult {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
}

interface DaumPostcodeWindow extends Window {
  daum?: {
    Postcode: new (options: { oncomplete: (data: AddressSearchResult) => void }) => {
      embed: (element: HTMLElement) => void;
    };
  };
}

function loadDaumPostcode(onReady: () => void) {
  if ((window as DaumPostcodeWindow).daum?.Postcode) {
    onReady();
    return;
  }

  const existingScript = document.querySelector<HTMLScriptElement>('script[data-daum-postcode]');
  if (existingScript) {
    existingScript.addEventListener('load', onReady, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
  script.async = true;
  script.dataset.daumPostcode = 'true';
  script.addEventListener('load', onReady, { once: true });
  document.body.appendChild(script);
}

interface ShippingFormSectionProps {
  form: ShippingForm;
  errors: FormErrors;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function ShippingFormSection({ form, errors, onChange }: ShippingFormSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="recipientName" className="typo-label">
        {localMessage('checkout.recipientName')} <span className="text-destructive">*</span>
      </label>
      <input
        id="recipientName"
        name="recipientName"
        type="text"
        value={form.recipientName}
        onChange={onChange}
        placeholder={localMessage('checkout.recipientName')}
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
      {errors.recipientName && (
        <p className="typo-label text-destructive">{errors.recipientName}</p>
      )}
    </div>
  );
}

interface PhoneInputSectionProps {
  form: ShippingForm;
  errors: FormErrors;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function PhoneInputSection({ form, errors, onChange }: PhoneInputSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="recipientPhone" className="typo-label">
        {localMessage('checkout.phone')} <span className="text-destructive">*</span>
      </label>
      <input
        id="recipientPhone"
        name="recipientPhone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={form.recipientPhone}
        onChange={onChange}
        placeholder={localMessage('checkout.phonePlaceholder')}
        maxLength={13}
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <p id="recipientPhoneHint" className="typo-label text-muted-foreground">
        {localMessage('checkout.phoneHint')}
      </p>
      {errors.recipientPhone && (
        <p className="typo-label text-destructive">{errors.recipientPhone}</p>
      )}
    </div>
  );
}

interface ZipcodeInputSectionProps {
  form: ShippingForm;
  errors: FormErrors;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onAddressSearch?: (result: AddressSearchResult) => void;
  readOnly?: boolean;
}

export function ZipcodeInputSection({ form, errors, onChange, onAddressSearch, readOnly = false }: ZipcodeInputSectionProps) {
  const [postcodeReady, setPostcodeReady] = useState(false);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDaumPostcode(() => setPostcodeReady(true));
  }, []);

  useEffect(() => {
    const container = postcodeContainerRef.current;
    if (!postcodeOpen || !postcodeReady || !container) return;

    const postcode = (window as DaumPostcodeWindow).daum?.Postcode;
    if (!postcode) return;

    container.replaceChildren();
    new postcode({
      oncomplete: (result) => {
        onAddressSearch?.(result);
        setPostcodeOpen(false);
      },
    }).embed(container);

    return () => container.replaceChildren();
  }, [onAddressSearch, postcodeOpen, postcodeReady]);

  return (
    <div className="space-y-1">
      <label htmlFor="zipcode" className="typo-label">
        {localMessage('checkout.zipcode')} <span className="text-destructive">*</span>
      </label>
      <div className="flex gap-2">
        <input
          id="zipcode"
          name="zipcode"
          type="text"
          value={form.zipcode}
          onChange={onChange}
          readOnly={readOnly}
          placeholder="12345"
          maxLength={5}
          className="min-w-0 flex-1 rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <Button
          type="button"
          variant="black"
          size="sm"
          disabled={!postcodeReady}
          onClick={() => setPostcodeOpen(true)}
          className="shrink-0"
        >
          {localMessage('checkout.addressSearch')}
        </Button>
      </div>
      {postcodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div className="relative h-[min(600px,90vh)] w-full max-w-lg overflow-hidden rounded-xl bg-background shadow-xl" role="dialog" aria-modal="true" aria-label={localMessage('checkout.addressSearch')}>
            <Button
              type="button"
              variant="gray"
              size="icon"
              onClick={() => setPostcodeOpen(false)}
              aria-label={localMessage('checkout.addressSearch')}
              className="absolute right-3 top-3 z-10 h-9 min-h-9 w-9 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
            <div ref={postcodeContainerRef} className="h-full w-full" />
          </div>
        </div>
      )}
      {errors.zipcode && (
        <p className="typo-label text-destructive">{errors.zipcode}</p>
      )}
    </div>
  );
}

interface AddressInputSectionProps {
  form: ShippingForm;
  errors: FormErrors;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  readOnly?: boolean;
}

export function AddressInputSection({ form, errors, onChange, readOnly = false }: AddressInputSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="address" className="typo-label">
        {localMessage('checkout.baseAddress')} <span className="text-destructive">*</span>
      </label>
      <input
        id="address"
        name="address"
        type="text"
        value={form.address}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={localMessage('checkout.addressPlaceholder')}
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
      {errors.address && (
        <p className="typo-label text-destructive">{errors.address}</p>
      )}
    </div>
  );
}

interface AddressDetailInputSectionProps {
  form: ShippingForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function AddressDetailInputSection({ form, onChange }: AddressDetailInputSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="addressDetail" className="typo-label">
        {localMessage('checkout.addressDetail')}
      </label>
      <input
        id="addressDetail"
        name="addressDetail"
        type="text"
        value={form.addressDetail}
        onChange={onChange}
        placeholder={localMessage('checkout.addressDetailPlaceholder')}
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </div>
  );
}

interface MemoInputSectionProps {
  form: ShippingForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function MemoInputSection({ form, onChange }: MemoInputSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="memo" className="typo-label">
        {localMessage('checkout.shippingMemo')}
      </label>
      <textarea
        id="memo"
        name="memo"
        value={form.memo}
        onChange={onChange}
        placeholder={localMessage('checkout.shippingMemoPlaceholder')}
        rows={3}
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
      />
    </div>
  );
}
