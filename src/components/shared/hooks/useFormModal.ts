'use client';

import { useState, useEffect } from 'react';

export function useFormModal<T>(
  defaults: T,
  initial: T | null | undefined,
  open: boolean,
) {
  const [formData, setFormData] = useState<T>(defaults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setFormData(initial as T);
    } else {
      setFormData(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  async function handleSubmit(
    e: React.FormEvent,
    onSubmit: (data: T) => Promise<void>,
    onClose: () => void,
  ) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return { formData, setFormData, loading, handleSubmit };
}
