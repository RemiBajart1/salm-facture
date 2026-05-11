<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\ConfigItemRepository;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Utils\Exceptions\ConflictException;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;

class ConfigItemService {

    public function __construct(
        private readonly ConfigItemRepository  $item_repo,
        private readonly LigneSejourRepository $ligne_repo,
    ) {}

    public function list_actifs(): array {
        return $this->item_repo->find_all_actifs();
    }

    public function create( array $data ): array {
        $this->validate( $data );
        $max_ordre = 0;
        foreach ( $this->item_repo->find_all_actifs() as $item ) {
            $max_ordre = max( $max_ordre, (int) $item['ordre'] );
        }
        $id = $this->item_repo->create( [
            'libelle'       => $data['libelle'],
            'categorie'     => $data['categorie'],
            'prix_unitaire' => $data['prix_unitaire'],
            'unite'         => $data['unite'] ?? 'UNITE',
            'ordre'         => $max_ordre + 1,
        ] );
        return $this->find_or_fail( $id );
    }

    public function update( int $id, array $data ): array {
        $this->find_or_fail( $id );
        $this->validate( $data, partial: true );
        $this->item_repo->update( $id, array_filter( [
            'libelle'       => $data['libelle']       ?? null,
            'categorie'     => $data['categorie']     ?? null,
            'prix_unitaire' => $data['prix_unitaire'] ?? null,
            'unite'         => $data['unite']         ?? null,
        ], fn( $v ) => $v !== null ) );
        return $this->find_or_fail( $id );
    }

    public function deactivate( int $id ): void {
        $this->find_or_fail( $id );
        $this->item_repo->deactivate( $id );
    }

    public function delete( int $id ): void {
        $this->find_or_fail( $id );
        if ( $this->item_repo->is_used( $id ) ) {
            throw new ConflictException( "Cet item est utilisé par des séjours existants. Vous pouvez uniquement le désactiver." );
        }
        $this->item_repo->hard_delete( $id );
    }

    /**
     * Promeut une saisie libre en item catalogue (effet atomique).
     * @param array $data { categorie_item: string, unite: string, nom_catalogue: string }
     */
    public function promouvoir( int $ligne_id, array $data ): array {
        $ligne = $this->ligne_repo->find_by_id( $ligne_id );
        if ( ! $ligne ) throw new NotFoundException( "Ligne #$ligne_id introuvable." );
        if ( $ligne['type_ligne'] !== 'LIBRE' ) throw new InvalidInputException( "Seules les lignes LIBRE peuvent être promues." );

        // Crée l'item catalogue
        $item_id = $this->item_repo->create( [
            'libelle'       => $data['nom_catalogue'] ?? $ligne['libelle'],
            'categorie'     => $data['categorie_item'],
            'prix_unitaire' => $ligne['prix_unitaire'],
            'unite'         => $data['unite'] ?? 'UNITE',
        ] );

        // Met à jour la ligne (montant inchangé)
        $this->ligne_repo->promouvoir( $ligne_id, $item_id );

        return $this->find_or_fail( $item_id );
    }

    private function find_or_fail( int $id ): array {
        $item = $this->item_repo->find_by_id( $id );
        if ( ! $item ) throw new NotFoundException( "Item catalogue #$id introuvable." );
        return $item;
    }

    private function validate( array $data, bool $partial = false ): void {
        $valid_categories = [ 'LOCATION', 'CASSE', 'INTERVENTION' ];
        $valid_unites     = [ 'UNITE', 'SEJOUR' ];

        if ( ! $partial || isset( $data['libelle'] ) ) {
            if ( empty( $data['libelle'] ) ) throw new InvalidInputException( 'Le libellé est obligatoire.' );
        }
        if ( ! $partial || isset( $data['categorie'] ) ) {
            if ( ! in_array( $data['categorie'] ?? '', $valid_categories, true ) ) {
                throw new InvalidInputException( 'Catégorie invalide. Valeurs acceptées : ' . implode( ', ', $valid_categories ) );
            }
        }
        if ( ! $partial || isset( $data['prix_unitaire'] ) ) {
            if ( ! isset( $data['prix_unitaire'] ) || $data['prix_unitaire'] < 0 ) {
                throw new InvalidInputException( 'Le prix unitaire doit être ≥ 0.' );
            }
        }
        if ( isset( $data['unite'] ) && ! in_array( $data['unite'], $valid_unites, true ) ) {
            throw new InvalidInputException( 'Unité invalide. Valeurs acceptées : ' . implode( ', ', $valid_unites ) );
        }
    }
}
