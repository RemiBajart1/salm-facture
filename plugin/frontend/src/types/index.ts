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
  id: string        // UUID
  nom: string
  email: string
  telephone?: string
  adresse?: string
  createdAt?: string
}

export interface SejourCategorie {
  id: string        // UUID
  nom: string
  prixNuit: number
  nbPrevues: number
  nbReelles?: number | null
}

export interface Sejour {
  id: string        // UUID
  statut: StatutSejour
  nomLocataire: string
  emailLocataire: string
  telephoneLocataire?: string
  dateArrivee: string
  dateDepart: string
  nbNuits: number
  heureArriveePrevue?: string
  heureDepartPrevu?: string
  heureArriveeReelle?: string | null
  heureDepartReel?: string | null
  nbAdultes?: number | null
  minPersonnesTotal: number
  modePaiement?: ModePaiement
  dateLimitePaiement?: string | null
  optionsPresaisies?: string | null
  notesInternes?: string | null
  categories: SejourCategorie[]
}

export interface LigneSejour {
  id: string        // UUID
  typeLigne: TypeLigne
  statut: StatutLigne
  designation: string
  quantite: number
  prixUnitaire: number
  montant: number
  configItemId?: string | null  // UUID
  saisiPar?: string | null
  createdAt?: string
}

export interface Facture {
  id: string        // UUID
  sejourId: string  // UUID
  numero: string
  statut: StatutFacture
  dateGeneration?: string
  montantHebergement: number
  montantEnergie: number
  montantTaxe: number
  montantSupplements: number
  montantTotal: number
  emailEnvoye: boolean
  pdfUrl?: string | null
}

export interface Paiement {
  id: string        // UUID
  montant: number
  mode: ModePaiement
  dateEncaissement: string
  numeroCheque?: string | null
  banqueEmettrice?: string | null
  chequePhotoUrl?: string | null
  enregistrePar?: string
  createdAt?: string
}

export interface TarifPersonne {
  id: string        // UUID
  nom: string
  prixNuit: number
  description?: string
  actif: boolean
  ordre: number
}

export interface ConfigItem {
  id: string        // UUID
  designation: string
  categorie: string
  prixUnitaire: number
  unite: 'UNITE' | 'SEJOUR' | 'INTERVENTION'
  actif: boolean
}

export interface ConfigSiteEntry {
  cle: string
  valeur: string
  description?: string
}

/* ── DTOs Requêtes ── */

export interface CreateSejourRequest {
  nomLocataire: string
  emailLocataire: string
  telephoneLocataire?: string
  adresseLocataire?: string
  dateArrivee: string
  dateDepart: string
  heureArriveePrevue?: string
  heureDepartPrevu?: string
  minPersonnesTotal?: number
  modePaiement?: ModePaiement
  dateLimitePaiement?: string
  optionsPresaisies?: string
  notesInternes?: string
  categories: {
    tarifId: string  // UUID
    nbPrevues: number
  }[]
}

export interface PatchPersonnesRequest {
  categories: {
    categorieId: string  // UUID
    nbReelles: number
  }[]
  nbAdultes: number
}

export interface AddSupplementRequest {
  configItemId?: string  // UUID, null si saisie libre
  designation: string
  quantite: number
  prixUnitaire: number
}

export interface CreatePaiementRequest {
  montant: number
  mode: ModePaiement
  dateEncaissement?: string
  numeroCheque?: string
  banqueEmettrice?: string
}

export interface PromouvoirLigneRequest {
  categorieItem: string
  unite: 'UNITE' | 'SEJOUR' | 'INTERVENTION'
  nomCatalogue?: string
}

/* ── DTOs Réponses paginées ── */

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
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
