<?php
/**
 * Plugin Name:       LocaGest
 * Plugin URI:        https://github.com/RemiBajart1/salm-facture
 * Description:       Système de facturation pour la maison de vacances UCJG Salm.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      8.2
 * Author:            UCJG Salm
 * License:           GPL v2 or later
 * Text Domain:       locagest
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'LOCAGEST_VERSION',    '0.1.0' );
define( 'LOCAGEST_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'LOCAGEST_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
// Chemins définis ici car WP_CONTENT_DIR n'est pas disponible dans wp-config.php
define( 'LOCAGEST_PDF_DIR',    WP_CONTENT_DIR . '/uploads/locagest/factures/' );
define( 'LOCAGEST_CHEQUE_DIR', WP_CONTENT_DIR . '/uploads/locagest/cheques/' );

// Autoloader Composer (disponible après `composer install` dans plugin/)
if ( file_exists( LOCAGEST_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
    require_once LOCAGEST_PLUGIN_DIR . 'vendor/autoload.php';
}

if ( class_exists( \Locagest\Plugin::class ) ) {
    register_activation_hook( __FILE__, [ \Locagest\Plugin::class, 'activate' ] );
    register_deactivation_hook( __FILE__, [ \Locagest\Plugin::class, 'deactivate' ] );
    \Locagest\Plugin::run();
}
