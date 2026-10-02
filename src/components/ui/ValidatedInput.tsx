import { useId } from 'react'
import { FormField } from './FormField'
import { Input } from './Input'

interface ValidatedInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** Transforms the raw typed value before it's stored (e.g. uppercasing). Never blocks characters. */
  transform?: (value: string) => string
  /** Validates the current value; returning a string shows it as an error with a red border. */
  validate?: (value: string) => string | null
  hint?: string
  placeholder?: string
  maxLength?: number
  required?: boolean
  className?: string
  onFocus?: () => void
  onBlur?: () => void
}

/**
 * Text input where the user can type anything — invalid characters or length are never blocked,
 * only flagged with a red border + error message via FormField once the field has a value.
 */
export function ValidatedInput({
  label,
  value,
  onChange,
  transform,
  validate,
  hint,
  placeholder,
  maxLength,
  required,
  className,
  onFocus,
  onBlur,
}: ValidatedInputProps) {
  const id = useId()
  const error = value ? validate?.(value) ?? null : null

  const handleChange = (raw: string) => {
    onChange(transform ? transform(raw) : raw)
  }

  return (
    <FormField label={label} hint={hint} error={error ?? undefined} required={required} htmlFor={id} className={className}>
      <Input
        id={id}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        error={Boolean(error)}
        required={required}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </FormField>
  )
}
