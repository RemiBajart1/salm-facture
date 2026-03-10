/**
 * Service API — LocaGest
 * Wrapping de fetch pour les appels REST.
 * En développement, tous les appels sont interceptés par MSW.
 * En production, les requêtes incluent le JWT Cognito via Amplify.
 */

import { fetchAuthSession } from 'aws-amplify/auth'

const API_BASE = '/api/v1'

/** Récupère les headers d'auth (JWT Cognito en prod, vide en dev avec MSW) */
async function authHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
  } catch {
    // En développement avec MSW, pas de session Cognito réelle
  }
  return {}
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new ApiError(response.status, errorText)
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/* ── Séjours ── */

import type {
  Sejour,
  LigneSejour,
  Facture,
  Paiement,
  PagedResponse,
  CreateSejourRequest,
  PatchPersonnesRequest,
  AddSupplementRequest,
  CreatePaiementRequest,
} from '../types'

export const sejourApi = {
  getCurrent: () => request<Sejour>('GET', '/sejours/current'),

  getById: (id: string) => request<Sejour>('GET', `/sejours/${id}`),

  list: (statut?: string, page = 0, size = 20) => {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    params.set('page', String(page))
    params.set('size', String(size))
    return request<PagedResponse<Sejour>>('GET', `/sejours?${params}`)
  },

  create: (data: CreateSejourRequest) =>
    request<Sejour>('POST', '/sejours', data),

  patchPersonnes: (id: string, data: PatchPersonnesRequest) =>
    request<void>('PATCH', `/sejours/${id}/personnes`, data),

  patchHoraires: (
    id: string,
    data: { heureArriveeReelle?: string; heureDepartReel?: string },
  ) => request<void>('PATCH', `/sejours/${id}/horaires`, data),

  addSupplement: (id: string, data: AddSupplementRequest) =>
    request<LigneSejour>('POST', `/sejours/${id}/supplements`, data),

  getLignes: (id: string) =>
    request<LigneSejour[]>('GET', `/sejours/${id}/lignes`),

  generateFacture: (id: string) =>
    request<Facture>('POST', `/sejours/${id}/facture`, { envoyer: false }),

  getFacture: (id: string) =>
    request<Facture>('GET', `/sejours/${id}/facture`),

  renvoyerFacture: (id: string) =>
    request<void>('POST', `/sejours/${id}/facture/renvoyer`),

  addPaiement: (id: string, data: CreatePaiementRequest) =>
    request<Paiement>('POST', `/sejours/${id}/paiements`, data),

  getPaiements: (id: string) =>
    request<Paiement[]>('GET', `/sejours/${id}/paiements`),
}

/* ── Locataires ── */

import type { Locataire } from '../types'

export const locataireApi = {
  search: (q: string) =>
    request<Locataire[]>('GET', `/locataires?q=${encodeURIComponent(q)}`),
}

/* ── Administration ── */

import type {
  TarifPersonne,
  ConfigItem,
  ConfigSiteEntry,
  PromouvoirLigneRequest,
} from '../types'

export const adminApi = {
  getTarifs: () => request<TarifPersonne[]>('GET', '/admin/tarifs'),

  createTarif: (data: Omit<TarifPersonne, 'id'>) =>
    request<TarifPersonne>('POST', '/admin/tarifs', data),

  updateTarif: (id: string, data: Partial<TarifPersonne>) =>
    request<TarifPersonne>('PUT', `/admin/tarifs/${id}`, data),

  getItems: () => request<ConfigItem[]>('GET', '/admin/items'),

  createItem: (data: Omit<ConfigItem, 'id'>) =>
    request<ConfigItem>('POST', '/admin/items', data),

  updateItem: (id: string, data: Partial<ConfigItem>) =>
    request<ConfigItem>('PUT', `/admin/items/${id}`, data),

  deleteItem: (id: string) => request<void>('DELETE', `/admin/items/${id}`),

  getLignesLibres: () =>
    request<LigneSejour[]>('GET', '/admin/lignes-libres'),

  promouvoirLigne: (id: string, data: PromouvoirLigneRequest) =>
    request<void>('POST', `/admin/lignes-libres/${id}/promouvoir`, data),

  getConfig: () => request<ConfigSiteEntry[]>('GET', '/admin/config'),

  patchConfig: (entries: { cle: string; valeur: string }[]) =>
    request<void>('PATCH', '/admin/config', { entries }),
}
