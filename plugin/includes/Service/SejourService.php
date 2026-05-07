<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\ConfigItemRepository;
use Locagest\Repository\LocataireRepository;
use Locagest\Repository\LigneSejourRepository;
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
        private readonly ?ConfigItemRepository     $item_repo = null,
        private readonly ?LigneSejourRepository    $ligne_repo = null,
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
            'objet_sejour'              => $data['objet_sejour'] ?? '',
            'nom_groupe'                => $data['nom_groupe'] ?? '',
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

        // Pré-créer les lignes pour les items obligatoires marqués "déjà membre"
        if ( ! empty( $data['deja_membre_item_ids'] ) && $this->item_repo && $this->ligne_repo ) {
            foreach ( (array) $data['deja_membre_item_ids'] as $item_id ) {
                $item = $this->item_repo->find_by_id( (int) $item_id );
                if ( $item && $item['actif'] && $item['obligatoire'] ) {
                    $this->ligne_repo->create( [
                        'sejour_id'      => $sejour_id,
                        'type_ligne'     => 'SUPPLEMENT',
                        'libelle'        => $item['libelle'] . " – Déjà membre pour l'année civile",
                        'quantite'       => 0,
                        'prix_unitaire'  => $item['prix_unitaire'],
                        'prix_total'     => 0,
                        'config_item_id' => (int) $item_id,
                        'statut'         => 'CONFIRME',
                    ] );
                }
            }
        }

        return $this->get_detail( $sejour_id );
    }

    /**
     * Met à jour toutes les informations d'un séjour PLANIFIE (resp. location uniquement).
     *
     * @param array $data Champs modifiables : locataire, dates, horaires, categories, notes, objet_sejour, nom_groupe, min_personnes_total
     */
    public function update_sejour( int $sejour_id, array $data ): array {
        $sejour = $this->find_or_fail( $sejour_id );

        if ( $sejour['statut'] !== 'PLANIFIE' ) {
            throw new InvalidInputException( 'Seuls les séjours planifiés peuvent être modifiés.' );
        }

        $update = [];

        // Locataire
        if ( ! empty( $data['locataire']['email'] ) || ! empty( $data['locataire']['nom'] ) ) {
            $loc          = $data['locataire'];
            $locataire_id = $this->locataire_repo->upsert_by_email(
                $loc['nom'] ?? '',
                $loc['email'] ?? '',
                $loc['telephone'] ?? '',
                $loc['adresse'] ?? ''
            );
            $update['locataire_id'] = $locataire_id;
        }

        // Dates
        if ( isset( $data['date_debut'], $data['date_fin'] ) ) {
            $this->validate_dates( $data['date_debut'], $data['date_fin'] );
            $update['date_debut'] = $data['date_debut'];
            $update['date_fin']   = $data['date_fin'];
            $update['nb_nuits']   = $this->calc_nb_nuits( $data['date_debut'], $data['date_fin'] );
        }

        // Champs simples
        $simple = [ 'heure_arrivee_prevue', 'heure_depart_prevu', 'notes', 'objet_sejour', 'nom_groupe', 'min_personnes_total', 'tarif_forfait_categorie_id' ];
        foreach ( $simple as $field ) {
            if ( array_key_exists( $field, $data ) ) {
                $update[ $field ] = $data[ $field ];
            }
        }

        if ( $update ) {
            $this->sejour_repo->update( $sejour_id, $update );
        }

        // Catégories : si fournies, remplacer les existantes
        if ( ! empty( $data['categories'] ) ) {
            $this->categorie_repo->delete_by_sejour( $sejour_id );
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
        $update = [];
        if ( isset( $data['nb_adultes'] ) ) $update['nb_adultes'] = (int) $data['nb_adultes'];
        if ( isset( $data['nb_enfants'] ) ) $update['nb_enfants'] = (int) $data['nb_enfants'];
        if ( $update ) $this->sejour_repo->update( $sejour_id, $update );
        foreach ( $data['categories'] ?? [] as $cat ) {
            $this->categorie_repo->update_nb_reelles( (int) $cat['id'], (int) $cat['nb_reelles'] );
        }
        return $this->get_detail( $sejour_id );
    }

    /**
     * Enrichit le résultat paginé avec les catégories de chaque séjour (1 requête IN).
     * @param array{items: array, total: int, page: int, size: int} $paginated
     * @return array{items: array, total: int, page: int, size: int}
     */
    public function enrich_list_with_categories( array $paginated ): array {
        $items = $paginated['items'];
        if ( empty( $items ) ) return $paginated;
        $ids = array_map( 'intval', array_column( $items, 'id' ) );
        $cats_by_sejour = $this->categorie_repo->find_by_sejour_ids( $ids );
        $paginated['items'] = array_map(
            fn( $sejour ) => array_merge( $sejour, [ 'categories' => $cats_by_sejour[(int) $sejour['id']] ?? [] ] ),
            $items
        );
        return $paginated;
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
