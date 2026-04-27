<?php

declare(strict_types=1);

namespace Locagest\Repository;

class LigneSejourRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_ligne_sejour';
    }

    public function find_by_sejour( int $sejour_id ): array {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM {$this->table} WHERE sejour_id = %d ORDER BY type_ligne ASC, ordre ASC", $sejour_id ),
            ARRAY_A
        ) ?: [];
    }

    public function find_lignes_libres_en_attente(): array {
        global $wpdb;
        return $wpdb->get_results(
            "SELECT l.*, s.date_debut, s.date_fin FROM {$this->table} l
             JOIN {$wpdb->prefix}locagest_sejour s ON s.id = l.sejour_id
             WHERE l.type_ligne = 'LIBRE' AND l.statut = 'BROUILLON'
             ORDER BY l.created_at DESC",
            ARRAY_A
        ) ?: [];
    }

    public function find_by_id( int $id ): ?array {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$this->table} WHERE id = %d", $id ),
            ARRAY_A
        ) ?: null;
    }

    public function create( array $data ): int {
        global $wpdb;
        $wpdb->insert( $this->table, $data );
        return (int) $wpdb->insert_id;
    }

    public function update( int $id, array $data ): void {
        global $wpdb;
        $wpdb->update( $this->table, $data, [ 'id' => $id ] );
    }

    /** Supprime toutes les lignes d'un type donné pour un séjour (pour recalcul). */
    public function delete_by_sejour_and_type( int $sejour_id, string $type_ligne ): void {
        global $wpdb;
        $wpdb->query( $wpdb->prepare(
            "DELETE FROM {$this->table} WHERE sejour_id = %d AND type_ligne = %s",
            $sejour_id,
            $type_ligne
        ) );
    }

    /** Supprime toutes les lignes calculées d'un séjour (HEBERGEMENT, ENERGIE, TAXE). */
    public function delete_calculated_lines( int $sejour_id ): void {
        global $wpdb;
        $wpdb->query( $wpdb->prepare(
            "DELETE FROM {$this->table} WHERE sejour_id = %d AND type_ligne IN ('HEBERGEMENT','ENERGIE','TAXE')",
            $sejour_id
        ) );
    }

    /** Retourne la première ligne d'un séjour correspondant à un config_item donné. */
    public function find_by_sejour_and_config_item( int $sejour_id, int $config_item_id ): ?array {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$this->table} WHERE sejour_id = %d AND config_item_id = %d LIMIT 1",
                $sejour_id,
                $config_item_id
            ),
            ARRAY_A
        ) ?: null;
    }

    /** Promeut une ligne LIBRE en SUPPLEMENT avec un config_item_id. */
    public function promouvoir( int $ligne_id, int $config_item_id ): void {
        global $wpdb;
        $wpdb->update( $this->table, [
            'type_ligne'     => 'SUPPLEMENT',
            'config_item_id' => $config_item_id,
            'statut'         => 'CONFIRME',
        ], [ 'id' => $ligne_id ] );
    }
}
