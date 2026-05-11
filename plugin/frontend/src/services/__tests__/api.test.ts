import { describe, it, expect } from 'vitest'
import { sejourApi } from '../api'

describe('sejourApi', () => {
  describe('invaliderFacture', () => {
    it('invalide la facture et retourne le message', async () => {
      const result = await sejourApi.invaliderFacture('1')
      expect(result.message).toBe('Facture invalidée.')
      expect(result.ancien_numero).toBeDefined()
    })
  })

  describe('list', () => {
    it('retourne une liste paginée de séjours', async () => {
      const result = await sejourApi.list()
      expect(result.content).toBeDefined()
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.totalElements).toBeGreaterThan(0)
    })

    it('supporte le filtre actif', async () => {
      const result = await sejourApi.list(undefined, 0, 20, { actif: true })
      const today = new Date().toISOString().slice(0, 10)
      result.content.forEach((s) => {
        expect(s.dateDepart >= today).toBe(true)
      })
    })

    it('supporte le tri ascendant', async () => {
      const result = await sejourApi.list(undefined, 0, 20, { sort: 'asc' })
      const dates = result.content.map((s) => s.dateArrivee)
      const sorted = [...dates].sort()
      expect(dates).toEqual(sorted)
    })
  })
})
