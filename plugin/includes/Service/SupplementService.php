<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\LigneSejourRepository;
use Locagest\Repository\ConfigItemRepository;
use Locagest\Repository\FactureRepository;
use Locagest\Utils\Exceptions\ImmuabiliteFactureException;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;

class SupplementService {

    public function __construct(
        private readonly LigneSejourRepository $ligne_repo,
        private readonly ConfigItemRepository  $item_repo,
        private readonly SejourService         $sejour_service,
        private readonly ?FactureRepository    $facture_repo = null,
    ) {}

    /**
     * Ajoute un supplément (catalogue ou libre) à un séjour.
     * @param array $data {
     *   type: 'SUPPLEMENT'|'LIBRE',
     *   config_item_id?: int,    // Si SUPPLEMENT
     *   libelle?: string,        // Si LIBRE
     *   prix_unitaire?: float,   // Si LIBRE
     *   quantite: float,
     * }
     */
    public function ajouter( int $sejour_id, array $data ): array {
        $this->sejour_service->find_or_fail( $sejour_id );
        $this->check_facture_not_locked( $sejour_id );
        $type = $data['type'] ?? 'SUPPLEMENT';

        if ( $type === 'SUPPLEMENT' ) {
            return $this->ajouter_catalogue( $sejour_id, $data );
        }
        return $this->ajouter_libre( $sejour_id, $data );
    }

    private function ajouter_catalogue( int $sejour_id, array $data ): array {
        if ( empty( $data['config_item_id'] ) ) {
            throw new InvalidInputException( 'config_item_id requis pour un supplément catalogue.' );
        }
        $item = $this->item_repo->find_by_id( (int) $data['config_item_id'] );
        if ( ! $item || ! $item['actif'] ) {
            throw new NotFoundException( "Item catalogue #{$data['config_item_id']} introuvable ou inactif." );
        }

        if ( (bool) ( $item['obligatoire'] ?? false ) ) {
            return $this->ajouter_obligatoire( $sejour_id, $item, $data );
        }

        // Quantité = 1 si unité SEJOUR
        $quantite = $item['unite'] === 'SEJOUR' ? 1.0 : max( 1.0, (float) ( $data['quantite'] ?? 1 ) );
        $total    = round( $quantite * (float) $item['prix_unitaire'], 2 );

        $id = $this->ligne_repo->create( [
            'sejour_id'      => $sejour_id,
            'type_ligne'     => 'SUPPLEMENT',
            'libelle'        => $item['libelle'],
            'quantite'       => $quantite,
            'prix_unitaire'  => $item['prix_unitaire'],
            'prix_total'     => $total,
            'config_item_id' => $item['id'],
            'statut'         => 'CONFIRME',
        ] );

        return $this->ligne_repo->find_by_id( $id );
    }

    /**
     * Upsert d'un item obligatoire (ex: carte de membre).
     * Si quantite = 0 : "déjà membre", prix_total = 0.
     * Remplace toute ligne existante pour ce config_item sur ce séjour.
     */
    private function ajouter_obligatoire( int $sejour_id, array $item, array $data ): array {
        $deja_membre = isset( $data['quantite'] ) && (float) $data['quantite'] === 0.0;
        $quantite    = $deja_membre ? 0.0 : 1.0;
        $prix        = (float) $item['prix_unitaire'];
        $total       = $deja_membre ? 0.0 : round( $prix, 2 );
        $libelle     = $deja_membre
            ? $item['libelle'] . ' – Déjà membre pour l\'année civile'
            : $item['libelle'];

        $existing = $this->ligne_repo->find_by_sejour_and_config_item( $sejour_id, (int) $item['id'] );
        if ( $existing ) {
            $this->ligne_repo->update( (int) $existing['id'], [
                'libelle'       => $libelle,
                'quantite'      => $quantite,
                'prix_unitaire' => $prix,
                'prix_total'    => $total,
                'statut'        => 'CONFIRME',
            ] );
            return $this->ligne_repo->find_by_id( (int) $existing['id'] );
        }

        $id = $this->ligne_repo->create( [
            'sejour_id'      => $sejour_id,
            'type_ligne'     => 'SUPPLEMENT',
            'libelle'        => $libelle,
            'quantite'       => $quantite,
            'prix_unitaire'  => $prix,
            'prix_total'     => $total,
            'config_item_id' => (int) $item['id'],
            'statut'         => 'CONFIRME',
        ] );

        return $this->ligne_repo->find_by_id( $id );
    }

    private function check_facture_not_locked( int $sejour_id ): void {
        if ( ! $this->facture_repo ) return;
        $facture = $this->facture_repo->find_active_by_sejour( $sejour_id );
        if ( $facture && in_array( $facture['statut'], [ 'EMISE', 'PAYEE' ], true ) ) {
            throw new ImmuabiliteFactureException( $facture['numero'] );
        }
    }

    private function ajouter_libre( int $sejour_id, array $data ): array {
        if ( empty( $data['libelle'] ) ) {
            throw new InvalidInputException( 'Le libellé est obligatoire pour une saisie libre.' );
        }
        if ( ! isset( $data['prix_unitaire'] ) || (float) $data['prix_unitaire'] < 0 ) {
            throw new InvalidInputException( 'Le prix unitaire doit être ≥ 0.' );
        }

        $quantite = max( 0.001, (float) ( $data['quantite'] ?? 1 ) );
        $total    = round( $quantite * (float) $data['prix_unitaire'], 2 );

        $id = $this->ligne_repo->create( [
            'sejour_id'     => $sejour_id,
            'type_ligne'    => 'LIBRE',
            'libelle'       => $data['libelle'],
            'quantite'      => $quantite,
            'prix_unitaire' => (float) $data['prix_unitaire'],
            'prix_total'    => $total,
            'statut'        => 'BROUILLON',
        ] );

        return $this->ligne_repo->find_by_id( $id );
    }
}
