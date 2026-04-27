<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Utils\Exceptions\LocagestException;

class FileService {

    private string $factures_dir;
    private string $cheques_dir;

    public function __construct() {
        $this->factures_dir = LOCAGEST_PDF_DIR;
        $this->cheques_dir  = LOCAGEST_CHEQUE_DIR;
    }

    /** Sauvegarde le PDF et retourne le chemin relatif stocké en base. */
    public function save_pdf( string $pdf_content, string $numero_facture ): string {
        $this->ensure_dir( $this->factures_dir );
        $filename = sanitize_file_name( $numero_facture ) . '.pdf';
        $path     = $this->factures_dir . $filename;
        if ( file_put_contents( $path, $pdf_content ) === false ) {
            throw new LocagestException( "Impossible de sauvegarder le PDF $filename." );
        }
        return 'locagest/factures/' . $filename;
    }

    /** Retourne l'URL temporaire signée (valable 15 min) vers un fichier en uploads. */
    public function url_temporaire( string $relative_path ): string {
        $expires = time() + 900;
        $token   = hash_hmac( 'sha256', $relative_path . $expires, LOCAGEST_JWT_SECRET );
        return add_query_arg( [
            'locagest_file' => rawurlencode( $relative_path ),
            'token'         => $token,
            'expires'       => $expires,
        ], home_url( '/wp-json/locagest/v1/files/download' ) );
    }

    public static function extension_for_mime( string $mime_type ): string {
        return match ( $mime_type ) {
            'image/png'  => 'png',
            'image/webp' => 'webp',
            default      => 'jpg',
        };
    }

    /** Sauvegarde la photo d'un chèque. $index permet de nommer les photos multiples. */
    public function save_cheque( int $paiement_id, string $content, string $mime_type, int $index = 0 ): string {
        $this->ensure_dir( $this->cheques_dir );
        $ext      = self::extension_for_mime( $mime_type );
        $suffix   = $index > 0 ? "-{$index}" : '';
        $filename = "cheque-{$paiement_id}{$suffix}.{$ext}";
        $path     = $this->cheques_dir . $filename;
        file_put_contents( $path, $content );
        return 'locagest/cheques/' . $filename;
    }

    /** Vérifie le token d'un téléchargement temporaire. */
    public function verify_download_token( string $relative_path, string $token, int $expires ): bool {
        if ( time() > $expires ) return false;
        $expected = hash_hmac( 'sha256', $relative_path . $expires, LOCAGEST_JWT_SECRET );
        return hash_equals( $expected, $token );
    }

    public function get_upload_base(): string {
        return wp_upload_dir()['basedir'] . '/';
    }

    private function ensure_dir( string $dir ): void {
        if ( ! is_dir( $dir ) ) {
            wp_mkdir_p( $dir );
        }
    }
}
