<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\LocataireRepository;
use Locagest\Repository\SejourRepository;
use Locagest\Repository\SejourCategorieRepository;
use Locagest\Repository\TarifPersonneRepository;
use Locagest\Repository\ConfigSiteRepository;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;

class SejourService {

    public function __construct(
        private readonly SejourRepository          $sejour_repo,
        private readonly SejourCategorieRepository $categorie_repo,
        private readonly TarifPersonneRepository   $tarif_repo,
        private readonly LocataireRepository       $locataire_repo,
        private readonly ConfigSiteRepository      $config_repo,
    ) {}

    /**
     * Crée un séjour avec ses catégories (snapshots inclus).
     *
     * @param array $data {
     *   locataire: {nom, email, telephone?, adresse?},
     *   date_debut: 'YYYY-MM-DD',
     *   date_fin:   'YYYY-MM-DD',
     *   categories: [{tarif_personne_id, nb_previsionnel}],
     *   min_personnes_total?: int,
     *   tarif_forfait_categorie_id: int,   // tarif_personne_id de la catégorie référence forfait
     *   heure_arrivee_prevue?: 'HH:MM',
     *   heure_depart_prevu?: 'HH:MM',
     *   notes?: string,
     * }
     */
    public function creer( array $data ): array {
        $this->validate_dates( $data['date_debut'] ?? '', $data['date_fin'] ?? '' );

        if ( empty( $data['categories'] ) ) {
            throw new InvalidInputException( 'Au moins une catégorie de tarif est requise.' );
        }

        $nb_nuits  = $this->calc_nb_nuits( $data['date_debut'], $data['date_fin'] );
        $min_def   = (int) ( $this->config_repo->get( 'min_personnes_defaut' ) ?? 40 );

        // Upsert locataire si un email est fourni
        $locataire_id = null;
        if ( ! empty( $data['locataire']['email'] ) ) {
            $loc          = $data['locataire'];
            $locataire_id = $this->locataire_repo->upsert_by_email(
                $loc['nom'] ?? '',
                $loc['email'],
                $loc['telephone'] ?? '',
                $loc['adresse'] ?? ''
            );
        }

        $sejour_id = $this->sejour_repo->create( [
            'locataire_id'              => $locataire_id,
            'date_debut'                => $data['date_debut'],
            'date_fin'                  => $data['date_fin'],
            'nb_nuits'                  => $nb_nuits,
            'heure_arrivee_prevue'      => $data['heure_arrivee_prevue'] ?? null,
            'heure_depart_prevu'        => $data['heure_depart_prevu'] ?? null,
            'statut'                    => 'PLANIFIE',
            'min_personnes_total'       => $data['min_personnes_total'] ?? $min_def,
            'tarif_forfait_categorie_id'=> $data['tarif_forfait_categorie_id'],
            'notes'                     => $data['notes'] ?? '',
        ] );

        // Créer les catégories avec snapshots
        foreach ( $data['categories'] as $i => $cat_data ) {
            $tarif = $this->tarif_repo->find_by_id( (int) $cat_data['tarif_personne_id'] );
            if ( ! $tarif ) {
                throw new NotFoundException( "Tarif #{$cat_data['tarif_personne_id']} introuvable." );
            }
            $this->categorie_repo->create( [
                'sejour_id'          => $sejour_id,
                'tarif_personne_id'  => $tarif['id'],
                'nom_snapshot'       => $tarif['nom'],
                'prix_nuit_snapshot' => $tarif['prix_nuit'],
                'nb_previsionnel'    => $cat_data['nb_previsionnel'] ?? 0,
                'nb_reelles'         => 0,
                'ordre'              => $i,
            ] );
        }

        return $this->get_detail( $sejour_id );
    }

    /** Met à jour les horaires réels d'un séjour. */
    public function update_horaires( int $sejour_id, array $data ): array {
        $sejour = $this->find_or_fail( $sejour_id );
        $update = [];
        if ( isset( $data['heure_arrivee_reelle'] ) ) $update['heure_arrivee_reelle'] = $data['heure_arrivee_reelle'];
        if ( isset( $data['heure_depart_reel'] ) )    $update['heure_depart_reel']    = $data['heure_depart_reel'];
        if ( isset( $data['statut'] ) )               $update['statut']               = $data['statut'];
        if ( $update ) $this->sejour_repo->update( $sejour_id, $update );
        return $this->get_detail( $sejour_id );
    }

    /**
     * Met à jour les effectifs réels + nb_adultes.
     * @param array $data { nb_adultes: int, categories: [{id: int, nb_reelles: int}] }
     */
    public function update_personnes( int $sejour_id, array $data ): array {
        $this->find_or_fail( $sejour_id );
        if ( isset( $data['nb_adultes'] ) ) {
            $this->sejour_repo->update( $sejour_id, [ 'nb_adultes' => (int) $data['nb_adultes'] ] );
        }
        foreach ( $data['categories'] ?? [] as $cat ) {
            $this->categorie_repo->update_nb_reelles( (int) $cat['id'], (int) $cat['nb_reelles'] );
        }
        return $this->get_detail( $sejour_id );
    }

    public function get_detail( int $sejour_id ): array {
        $sejour     = $this->find_or_fail( $sejour_id );
        $categories = $this->categorie_repo->find_by_sejour( $sejour_id );
        return array_merge( $sejour, [ 'categories' => $categories ] );
    }

    public function find_or_fail( int $id ): array {
        $sejour = $this->sejour_repo->find_by_id( $id );
        if ( ! $sejour ) throw new NotFoundException( "Séjour #$id introuvable." );
        return $sejour;
    }

    private function validate_dates( string $debut, string $fin ): void {
        if ( ! $debut || ! $fin ) throw new InvalidInputException( 'Les dates de début et de fin sont obligatoires.' );
        if ( $fin <= $debut )    throw new InvalidInputException( 'La date de fin doit être après la date de début.' );
    }

    private function calc_nb_nuits( string $debut, string $fin ): int {
        $d1 = new \DateTimeImmutable( $debut );
        $d2 = new \DateTimeImmutable( $fin );
        return (int) $d1->diff( $d2 )->days;
    }
}
