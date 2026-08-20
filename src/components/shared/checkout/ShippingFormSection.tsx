'use client';

import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';
import { localMessage } from '@/utils/localMessages';
import { AddressSearchFields, type AddressSearchResult } from '@/components/shared/address/AddressSearchFields';

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
        inputMode="numeric"
        autoComplete="tel"
        value={form.recipientPhone}
        onChange={onChange}
        placeholder={localMessage('checkout.phonePlaceholder')}
        maxLength={13}
        aria-describedby="recipientPhoneHint"
        className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <p id="recipientPhoneHint" className="sr-only">
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
  return (
    <AddressSearchFields
      values={{
        zipcode: form.zipcode,
        address: form.address,
        addressDetail: form.addressDetail,
      }}
      errors={errors}
      labels={{
        zipcode: localMessage('checkout.zipcode'),
        address: localMessage('checkout.baseAddress'),
        addressDetail: localMessage('checkout.addressDetail'),
        addressSearch: localMessage('checkout.addressSearch'),
        addressSearchClose: localMessage('checkout.addressSearchClose'),
        addressSearchLoadError: localMessage('checkout.addressSearchLoadError'),
      }}
      placeholders={{
        zipcode: localMessage('checkout.zipcodePlaceholder'),
        address: localMessage('checkout.addressPlaceholder'),
        addressDetail: localMessage('checkout.addressDetailPlaceholder'),
      }}
      onChange={onChange}
      onAddressSelect={(result) => onAddressSearch?.(result)}
      readOnlyBaseAddress={readOnly}
    />
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
