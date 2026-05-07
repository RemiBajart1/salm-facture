import type {
  Sejour,
  SejourCategorie,
  LigneSejour,
  Facture,
  Paiement,
  TarifPersonne,
  ConfigItem,
  ConfigSiteEntry,
  Locataire,
  PagedResponse,
  CreateSejourRequest,
  UpdateSejourRequest,
  PatchPersonnesRequest,
  AddSupplementRequest,
  CreatePaiementRequest,
  PromouvoirLigneRequest,
} from '../types'

function apiBase(): string {
  return window.locagestConfig?.apiBase ?? '/wp-json/locagest/v1'
}

function authToken(): string | null {
  // Préfère le token injecté par WordPress (wp_localize_script) sur le localStorage,
  // pour éviter d'utiliser un token périmé stocké en local après re-connexion WP.
  return window.locagestConfig?.token ?? localStorage.getItem('locagest_jwt')
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = authToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new ApiError(response.status, errorText)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Mappers WP (snake_case) → TS (camelCase) ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSejourCategorie(c: any): SejourCategorie {
  return {
    id:         String(c.id),
    nom:        c.nom_snapshot ?? c.nom,
    prixNuit:   Number(c.prix_nuit_snapshot ?? c.prix_nuit ?? 0),
    nbPrevues:  Number(c.nb_previsionnel ?? c.nb_prevues ?? 0),
    nbReelles:  c.nb_reelles != null ? Number(c.nb_reelles) : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSejour(s: any): Sejour {
  return {
    id:                    String(s.id),
    statut:                s.statut,
    nomLocataire:          s.locataire_nom_snapshot ?? s.nom_locataire ?? '',
    emailLocataire:        s.locataire_email_snapshot ?? s.email_locataire ?? '',
    telephoneLocataire:    s.locataire_telephone_snapshot ?? s.telephone_locataire,
    dateArrivee:           s.date_debut ?? s.date_arrivee,
    dateDepart:            s.date_fin ?? s.date_depart,
    nbNuits:               Number(s.nb_nuits ?? 1),
    heureArriveePrevue:    s.heure_arrivee_prevue,
    heureDepartPrevu:      s.heure_depart_prevu,
    heureArriveeReelle:    s.heure_arrivee_reelle ?? null,
    heureDepartReel:       s.heure_depart_reel ?? null,
    nbAdultes:             s.nb_adultes != null ? Number(s.nb_adultes) : null,
    nbEnfants:             s.nb_enfants != null ? Number(s.nb_enfants) : null,
    minPersonnesTotal:     Number(s.min_personnes_total ?? 40),
    modePaiement:          s.mode_paiement,
    dateLimitePaiement:    s.date_limite_paiement ?? null,
    optionsPresaisies:     s.options_presaisies ?? null,
    notesInternes:         s.notes ?? null,
    objetSejour:           s.objet_sejour ?? null,
    nomGroupe:             s.nom_groupe ?? null,
    adresseLocataire:      s.locataire_adresse_snapshot ?? null,
    categories:            (s.categories ?? []).map(mapSejourCategorie),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLigne(l: any): LigneSejour {
  const wpType = l.type_ligne ?? l.typeLigne
  const typeLigne = wpType === 'TAXE' ? 'TAXE_SEJOUR' : wpType
  const wpStatut = l.statut
  const statut = wpStatut === 'BROUILLON' ? 'A_CONFIRMER' : 'CONFIRME'
  return {
    id:           String(l.id),
    typeLigne,
    statut,
    designation:  l.libelle ?? l.designation ?? '',
    quantite:     Number(l.quantite ?? 1),
    prixUnitaire: Number(l.prix_unitaire ?? 0),
    montant:      Number(l.prix_total ?? l.montant ?? 0),
    configItemId: l.config_item_id != null ? String(l.config_item_id) : null,
    saisiPar:     l.saisi_par ?? null,
    createdAt:    l.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFacture(f: any): Facture {
  return {
    id:                  String(f.id),
    sejourId:            String(f.sejour_id ?? f.sejourId),
    numero:              f.numero ?? '',
    statut:              f.statut,
    dateGeneration:      f.date_generation ?? f.dateGeneration,
    dateEcheance:        f.date_echeance ?? null,
    siretSnapshot:       f.siret_snapshot ?? null,
    telephoneSnapshot:   f.telephone_snapshot ?? null,
    montantHebergement:  Number(f.montant_hebergement ?? f.montantHebergement ?? 0),
    montantEnergie:      Number(f.montant_energie ?? f.montantEnergie ?? 0),
    montantTaxe:         Number(f.montant_taxe ?? f.montantTaxe ?? 0),
    montantSupplements:  Number(f.montant_supplements ?? f.montantSupplements ?? 0),
    montantTotal:        Number(f.montant_total ?? f.montantTotal ?? 0),
    emailEnvoye:         Boolean(f.email_envoye ?? f.emailEnvoye ?? false),
    pdfUrl:              f.pdf_url ?? f.pdfUrl ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaiement(p: any): Paiement {
  return {
    id:              String(p.id),
    montant:         Number(p.montant),
    mode:            p.mode,
    dateEncaissement: p.date_paiement ?? p.dateEncaissement ?? '',
    numeroCheque:    p.reference ?? p.numeroCheque ?? null,
    banqueEmettrice: p.banque_emettrice ?? p.banqueEmettrice ?? null,
    chequePhotoUrl:  p.cheque_photo_url ?? null,
    enregistrePar:   p.enregistre_par ?? undefined,
    createdAt:       p.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTarif(t: any): TarifPersonne {
  return {
    id:          String(t.id),
    nom:         t.nom,
    prixNuit:    Number(t.prix_nuit ?? t.prixNuit ?? 0),
    description: t.description,
    actif:       Boolean(t.actif),
    ordre:       Number(t.ordre ?? 0),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConfigItem(i: any): ConfigItem {
  return {
    id:           String(i.id),
    designation:  i.libelle ?? i.designation ?? '',
    categorie:    i.categorie ?? '',
    prixUnitaire: Number(i.prix_unitaire ?? i.prixUnitaire ?? 0),
    unite:        i.unite,
    actif:        Boolean(i.actif),
    obligatoire:  Boolean(i.obligatoire ?? false),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPagedResponse<W, T>(data: any, mapper: (item: W) => T): PagedResponse<T> {
  // Supporte le format WP {items, total, page, size} et l'ancien format Java {content, totalElements, ...}
  if (data.items !== undefined) {
    return {
      content:       (data.items as W[]).map(mapper),
      totalElements: Number(data.total),
      totalPages:    Math.ceil(Number(data.total) / Number(data.size || 1)),
      page:          Number(data.page),
      size:          Number(data.size),
    }
  }
  return {
    content:       (data.content as W[]).map(mapper),
    totalElements: Number(data.totalElements),
    totalPages:    Number(data.totalPages),
    page:          Number(data.page),
    size:          Number(data.size),
  }
}

// ── Mappers TS → WP (requêtes) ────────────────────────────────────────────────

function toWPCreateSejour(data: CreateSejourRequest): Record<string, unknown> {
  return {
    locataire: {
      nom:       data.nomLocataire,
      email:     data.emailLocataire,
      telephone: data.telephoneLocataire,
      adresse:   data.adresseLocataire,
    },
    date_debut:              data.dateArrivee,
    date_fin:                data.dateDepart,
    heure_arrivee_prevue:    data.heureArriveePrevue,
    heure_depart_prevu:      data.heureDepartPrevu,
    min_personnes_total:     data.minPersonnesTotal,
    mode_paiement:           data.modePaiement,
    date_limite_paiement:    data.dateLimitePaiement,
    options_presaisies:      data.optionsPresaisies,
    notes:                   data.notesInternes,
    objet_sejour:            data.objetSejour,
    nom_groupe:              data.nomGroupe ?? '',
    deja_membre_item_ids:    data.dejaMembreItemIds?.map(Number) ?? [],
    categories:              data.categories.map((c) => ({
      tarif_personne_id: Number(c.tarifId),
      nb_previsionnel:   c.nbPrevues,
    })),
  }
}

function toWPUpdateSejour(data: UpdateSejourRequest): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.nomLocataire !== undefined || data.emailLocataire !== undefined) {
    out.locataire = {
      nom:       data.nomLocataire,
      email:     data.emailLocataire,
      telephone: data.telephoneLocataire,
      adresse:   data.adresseLocataire,
    }
  }
  if (data.dateArrivee)    out.date_debut            = data.dateArrivee
  if (data.dateDepart)     out.date_fin              = data.dateDepart
  if (data.heureArriveePrevue !== undefined) out.heure_arrivee_prevue = data.heureArriveePrevue
  if (data.heureDepartPrevu !== undefined)   out.heure_depart_prevu   = data.heureDepartPrevu
  if (data.minPersonnesTotal !== undefined)  out.min_personnes_total  = data.minPersonnesTotal
  if (data.notesInternes !== undefined)      out.notes                = data.notesInternes
  if (data.objetSejour !== undefined)        out.objet_sejour         = data.objetSejour
  if (data.nomGroupe !== undefined)          out.nom_groupe           = data.nomGroupe
  if (data.categories) {
    out.categories = data.categories.map((c) => ({
      tarif_personne_id: Number(c.tarifPersonneId),
      nb_previsionnel:   c.nbPrevisionnel,
    }))
  }
  return out
}

function toWPPatchPersonnes(data: PatchPersonnesRequest): Record<string, unknown> {
  return {
    nb_adultes: data.nbAdultes,
    nb_enfants: data.nbEnfants,
    categories: data.categories.map((c) => ({
      id:         Number(c.categorieId),
      nb_reelles: c.nbReelles,
    })),
  }
}

function toWPAddSupplement(data: AddSupplementRequest): Record<string, unknown> {
  if (data.configItemId) {
    return {
      type:           'SUPPLEMENT',
      config_item_id: Number(data.configItemId),
      quantite:       data.quantite,
    }
  }
  return {
    type:         'LIBRE',
    libelle:      data.designation,
    prix_unitaire: data.prixUnitaire,
    quantite:     data.quantite,
  }
}

function toWPCreatePaiement(data: CreatePaiementRequest): Record<string, unknown> {
  return {
    montant:       data.montant,
    mode:          data.mode,
    reference:     data.numeroCheque,
    date_paiement: data.dateEncaissement,
    banque_emettrice: data.banqueEmettrice,
  }
}

function toWPTarif(data: Omit<TarifPersonne, 'id'> | Partial<TarifPersonne>): Record<string, unknown> {
  return {
    nom:        (data as TarifPersonne).nom,
    prix_nuit:  (data as TarifPersonne).prixNuit,
    description: (data as TarifPersonne).description,
    actif:      (data as TarifPersonne).actif,
    ordre:      (data as TarifPersonne).ordre,
  }
}

function toWPItem(data: Omit<ConfigItem, 'id'> | Partial<ConfigItem>): Record<string, unknown> {
  return {
    libelle:       (data as ConfigItem).designation,
    categorie:     (data as ConfigItem).categorie,
    prix_unitaire: (data as ConfigItem).prixUnitaire,
    unite:         (data as ConfigItem).unite,
    actif:         (data as ConfigItem).actif,
  }
}

// ── API Séjours ───────────────────────────────────────────────────────────────

export const sejourApi = {
  getCurrent: async () =>
    mapSejour(await request<unknown>('GET', '/sejours/current')),

  getById: async (id: string) =>
    mapSejour(await request<unknown>('GET', `/sejours/${id}`)),

  list: async (statut?: string, page = 0, size = 20) => {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    params.set('page', String(page))
    params.set('size', String(size))
    const data = await request<unknown>('GET', `/sejours?${params}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mapPagedResponse<any, Sejour>(data, mapSejour)
  },

  create: async (data: CreateSejourRequest) =>
    mapSejour(await request<unknown>('POST', '/sejours', toWPCreateSejour(data))),

  update: async (id: string, data: UpdateSejourRequest) =>
    mapSejour(await request<unknown>('PUT', `/sejours/${id}`, toWPUpdateSejour(data))),

  patchPersonnes: (id: string, data: PatchPersonnesRequest) =>
    request<void>('PATCH', `/sejours/${id}/personnes`, toWPPatchPersonnes(data)),

  patchHoraires: (id: string, data: { heureArriveeReelle?: string; heureDepartReel?: string }) =>
    request<void>('PATCH', `/sejours/${id}/horaires`, {
      heure_arrivee_reelle: data.heureArriveeReelle,
      heure_depart_reel:    data.heureDepartReel,
    }),

  addSupplement: async (id: string, data: AddSupplementRequest) =>
    mapLigne(await request<unknown>('POST', `/sejours/${id}/supplements`, toWPAddSupplement(data))),

  getLignes: async (id: string) => {
    const data = await request<unknown[]>('GET', `/sejours/${id}/lignes`)
    return data.map(mapLigne)
  },

  generateFacture: async (id: string) =>
    mapFacture(await request<unknown>('POST', `/sejours/${id}/facture`, { envoyer_email: false })),

  getFacture: async (id: string) =>
    mapFacture(await request<unknown>('GET', `/sejours/${id}/facture`)),

  renvoyerFacture: (id: string) =>
    request<void>('POST', `/sejours/${id}/facture/renvoyer`),

  regenererFacture: async (id: string) =>
    mapFacture(await request<unknown>('POST', `/sejours/${id}/facture/regenerer`)),

  addPaiement: async (id: string, data: CreatePaiementRequest) =>
    mapPaiement(await request<unknown>('POST', `/sejours/${id}/paiements`, toWPCreatePaiement(data))),

  getPaiements: async (id: string) => {
    const data = await request<unknown[]>('GET', `/sejours/${id}/paiements`)
    return data.map(mapPaiement)
  },

  uploadPhotoCheque: async (sejourId: string, paiementId: string, files: File[]): Promise<void> => {
    const form = new FormData()
    files.forEach((file) => form.append('photo[]', file))
    const headers: Record<string, string> = {}
    const token = authToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(
      `${apiBase()}/sejours/${sejourId}/paiements/${paiementId}/photo`,
      { method: 'POST', headers, body: form },
    )
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new ApiError(response.status, errorText)
    }
  },
}

// ── API Locataires ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLocataire(l: any): Locataire {
  return {
    id:        String(l.id),
    nom:       l.nom,
    email:     l.email,
    telephone: l.telephone,
    adresse:   l.adresse,
    createdAt: l.created_at,
  }
}

export const locataireApi = {
  search: async (q: string) => {
    const data = await request<unknown[]>('GET', `/locataires?q=${encodeURIComponent(q)}`)
    return data.map(mapLocataire)
  },
}

// ── API Administration ────────────────────────────────────────────────────────

export const adminApi = {
  getTarifs: async () => {
    const data = await request<unknown[]>('GET', '/admin/tarifs')
    return data.map(mapTarif)
  },

  createTarif: async (data: Omit<TarifPersonne, 'id'>) =>
    mapTarif(await request<unknown>('POST', '/admin/tarifs', toWPTarif(data))),

  updateTarif: async (id: string, data: Partial<TarifPersonne>) =>
    mapTarif(await request<unknown>('PUT', `/admin/tarifs/${id}`, toWPTarif(data))),

  deleteTarif: (id: string) =>
    request<void>('DELETE', `/admin/tarifs/${id}`),

  getItems: async () => {
    const data = await request<unknown[]>('GET', '/admin/items')
    return data.map(mapConfigItem)
  },

  createItem: async (data: Omit<ConfigItem, 'id'>) =>
    mapConfigItem(await request<unknown>('POST', '/admin/items', toWPItem(data))),

  updateItem: async (id: string, data: Partial<ConfigItem>) =>
    mapConfigItem(await request<unknown>('PUT', `/admin/items/${id}`, toWPItem(data))),

  deleteItem: (id: string) =>
    request<void>('DELETE', `/admin/items/${id}`),

  getLignesLibres: async () => {
    const data = await request<unknown[]>('GET', '/admin/lignes-libres')
    return data.map(mapLigne)
  },

  promouvoirLigne: (id: string, data: PromouvoirLigneRequest) =>
    request<void>('POST', `/admin/lignes-libres/${id}/promouvoir`, data),

  getConfig: () =>
    request<ConfigSiteEntry[]>('GET', '/admin/config'),

  patchConfig: (entries: { cle: string; valeur: string }[]) =>
    request<void>('PATCH', '/admin/config', { entries }),
}
