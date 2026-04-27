<?php

declare(strict_types=1);

// Autoloader Composer
require_once __DIR__ . '/../vendor/autoload.php';

// Constantes WP minimales
define( 'ABSPATH', '/tmp/wp/' );
define( 'WPINC', 'wp-includes' );
define( 'LOCAGEST_VERSION', '0.1.0' );
define( 'LOCAGEST_PLUGIN_DIR', dirname( __DIR__ ) . '/' );
define( 'LOCAGEST_PDF_DIR', '/tmp/locagest-test/factures/' );
define( 'LOCAGEST_CHEQUE_DIR', '/tmp/locagest-test/cheques/' );
