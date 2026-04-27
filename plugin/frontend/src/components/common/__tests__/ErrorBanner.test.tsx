import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBanner } from '../ErrorBanner'

describe('ErrorBanner', () => {
  it('affiche le message d\'erreur', () => {
    render(<ErrorBanner message="Une erreur est survenue" />)
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
  })

  it('a le rôle alert', () => {
    render(<ErrorBanner message="Erreur" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('affiche le bouton de fermeture si onDismiss fourni', () => {
    render(<ErrorBanner message="Erreur" onDismiss={() => {}} />)
    expect(screen.getByLabelText('Fermer')).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton de fermeture si onDismiss absent', () => {
    render(<ErrorBanner message="Erreur" />)
    expect(screen.queryByLabelText('Fermer')).not.toBeInTheDocument()
  })

  it('appelle onDismiss au clic sur ✕', async () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner message="Erreur" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByLabelText('Fermer'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
