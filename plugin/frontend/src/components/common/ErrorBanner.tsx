import styles from './ErrorBanner.module.css'

interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

/** Bandeau d'erreur visible (erreurs techniques → message générique) */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon}>⚠️</span>
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Fermer"
        >
          ✕
        </button>
      )}
    </div>
  )
}
