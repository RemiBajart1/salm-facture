import { http, HttpResponse } from 'msw'

const BASE = '/wp-json/locagest/v1'

/* ── Comptes de développement ── */

const DEV_USERS: Record<string, { password: string; roles: string[]; user_id: number }> = {
  'gardien@test.fr':  { password: 'test', roles: ['locagest_gardien'],       user_id: 1 },
  'resp@test.fr':     { password: 'test', roles: ['locagest_resp_location'],  user_id: 2 },
  'tresorier@test.fr':{ password: 'test', roles: ['locagest_tresorier'],      user_id: 3 },
}

/* ── Données fictives (format WP snake_case) ── */

const mockLocataires = [
  { id: 1, nom: 'Famille Dupont',              email: 'jp.dupont@email.fr',         telephone: '06 12 34 56 78', adresse: '12 rue des Lilas, 67000 Strasbourg' },
  { id: 2, nom: 'Association Les Randonneurs', email: 'contact@randonneurs67.fr',    telephone: '03 88 45 67 89', adresse: '5 allée des Vosges, 67200 Strasbourg' },
  { id: 3, nom: 'Famille Martin',              email: 'c.martin@gmail.com',          telephone: '06 98 76 54 32' },
]

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const nextWeekStr = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10)
const nextMonthStr = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10)
const nextMonthEndStr = new Date(today.getTime() + 32 * 86400000).toISOString().slice(0, 10)

const mockSejourCurrent = {
  id: 1,
  statut: 'EN_COURS',
  locataire_nom_snapshot:       'Famille Dupont',
  locataire_email_snapshot:     'jp.dupont@email.fr',
  locataire_telephone_snapshot: '06 12 34 56 78',
  date_debut:           todayStr,
  date_fin:             nextWeekStr,
  nb_nuits:             7,
  heure_arrivee_prevue: '15:00',
  heure_depart_prevu:   '10:00',
  heure_arrivee_reelle: '15:30',
  heure_depart_reel:    null,
  min_personnes_total:  40,
  nb_adultes:           null,
  options_presaisies:   'Linge de maison inclus, animaux autorisés',
  mode_paiement:        'CHEQUE',
  notes:                null,
  objet_sejour:         'Week-end anniversaire 40 ans',
  nom_groupe:           'Les Amis de Pierre',
  categories: [
    { id: 1, nom_snapshot: "Membre de l'union", prix_nuit_snapshot: 14.0, nb_previsionnel: 25, nb_reelles: null },
    { id: 2, nom_snapshot: 'Groupe de jeunes',  prix_nuit_snapshot: 12.0, nb_previsionnel: 15, nb_reelles: null },
  ],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSejours: any[] = [
  mockSejourCurrent,
  {
    id: 2,
    statut: 'PLANIFIE',
    locataire_nom_snapshot:       'Association Les Randonneurs',
    locataire_email_snapshot:     'contact@randonneurs67.fr',
    locataire_telephone_snapshot: '03 88 45 67 89',
    date_debut:           nextMonthStr,
    date_fin:             nextMonthEndStr,
    nb_nuits:             2,
    heure_arrivee_prevue: '16:00',
    heure_depart_prevu:   '10:00',
    heure_arrivee_reelle: null,
    heure_depart_reel:    null,
    min_personnes_total:  40,
    nb_adultes:           null,
    options_presaisies:   null,
    mode_paiement:        'VIREMENT',
    notes:                null,
    objet_sejour:         'Randonnée club vosges',
    nom_groupe:           'Les Randonneurs 67',
    categories: [
      { id: 3, nom_snapshot: 'Extérieur', prix_nuit_snapshot: 18.0, nb_previsionnel: 42, nb_reelles: null },
    ],
  },
  {
    id: 3,
    statut: 'TERMINE',
    locataire_nom_snapshot:       'Famille Martin',
    locataire_email_snapshot:     'c.martin@gmail.com',
    locataire_telephone_snapshot: '06 98 76 54 32',
    date_debut:           '2025-02-14',
    date_fin:             '2025-02-16',
    nb_nuits:             2,
    heure_arrivee_prevue: '14:00',
    heure_depart_prevu:   '11:00',
    heure_arrivee_reelle: '14:15',
    heure_depart_reel:    '11:00',
    min_personnes_total:  40,
    nb_adultes:           22,
    options_presaisies:   null,
    mode_paiement:        'CHEQUE',
    notes:                null,
    objet_sejour:         'Saint-Valentin en famille',
    nom_groupe:           '',
    categories: [
      { id: 4, nom_snapshot: "Membre de l'union", prix_nuit_snapshot: 14.0, nb_previsionnel: 30, nb_reelles: 28 },
    ],
  },
]

type MockLigne = {
  id: number; _sejour_id: number; type_ligne: string; statut: string;
  libelle: string; quantite: number; prix_unitaire: number; prix_total: number; config_item_id?: number | null
}
const mockLignes: MockLigne[] = [
  { id: 1, _sejour_id: 1, type_ligne: 'HEBERGEMENT', statut: 'CONFIRME',   libelle: "Forfait hébergement – 40 personnes · 7 nuits", quantite: 1, prix_unitaire: 3727.36, prix_total: 3727.36 },
  { id: 2, _sejour_id: 1, type_ligne: 'ENERGIE',     statut: 'CONFIRME',   libelle: 'Forfait énergies (2 nuits × 80 €)',           quantite: 2, prix_unitaire: 80.0,    prix_total: 160.0 },
  { id: 3, _sejour_id: 1, type_ligne: 'TAXE',        statut: 'CONFIRME',   libelle: 'Taxe de séjour (22 adultes × 7 nuits × 0,88 €)', quantite: 154, prix_unitaire: 0.88, prix_total: 135.52 },
  { id: 4, _sejour_id: 1, type_ligne: 'SUPPLEMENT',  statut: 'CONFIRME',   libelle: 'Assiette cassée',   quantite: 1, prix_unitaire: 8.0,  prix_total: 8.0,  config_item_id: 1 },
  { id: 5, _sejour_id: 1, type_ligne: 'SUPPLEMENT',  statut: 'CONFIRME',   libelle: 'Verre cassé',       quantite: 2, prix_unitaire: 4.0,  prix_total: 8.0,  config_item_id: 2 },
  { id: 6, _sejour_id: 1, type_ligne: 'SUPPLEMENT',  statut: 'CONFIRME',   libelle: 'Location barbecue', quantite: 1, prix_unitaire: 25.0, prix_total: 25.0, config_item_id: 3 },
  { id: 7, _sejour_id: 1, type_ligne: 'LIBRE',        statut: 'BROUILLON', libelle: 'Drap taché (1)',    quantite: 1, prix_unitaire: 15.0, prix_total: 15.0 },
]

const mockFacture = {
  id: 1,
  sejour_id:           1,
  numero:              'FAC-2025-001',
  statut:              'BROUILLON',
  montant_hebergement: 3727.36,
  montant_energie:     160.0,
  montant_taxe:        135.52,
  montant_supplements: 56.0,
  montant_total:       4078.88,
  email_envoye:        false,
  pdf_url:             null,
}

const mockTarifs = [
  { id: 1, nom: "Membre de l'union", prix_nuit: 14.0, description: 'Tarif standard UCJG', actif: true, ordre: 1 },
  { id: 2, nom: 'Groupe de jeunes',  prix_nuit: 12.0, description: 'Groupes <25 ans',     actif: true, ordre: 2 },
  { id: 3, nom: 'Extérieur',         prix_nuit: 18.0, description: "Personnes extérieures à l'union", actif: true, ordre: 3 },
  { id: 4, nom: 'Bénévole encadrant',prix_nuit: 8.0,  description: 'Encadrants bénévoles', actif: false, ordre: 4 },
]

const mockItems = [
  { id: 1, libelle: 'Assiette cassée',         prix_unitaire: 8.0,  unite: 'UNITE',        categorie: 'CASSE',    actif: true },
  { id: 2, libelle: 'Verre cassé',             prix_unitaire: 4.0,  unite: 'UNITE',        categorie: 'CASSE',    actif: true },
  { id: 3, libelle: 'Location barbecue',       prix_unitaire: 25.0, unite: 'SEJOUR',       categorie: 'LOCATION', actif: true },
  { id: 4, libelle: 'Nettoyage supplémentaire',prix_unitaire: 60.0, unite: 'INTERVENTION', categorie: 'SERVICE',  actif: true },
  { id: 5, libelle: 'Kit linge de lit',        prix_unitaire: 5.0,  unite: 'UNITE',        categorie: 'LINGE',    actif: true },
]

const mockConfig = [
  { cle: 'min_personnes_defaut', valeur: '40',   description: 'Forfait minimum de personnes par nuit (défaut)' },
  { cle: 'energie_nb_nuits',     valeur: '2',    description: 'Nombre de nuits incluses dans le forfait énergie' },
  { cle: 'energie_prix_nuit',    valeur: '80',   description: 'Prix du forfait énergie par nuit (€)' },
  { cle: 'taxe_adulte_nuit',     valeur: '0.88', description: 'Taxe de séjour par adulte par nuit (€)' },
  { cle: 'iban',                 valeur: 'FR76 3000 1007 9412 3456 7890 185', description: 'IBAN pour virement bancaire' },
  { cle: 'email_responsable',    valeur: 'resp.location@ucjgsalm.org', description: 'Email du responsable location' },
  { cle: 'delai_paiement_jours', valeur: '14',   description: 'Délai de paiement en jours après émission facture' },
  { cle: 'adresse_maison',       valeur: '53 rue du Haut-Fourneau, 67130 La Broque', description: 'Adresse de la maison' },
]

/* ── Helpers ── */

let ligneCounter = 8
let sejourCounter = 4
const nextLigneId  = () => ligneCounter++
const nextSejourId = () => sejourCounter++

/* ── Handlers ── */

export const handlers = [

  /* Auth */
  http.post(`${BASE}/auth/token`, async ({ request }) => {
    const body = await request.json() as { username?: string; password?: string }
    const devUser = DEV_USERS[body.username ?? '']
    if (!devUser || devUser.password !== body.password) {
      return HttpResponse.json({ message: 'Identifiants incorrects.' }, { status: 401 })
    }
    return HttpResponse.json({
      token:      `mock-jwt-${devUser.roles[0]}`,
      user_id:    devUser.user_id,
      roles:      devUser.roles,
      expires_in: 86400,
    })
  }),

  /* Séjour courant */
  http.get(`${BASE}/sejours/current`, () => HttpResponse.json(mockSejourCurrent)),

  /* Liste séjours paginés */
  http.get(`${BASE}/sejours`, ({ request }) => {
    const url    = new URL(request.url)
    const statut = url.searchParams.get('statut')
    const page   = parseInt(url.searchParams.get('page') ?? '0')
    const size   = parseInt(url.searchParams.get('size') ?? '20')
    const actif  = url.searchParams.get('actif') === '1'
    const sort   = url.searchParams.get('sort') === 'asc' ? 'asc' : 'desc'
    const today  = new Date().toISOString().slice(0, 10)

    let filtered = statut ? mockSejours.filter((s) => s.statut === statut) : [...mockSejours]
    if (actif) filtered = filtered.filter((s) => s.date_fin >= today)
    filtered.sort((a, b) => sort === 'asc'
      ? a.date_debut.localeCompare(b.date_debut)
      : b.date_debut.localeCompare(a.date_debut))

    return HttpResponse.json({
      items: filtered.slice(page * size, (page + 1) * size),
      total: filtered.length,
      page,
      size,
    })
  }),

  /* Séjour par ID */
  http.get(`${BASE}/sejours/:id`, ({ params }) => {
    const sejour = mockSejours.find((s) => String(s.id) === String(params.id))
    if (!sejour) return HttpResponse.json({ message: 'Séjour introuvable' }, { status: 404 })
    return HttpResponse.json(sejour)
  }),

  /* Créer séjour */
  http.post(`${BASE}/sejours`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const loc  = (body.locataire ?? {}) as Record<string, unknown>
    const newSejour = {
      id:                           nextSejourId(),
      statut:                       'PLANIFIE',
      locataire_nom_snapshot:       String(loc.nom ?? ''),
      locataire_email_snapshot:     String(loc.email ?? ''),
      locataire_telephone_snapshot: loc.telephone as string | undefined,
      date_debut:                   String(body.date_debut ?? ''),
      date_fin:                     String(body.date_fin ?? ''),
      nb_nuits:                     1,
      heure_arrivee_prevue:         body.heure_arrivee_prevue,
      heure_depart_prevu:           body.heure_depart_prevu,
      heure_arrivee_reelle:         null,
      heure_depart_reel:            null,
      min_personnes_total:          Number(body.min_personnes_total ?? 40),
      nb_adultes:                   null,
      mode_paiement:                body.mode_paiement ?? 'CHEQUE',
      options_presaisies:           body.options_presaisies ?? null,
      notes:                        body.notes ?? null,
      categories:                   [],
    }
    mockSejours.push(newSejour)
    return HttpResponse.json(newSejour, { status: 201 })
  }),

  /* Patch personnes */
  http.patch(`${BASE}/sejours/:id/personnes`, async ({ params, request }) => {
    const sejour = mockSejours.find((s) => String(s.id) === String(params.id))
    if (!sejour) return HttpResponse.json({ message: 'Séjour introuvable' }, { status: 404 })
    const body = await request.json() as { categories: { id: number; nb_reelles: number }[]; nb_adultes: number }
    body.categories.forEach(({ id, nb_reelles }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = sejour.categories.find((c: any) => c.id === id)
      if (cat) cat.nb_reelles = nb_reelles
    })
    return new HttpResponse(null, { status: 204 })
  }),

  /* Patch horaires */
  http.patch(`${BASE}/sejours/:id/horaires`, () => new HttpResponse(null, { status: 204 })),

  /* Ajouter supplément */
  http.post(`${BASE}/sejours/:id/supplements`, async ({ params, request }) => {
    const body   = await request.json() as Record<string, unknown>
    const isLibre = body.type === 'LIBRE'
    const newLigne: MockLigne = {
      id:            nextLigneId(),
      _sejour_id:    Number(params.id),
      type_ligne:    isLibre ? 'LIBRE' : 'SUPPLEMENT',
      statut:        isLibre ? 'BROUILLON' : 'CONFIRME',
      libelle:       String(body.libelle ?? body.designation ?? ''),
      quantite:      Number(body.quantite ?? 1),
      prix_unitaire: Number(body.prix_unitaire ?? 0),
      prix_total:    Number(body.quantite ?? 1) * Number(body.prix_unitaire ?? 0),
      config_item_id: body.config_item_id as number | null ?? null,
    }
    mockLignes.push(newLigne)
        const { _sejour_id: _sid, ...response } = newLigne
    void _sid
    return HttpResponse.json(response, { status: 201 })
  }),

  /* Lignes du séjour */
  http.get(`${BASE}/sejours/:id/lignes`, ({ params }) => {
    const lignes = mockLignes
      .filter((l) => String(l._sejour_id) === String(params.id))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _sejour_id, ...l }) => l)
    return HttpResponse.json(lignes)
  }),

  /* Générer facture */
  http.post(`${BASE}/sejours/:id/facture`, () => HttpResponse.json(mockFacture, { status: 202 })),

  /* Lire facture */
  http.get(`${BASE}/sejours/:id/facture`, () => HttpResponse.json(mockFacture)),

  /* Renvoyer facture */
  http.post(`${BASE}/sejours/:id/facture/renvoyer`, () => new HttpResponse(null, { status: 204 })),

  /* Invalider facture */
  http.post(`${BASE}/sejours/:id/facture/invalider`, () => {
    mockFacture.statut = 'INVALIDE'
    return HttpResponse.json({ message: 'Facture invalidée.', ancien_numero: mockFacture.numero })
  }),

  /* Ajouter paiement */
  http.post(`${BASE}/sejours/:id/paiements`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id:              99,
      montant:         body.montant,
      mode:            body.mode,
      date_paiement:   body.date_paiement ?? new Date().toISOString().split('T')[0],
      reference:       body.reference,
      banque_emettrice: body.banque_emettrice,
    }, { status: 201 })
  }),

  /* Paiements */
  http.get(`${BASE}/sejours/:id/paiements`, () => HttpResponse.json([])),

  /* Recherche locataires */
  http.get(`${BASE}/locataires`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    const results = mockLocataires.filter(
      (l) => l.nom.toLowerCase().includes(q) || l.email.toLowerCase().includes(q),
    )
    return HttpResponse.json(results)
  }),

  /* Tarifs */
  http.get(`${BASE}/admin/tarifs`, () => HttpResponse.json(mockTarifs)),

  http.post(`${BASE}/admin/tarifs`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newTarif = { id: mockTarifs.length + 1, ...body }
    mockTarifs.push(newTarif as typeof mockTarifs[0])
    return HttpResponse.json(newTarif, { status: 201 })
  }),

  http.put(`${BASE}/admin/tarifs/:id`, async ({ params, request }) => {
    const idx = mockTarifs.findIndex((t) => String(t.id) === String(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Tarif introuvable' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    mockTarifs[idx] = { ...mockTarifs[idx], ...body } as typeof mockTarifs[0]
    return HttpResponse.json(mockTarifs[idx])
  }),

  /* Items */
  http.get(`${BASE}/admin/items`, () => HttpResponse.json(mockItems)),

  http.post(`${BASE}/admin/items`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newItem = { id: mockItems.length + 1, ...body }
    mockItems.push(newItem as typeof mockItems[0])
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put(`${BASE}/admin/items/:id`, async ({ params, request }) => {
    const idx = mockItems.findIndex((i) => String(i.id) === String(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Item introuvable' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    mockItems[idx] = { ...mockItems[idx], ...body } as typeof mockItems[0]
    return HttpResponse.json(mockItems[idx])
  }),

  http.delete(`${BASE}/admin/items/:id`, ({ params }) => {
    const idx = mockItems.findIndex((i) => String(i.id) === String(params.id))
    if (idx !== -1) mockItems[idx].actif = false
    return new HttpResponse(null, { status: 204 })
  }),

  /* Lignes libres */
  http.get(`${BASE}/admin/lignes-libres`, () => {
    return HttpResponse.json(
      mockLignes
        .filter((l) => l.type_ligne === 'LIBRE')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ _sejour_id, ...l }) => l),
    )
  }),

  http.post(`${BASE}/admin/lignes-libres/:id/promouvoir`, () => new HttpResponse(null, { status: 204 })),

  /* Config site */
  http.get(`${BASE}/admin/config`, () => HttpResponse.json(mockConfig)),

  http.patch(`${BASE}/admin/config`, async ({ request }) => {
    const body = await request.json() as { entries: { cle: string; valeur: string }[] }
    body.entries.forEach(({ cle, valeur }) => {
      const entry = mockConfig.find((c) => c.cle === cle)
      if (entry) entry.valeur = valeur
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
