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
    id: 1,
    nom: 'Famille Dupont',
    email: 'jp.dupont@email.fr',
    telephone: '06 12 34 56 78',
    adresse: '12 rue des Lilas, 67000 Strasbourg',
  },
  {
    id: 2,
    nom: 'Association Les Randonneurs',
    email: 'contact@randonneurs67.fr',
    telephone: '03 88 45 67 89',
    adresse: '5 allée des Vosges, 67200 Strasbourg',
  },
  {
    id: 3,
    nom: 'Famille Martin',
    email: 'c.martin@gmail.com',
    telephone: '06 98 76 54 32',
  },
]

const mockSejourCurrent: Sejour = {
  id: 1,
  statut: 'EN_COURS',
  locataire: mockLocataires[0],
  dateArrivee: '2025-03-22',
  dateDepart: '2025-03-29',
  nbNuits: 7,
  heureArriveePrevue: '15:00',
  heureDepartPrevu: '10:00',
  heureArriveeReelle: '15:30',
  heureDepartReelle: null,
  minPersonnesTotal: 40,
  tarifForfaitCategorieId: 1,
  categories: [
    {
      id: 1,
      tarifPersonneId: 1,
      nomSnapshot: "Membre de l'union",
      prixNuitSnapshot: 14.0,
      effectifPrevu: 25,
      effectifReel: null,
    },
    {
      id: 2,
      tarifPersonneId: 2,
      nomSnapshot: 'Groupe de jeunes',
      prixNuitSnapshot: 12.0,
      effectifPrevu: 15,
      effectifReel: null,
    },
  ],
  options: 'Linge de maison inclus, animaux autorisés',
  modePaiement: 'CHEQUE',
}

const mockSejours: Sejour[] = [
  mockSejourCurrent,
  {
    id: 2,
    statut: 'PLANIFIE',
    locataire: mockLocataires[1],
    dateArrivee: '2025-04-05',
    dateDepart: '2025-04-07',
    nbNuits: 2,
    heureArriveePrevue: '16:00',
    heureDepartPrevu: '10:00',
    minPersonnesTotal: 40,
    tarifForfaitCategorieId: 3,
    categories: [
      {
        id: 3,
        tarifPersonneId: 3,
        nomSnapshot: 'Extérieur',
        prixNuitSnapshot: 18.0,
        effectifPrevu: 42,
        effectifReel: null,
      },
    ],
    modePaiement: 'VIREMENT',
  },
  {
    id: 3,
    statut: 'TERMINE',
    locataire: mockLocataires[2],
    dateArrivee: '2025-02-14',
    dateDepart: '2025-02-16',
    nbNuits: 2,
    heureArriveePrevue: '14:00',
    heureDepartPrevu: '11:00',
    heureArriveeReelle: '14:15',
    heureDepartReelle: '11:00',
    minPersonnesTotal: 40,
    tarifForfaitCategorieId: 4,
    categories: [
      {
        id: 4,
        tarifPersonneId: 1,
        nomSnapshot: "Membre de l'union",
        prixNuitSnapshot: 14.0,
        effectifPrevu: 30,
        effectifReel: 28,
      },
    ],
    modePaiement: 'CHEQUE',
  },
]

const mockLignes: LigneSejour[] = [
  {
    id: 1,
    sejourId: 1,
    typeLigne: 'HEBERGEMENT',
    statut: 'CONFIRME',
    libelle: "Forfait hébergement – 40 personnes · 7 nuits",
    quantite: 1,
    prixUnitaire: 3727.36,
    prixTotal: 3727.36,
  },
  {
    id: 2,
    sejourId: 1,
    typeLigne: 'ENERGIE',
    statut: 'CONFIRME',
    libelle: 'Forfait énergies (2 nuits × 80 €)',
    quantite: 2,
    prixUnitaire: 80.0,
    prixTotal: 160.0,
  },
  {
    id: 3,
    sejourId: 1,
    typeLigne: 'TAXE_SEJOUR',
    statut: 'CONFIRME',
    libelle: 'Taxe de séjour (22 adultes × 7 nuits × 0,88 €)',
    quantite: 154,
    prixUnitaire: 0.88,
    prixTotal: 135.52,
  },
  {
    id: 4,
    sejourId: 1,
    typeLigne: 'SUPPLEMENT',
    statut: 'CONFIRME',
    libelle: 'Assiette cassée',
    quantite: 1,
    prixUnitaire: 8.0,
    prixTotal: 8.0,
    configItemId: 1,
  },
  {
    id: 5,
    sejourId: 1,
    typeLigne: 'SUPPLEMENT',
    statut: 'CONFIRME',
    libelle: 'Verre cassé',
    quantite: 2,
    prixUnitaire: 4.0,
    prixTotal: 8.0,
    configItemId: 2,
  },
  {
    id: 6,
    sejourId: 1,
    typeLigne: 'SUPPLEMENT',
    statut: 'CONFIRME',
    libelle: 'Location barbecue',
    quantite: 1,
    prixUnitaire: 25.0,
    prixTotal: 25.0,
    configItemId: 3,
  },
  {
    id: 7,
    sejourId: 1,
    typeLigne: 'LIBRE',
    statut: 'A_CONFIRMER',
    libelle: 'Drap taché (1)',
    quantite: 1,
    prixUnitaire: 15.0,
    prixTotal: 15.0,
  },
]

const mockFacture: Facture = {
  id: 1,
  sejourId: 1,
  numero: 'FAC-2025-001',
  statut: 'BROUILLON',
  montantTotal: 4078.88,
  lignes: mockLignes,
}

const mockTarifs: TarifPersonne[] = [
  {
    id: 1,
    nom: "Membre de l'union",
    prixNuit: 14.0,
    description: 'Tarif standard UCJG',
    actif: true,
    ordre: 1,
  },
  {
    id: 2,
    nom: 'Groupe de jeunes',
    prixNuit: 12.0,
    description: 'Groupes <25 ans',
    actif: true,
    ordre: 2,
  },
  {
    id: 3,
    nom: 'Extérieur',
    prixNuit: 18.0,
    description: "Personnes extérieures à l'union",
    actif: true,
    ordre: 3,
  },
  {
    id: 4,
    nom: 'Bénévole encadrant',
    prixNuit: 8.0,
    description: 'Encadrants bénévoles',
    actif: false,
    ordre: 4,
  },
]

const mockItems: ConfigItem[] = [
  {
    id: 1,
    nom: 'Assiette cassée',
    prixUnitaire: 8.0,
    unite: 'unité',
    categorieItem: 'CASSE',
    actif: true,
  },
  {
    id: 2,
    nom: 'Verre cassé',
    prixUnitaire: 4.0,
    unite: 'unité',
    categorieItem: 'CASSE',
    actif: true,
  },
  {
    id: 3,
    nom: 'Location barbecue',
    prixUnitaire: 25.0,
    unite: 'séjour',
    categorieItem: 'LOCATION',
    actif: true,
  },
  {
    id: 4,
    nom: 'Nettoyage supplémentaire',
    prixUnitaire: 60.0,
    unite: 'intervention',
    categorieItem: 'SERVICE',
    actif: true,
  },
  {
    id: 5,
    nom: 'Kit linge de lit',
    prixUnitaire: 5.0,
    unite: 'kit',
    categorieItem: 'LINGE',
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
      number: page,
      size,
    })
  }),

  /* Séjour par ID */
  http.get('/api/v1/sejours/:id', ({ params }) => {
    const sejour = mockSejours.find((s) => s.id === Number(params.id))
    if (!sejour) return HttpResponse.json({ message: 'Séjour introuvable' }, { status: 404 })
    return HttpResponse.json(sejour)
  }),

  /* Créer séjour */
  http.post('/api/v1/sejours', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newSejour: Sejour = {
      id: mockSejours.length + 1,
      statut: 'PLANIFIE',
      locataire: {
        id: mockLocataires.length + 1,
        nom: String(body.locataireNom ?? ''),
        email: String(body.locataireEmail ?? ''),
        telephone: body.locataireTelephone as string | undefined,
        adresse: body.locataireAdresse as string | undefined,
      },
      dateArrivee: String(body.dateArrivee ?? ''),
      dateDepart: String(body.dateDepart ?? ''),
      nbNuits: 1,
      minPersonnesTotal: Number(body.minPersonnesTotal ?? 40),
      tarifForfaitCategorieId: body.tarifForfaitCategorieId as number | undefined,
      categories: [],
      modePaiement: (body.modePaiement as 'CHEQUE' | 'VIREMENT') ?? 'CHEQUE',
    }
    mockSejours.push(newSejour)
    return HttpResponse.json(newSejour, { status: 201 })
  }),

  /* Patch personnes */
  http.patch('/api/v1/sejours/:id/personnes', async ({ params, request }) => {
    const sejour = mockSejours.find((s) => s.id === Number(params.id))
    if (!sejour) return HttpResponse.json({ message: 'Séjour introuvable' }, { status: 404 })
    const body = await request.json() as { categories: { sejourCategorieId: number; effectifReel: number }[] }
    body.categories.forEach(({ sejourCategorieId, effectifReel }) => {
      const cat = sejour.categories.find((c) => c.id === sejourCategorieId)
      if (cat) cat.effectifReel = effectifReel
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
    const newLigne: LigneSejour = {
      id: mockLignes.length + 1,
      sejourId: Number(params.id),
      typeLigne: (body.typeLigne as 'SUPPLEMENT' | 'LIBRE') ?? 'SUPPLEMENT',
      statut: body.typeLigne === 'LIBRE' ? 'A_CONFIRMER' : 'CONFIRME',
      libelle: String(body.libelle ?? ''),
      quantite: Number(body.quantite ?? 1),
      prixUnitaire: Number(body.prixUnitaire ?? 0),
      prixTotal: Number(body.quantite ?? 1) * Number(body.prixUnitaire ?? 0),
      configItemId: body.configItemId as number | undefined,
    }
    mockLignes.push(newLigne)
    return HttpResponse.json(newLigne, { status: 201 })
  }),

  /* Lignes du séjour */
  http.get('/api/v1/sejours/:id/lignes', ({ params }) => {
    const lignes = mockLignes.filter((l) => l.sejourId === Number(params.id))
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
  http.post('/api/v1/sejours/:id/paiements', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      {
        id: 1,
        sejourId: Number(params.id),
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
    const newTarif: TarifPersonne = { id: mockTarifs.length + 1, ...body }
    mockTarifs.push(newTarif)
    return HttpResponse.json(newTarif, { status: 201 })
  }),

  http.put('/api/v1/admin/tarifs/:id', async ({ params, request }) => {
    const idx = mockTarifs.findIndex((t) => t.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Tarif introuvable' }, { status: 404 })
    const body = await request.json() as Partial<TarifPersonne>
    mockTarifs[idx] = { ...mockTarifs[idx], ...body }
    return HttpResponse.json(mockTarifs[idx])
  }),

  /* Items */
  http.get('/api/v1/admin/items', () => HttpResponse.json(mockItems)),

  http.post('/api/v1/admin/items', async ({ request }) => {
    const body = await request.json() as Omit<ConfigItem, 'id'>
    const newItem: ConfigItem = { id: mockItems.length + 1, ...body }
    mockItems.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put('/api/v1/admin/items/:id', async ({ params, request }) => {
    const idx = mockItems.findIndex((i) => i.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Item introuvable' }, { status: 404 })
    const body = await request.json() as Partial<ConfigItem>
    mockItems[idx] = { ...mockItems[idx], ...body }
    return HttpResponse.json(mockItems[idx])
  }),

  http.delete('/api/v1/admin/items/:id', ({ params }) => {
    const idx = mockItems.findIndex((i) => i.id === Number(params.id))
    if (idx !== -1) mockItems[idx].actif = false
    return new HttpResponse(null, { status: 204 })
  }),

  /* Lignes libres */
  http.get('/api/v1/admin/lignes-libres', () => {
    return HttpResponse.json(mockLignes.filter((l) => l.typeLigne === 'LIBRE'))
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
