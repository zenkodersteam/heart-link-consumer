'use client';

import { OTPInput } from 'input-otp';

/**
 * Six boxes that are really one input.
 *
 * Same reasoning as the member site: six real inputs break paste, backspace and
 * autofill, and announce as six unlabelled fields. This is one input with the
 * boxes drawn from its state.
 */
export function AdminOtpBoxes({
  value,
  onChange,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <OTPInput
      maxLength={6}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoFocus
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      aria-label="Your six-digit code"
      aria-invalid={invalid || undefined}
      containerClassName="hl-otp"
      render={({ slots }) => (
        <>
          {slots.map((slot, index) => (
            <div
              key={index}
              className={[
                'hl-otp__box',
                slot.isActive ? 'hl-otp__box--active' : '',
                invalid ? 'hl-otp__box--invalid' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {slot.char}
              {slot.hasFakeCaret ? <span className="hl-otp__caret" /> : null}
            </div>
          ))}
        </>
      )}
    />
  );
}
