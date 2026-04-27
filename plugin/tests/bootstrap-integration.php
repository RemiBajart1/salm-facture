<?php

declare(strict_types=1);

// Nécessite d'être exécuté dans le container Docker WordPress
$wp_load = '/var/www/html/wp-load.php';
if ( ! file_exists( $wp_load ) ) {
    fwrite( STDERR, "ERREUR : bootstrap-integration.php doit être exécuté dans le container Docker.\n" );
    fwrite( STDERR, "Commande : docker exec salm-facture-wordpress-1 bash -c \"cd /var/www/html/wp-content/plugins/locagest && vendor/bin/phpunit -c phpunit-integration.xml\"\n" );
    exit( 1 );
}

require_once $wp_load;
require_once __DIR__ . '/../vendor/autoload.php';
