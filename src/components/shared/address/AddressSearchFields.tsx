'use client';

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AddressSearchResult {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
}

interface PostcodeConstructorOptions {
  oncomplete: (data: AddressSearchResult) => void;
  width?: string;
  height?: string;
}

interface PostcodeInstance {
  embed: (element: HTMLElement) => void;
}

interface PostcodeNamespace {
  Postcode: new (options: PostcodeConstructorOptions) => PostcodeInstance;
}

interface PostcodeWindow extends Window {
  daum?: PostcodeNamespace;
  kakao?: PostcodeNamespace;
}

interface AddressValues {
  zipcode: string;
  address: string;
  addressDetail: string;
}

interface AddressErrors {
  zipcode?: string;
  address?: string;
}

interface AddressLabels {
  zipcode: string;
  address: string;
  addressDetail: string;
  addressSearch: string;
  addressSearchClose: string;
  addressSearchLoadError: string;
}

interface AddressPlaceholders {
  zipcode: string;
  address: string;
  addressDetail: string;
}

interface AddressFieldNames {
  zipcode: string;
  address: string;
  addressDetail: string;
}

interface AddressSearchFieldsProps {
  values: AddressValues;
  errors?: AddressErrors;
  labels: AddressLabels;
  placeholders: AddressPlaceholders;
  names?: AddressFieldNames;
  idPrefix?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddressSelect: (result: AddressSearchResult) => void;
  readOnlyBaseAddress?: boolean;
  required?: boolean;
}

const POSTCODE_SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
const POSTCODE_SCRIPT_SELECTOR = 'script[data-daum-postcode]';

type PostcodeScriptStatus = 'idle' | 'loading' | 'ready' | 'failed';

let postcodeScriptStatus: PostcodeScriptStatus = 'idle';
let postcodeScriptPromise: Promise<void> | null = null;

function getPostcodeNamespace(): PostcodeNamespace | undefined {
  const postcodeWindow = window as PostcodeWindow;
  return postcodeWindow.daum ?? postcodeWindow.kakao;
}

function removePostcodeScript(): void {
  document.querySelectorAll<HTMLScriptElement>(POSTCODE_SCRIPT_SELECTOR).forEach((script) => script.remove());
}

function loadPostcodeScript(): Promise<void> {
  if (getPostcodeNamespace()?.Postcode) {
    postcodeScriptStatus = 'ready';
    return Promise.resolve();
  }

  if (postcodeScriptStatus === 'loading' && postcodeScriptPromise) {
    return postcodeScriptPromise;
  }

  if (postcodeScriptStatus === 'failed') {
    removePostcodeScript();
  }

  postcodeScriptStatus = 'loading';
  postcodeScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(POSTCODE_SCRIPT_SELECTOR);
    const script = existingScript ?? document.createElement('script');

    const handleLoad = () => {
      if (getPostcodeNamespace()?.Postcode) {
        postcodeScriptStatus = 'ready';
        resolve();
        return;
      }

      postcodeScriptStatus = 'failed';
      reject(new Error('Postcode script loaded without Postcode namespace'));
    };

    const handleError = () => {
      postcodeScriptStatus = 'failed';
      postcodeScriptPromise = null;
      reject(new Error('Failed to load postcode script'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.src = POSTCODE_SCRIPT_SRC;
      script.async = true;
      script.dataset.daumPostcode = 'true';
      document.body.appendChild(script);
    }
  });

  return postcodeScriptPromise;
}

export function AddressSearchFields({
  values,
  errors = {},
  labels,
  placeholders,
  names = { zipcode: 'zipcode', address: 'address', addressDetail: 'addressDetail' },
  idPrefix,
  onChange,
  onAddressSelect,
  readOnlyBaseAddress = true,
  required = true,
}: AddressSearchFieldsProps) {
  const generatedId = useId();
  const fieldIdPrefix = idPrefix ?? `address-${generatedId}`;
  const [postcodeReady, setPostcodeReady] = useState(false);
  const [postcodeLoadError, setPostcodeLoadError] = useState(false);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const onAddressSelectRef = useRef(onAddressSelect);
  const allowManualAddress = !readOnlyBaseAddress || postcodeLoadError;

  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  const loadPostcode = useCallback(() => {
    void loadPostcodeScript()
      .then(() => {
        setPostcodeReady(true);
        setPostcodeLoadError(false);
      })
      .catch(() => {
        setPostcodeReady(false);
        setPostcodeLoadError(true);
      });
  }, []);

  useEffect(() => {
    loadPostcode();
  }, [loadPostcode]);

  const closePostcode = useCallback(() => {
    setPostcodeOpen(false);
    requestAnimationFrame(() => searchButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!postcodeOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePostcode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closePostcode, postcodeOpen]);

  useEffect(() => {
    const container = postcodeContainerRef.current;
    if (!postcodeOpen || !postcodeReady || !container) return;

    const Postcode = getPostcodeNamespace()?.Postcode;
    if (!Postcode) {
      setPostcodeOpen(false);
      setPostcodeReady(false);
      setPostcodeLoadError(true);
      return;
    }

    container.replaceChildren();
    new Postcode({
      width: '100%',
      height: '100%',
      oncomplete: (result) => {
        onAddressSelectRef.current(result);
        closePostcode();
      },
    }).embed(container);

    return () => container.replaceChildren();
  }, [closePostcode, postcodeOpen, postcodeReady]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor={`${fieldIdPrefix}-zipcode`} className="typo-label">
          {labels.zipcode} {required && <span className="text-destructive">*</span>}
        </label>
        <div className="flex gap-2">
          <input
            id={`${fieldIdPrefix}-zipcode`}
            name={names.zipcode}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={values.zipcode}
            onChange={onChange}
            readOnly={!allowManualAddress}
            placeholder={placeholders.zipcode}
            maxLength={5}
            className="w-32 flex-none rounded-md border field-soft px-3 py-2 text-sm tracking-wide outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <Button
            ref={searchButtonRef}
            type="button"
            variant="black"
            size="sm"
            disabled={!postcodeReady && !postcodeLoadError}
            onClick={() => {
              if (postcodeReady) {
                setPostcodeOpen(true);
                return;
              }
              setPostcodeLoadError(false);
              loadPostcode();
            }}
            className="shrink-0"
          >
            {labels.addressSearch}
          </Button>
        </div>
        {postcodeLoadError && (
          <p className="typo-label text-destructive" role="status">
            {labels.addressSearchLoadError}
          </p>
        )}
        {errors.zipcode && (
          <p className="typo-label text-destructive">{errors.zipcode}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${fieldIdPrefix}-address`} className="typo-label">
          {labels.address} {required && <span className="text-destructive">*</span>}
        </label>
        <input
          id={`${fieldIdPrefix}-address`}
          name={names.address}
          type="text"
          autoComplete="street-address"
          value={values.address}
          onChange={onChange}
          readOnly={!allowManualAddress}
          placeholder={placeholders.address}
          className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
        />
        {errors.address && (
          <p className="typo-label text-destructive">{errors.address}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${fieldIdPrefix}-addressDetail`} className="typo-label">
          {labels.addressDetail}
        </label>
        <input
          id={`${fieldIdPrefix}-addressDetail`}
          name={names.addressDetail}
          type="text"
          autoComplete="address-line2"
          value={values.addressDetail}
          onChange={onChange}
          placeholder={placeholders.addressDetail}
          className="w-full rounded-md border field-soft px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>

      {postcodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div
            className="relative h-5/6 max-h-screen w-full max-w-lg overflow-hidden rounded-xl bg-background shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={labels.addressSearch}
          >
            <Button
              ref={closeButtonRef}
              type="button"
              variant="gray"
              size="icon"
              onClick={closePostcode}
              aria-label={labels.addressSearchClose}
              className="absolute right-3 top-3 z-10 h-9 min-h-9 w-9 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
            <div ref={postcodeContainerRef} className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
