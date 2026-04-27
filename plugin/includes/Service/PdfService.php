<?php

declare(strict_types=1);

namespace Locagest\Service;

use Dompdf\Dompdf;
use Dompdf\Options;

class PdfService {

    public function generer( array $facture, array $sejour, array $locataire, array $lignes, array $paiements ): string {
        $options = new Options();
        $options->set( 'isHtml5ParserEnabled', true );
        $options->set( 'isRemoteEnabled', false );
        $options->set( 'defaultFont', 'DejaVu Sans' );
        $dompdf = new Dompdf( $options );
        $dompdf->loadHtml( $this->render_html( $facture, $sejour, $locataire, $lignes, $paiements ), 'UTF-8' );
        $dompdf->setPaper( 'A4', 'portrait' );
        $dompdf->render();
        return $dompdf->output();
    }

    private function render_html( array $facture, array $sejour, array $locataire, array $lignes, array $paiements ): string {
        $assoc   = esc( $facture['nom_association_snapshot'] );
        $adresse = nl2br( esc( $facture['adresse_facturation_snapshot'] ) );
        $iban    = esc( $facture['iban_snapshot'] );
        $numero  = esc( $facture['numero'] );
        $date_em = $facture['date_emission'] ? date( 'd/m/Y', strtotime( $facture['date_emission'] ) ) : date( 'd/m/Y' );

        $loc_nom      = esc( $facture['locataire_nom_snapshot'] );
        $loc_email    = esc( $facture['locataire_email_snapshot'] );
        $loc_adresse  = nl2br( esc( $facture['locataire_adresse_snapshot'] ) );

        $debut   = date( 'd/m/Y', strtotime( $sejour['date_debut'] ) );
        $fin     = date( 'd/m/Y', strtotime( $sejour['date_fin'] ) );
        $nb_nuits = (int) $sejour['nb_nuits'];

        $lignes_html = '';
        foreach ( $lignes as $ligne ) {
            $classe      = strtolower( $ligne['type_ligne'] );
            $libelle     = esc( $ligne['libelle'] );
            $quantite    = esc( (string) (float) $ligne['quantite'] );
            $prix_unit   = number_format( (float) $ligne['prix_unitaire'], 2, ',', ' ' );
            $prix_total  = number_format( (float) $ligne['prix_total'], 2, ',', ' ' );
            $lignes_html .= "<tr class=\"ligne-{$classe}\">
                <td>{$libelle}</td>
                <td class=\"right\">{$quantite}</td>
                <td class=\"right\">{$prix_unit} €</td>
                <td class=\"right\">{$prix_total} €</td>
            </tr>";
        }

        $total = number_format( (float) $facture['montant_total'], 2, ',', ' ' );

        $paiements_html = '';
        $total_paye     = 0.0;
        foreach ( $paiements as $p ) {
            $mode         = match ( $p['mode'] ) {
                'CHEQUE'   => 'Chèque',
                'VIREMENT' => 'Virement',
                default    => 'Espèces',
            };
            $date_p       = date( 'd/m/Y', strtotime( $p['date_paiement'] ) );
            $montant_p    = number_format( (float) $p['montant'], 2, ',', ' ' );
            $total_paye  += (float) $p['montant'];
            $paiements_html .= "<tr><td>$mode</td><td>$date_p</td><td class=\"right\">$montant_p €</td></tr>";
        }

        $solde      = number_format( (float) $facture['montant_total'] - $total_paye, 2, ',', ' ' );
        $total_paye = number_format( $total_paye, 2, ',', ' ' );

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: DejaVu Sans, sans-serif; font-size: 10pt; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 30px 40px; }
  .header { display: table; width: 100%; margin-bottom: 24px; }
  .header-left { display: table-cell; vertical-align: top; width: 55%; }
  .header-right { display: table-cell; vertical-align: top; text-align: right; }
  h1 { font-size: 22pt; color: #003366; margin: 0 0 4px 0; }
  .assoc-name { font-size: 13pt; font-weight: bold; color: #003366; }
  .adresse { font-size: 9pt; color: #555; }
  .facture-meta { background: #003366; color: white; padding: 10px 16px; border-radius: 4px; display: inline-block; margin-bottom: 20px; }
  .facture-meta .numero { font-size: 14pt; font-weight: bold; }
  .section-title { font-size: 10pt; font-weight: bold; color: #003366; border-bottom: 1px solid #003366; padding-bottom: 3px; margin: 18px 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #003366; color: white; padding: 6px 10px; text-align: left; font-size: 9pt; }
  td { padding: 5px 10px; border-bottom: 1px solid #e0e0e0; font-size: 9pt; }
  .right { text-align: right; }
  tr.ligne-hebergement td { background: #f0f4ff; }
  tr.total td { font-weight: bold; background: #e8f0fe; font-size: 11pt; border-top: 2px solid #003366; }
  .iban-box { background: #f9f9f9; border: 1px solid #ccc; padding: 10px 16px; border-radius: 4px; margin-top: 12px; font-size: 9pt; }
  .footer { margin-top: 30px; font-size: 8pt; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="assoc-name">$assoc</div>
      <div class="adresse">$adresse</div>
    </div>
    <div class="header-right">
      <div class="facture-meta">
        <div class="numero">Facture $numero</div>
        <div style="font-size:9pt;">Émise le $date_em</div>
      </div>
    </div>
  </div>

  <div class="section-title">Locataire</div>
  <table>
    <tr><td style="width:30%;color:#555;">Nom</td><td>$loc_nom</td></tr>
    <tr><td style="color:#555;">Email</td><td>$loc_email</td></tr>
    <tr><td style="color:#555;">Adresse</td><td>$loc_adresse</td></tr>
  </table>

  <div class="section-title">Séjour</div>
  <table>
    <tr><td style="width:30%;color:#555;">Période</td><td>Du $debut au $fin ($nb_nuits nuit(s))</td></tr>
  </table>

  <div class="section-title">Détail de la facture</div>
  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th class="right">Qté</th>
        <th class="right">P.U.</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      $lignes_html
    </tbody>
    <tfoot>
      <tr class="total">
        <td colspan="3">Total à régler</td>
        <td class="right">$total €</td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title">Paiements reçus</div>
  <table>
    <thead><tr><th>Mode</th><th>Date</th><th class="right">Montant</th></tr></thead>
    <tbody>$paiements_html</tbody>
    <tfoot>
      <tr><td colspan="2" style="font-weight:bold;">Total réglé</td><td class="right" style="font-weight:bold;">$total_paye €</td></tr>
      <tr><td colspan="2" style="font-weight:bold;color:#c00;">Solde restant</td><td class="right" style="font-weight:bold;color:#c00;">$solde €</td></tr>
    </tfoot>
  </table>

  <div class="iban-box">
    <strong>Règlement par virement :</strong> IBAN $iban
  </div>

  <div class="footer">$assoc — Document généré automatiquement par LocaGest</div>
</div>
</body>
</html>
HTML;
    }
}

function esc( string $s ): string {
    return htmlspecialchars( $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
}
