<?php

declare(strict_types=1);

namespace Locagest\Api;

use Locagest\Utils\ExceptionHandler;

class AuthController {

    private const NS = 'locagest/v1';

    public function register_routes(): void {
        register_rest_route( self::NS, '/auth/token', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'token' ],
            'permission_callback' => '__return_true',
        ] );
    }

    /**
     * POST /wp-json/locagest/v1/auth/token
     * Body: { username, password }
     */
    public function token( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $params   = (array) $request->get_json_params();
            $username = sanitize_text_field( $params['username'] ?? '' );
            $password = $params['password'] ?? '';

            if ( ! $username || ! $password ) {
                return new \WP_REST_Response( [ 'message' => 'Identifiants manquants.' ], 400 );
            }

            $user = wp_authenticate( $username, $password );
            if ( is_wp_error( $user ) ) {
                return new \WP_REST_Response( [ 'message' => 'Identifiants incorrects.' ], 401 );
            }

            $roles = Auth::locagest_roles( $user );
            if ( empty( $roles ) ) {
                return new \WP_REST_Response( [ 'message' => 'Compte sans rôle LocaGest.' ], 403 );
            }

            return new \WP_REST_Response( Auth::generate_token( $user ), 200 );
        } );
    }
}
