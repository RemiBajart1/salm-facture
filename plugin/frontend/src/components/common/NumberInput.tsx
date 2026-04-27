import styles from './NumberInput.module.css'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Input numérique avec boutons − et +.
 * Utilisé pour la saisie des effectifs et quantités de suppléments.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled = false,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1)
  }

  const handleIncrement = () => {
    if (value < max) onChange(value + 1)
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
      <div className={styles.value} aria-live="polite">
        {value}
      </div>
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
