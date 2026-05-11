import { useState, useEffect } from 'react'
import { sejourApi } from '../services/api'
import type { Sejour } from '../types'

interface UseSejourResult {
  sejour: Sejour | null
  loading: boolean
  error: string | null
  refresh: () => void
}

/** Charge le séjour EN_COURS (accueil gardien) */
export function useCurrentSejour(): UseSejourResult {
  const [sejour, setSejour] = useState<Sejour | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    sejourApi
      .getCurrent()
      .then((data) => {
        if (!cancelled) setSejour(data)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement séjour courant:', err)
          setError('Impossible de charger le séjour en cours')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  return { sejour, loading, error, refresh: () => setTick((t) => t + 1) }
}

/** Charge un séjour par ID */
export function useSejour(id: string): UseSejourResult {
  const [sejour, setSejour] = useState<Sejour | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    sejourApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setSejour(data)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(`Erreur chargement séjour ${id}:`, err)
          setError('Impossible de charger le séjour')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, tick])

  return { sejour, loading, error, refresh: () => setTick((t) => t + 1) }
}

/**
 * Charge un séjour par ID si fourni, sinon le séjour courant.
 * Évite les appels de hooks conditionnels.
 */
export function useSejourByIdOrCurrent(id?: string): UseSejourResult {
  const [sejour, setSejour] = useState<Sejour | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const promise = id ? sejourApi.getById(id) : sejourApi.getCurrent()
    promise
      .then((data) => {
        if (!cancelled) setSejour(data)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement séjour:', err)
          setError('Impossible de charger le séjour')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, tick])

  return { sejour, loading, error, refresh: () => setTick((t) => t + 1) }
}

interface UseSejourListResult {
  sejours: Sejour[]
  loading: boolean
  error: string | null
  refresh: () => void
}

/** Charge la liste des séjours avec filtres optionnels */
export function useSejourList(options?: { actifOnly?: boolean; sort?: 'asc' | 'desc' }): UseSejourListResult {
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const actifOnly = options?.actifOnly
  const sort = options?.sort

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    sejourApi
      .list(undefined, 0, 100, { actif: actifOnly, sort })
      .then((data) => {
        if (!cancelled) setSejours(data.content)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement liste séjours:', err)
          setError('Impossible de charger les séjours')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [actifOnly, sort, tick])

  return { sejours, loading, error, refresh: () => setTick((t) => t + 1) }
}
