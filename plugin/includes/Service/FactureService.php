<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\FactureRepository;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Repository\PaiementRepository;
use Locagest\Repository\ConfigSiteRepository;
use Locagest\Repository\LocataireRepository;
use Locagest\Utils\Exceptions\ImmuabiliteFactureException;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;

class FactureService {

    public function __construct(
        private readonly FactureRepository     $facture_repo,
        private readonly LigneSejourRepository $ligne_repo,
        private readonly PaiementRepository    $paiement_repo,
        private readonly ConfigSiteRepository  $config_repo,
        private readonly LocataireRepository   $locataire_repo,
        private readonly FactureCalculService  $calcul_service,
        private readonly PdfService            $pdf_service,
        private readonly FileService           $file_service,
        private readonly EmailService          $email_service,
        private readonly SejourService         $sejour_service,
    ) {}

    /**
     * Génère (ou regénère si BROUILLON) la facture d'un séjour.
     * Lance 409 si la facture est EMISE ou PAYEE.
     */
    public function generer( int $sejour_id, bool $envoyer_email = true ): array {
        $sejour     = $this->sejour_service->get_detail( $sejour_id );
        $categories = $sejour['categories'];
        $config     = $this->config_repo->get_all();

        // Vérification immuabilité
        $existing = $this->facture_repo->find_by_sejour( $sejour_id );
        if ( $existing && in_array( $existing['statut'], [ 'EMISE', 'PAYEE' ], true ) ) {
            throw new ImmuabiliteFactureException( $existing['numero'] );
        }

        // Calcul des lignes
        $min_personnes = (int) ( $sejour['min_personnes_total'] ?? $config['min_personnes_defaut'] ?? 40 );
        $forfait_id    = (int) ( $sejour['tarif_forfait_categorie_id'] ?? 0 );

        $ligne_heberg = $this->calcul_service->calculer_hebergement(
            $categories,
            (int) $sejour['nb_nuits'],
            $min_personnes,
            $forfait_id
        );
        $ligne_energie = $this->calcul_service->calculer_energie(
            (int) $sejour['nb_nuits'],
            (int) ( $config['energie_nb_nuits'] ?? 2 ),
            (float) ( $config['energie_prix_nuit'] ?? 80 )
        );
        $ligne_taxe = $this->calcul_service->calculer_taxe(
            (int) $sejour['nb_adultes'],
            (int) $sejour['nb_nuits'],
            (float) ( $config['taxe_adulte_nuit'] ?? 0.88 )
        );
        $ligne_taxe_enfants = $this->calcul_service->calculer_taxe_enfants(
            (int) ( $sejour['nb_enfants'] ?? 0 ),
            (int) $sejour['nb_nuits'],
            (float) ( $config['taxe_enfant_nuit'] ?? 0.00 )
        );

        // Supprimer les lignes calculées existantes et les recréer
        $this->ligne_repo->delete_calculated_lines( $sejour_id );
        $lignes_calculees = [
            [ 'type' => 'HEBERGEMENT', 'data' => $ligne_heberg ],
            [ 'type' => 'ENERGIE',     'data' => $ligne_energie ],
            [ 'type' => 'TAXE',        'data' => $ligne_taxe    ],
        ];
        // N'ajouter la ligne enfants que si > 0 personnes ou tarif > 0
        if ( $ligne_taxe_enfants['prix_total'] > 0 || (int) ( $sejour['nb_enfants'] ?? 0 ) > 0 ) {
            $lignes_calculees[] = [ 'type' => 'TAXE', 'data' => $ligne_taxe_enfants ];
        }
        foreach ( $lignes_calculees as $i => $entry ) {
            $this->ligne_repo->create( [
                'sejour_id'     => $sejour_id,
                'type_ligne'    => $entry['type'],
                'libelle'       => $entry['data']['libelle'],
                'quantite'      => $entry['data']['quantite'],
                'prix_unitaire' => $entry['data']['prix_unitaire'],
                'prix_total'    => $entry['data']['prix_total'],
                'statut'        => 'CONFIRME',
                'ordre'         => $i,
            ] );
        }

        // Montant suppléments (lignes déjà en base)
        $all_lignes       = $this->ligne_repo->find_by_sejour( $sejour_id );
        $montant_suppl    = 0.0;
        foreach ( $all_lignes as $l ) {
            if ( in_array( $l['type_ligne'], [ 'SUPPLEMENT', 'LIBRE' ], true ) ) {
                $montant_suppl += (float) $l['prix_total'];
            }
        }

        $montant_total = $ligne_heberg['prix_total'] + $ligne_energie['prix_total'] + $ligne_taxe['prix_total'] + $ligne_taxe_enfants['prix_total'] + $montant_suppl;

        // Snapshots locataire + config
        $locataire = $sejour['locataire_id'] ? $this->locataire_repo->find_by_id( (int) $sejour['locataire_id'] ) : [];

        $date_emission = current_time( 'Y-m-d' );
        $delai_jours   = (int) ( $config['delai_reglement_jours'] ?? 7 );
        $date_echeance = date( 'Y-m-d', strtotime( $date_emission . " +{$delai_jours} days" ) );

        $facture_data = [
            'sejour_id'                    => $sejour_id,
            'statut'                       => 'BROUILLON',  // Passera à EMISE après succès du PDF
            'locataire_nom_snapshot'       => $locataire['nom']      ?? '',
            'locataire_email_snapshot'     => $locataire['email']    ?? '',
            'locataire_adresse_snapshot'   => $locataire['adresse']  ?? '',
            'iban_snapshot'                => $config['iban']                ?? '',
            'adresse_facturation_snapshot' => $config['adresse_facturation'] ?? '',
            'nom_association_snapshot'     => $config['nom_association']     ?? 'UCJG Salm',
            'siret_snapshot'               => $config['siret']               ?? '',
            'telephone_snapshot'           => $config['telephone_facturation'] ?? '',
            'date_echeance'                => $date_echeance,
            'montant_hebergement'          => $ligne_heberg['prix_total'],
            'montant_energie'              => $ligne_energie['prix_total'],
            'montant_taxe'                 => $ligne_taxe['prix_total'],
            'montant_supplements'          => $montant_suppl,
            'montant_total'                => $montant_total,
            'date_emission'                => $date_emission,
        ];

        // Créer ou mettre à jour la facture
        if ( $existing ) {
            $this->facture_repo->update( (int) $existing['id'], $facture_data );
            $facture_data['id']     = $existing['id'];
            $facture_data['numero'] = $existing['numero'];
        } else {
            $facture_data['numero'] = $this->facture_repo->next_numero();
            $id = $this->facture_repo->create( $facture_data );
            $facture_data['id'] = $id;
        }

        $facture = $this->facture_repo->find_by_sejour( $sejour_id );
        $lignes  = $this->ligne_repo->find_by_sejour( $sejour_id );

        // Générer le PDF
        $pdf_content = $this->pdf_service->generer( $facture, $sejour, $locataire ?? [], $lignes, [] );
        $pdf_path    = $this->file_service->save_pdf( $pdf_content, $facture['numero'] );
        // PDF OK → passer la facture à EMISE
        $this->facture_repo->update( (int) $facture['id'], [ 'pdf_path' => $pdf_path, 'statut' => 'EMISE' ] );
        $facture['pdf_path'] = $pdf_path;
        $facture['statut']   = 'EMISE';

        // Envoyer par email si demandé et si email présent
        if ( $envoyer_email && ! empty( $facture['locataire_email_snapshot'] ) ) {
            $this->email_service->envoyer_facture( $facture, $pdf_content, $facture['numero'] );
        }

        return $facture;
    }

    /** Renvoie la facture par email en réutilisant le PDF existant. */
    public function renvoyer( int $sejour_id ): void {
        $facture = $this->facture_repo->find_by_sejour( $sejour_id );
        if ( ! $facture ) throw new NotFoundException( "Aucune facture pour le séjour #$sejour_id." );
        if ( empty( $facture['locataire_email_snapshot'] ) ) throw new InvalidInputException( 'Aucun email locataire pour ce séjour.' );

        // Lire le PDF existant depuis le disque
        $uploads   = wp_upload_dir();
        $pdf_path  = $uploads['basedir'] . '/' . $facture['pdf_path'];
        $pdf_content = file_exists( $pdf_path ) ? file_get_contents( $pdf_path ) : '';

        // Si le PDF a disparu, le regénérer
        if ( ! $pdf_content ) {
            $sejour    = $this->sejour_service->get_detail( $sejour_id );
            $locataire = $sejour['locataire_id'] ? $this->locataire_repo->find_by_id( (int) $sejour['locataire_id'] ) : [];
            $lignes    = $this->ligne_repo->find_by_sejour( $sejour_id );
            $paiements = $this->paiement_repo->find_by_sejour( $sejour_id );
            $pdf_content = $this->pdf_service->generer( $facture, $sejour, $locataire ?? [], $lignes, $paiements );
        }

        $this->email_service->envoyer_facture( $facture, $pdf_content, $facture['numero'] );
    }

    public function get_by_sejour( int $sejour_id ): array {
        $facture = $this->facture_repo->find_by_sejour( $sejour_id );
        if ( ! $facture ) throw new NotFoundException( "Aucune facture pour le séjour #$sejour_id." );
        $facture['lignes']    = $this->ligne_repo->find_by_sejour( $sejour_id );
        $facture['paiements'] = $this->paiement_repo->find_by_sejour( $sejour_id );
        if ( $facture['pdf_path'] ) {
            $facture['pdf_url'] = $this->file_service->url_temporaire( $facture['pdf_path'] );
        }
        return $facture;
    }
}
