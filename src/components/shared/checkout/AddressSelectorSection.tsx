'use client';

import type { UserAddress } from '@/lib/api';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  if (addressLoading) {
    return <p className="text-sm text-muted-foreground">{localMessage('checkout.loadingAddresses')}</p>;
  }

  if (addresses.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed border-soft p-4">
        <p className="text-sm text-muted-foreground">{localMessage('checkout.noSavedAddress')}</p>
        <Button
          type="button"
          variant="gray"
          size="sm"
          onClick={() => { window.location.href = `/${locale}/my/address`; }}
        >
          {localMessage('checkout.addAddress')}
        </Button>
      </div>
    );
  }

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const handleSelect = (id: number | 'manual') => {
    onSelect(id);
    setIsExpanded(false);
  };

  if (selectedAddress && !isExpanded) {
    const selectedZipcode = String(selectedAddress.zipcode).padStart(5, '0');

    return (
      <div className="checkout-toss-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-full bg-background px-2 py-1 typo-label font-semibold">
              {selectedAddress.label ?? localMessage('checkout.defaultAddressLabel')}
            </span>
            <span className="typo-label text-muted-foreground">{selectedAddress.recipientName}</span>
          </div>
          <Button
            type="button"
            variant="gray"
            size="sm"
            onClick={() => setIsExpanded(true)}
            aria-expanded={false}
            className="shrink-0"
          >
            {localMessage('checkout.changeAddress')}
          </Button>
        </div>
        <p className="mt-2 typo-body-sm font-semibold">{selectedAddress.phone}</p>
        <p className="mt-1 typo-label leading-relaxed text-muted-foreground">
          {selectedZipcode} {selectedAddress.address} {selectedAddress.addressDetail ?? ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-b border-soft pb-4">
      {selectedAddress && (
        <Button type="button" variant="gray" size="sm" onClick={() => setIsExpanded(false)}>
          {localMessage('checkout.changeAddress')}
        </Button>
      )}
      {addresses.map((addr) => (
        <label key={addr.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/30 p-3">
          <input
            type="radio"
            name="savedAddress"
            checked={selectedAddressId === addr.id}
            onChange={() => handleSelect(addr.id)}
            className="mt-1 accent-foreground"
          />
          <span className="min-w-0 typo-body-sm">
            <span className="font-semibold">{addr.label ?? localMessage('checkout.defaultAddressLabel')}</span>
            <span className="ml-2 text-muted-foreground">{addr.recipientName} · {addr.phone}</span>
            <span className="mt-1 block typo-label leading-relaxed text-muted-foreground">
              {addr.zipcode} {addr.address} {addr.addressDetail ?? ''}
            </span>
          </span>
        </label>
      ))}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-muted/30 p-3">
        <input
          type="radio"
          name="savedAddress"
          checked={selectedAddressId === 'manual'}
          onChange={() => handleSelect('manual')}
          className="accent-foreground"
        />
        <span className="typo-body-sm">{localMessage('checkout.manualEntry')}</span>
      </label>
    </div>
  );
}
