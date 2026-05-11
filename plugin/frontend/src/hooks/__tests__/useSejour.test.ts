import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSejourList, useSejourByIdOrCurrent } from '../useSejour'

describe('useSejourList', () => {
  it('charge la liste des séjours', async () => {
    const { result } = renderHook(() => useSejourList({ sort: 'asc' }))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.sejours.length).toBeGreaterThan(0)
  })

  it('filtre les séjours actifs avec actifOnly', async () => {
    const { result } = renderHook(() => useSejourList({ actifOnly: true, sort: 'asc' }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const today = new Date().toISOString().slice(0, 10)
    result.current.sejours.forEach((s) => {
      expect(s.dateDepart >= today).toBe(true)
    })
  })

  it('trie par date ascendante quand sort=asc', async () => {
    const { result } = renderHook(() => useSejourList({ sort: 'asc' }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const dates = result.current.sejours.map((s) => s.dateArrivee)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })
})

describe('useSejourByIdOrCurrent', () => {
  it('charge le séjour courant quand aucun ID fourni', async () => {
    const { result } = renderHook(() => useSejourByIdOrCurrent())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.sejour).not.toBeNull()
    expect(result.current.sejour?.statut).toBe('EN_COURS')
  })

  it('charge un séjour par ID quand ID fourni', async () => {
    const { result } = renderHook(() => useSejourByIdOrCurrent('2'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.sejour).not.toBeNull()
    expect(result.current.sejour?.statut).toBe('PLANIFIE')
  })

  it('retourne une erreur pour un ID inexistant', async () => {
    const { result } = renderHook(() => useSejourByIdOrCurrent('999'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.sejour).toBeNull()
  })
})
