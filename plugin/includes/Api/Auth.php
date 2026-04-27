<?php

declare(strict_types=1);

namespace Locagest\Api;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class Auth {

    private const ALGO    = 'HS256';
    private const TTL_SEC = 86400; // 24 h

    /** Retourne les rôles LocaGest d'un utilisateur WP. */
    public static function locagest_roles( \WP_User $user ): array {
        $locagest_roles = [ 'locagest_gardien', 'locagest_resp_location', 'locagest_tresorier', 'locagest_administrateur' ];
        return array_values( array_intersect( (array) $user->roles, $locagest_roles ) );
    }

    /** Génère un JWT pour un utilisateur WP. */
    public static function generate_token( \WP_User $user ): array {
        $now     = time();
        $payload = [
            'iss'      => home_url(),
            'iat'      => $now,
            'exp'      => $now + self::TTL_SEC,
            'user_id'  => $user->ID,
            'roles'    => self::locagest_roles( $user ),
        ];
        return [
            'token'      => JWT::encode( $payload, LOCAGEST_JWT_SECRET, self::ALGO ),
            'user_id'    => $user->ID,
            'roles'      => $payload['roles'],
            'expires_in' => self::TTL_SEC,
        ];
    }

    /**
     * permission_callback : valide le JWT et injecte user_id + roles dans la requête.
     * Retourne true ou WP_Error 401.
     */
    public static function require_auth( \WP_REST_Request $request ): bool|\WP_Error {
        $header = $request->get_header( 'Authorization' );
        if ( ! $header || ! str_starts_with( $header, 'Bearer ' ) ) {
            return new \WP_Error( 'rest_unauthorized', 'Token JWT manquant.', [ 'status' => 401 ] );
        }
        try {
            $decoded = JWT::decode( substr( $header, 7 ), new Key( LOCAGEST_JWT_SECRET, self::ALGO ) );
            $request->set_param( '_jwt_user_id',    $decoded->user_id );
            $request->set_param( '_jwt_user_roles', (array) $decoded->roles );
            return true;
        } catch ( \Exception $e ) {
            return new \WP_Error( 'rest_unauthorized', 'Token invalide ou expiré.', [ 'status' => 401 ] );
        }
    }

    /**
     * Fabrique un permission_callback qui exige l'un des rôles donnés.
     */
    public static function require_role( string ...$roles ): callable {
        return function ( \WP_REST_Request $request ) use ( $roles ): bool|\WP_Error {
            $auth = self::require_auth( $request );
            if ( is_wp_error( $auth ) ) return $auth;
            $user_roles = (array) $request->get_param( '_jwt_user_roles' );
            foreach ( $roles as $role ) {
                if ( in_array( $role, $user_roles, true ) ) return true;
            }
            return new \WP_Error( 'rest_forbidden', 'Accès refusé pour ce rôle.', [ 'status' => 403 ] );
        };
    }
}
