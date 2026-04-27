<?php

declare(strict_types=1);

namespace Locagest\Repository;

class LocataireRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_locataire';
    }

    public function find_by_id( int $id ): ?array {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$this->table} WHERE id = %d", $id ),
            ARRAY_A
        ) ?: null;
    }

    /** Recherche par nom ou email (LIKE, max 20 résultats). */
    public function search( string $q ): array {
        global $wpdb;
        $like = '%' . $wpdb->esc_like( $q ) . '%';
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->table} WHERE nom LIKE %s OR email LIKE %s ORDER BY nom ASC LIMIT 20",
                $like,
                $like
            ),
            ARRAY_A
        ) ?: [];
    }

    /**
     * Upsert par email : met à jour nom/téléphone/adresse si l'email existe déjà.
     * Retourne l'ID du locataire.
     */
    public function upsert_by_email( string $nom, string $email, string $telephone = '', string $adresse = '' ): int {
        global $wpdb;
        $existing = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$this->table} WHERE email = %s", $email ) );
        if ( $existing ) {
            $wpdb->update( $this->table, [ 'nom' => $nom, 'telephone' => $telephone, 'adresse' => $adresse ], [ 'id' => $existing ] );
            return (int) $existing;
        }
        $wpdb->insert( $this->table, [ 'nom' => $nom, 'email' => $email, 'telephone' => $telephone, 'adresse' => $adresse ] );
        return (int) $wpdb->insert_id;
    }
}
