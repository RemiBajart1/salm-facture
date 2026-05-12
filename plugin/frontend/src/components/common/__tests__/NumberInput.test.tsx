import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberInput } from '../NumberInput'

describe('NumberInput', () => {
  it('affiche la valeur initiale', () => {
    render(<NumberInput value={5} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(5)
  })

  it('accepte la saisie clavier', async () => {
    const onChange = vi.fn()
    render(<NumberInput value={3} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '8')
    expect(onChange).toHaveBeenLastCalledWith(8)
  })

  it('appelle onChange avec valeur - 1 au clic sur −', async () => {
    const onChange = vi.fn()
    render(<NumberInput value={5} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Diminuer'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('appelle onChange avec valeur + 1 au clic sur +', async () => {
    const onChange = vi.fn()
    render(<NumberInput value={5} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Augmenter'))
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('désactive − quand valeur = min', () => {
    render(<NumberInput value={0} onChange={() => {}} min={0} />)
    expect(screen.getByLabelText('Diminuer')).toBeDisabled()
  })

  it('désactive + quand valeur = max', () => {
    render(<NumberInput value={10} onChange={() => {}} max={10} />)
    expect(screen.getByLabelText('Augmenter')).toBeDisabled()
  })

  it('ne passe pas en dessous du min', async () => {
    const onChange = vi.fn()
    render(<NumberInput value={0} onChange={onChange} min={0} />)
    await userEvent.click(screen.getByLabelText('Diminuer'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ne dépasse pas le max', async () => {
    const onChange = vi.fn()
    render(<NumberInput value={5} onChange={onChange} max={5} />)
    await userEvent.click(screen.getByLabelText('Augmenter'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('est désactivé quand disabled=true', () => {
    render(<NumberInput value={5} onChange={() => {}} disabled />)
    expect(screen.getByLabelText('Diminuer')).toBeDisabled()
    expect(screen.getByLabelText('Augmenter')).toBeDisabled()
  })

  it('affiche aria-label sur le groupe', () => {
    render(<NumberInput value={5} onChange={() => {}} aria-label="Nombre d'adultes" />)
    expect(screen.getByRole('group', { name: "Nombre d'adultes" })).toBeInTheDocument()
  })
})
