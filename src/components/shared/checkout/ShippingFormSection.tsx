'use client';

import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';
import { localMessage } from '@/utils/localMessages';

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
        type="text"
        value={form.recipientPhone}
        onChange={onChange}
        placeholder="010-1234-5678"
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
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
}

export function ZipcodeInputSection({ form, errors, onChange }: ZipcodeInputSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="zipcode" className="typo-label">
        {localMessage('checkout.zipcode')} <span className="text-destructive">*</span>
      </label>
      <input
        id="zipcode"
        name="zipcode"
        type="text"
        value={form.zipcode}
        onChange={onChange}
        placeholder="12345"
        maxLength={5}
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
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
}

export function AddressInputSection({ form, errors, onChange }: AddressInputSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="address" className="typo-label">
        {localMessage('checkout.address')} <span className="text-destructive">*</span>
      </label>
      <input
        id="address"
        name="address"
        type="text"
        value={form.address}
        onChange={onChange}
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
