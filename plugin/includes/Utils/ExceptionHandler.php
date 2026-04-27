<?php

declare(strict_types=1);

namespace Locagest\Utils;

use Locagest\Utils\Exceptions\LocagestException;

class ExceptionHandler {

    /**
     * Exécute un callable dans un try/catch et retourne WP_REST_Response.
     */
    public static function handle( callable $fn ): \WP_REST_Response {
        try {
            $result = $fn();
            if ( $result instanceof \WP_REST_Response ) return $result;
            return new \WP_REST_Response( $result, 200 );
        } catch ( LocagestException $e ) {
            error_log( '[LocaGest][ERROR] ' . $e->getMessage() );
            return new \WP_REST_Response(
                [ 'code' => 'locagest_error', 'message' => $e->getMessage() ],
                $e->getHttpStatus()
            );
        } catch ( \Throwable $e ) {
            error_log( '[LocaGest][FATAL] ' . $e->getMessage() . "\n" . $e->getTraceAsString() );
            return new \WP_REST_Response(
                [ 'code' => 'server_error', 'message' => 'Une erreur est survenue, veuillez réessayer plus tard.' ],
                500
            );
        }
    }
}
