/**
 * Handlers MSW — données fictives pour le développement sans backend.
 * Couvre toutes les routes de l'API LocaGest.
 */
import { http, HttpResponse } from 'msw'
import type {
  Sejour,
  LigneSejour,
  Facture,
  TarifPersonne,
  ConfigItem,
  ConfigSiteEntry,
  Locataire,
} from '../types'

/* ── Données fictives ── */

const mockLocataires: Locataire[] = [
  {
    id: 'loc-uuid-1',
    nom: 'Famille Dupont',
    email: 'jp.dupont@email.fr',
    telephone: '06 12 34 56 78',
    adresse: '12 rue des Lilas, 67000 Strasbourg',
  },
  {
    id: 'loc-uuid-2',
    nom: 'Association Les Randonneurs',
    email: 'contact@randonneurs67.fr',
    telephone: '03 88 45 67 89',
    adresse: '5 allée des Vosges, 67200 Strasbourg',
  },
  {
    id: 'loc-uuid-3',
    nom: 'Famille Martin',
    email: 'c.martin@gmail.com',
    telephone: '06 98 76 54 32',
  },
]

const mockSejourCurrent: Sejour = {
  id: 'sejour-uuid-1',
  statut: 'EN_COURS',
  nomLocataire: 'Famille Dupont',
  emailLocataire: 'jp.dupont@email.fr',
  telephoneLocataire: '06 12 34 56 78',
  dateArrivee: '2025-03-22',
  dateDepart: '2025-03-29',
  nbNuits: 7,
  heureArriveePrevue: '15:00',
  heureDepartPrevu: '10:00',
  heureArriveeReelle: '15:30',
  heureDepartReel: null,
  minPersonnesTotal: 40,
  categories: [
    {
      id: 'cat-uuid-1',
      nom: "Membre de l'union",
      prixNuit: 14.0,
      nbPrevues: 25,
      nbReelles: null,
    },
    {
      id: 'cat-uuid-2',
      nom: 'Groupe de jeunes',
      prixNuit: 12.0,
      nbPrevues: 15,
      nbReelles: null,
    },
  ],
  optionsPresaisies: 'Linge de maison inclus, animaux autorisés',
  modePaiement: 'CHEQUE',
}

const mockSejours: Sejour[] = [
  mockSejourCurrent,
  {
    id: 'sejour-uuid-2',
    statut: 'PLANIFIE',
    nomLocataire: 'Association Les Randonneurs',
    emailLocataire: 'contact@randonneurs67.fr',
    telephoneLocataire: '03 88 45 67 89',
    dateArrivee: '2025-04-05',
    dateDepart: '2025-04-07',
    nbNuits: 2,
    heureArriveePrevue: '16:00',
    heureDepartPrevu: '10:00',
    minPersonnesTotal: 40,
    categories: [
      {
        id: 'cat-uuid-3',
        nom: 'Extérieur',
        prixNuit: 18.0,
        nbPrevues: 42,
        nbReelles: null,
      },
    ],
    modePaiement: 'VIREMENT',
  },
  {
    id: 'sejour-uuid-3',
    statut: 'TERMINE',
    nomLocataire: 'Famille Martin',
    emailLocataire: 'c.martin@gmail.com',
    telephoneLocataire: '06 98 76 54 32',
    dateArrivee: '2025-02-14',
    dateDepart: '2025-02-16',
    nbNuits: 2,
    heureArriveePrevue: '14:00',
    heureDepartPrevu: '11:00',
    heureArriveeReelle: '14:15',
    heureDepartReel: '11:00',
    minPersonnesTotal: 40,
    categories: [
      {
        id: 'cat-uuid-4',
        nom: "Membre de l'union",
        prixNuit: 14.0,
        nbPrevues: 30,
        nbReelles: 28,
      },
    ],
    modePaiement: 'CHEQUE',
  },
]

// Données internes avec sejourId pour le filtrage (non exposé dans LigneSejour)
type LigneAvecSejour = LigneSejour & { _sejourId: string }

const mockLignes: LigneAvecSejour[] = [
  {
    id: 'ligne-uuid-1',
    _sejourId: 'sejour-uuid-1',
    typeLigne: 'HEBERGEMENT',
    statut: 'CONFIRME',
    designation: "Forfait hébergement – 40 personnes · 7 nuits",
    quantite: 1,
    prixUnitaire: 3727.36,
    montant: 3727.36,
  },
  {
    id: 'ligne-uuid-2',
    _sejourId: 'sejour-uuid-1',
    typeLigne: 'ENERGIE',
    statut: 'CONFIRME',
    designation: 'Forfait énergies (2 nuits × 80 €)',
    quantite: 2,
    prixUnitaire: 80.0,
    montant: 160.0,
  },
  {
    id: 'ligne-uuid-3',
    _sejourId: 'sejour-uuid-1',
    typeLigne: 'TAXE_SEJOUR',
    statut: 'CONFIRME',
    designation: 'Taxe de séjour (22 adultes × 7 nuits × 0,88 €)',
    quantite: 154,
    prixUnitaire: 0.88,
    montant: 135.52,
  },
  {
    id: 'ligne-uuid-4',
    _sejourId: 'sejour-uuid-1',
    typeLigne: 'SUPPLEMENT',
    statut: 'CONFIRME',
    designation: 'Assiette cassée',
    quantite: 1,
    prixUnitaire: 8.0,
    montant: 8.0,
    configItemId: 'item-uuid-1',
  },
  {
    id: 'ligne-uuid-5',
    _sejourId: 'sejour-uuid-1',
    typeLigne: 'SUPPLEMENT',
    statut: 'CONFIRME',
    designation: 'Verre cassé',
    quantite: 2,
    prixUnitaire: 4.0,
    montant: 8.0,
    configItemId: 'item-uuid-2',
  },
  {
    id: 'ligne-uuid-6',
    _sejourId: 'sejour-uuid-1',
    typeLigne: 'SUPPLEMENT',
    statut: 'CONFIRME',
    designation: 'Location barbecue',
    quantite: 1,
    prixUnitaire: 25.0,
    montant: 25.0,
    configItemId: 'item-uuid-3',
  },
  {
    id: 'ligne-uuid-7',
    _sejourId: 'sejour-uuid-1',
    typeLigne: 'LIBRE',
    statut: 'A_CONFIRMER',
    designation: 'Drap taché (1)',
    quantite: 1,
    prixUnitaire: 15.0,
    montant: 15.0,
  },
]

const mockFacture: Facture = {
  id: 'facture-uuid-1',
  sejourId: 'sejour-uuid-1',
  numero: 'FAC-2025-001',
  statut: 'BROUILLON',
  montantHebergement: 3727.36,
  montantEnergie: 160.0,
  montantTaxe: 135.52,
  montantSupplements: 56.0,
  montantTotal: 4078.88,
  emailEnvoye: false,
}

const mockTarifs: TarifPersonne[] = [
  {
    id: 'tarif-uuid-1',
    nom: "Membre de l'union",
    prixNuit: 14.0,
    description: 'Tarif standard UCJG',
    actif: true,
    ordre: 1,
  },
  {
    id: 'tarif-uuid-2',
    nom: 'Groupe de jeunes',
    prixNuit: 12.0,
    description: 'Groupes <25 ans',
    actif: true,
    ordre: 2,
  },
  {
    id: 'tarif-uuid-3',
    nom: 'Extérieur',
    prixNuit: 18.0,
    description: "Personnes extérieures à l'union",
    actif: true,
    ordre: 3,
  },
  {
    id: 'tarif-uuid-4',
    nom: 'Bénévole encadrant',
    prixNuit: 8.0,
    description: 'Encadrants bénévoles',
    actif: false,
    ordre: 4,
  },
]

const mockItems: ConfigItem[] = [
  {
    id: 'item-uuid-1',
    designation: 'Assiette cassée',
    prixUnitaire: 8.0,
    unite: 'UNITE',
    categorie: 'CASSE',
    actif: true,
  },
  {
    id: 'item-uuid-2',
    designation: 'Verre cassé',
    prixUnitaire: 4.0,
    unite: 'UNITE',
    categorie: 'CASSE',
    actif: true,
  },
  {
    id: 'item-uuid-3',
    designation: 'Location barbecue',
    prixUnitaire: 25.0,
    unite: 'SEJOUR',
    categorie: 'LOCATION',
    actif: true,
  },
  {
    id: 'item-uuid-4',
    designation: 'Nettoyage supplémentaire',
    prixUnitaire: 60.0,
    unite: 'INTERVENTION',
    categorie: 'SERVICE',
    actif: true,
  },
  {
    id: 'item-uuid-5',
    designation: 'Kit linge de lit',
    prixUnitaire: 5.0,
    unite: 'UNITE',
    categorie: 'LINGE',
    actif: true,
  },
]

const mockConfig: ConfigSiteEntry[] = [
  { cle: 'min_personnes_defaut', valeur: '40', description: 'Forfait minimum de personnes par nuit (défaut)' },
  { cle: 'energie_nb_nuits', valeur: '2', description: 'Nombre de nuits incluses dans le forfait énergie' },
  { cle: 'energie_prix_nuit', valeur: '80', description: 'Prix du forfait énergie par nuit (€)' },
  { cle: 'taxe_adulte_nuit', valeur: '0.88', description: 'Taxe de séjour par adulte par nuit (€)' },
  { cle: 'iban', valeur: 'FR76 3000 1007 9412 3456 7890 185', description: 'IBAN pour virement bancaire' },
  { cle: 'email_responsable', valeur: 'resp.location@ucjgsalm.org', description: 'Email du responsable location (copie facture)' },
  { cle: 'delai_paiement_jours', valeur: '14', description: 'Délai de paiement en jours après émission facture' },
  { cle: 'adresse_maison', valeur: '53 rue du Haut-Fourneau, 67130 La Broque', description: 'Adresse de la maison de vacances' },
]

/* ── Helpers ── */

let ligneCounter = 8
const nextLigneId = () => `ligne-uuid-${ligneCounter++}`

let sejourCounter = 4
const nextSejourId = () => `sejour-uuid-${sejourCounter++}`

/* ── Handlers ── */

export const handlers = [
  /* Séjour courant */
  http.get('/api/v1/sejours/current', () => {
    return HttpResponse.json(mockSejourCurrent)
  }),

  /* Liste séjours paginés */
  http.get('/api/v1/sejours', ({ request }) => {
    const url = new URL(request.url)
    const statut = url.searchParams.get('statut')
    const page = parseInt(url.searchParams.get('page') ?? '0')
    const size = parseInt(url.searchParams.get('size') ?? '20')
    const filtered = statut
      ? mockSejours.filter((s) => s.statut === statut)
      : mockSejours
    return HttpResponse.json({
      content: filtered.slice(page * size, (page + 1) * size),
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
      page,
      size,
    })
  }),

  /* Séjour par ID */
  http.get('/api/v1/sejours/:id', ({ params }) => {
    const sejour = mockSejours.find((s) => s.id === params.id)
    if (!sejour) return HttpResponse.json({ message: 'Séjour introuvable' }, { status: 404 })
    return HttpResponse.json(sejour)
  }),

  /* Créer séjour */
  http.post('/api/v1/sejours', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newSejour: Sejour = {
      id: nextSejourId(),
      statut: 'PLANIFIE',
      nomLocataire: String(body.nomLocataire ?? ''),
      emailLocataire: String(body.emailLocataire ?? ''),
      telephoneLocataire: body.telephoneLocataire as string | undefined,
      dateArrivee: String(body.dateArrivee ?? ''),
      dateDepart: String(body.dateDepart ?? ''),
      nbNuits: 1,
      minPersonnesTotal: Number(body.minPersonnesTotal ?? 40),
      categories: [],
      modePaiement: (body.modePaiement as 'CHEQUE' | 'VIREMENT') ?? 'CHEQUE',
      optionsPresaisies: body.optionsPresaisies as string | undefined,
    }
    mockSejours.push(newSejour)
    return HttpResponse.json(newSejour, { status: 201 })
  }),

  /* Patch personnes */
  http.patch('/api/v1/sejours/:id/personnes', async ({ params, request }) => {
    const sejour = mockSejours.find((s) => s.id === params.id)
    if (!sejour) return HttpResponse.json({ message: 'Séjour introuvable' }, { status: 404 })
    const body = await request.json() as { categories: { categorieId: string; nbReelles: number }[] }
    body.categories.forEach(({ categorieId, nbReelles }) => {
      const cat = sejour.categories.find((c) => c.id === categorieId)
      if (cat) cat.nbReelles = nbReelles
    })
    return new HttpResponse(null, { status: 204 })
  }),

  /* Patch horaires */
  http.patch('/api/v1/sejours/:id/horaires', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  /* Ajouter supplément */
  http.post('/api/v1/sejours/:id/supplements', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const isLibre = !body.configItemId
    const newLigne: LigneAvecSejour = {
      id: nextLigneId(),
      _sejourId: String(params.id),
      typeLigne: isLibre ? 'LIBRE' : 'SUPPLEMENT',
      statut: isLibre ? 'A_CONFIRMER' : 'CONFIRME',
      designation: String(body.designation ?? ''),
      quantite: Number(body.quantite ?? 1),
      prixUnitaire: Number(body.prixUnitaire ?? 0),
      montant: Number(body.quantite ?? 1) * Number(body.prixUnitaire ?? 0),
      configItemId: body.configItemId as string | undefined,
    }
    mockLignes.push(newLigne)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _sejourId, ...ligneResponse } = newLigne
    return HttpResponse.json(ligneResponse, { status: 201 })
  }),

  /* Lignes du séjour */
  http.get('/api/v1/sejours/:id/lignes', ({ params }) => {
    const lignes = mockLignes
      .filter((l) => l._sejourId === params.id)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _sejourId, ...l }) => l)
    return HttpResponse.json(lignes)
  }),

  /* Générer facture */
  http.post('/api/v1/sejours/:id/facture', () => {
    return HttpResponse.json(mockFacture, { status: 202 })
  }),

  /* Lire facture */
  http.get('/api/v1/sejours/:id/facture', () => {
    return HttpResponse.json(mockFacture)
  }),

  /* Renvoyer facture */
  http.post('/api/v1/sejours/:id/facture/renvoyer', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  /* Ajouter paiement */
  http.post('/api/v1/sejours/:id/paiements', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      {
        id: 'paiement-uuid-1',
        montant: body.montant,
        mode: body.mode,
        dateEncaissement: new Date().toISOString().split('T')[0],
        numeroCheque: body.numeroCheque,
        banqueEmettrice: body.banqueEmettrice,
      },
      { status: 201 },
    )
  }),

  /* Paiements */
  http.get('/api/v1/sejours/:id/paiements', () => {
    return HttpResponse.json([])
  }),

  /* Recherche locataires */
  http.get('/api/v1/locataires', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    const results = mockLocataires.filter(
      (l) =>
        l.nom.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q),
    )
    return HttpResponse.json(results)
  }),

  /* Tarifs */
  http.get('/api/v1/admin/tarifs', () => HttpResponse.json(mockTarifs)),

  http.post('/api/v1/admin/tarifs', async ({ request }) => {
    const body = await request.json() as Omit<TarifPersonne, 'id'>
    const newTarif: TarifPersonne = { id: `tarif-uuid-${mockTarifs.length + 1}`, ...body }
    mockTarifs.push(newTarif)
    return HttpResponse.json(newTarif, { status: 201 })
  }),

  http.put('/api/v1/admin/tarifs/:id', async ({ params, request }) => {
    const idx = mockTarifs.findIndex((t) => t.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Tarif introuvable' }, { status: 404 })
    const body = await request.json() as Partial<TarifPersonne>
    mockTarifs[idx] = { ...mockTarifs[idx], ...body }
    return HttpResponse.json(mockTarifs[idx])
  }),

  /* Items */
  http.get('/api/v1/admin/items', () => HttpResponse.json(mockItems)),

  http.post('/api/v1/admin/items', async ({ request }) => {
    const body = await request.json() as Omit<ConfigItem, 'id'>
    const newItem: ConfigItem = { id: `item-uuid-${mockItems.length + 1}`, ...body }
    mockItems.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put('/api/v1/admin/items/:id', async ({ params, request }) => {
    const idx = mockItems.findIndex((i) => i.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Item introuvable' }, { status: 404 })
    const body = await request.json() as Partial<ConfigItem>
    mockItems[idx] = { ...mockItems[idx], ...body }
    return HttpResponse.json(mockItems[idx])
  }),

  http.delete('/api/v1/admin/items/:id', ({ params }) => {
    const idx = mockItems.findIndex((i) => i.id === params.id)
    if (idx !== -1) mockItems[idx].actif = false
    return new HttpResponse(null, { status: 204 })
  }),

  /* Lignes libres */
  http.get('/api/v1/admin/lignes-libres', () => {
    return HttpResponse.json(
      mockLignes
        .filter((l) => l.typeLigne === 'LIBRE')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ _sejourId, ...l }) => l),
    )
  }),

  http.post('/api/v1/admin/lignes-libres/:id/promouvoir', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  /* Config site */
  http.get('/api/v1/admin/config', () => HttpResponse.json(mockConfig)),

  http.patch('/api/v1/admin/config', async ({ request }) => {
    const body = await request.json() as { entries: { cle: string; valeur: string }[] }
    body.entries.forEach(({ cle, valeur }) => {
      const entry = mockConfig.find((c) => c.cle === cle)
      if (entry) entry.valeur = valeur
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
