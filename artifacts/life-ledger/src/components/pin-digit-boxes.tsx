import React, { useEffect, useRef } from 'react';
import type { PinLength } from '@/lib/pin-types';

interface PinDigitBoxesProps {
  value: string;
  onChange: (value: string) => void;
  length: PinLength;
  label: string;
  testId: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function PinDigitBoxes({
  value,
  onChange,
  length,
  label,
  testId,
  autoFocus = false,
  disabled = false,
}: PinDigitBoxesProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus && value.length === 0) inputRefs.current[0]?.focus();
  }, [autoFocus, value.length]);

  const enterDigits = (index: number, incoming: string) => {
    if (index > value.length) return;
    const digits = incoming.replace(/\D/g, '').slice(0, length - index);
    if (!digits) return;
    const nextValue = (value.slice(0, index) + digits + value.slice(index + digits.length)).slice(0, length);
    onChange(nextValue);
    inputRefs.current[Math.min(index + digits.length, length - 1)]?.focus();
  };

  const removeDigit = (index: number) => {
    if (index < value.length) {
      const nextValue = value.slice(0, index) + value.slice(index + 1);
      onChange(nextValue);
      inputRefs.current[Math.min(index, nextValue.length)]?.focus();
      return;
    }
    if (index > 0) inputRefs.current[index - 1]?.focus();
  };

  return (
    <div role="group" aria-label={label} className="flex gap-2 sm:gap-3">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={element => { inputRefs.current[index] = element; }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] ?? ''}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          onFocus={event => event.currentTarget.select()}
          onChange={event => enterDigits(index, event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Backspace') {
              event.preventDefault();
              removeDigit(index);
            }
            if (event.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
            if (event.key === 'ArrowRight' && index < length - 1) inputRefs.current[index + 1]?.focus();
          }}
          onPaste={event => {
            event.preventDefault();
            enterDigits(index, event.clipboardData.getData('text'));
          }}
          aria-label={`${label}, digit ${index + 1} of ${length}`}
          data-testid={index === 0 ? testId : `${testId}-${index + 1}`}
          className="w-11 h-12 sm:w-12 sm:h-14 rounded-xl border border-border bg-background text-center text-xl font-semibold tracking-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
      ))}
    </div>
  );
}