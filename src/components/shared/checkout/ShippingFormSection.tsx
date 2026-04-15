'use client';

import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';

interface ShippingFormSectionProps {
  form: ShippingForm;
  errors: FormErrors;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function ShippingFormSection({ form, errors, onChange }: ShippingFormSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="recipientName" className="typo-label">
        받는 분 이름 <span className="text-destructive">*</span>
      </label>
      <input
        id="recipientName"
        name="recipientName"
        type="text"
        value={form.recipientName}
        onChange={onChange}
        placeholder="홍길동"
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
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
        연락처 <span className="text-destructive">*</span>
      </label>
      <input
        id="recipientPhone"
        name="recipientPhone"
        type="text"
        value={form.recipientPhone}
        onChange={onChange}
        placeholder="010-1234-5678"
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
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
        우편번호 <span className="text-destructive">*</span>
      </label>
      <input
        id="zipcode"
        name="zipcode"
        type="text"
        value={form.zipcode}
        onChange={onChange}
        placeholder="12345"
        maxLength={5}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
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
        주소 <span className="text-destructive">*</span>
      </label>
      <input
        id="address"
        name="address"
        type="text"
        value={form.address}
        onChange={onChange}
        placeholder="서울특별시 강남구 테헤란로 123"
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
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
        상세 주소
      </label>
      <input
        id="addressDetail"
        name="addressDetail"
        type="text"
        value={form.addressDetail}
        onChange={onChange}
        placeholder="동/호수 등"
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
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
        배송 메모
      </label>
      <textarea
        id="memo"
        name="memo"
        value={form.memo}
        onChange={onChange}
        placeholder="배송 시 요청사항을 입력해주세요."
        rows={3}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
      />
    </div>
  );
}