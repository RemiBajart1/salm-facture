/**
 * Hook pour charger un séjour depuis l'API.
 * Gère les états loading / error / data.
 */
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
export function useSejour(id: number): UseSejourResult {
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
