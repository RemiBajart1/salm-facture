import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  message?: string
}

/** Indicateur de chargement centré */
export function LoadingSpinner({ message = 'Chargement...' }: LoadingSpinnerProps) {
  return (
    <div className={styles.container} role="status" aria-label={message}>
      <div className={styles.spinner} />
      <p className={styles.message}>{message}</p>
    </div>
  )
}
