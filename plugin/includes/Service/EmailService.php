<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\ConfigSiteRepository;

class EmailService {

    public function __construct( private readonly ConfigSiteRepository $config_repo ) {}

    /**
     * Envoie la facture par email au locataire + copie au resp. location.
     */
    public function envoyer_facture( array $facture, string $pdf_content, string $numero ): void {
        $to      = $facture['locataire_email_snapshot'];
        $cc      = $this->config_repo->get( 'email_resp_location' ) ?? '';
        $subject = "[UCJG Salm] Facture {$numero}";
        $message = $this->build_message( $facture, $numero );

        $headers = [ 'Content-Type: text/html; charset=UTF-8' ];
        if ( $cc ) $headers[] = "Cc: $cc";

        // Attacher le PDF via un fichier temporaire
        $tmp = tempnam( sys_get_temp_dir(), 'locagest_' ) . '.pdf';
        file_put_contents( $tmp, $pdf_content );

        add_action( 'phpmailer_init', function ( $mailer ) use ( $tmp, $numero ) {
            $mailer->addAttachment( $tmp, "Facture-{$numero}.pdf", 'base64', 'application/pdf' );
        } );

        wp_mail( $to, $subject, $message, $headers );
        @unlink( $tmp );
    }

    private function build_message( array $facture, string $numero ): string {
        $assoc = htmlspecialchars( $facture['nom_association_snapshot'] );
        $nom   = htmlspecialchars( $facture['locataire_nom_snapshot'] );
        $total = number_format( (float) $facture['montant_total'], 2, ',', ' ' );
        $iban  = htmlspecialchars( $facture['iban_snapshot'] );
        return <<<HTML
<p>Bonjour $nom,</p>
<p>Veuillez trouver ci-joint votre facture <strong>$numero</strong> d'un montant de <strong>$total €</strong>.</p>
<p>Pour le règlement par virement, l'IBAN est : <strong>$iban</strong></p>
<p>Cordialement,<br>$assoc</p>
HTML;
    }
}
