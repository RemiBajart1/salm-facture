import type { ConfigItem } from '../types'
import type { AddSupplementRequest } from '../services/api'

export function buildAdhesionPayloads(
  adhesionItems: ConfigItem[],
  dejaMembreIds: Set<string>,
): Pick<AddSupplementRequest, 'configItemId' | 'designation' | 'quantite' | 'prixUnitaire'>[] {
  return adhesionItems.map((item) => ({
    configItemId: item.id,
    designation:  item.designation,
    quantite:     dejaMembreIds.has(item.id) ? 0 : 1,
    prixUnitaire: item.prixUnitaire,
  }))
}
