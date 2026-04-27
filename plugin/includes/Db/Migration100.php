<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration100 {

    public static function run(): void {
        global $wpdb;
        $collate = $wpdb->get_charset_collate();
        $p       = $wpdb->prefix . 'locagest_';

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}config_site (
  cle VARCHAR(100) NOT NULL,
  valeur TEXT NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (cle)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}tarif_personne (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  prix_nuit DECIMAL(10,2) NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}config_item (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  libelle VARCHAR(200) NOT NULL,
  categorie ENUM('LOCATION','CASSE','INTERVENTION') NOT NULL,
  prix_unitaire DECIMAL(10,2) NOT NULL,
  unite ENUM('UNITE','SEJOUR') NOT NULL DEFAULT 'UNITE',
  actif TINYINT(1) NOT NULL DEFAULT 1,
  ordre INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}locataire (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL DEFAULT '',
  telephone VARCHAR(50) NOT NULL DEFAULT '',
  adresse TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_email (email)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}sejour (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  locataire_id BIGINT UNSIGNED,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  nb_nuits INT UNSIGNED NOT NULL DEFAULT 0,
  heure_arrivee_prevue TIME,
  heure_depart_prevu TIME,
  heure_arrivee_reelle TIME,
  heure_depart_reel TIME,
  nb_adultes INT UNSIGNED NOT NULL DEFAULT 0,
  statut ENUM('PLANIFIE','EN_COURS','TERMINE','ANNULE') NOT NULL DEFAULT 'PLANIFIE',
  min_personnes_total INT UNSIGNED,
  tarif_forfait_categorie_id BIGINT UNSIGNED,
  notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_statut (statut),
  KEY idx_dates (date_debut, date_fin)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}sejour_categorie (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sejour_id BIGINT UNSIGNED NOT NULL,
  tarif_personne_id BIGINT UNSIGNED NOT NULL,
  nom_snapshot VARCHAR(100) NOT NULL,
  prix_nuit_snapshot DECIMAL(10,2) NOT NULL,
  nb_previsionnel INT UNSIGNED NOT NULL DEFAULT 0,
  nb_reelles INT UNSIGNED NOT NULL DEFAULT 0,
  ordre INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_sejour (sejour_id)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}ligne_sejour (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sejour_id BIGINT UNSIGNED NOT NULL,
  type_ligne ENUM('HEBERGEMENT','ENERGIE','TAXE','SUPPLEMENT','LIBRE') NOT NULL,
  libelle VARCHAR(500) NOT NULL,
  quantite DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  prix_unitaire DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  prix_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  config_item_id BIGINT UNSIGNED,
  statut ENUM('BROUILLON','CONFIRME') NOT NULL DEFAULT 'CONFIRME',
  ordre INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sejour (sejour_id),
  KEY idx_type (type_ligne)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}facture (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sejour_id BIGINT UNSIGNED NOT NULL,
  numero VARCHAR(20) NOT NULL DEFAULT '',
  statut ENUM('BROUILLON','EMISE','PAYEE') NOT NULL DEFAULT 'BROUILLON',
  locataire_nom_snapshot VARCHAR(200) NOT NULL DEFAULT '',
  locataire_email_snapshot VARCHAR(200) NOT NULL DEFAULT '',
  locataire_adresse_snapshot TEXT NOT NULL,
  iban_snapshot VARCHAR(100) NOT NULL DEFAULT '',
  adresse_facturation_snapshot TEXT NOT NULL,
  nom_association_snapshot VARCHAR(200) NOT NULL DEFAULT '',
  montant_hebergement DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  montant_energie DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  montant_taxe DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  montant_supplements DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  montant_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  pdf_path VARCHAR(500) NOT NULL DEFAULT '',
  date_emission DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_sejour (sejour_id),
  UNIQUE KEY unique_numero (numero)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}paiement (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sejour_id BIGINT UNSIGNED NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  mode ENUM('CHEQUE','VIREMENT','ESPECES') NOT NULL,
  reference VARCHAR(100) NOT NULL DEFAULT '',
  photo_cheque_path VARCHAR(500) NOT NULL DEFAULT '',
  date_paiement DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sejour (sejour_id)
) $collate;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$p}facture_sequence (
  annee INT NOT NULL,
  dernier_numero INT NOT NULL DEFAULT 0,
  PRIMARY KEY (annee)
) $collate;" );

        self::insert_default_data();
    }

    private static function insert_default_data(): void {
        global $wpdb;
        $p = $wpdb->prefix . 'locagest_';

        $config_defaults = [
            [ 'min_personnes_defaut', '40',  'Forfait minimum de personnes par nuit (défaut)' ],
            [ 'energie_nb_nuits',    '2',    'Nombre de nuits facturées pour l\'énergie' ],
            [ 'energie_prix_nuit',   '80.00','Prix de l\'énergie par nuit' ],
            [ 'taxe_adulte_nuit',    '0.88', 'Taxe de séjour par adulte par nuit' ],
            [ 'iban',                '',     'IBAN de l\'association pour les virements' ],
            [ 'adresse_facturation', '53 rue du Haut-Fourneau, 67130 La Broque', 'Adresse sur les factures' ],
            [ 'email_resp_location', '',     'Email du responsable location (copie factures)' ],
            [ 'nom_association',     'UCJG Salm', 'Nom de l\'association sur les factures' ],
        ];
        foreach ( $config_defaults as [$cle, $valeur, $desc] ) {
            $wpdb->query( $wpdb->prepare(
                "INSERT IGNORE INTO {$p}config_site (cle, valeur, description) VALUES (%s, %s, %s)",
                $cle, $valeur, $desc
            ) );
        }

        $tarifs_defaults = [
            [ 'Extérieur',                                   18.00, 1 ],
            [ 'Membres de l\'union',                         15.00, 2 ],
            [ 'Jeunes (groupe de jeunes)',                   12.00, 3 ],
            [ 'Présence journée sans nuitée (par jour)',      8.00, 4 ],
        ];
        foreach ( $tarifs_defaults as [$nom, $prix, $ordre] ) {
            $exists = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$p}tarif_personne WHERE nom = %s", $nom ) );
            if ( ! $exists ) {
                $wpdb->insert( "{$p}tarif_personne", [ 'nom' => $nom, 'prix_nuit' => $prix, 'ordre' => $ordre ] );
            }
        }

        $items_defaults = [
            [ 'Location/changement de draps',                  'LOCATION',    5.00,  'UNITE' ],
            [ 'Location verre à vin',                          'LOCATION',    0.50,  'UNITE' ],
            [ 'Location de barbecue',                          'LOCATION',   20.00,  'SEJOUR' ],
            [ 'Assiette cassée',                               'CASSE',       2.00,  'UNITE' ],
            [ 'Verre cassé',                                   'CASSE',       1.00,  'UNITE' ],
            [ 'Verre à vin/bière cassé',                       'CASSE',       1.50,  'UNITE' ],
            [ 'Plat cassé',                                    'CASSE',       5.00,  'UNITE' ],
            [ 'Nettoyage supplémentaire',                      'INTERVENTION',100.00,'UNITE' ],
            [ 'Forfait nettoyage complet',                     'INTERVENTION',500.00,'SEJOUR' ],
            [ 'Déclenchement alarme incendie manuel non justifié', 'INTERVENTION', 150.00, 'UNITE' ],
        ];
        foreach ( $items_defaults as $i => [$libelle, $categorie, $prix, $unite] ) {
            $exists = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$p}config_item WHERE libelle = %s", $libelle ) );
            if ( ! $exists ) {
                $wpdb->insert( "{$p}config_item", [
                    'libelle'       => $libelle,
                    'categorie'     => $categorie,
                    'prix_unitaire' => $prix,
                    'unite'         => $unite,
                    'ordre'         => $i + 1,
                ] );
            }
        }
    }
}
