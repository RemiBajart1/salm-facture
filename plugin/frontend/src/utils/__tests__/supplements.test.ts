import { describe, it, expect } from 'vitest'
import { buildAdhesionPayloads } from '../supplements'
import type { ConfigItem } from '../../types'

const makeItem = (id: string): ConfigItem => ({
  id,
  designation: `Item ${id}`,
  prixUnitaire: 15,
  unite: 'SEJOUR',
  categorie: 'ADHESION',
  actif: true,
  obligatoire: true,
})

describe('buildAdhesionPayloads', () => {
  it('quantite = 1 si item absent de dejaMembreIds', () => {
    const result = buildAdhesionPayloads([makeItem('1')], new Set())
    expect(result[0].quantite).toBe(1)
  })

  it('quantite = 0 si item présent dans dejaMembreIds', () => {
    const result = buildAdhesionPayloads([makeItem('1')], new Set(['1']))
    expect(result[0].quantite).toBe(0)
  })

  it('items mixtes : chacun a la bonne quantite', () => {
    const items = [makeItem('1'), makeItem('2'), makeItem('3')]
    const result = buildAdhesionPayloads(items, new Set(['2']))
    expect(result[0].quantite).toBe(1) // '1' absent → nouveau membre
    expect(result[1].quantite).toBe(0) // '2' présent → déjà membre
    expect(result[2].quantite).toBe(1) // '3' absent → nouveau membre
  })

  it('liste vide → tableau vide', () => {
    expect(buildAdhesionPayloads([], new Set(['99']))).toHaveLength(0)
  })

  it('configItemId correspond bien à item.id', () => {
    const result = buildAdhesionPayloads([makeItem('42')], new Set())
    expect(result[0].configItemId).toBe('42')
  })
})
