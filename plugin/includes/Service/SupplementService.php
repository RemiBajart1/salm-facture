<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\LigneSejourRepository;
use Locagest\Repository\ConfigItemRepository;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;

class SupplementService {

    public function __construct(
        private readonly LigneSejourRepository $ligne_repo,
        private readonly ConfigItemRepository  $item_repo,
        private readonly SejourService         $sejour_service,
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
