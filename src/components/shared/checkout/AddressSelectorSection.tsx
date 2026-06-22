'use client';

import type { UserAddress } from '@/lib/api';
import { localMessage } from '@/utils/localMessages';

interface AddressSelectorSectionProps {
  addresses: UserAddress[];
  selectedAddressId: number | 'manual' | null;
  addressLoading: boolean;
  onSelect: (id: number | 'manual') => void;
  locale: string;
}

export function AddressSelectorSection({
  addresses,
  selectedAddressId,
  addressLoading,
  onSelect,
  locale,
}: AddressSelectorSectionProps) {
  if (addressLoading) {
    return <p className="text-sm text-muted-foreground">{localMessage('checkout.loadingAddresses')}</p>;
  }

  if (addresses.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">{localMessage('checkout.noSavedAddress')}</p>
        <button
          type="button"
          onClick={() => { window.location.href = `/${locale}/my/address`; }}
          className="text-sm font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
        >
          {localMessage('checkout.addAddress')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-b pb-4">
      {addresses.map((addr) => (
        <label key={addr.id} className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="savedAddress"
            checked={selectedAddressId === addr.id}
            onChange={() => onSelect(addr.id)}
            className="mt-1 accent-foreground"
          />
          <span className="text-sm">
            <span className="font-medium">{addr.label ?? localMessage('checkout.defaultAddressLabel')}</span>{' '}
            {addr.recipientName} {addr.phone}{' '}
            <span className="text-muted-foreground">
              {addr.address} {addr.addressDetail ?? ''}
            </span>
          </span>
        </label>
      ))}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="radio"
          name="savedAddress"
          checked={selectedAddressId === 'manual'}
          onChange={() => onSelect('manual')}
          className="accent-foreground"
        />
        <span className="text-sm">{localMessage('checkout.manualEntry')}</span>
      </label>
    </div>
  );
}
