import { useState, useEffect } from 'react'
import styles from './NumberInput.module.css'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  'aria-label'?: string
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled = false,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const handleDecrement = () => {
    if (value > min) onChange(value - 1)
  }

  const handleIncrement = () => {
    if (value < max) onChange(value + 1)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed)
    }
  }

  const handleBlur = () => {
    const parsed = parseInt(inputValue, 10)
    if (isNaN(parsed) || parsed < min) {
      setInputValue(String(min))
      onChange(min)
    } else if (parsed > max) {
      setInputValue(String(max))
      onChange(max)
    }
  }

  return (
    <div className={styles.container} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={styles.btn}
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Diminuer"
      >
        −
      </button>
      <input
        type="number"
        className={styles.input}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        disabled={disabled}
      />
      <button
        type="button"
        className={styles.btn}
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Augmenter"
      >
        +
      </button>
    </div>
  )
}
