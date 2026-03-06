/* Types TypeScript — miroir des DTOs backend LocaGest */

/* ── Enums ── */

export type StatutSejour =
  | 'PLANIFIE'
  | 'EN_COURS'
  | 'TERMINE'
  | 'ANNULE'

export type TypeLigne =
  | 'HEBERGEMENT'
  | 'ENERGIE'
  | 'TAXE_SEJOUR'
  | 'SUPPLEMENT'
  | 'LIBRE'

export type StatutLigne =
  | 'CONFIRME'
  | 'A_CONFIRMER'

export type StatutFacture =
  | 'BROUILLON'
  | 'EMISE'
  | 'PAYEE'

export type ModePaiement =
  | 'CHEQUE'
  | 'VIREMENT'

/* ── Entités ── */

export interface Locataire {
  id: number
  nom: string
  email: string
  telephone?: string
  adresse?: string
}

export interface SejourCategorie {
  id: number
  tarifPersonneId: number
  nomSnapshot: string
  prixNuitSnapshot: number
  effectifPrevu: number
  effectifReel?: number | null
}

export interface Sejour {
  id: number
  statut: StatutSejour
  locataire: Locataire
  dateArrivee: string
  dateDepart: string
  nbNuits: number
  heureArriveePrevue?: string
  heureDepartPrevu?: string
  heureArriveeReelle?: string | null
  heureDepartReelle?: string | null
  minPersonnesTotal: number
  tarifForfaitCategorieId?: number | null
  categories: SejourCategorie[]
  options?: string
  modePaiement?: ModePaiement
  dateLimitePaiement?: string
}

export interface LigneSejour {
  id: number
  sejourId: number
  typeLigne: TypeLigne
  statut: StatutLigne
  libelle: string
  quantite: number
  prixUnitaire: number
  prixTotal: number
  configItemId?: number | null
}

export interface Facture {
  id: number
  sejourId: number
  numero: string
  statut: StatutFacture
  montantTotal: number
  dateEmission?: string
  pdfUrl?: string
  lignes: LigneSejour[]
}

export interface Paiement {
  id: number
  sejourId: number
  montant: number
  mode: ModePaiement
  dateEncaissement: string
  numeroCheque?: string
  banqueEmettrice?: string
  photoUrl?: string
}

export interface TarifPersonne {
  id: number
  nom: string
  prixNuit: number
  description?: string
  actif: boolean
  ordre: number
}

export interface ConfigItem {
  id: number
  nom: string
  prixUnitaire: number
  unite: string
  categorieItem: string
  actif: boolean
}

export interface ConfigSiteEntry {
  cle: string
  valeur: string
  description?: string
}

/* ── DTOs Requêtes ── */

export interface CreateSejourRequest {
  locataireNom: string
  locataireEmail: string
  locataireTelephone?: string
  locataireAdresse?: string
  dateArrivee: string
  dateDepart: string
  heureArriveePrevue?: string
  heureDepartPrevu?: string
  minPersonnesTotal?: number
  tarifForfaitCategorieId?: number
  modePaiement?: ModePaiement
  dateLimitePaiement?: string
  options?: string
  categories: {
    tarifPersonneId: number
    effectifPrevu: number
  }[]
}

export interface PatchPersonnesRequest {
  categories: {
    sejourCategorieId: number
    effectifReel: number
  }[]
  nbAdultes: number
}

export interface AddSupplementRequest {
  configItemId?: number
  libelle: string
  quantite: number
  prixUnitaire: number
  typeLigne: 'SUPPLEMENT' | 'LIBRE'
}

export interface CreatePaiementRequest {
  montant: number
  mode: ModePaiement
  numeroCheque?: string
  banqueEmettrice?: string
}

export interface PromouvoirLigneRequest {
  categorieItem: string
  unite: string
  nomCatalogue: string
}

/* ── DTOs Réponses paginées ── */

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

/* ── Calcul hébergement (côté client pour affichage temps réel) ── */

export interface CalculHebergementResult {
  montantTotal: number
  forfaitApplique: boolean
  totalReelParNuit: number
  minPersonnesTotal: number
  details: {
    nuit: number
    montantReel: number
    totalReel: number
    montantFacture: number
    forfait: boolean
  }[]
}
