'use client';

import { useState } from 'react';

type ValidatorFn<T> = (form: T) => Partial<Record<keyof T, string>>;

export function useFormValidation<T extends Record<string, unknown>>(
  validator: ValidatorFn<T>,
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = (form: T): boolean => {
    const result = validator(form);
    setErrors(result);
    return Object.keys(result).length === 0;
  };

  const clearError = (field: keyof T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearAll = () => setErrors({});

  return { errors, validate, clearError, clearAll };
}
