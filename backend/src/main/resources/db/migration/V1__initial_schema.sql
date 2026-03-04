-- ============================================================
-- LocaGest v2 — Migration V1 : schéma initial
-- Aurora PostgreSQL 16
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TYPES ENUM ───────────────────────────────────────────────
CREATE TYPE statut_sejour  AS ENUM ('PLANIFIE', 'EN_COURS', 'TERMINE');
CREATE TYPE mode_paiement  AS ENUM ('CHEQUE', 'VIREMENT');
CREATE TYPE statut_facture AS ENUM ('BROUILLON', 'EMISE', 'PAYEE');
CREATE TYPE statut_ligne   AS ENUM ('CONFIRME', 'LIBRE');
CREATE TYPE type_ligne     AS ENUM ('HEBERGEMENT', 'ENERGIE', 'TAXE', 'SUPPLEMENT', 'LIBRE');
CREATE TYPE categorie_item AS ENUM ('CASSE', 'LOCATION', 'SERVICE');
CREATE TYPE unite_item     AS ENUM ('UNITE', 'SEJOUR', 'INTERVENTION');

-- ── CONFIG SITE ───────────────────────────────────────────────
-- Clés métier attendues :
--   energie_prix_nuit        80.00
--   energie_nb_nuits         2
--   taxe_adulte_nuit         0.88
--   min_personnes_defaut     40
--   iban                     FR76 ...
--   delai_paiement_jours     15
--   email_resp_location      location@ucjgsalm.org
CREATE TABLE config_site (
    cle        VARCHAR(60)  PRIMARY KEY,
    valeur     TEXT         NOT NULL,
    updated_at TIMESTAMPTZ  DEFAULT now(),
    updated_by VARCHAR(100)             -- sub Cognito
);

INSERT INTO config_site (cle, valeur) VALUES
    ('energie_prix_nuit',     '80.00'),
    ('energie_nb_nuits',      '2'),
    ('taxe_adulte_nuit',      '0.88'),
    ('min_personnes_defaut',  '40'),
    ('iban',                  'FR76 3000 4028 3700 0100 7840 943'),
    ('delai_paiement_jours',  '15'),
    ('email_resp_location',   'location@ucjgsalm.org');

-- ── TARIFS PAR PERSONNE ───────────────────────────────────────
CREATE TABLE tarif_personne (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nom         VARCHAR(100) NOT NULL,
    prix_nuit   NUMERIC(8,2) NOT NULL CHECK (prix_nuit >= 0),
    description TEXT,
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    ordre       INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  DEFAULT now(),
    updated_at  TIMESTAMPTZ  DEFAULT now(),
    updated_by  VARCHAR(100)
);

INSERT INTO tarif_personne (nom, prix_nuit, description, ordre) VALUES
    ('Membre de l''union', 14.00, 'Tarif standard UCJG',       1),
    ('Groupe de jeunes',   12.00, 'Groupes de moins de 25 ans', 2),
    ('Extérieur',          18.00, 'Non-membres UCJG',           3);

-- ── ITEMS SUPPLÉMENTAIRES ─────────────────────────────────────
CREATE TABLE config_item (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    designation   VARCHAR(200)   NOT NULL,
    categorie     categorie_item NOT NULL,
    prix_unitaire NUMERIC(8,2)   NOT NULL CHECK (prix_unitaire >= 0),
    unite         unite_item     NOT NULL DEFAULT 'UNITE',
    actif         BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ    DEFAULT now(),
    updated_at    TIMESTAMPTZ    DEFAULT now()
);

INSERT INTO config_item (designation, categorie, prix_unitaire, unite) VALUES
    ('Assiette cassée',           'CASSE',    8.00,  'UNITE'),
    ('Verre cassé',               'CASSE',    4.00,  'UNITE'),
    ('Verre à vin cassé',         'CASSE',    6.00,  'UNITE'),
    ('Location barbecue',         'LOCATION', 25.00, 'SEJOUR'),
    ('Nettoyage supplémentaire',  'SERVICE',  60.00, 'INTERVENTION');

-- ── LOCATAIRES ───────────────────────────────────────────────
CREATE TABLE locataire (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nom        VARCHAR(200) NOT NULL,
    email      VARCHAR(200) NOT NULL,
    telephone  VARCHAR(30),
    adresse    TEXT,
    created_at TIMESTAMPTZ  DEFAULT now()
);

-- ── SÉJOURS ──────────────────────────────────────────────────
CREATE TABLE sejour (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    locataire_id          UUID          NOT NULL REFERENCES locataire(id),
    statut                statut_sejour NOT NULL DEFAULT 'PLANIFIE',
    date_arrivee          DATE          NOT NULL,
    date_depart           DATE          NOT NULL CHECK (date_depart > date_arrivee),
    nb_nuits              INT           GENERATED ALWAYS AS (date_depart - date_arrivee) STORED,
    heure_arrivee_prevue  TIME,
    heure_depart_prevu    TIME,
    heure_arrivee_reelle  TIME,
    heure_depart_reel     TIME,
    nb_adultes            INT,
    min_personnes_total   INT           NOT NULL DEFAULT 40,
    mode_paiement         mode_paiement,
    date_limite_paiement  DATE,
    options_presaisies    TEXT,
    notes_internes        TEXT,
    created_by            VARCHAR(100)  NOT NULL,
    updated_by            VARCHAR(100),
    created_at            TIMESTAMPTZ   DEFAULT now(),
    updated_at            TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_sejour_statut_date ON sejour (statut, date_arrivee);
CREATE INDEX idx_sejour_locataire   ON sejour (locataire_id);

-- ── CATÉGORIES DE PERSONNES PAR SÉJOUR ───────────────────────
-- Une ligne par tarif applicable à ce séjour.
-- Snapshot : nom + prix copiés au moment de la création, immuables ensuite.
CREATE TABLE sejour_categorie (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sejour_id          UUID        NOT NULL REFERENCES sejour(id) ON DELETE CASCADE,
    tarif_id           UUID        REFERENCES tarif_personne(id),  -- peut devenir NULL si tarif supprimé
    nom_snapshot       VARCHAR(100) NOT NULL,   -- NE PAS rejoindre tarif_personne pour les calculs
    prix_nuit_snapshot NUMERIC(8,2) NOT NULL,
    nb_prevues         INT,                     -- saisi par resp. location
    nb_reelles         INT,                     -- saisi par le gardien
    ordre              INT         NOT NULL DEFAULT 0,
    CONSTRAINT uq_sejour_tarif UNIQUE (sejour_id, tarif_id)
);

CREATE INDEX idx_sejour_categorie_sejour ON sejour_categorie (sejour_id);

-- ── LIGNES DE FACTURE ─────────────────────────────────────────
-- type_ligne = HEBERGEMENT : une seule ligne "Forfait N personnes · M nuits"
-- type_ligne = ENERGIE     : forfait énergies
-- type_ligne = TAXE        : taxe de séjour
-- type_ligne = SUPPLEMENT  : item du catalogue (config_item)
-- type_ligne = LIBRE       : saisie libre gardien (peut être promu en SUPPLEMENT)
CREATE TABLE ligne_sejour (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sejour_id      UUID         NOT NULL REFERENCES sejour(id) ON DELETE CASCADE,
    config_item_id UUID         REFERENCES config_item(id),   -- rempli après promotion LIBRE→SUPPLEMENT
    type_ligne     type_ligne   NOT NULL,
    designation    VARCHAR(300) NOT NULL,
    quantite       NUMERIC(10,3) NOT NULL,
    prix_unitaire  NUMERIC(8,2)  NOT NULL,
    montant        NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(quantite * prix_unitaire, 2)) STORED,
    statut         statut_ligne  NOT NULL DEFAULT 'CONFIRME',
    saisi_par      VARCHAR(100),
    created_at     TIMESTAMPTZ   DEFAULT now()
);

-- Index partiel : retrouver les lignes LIBRE en attente de promotion
CREATE INDEX idx_ligne_sejour        ON ligne_sejour (sejour_id);
CREATE INDEX idx_ligne_libre_pending ON ligne_sejour (sejour_id) WHERE statut = 'LIBRE';

-- ── FACTURES ─────────────────────────────────────────────────
CREATE TABLE facture (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    sejour_id           UUID           NOT NULL UNIQUE REFERENCES sejour(id),
    numero              VARCHAR(20)    NOT NULL UNIQUE,   -- FAC-2025-042
    date_generation     TIMESTAMPTZ    DEFAULT now(),
    montant_hebergement NUMERIC(10,2),
    montant_energie     NUMERIC(10,2),
    montant_taxe        NUMERIC(10,2),
    montant_supplements NUMERIC(10,2),
    montant_total       NUMERIC(10,2)  NOT NULL,
    statut              statut_facture NOT NULL DEFAULT 'BROUILLON',
    pdf_s3_key          VARCHAR(500),
    email_envoye        BOOLEAN        DEFAULT FALSE,
    email_envoye_at     TIMESTAMPTZ
);

-- ── PAIEMENTS ────────────────────────────────────────────────
CREATE TABLE paiement (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sejour_id         UUID          NOT NULL REFERENCES sejour(id),
    mode              mode_paiement NOT NULL,
    montant           NUMERIC(10,2) NOT NULL CHECK (montant > 0),
    date_encaissement DATE,
    numero_cheque     VARCHAR(50),
    banque_emettrice  VARCHAR(100),
    cheque_s3_key     VARCHAR(500),
    enregistre_par    VARCHAR(100)  NOT NULL,
    created_at        TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_paiement_sejour ON paiement (sejour_id);

-- ── NUMÉROTATION FACTURES ─────────────────────────────────────
CREATE TABLE facture_sequence (
    annee   INT PRIMARY KEY,
    counter INT NOT NULL DEFAULT 0
);

-- ── TRIGGER : updated_at automatique ─────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sejour_updated
    BEFORE UPDATE ON sejour
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_tarif_updated
    BEFORE UPDATE ON tarif_personne
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_configitem_updated
    BEFORE UPDATE ON config_item
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
