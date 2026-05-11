<?php

declare(strict_types=1);

namespace Locagest\Repository;

class FactureRepository {

    private string $table;
    private string $seq_table;

    public function __construct() {
        global $wpdb;
        $this->table     = $wpdb->prefix . 'locagest_facture';
        $this->seq_table = $wpdb->prefix . 'locagest_facture_sequence';
    }

    /**
     * Retourne la facture active (non invalidée) d'un séjour, ou null.
     */
    public function find_active_by_sejour( int $sejour_id ): ?array {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$this->table} WHERE sejour_id = %d AND statut != 'INVALIDE' ORDER BY id DESC LIMIT 1",
                $sejour_id
            ),
            ARRAY_A
        ) ?: null;
    }

    /**
     * Alias de compatibilité — retourne la facture active.
     */
    public function find_by_sejour( int $sejour_id ): ?array {
        return $this->find_active_by_sejour( $sejour_id );
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

    /**
     * Génère le prochain numéro de facture de façon atomique.
     * Format : FAC-YYYY-NNN
     */
    public function next_numero(): string {
        global $wpdb;
        $annee = (int) current_time( 'Y' );

        $wpdb->query( 'START TRANSACTION' );
        try {
            $wpdb->query( $wpdb->prepare(
                "INSERT INTO {$this->seq_table} (annee, dernier_numero) VALUES (%d, 0)
                 ON DUPLICATE KEY UPDATE dernier_numero = dernier_numero",
                $annee
            ) );
            $wpdb->query( $wpdb->prepare(
                "SELECT dernier_numero FROM {$this->seq_table} WHERE annee = %d FOR UPDATE",
                $annee
            ) );
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$this->seq_table} SET dernier_numero = dernier_numero + 1 WHERE annee = %d",
                $annee
            ) );
            $num = (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT dernier_numero FROM {$this->seq_table} WHERE annee = %d",
                $annee
            ) );
            $wpdb->query( 'COMMIT' );
        } catch ( \Throwable $e ) {
            $wpdb->query( 'ROLLBACK' );
            throw $e;
        }

        return sprintf( 'FAC-%d-%03d', $annee, $num );
    }
}
