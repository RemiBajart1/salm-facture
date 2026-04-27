<?php

declare(strict_types=1);

namespace Locagest\Service;

/**
 * Contient toute la logique de calcul des lignes de facture.
 * Implémente les règles §4.1 (hébergement), §4.2 (énergie), §4.3 (taxe).
 * Ne fait aucun accès à la base de données.
 */
class FactureCalculService {

    /**
     * Calcule la ligne hébergement selon §4.1.
     *
     * @param array  $categories     Lignes sejour_categorie avec prix_nuit_snapshot et nb_reelles.
     * @param int    $nb_nuits
     * @param int    $min_personnes  Forfait minimum (sejour.min_personnes_total ou config_site.min_personnes_defaut).
     * @param int    $forfait_tarif_personne_id  ID tarif_personne de la catégorie de référence.
     * @return array{libelle: string, quantite: float, prix_unitaire: float, prix_total: float, forfait_applique: bool}
     */
    public function calculer_hebergement( array $categories, int $nb_nuits, int $min_personnes, int $forfait_tarif_personne_id ): array {
        $total_reel   = 0;
        $montant_reel = 0.0;
        $prix_ref     = 0.0;

        foreach ( $categories as $cat ) {
            $nb    = (int)   $cat['nb_reelles'];
            $prix  = (float) $cat['prix_nuit_snapshot'];
            $total_reel   += $nb;
            $montant_reel += $nb * $prix;

            if ( (int) $cat['tarif_personne_id'] === $forfait_tarif_personne_id ) {
                $prix_ref = $prix;
            }
        }

        $forfait_applique = $total_reel < $min_personnes;

        if ( $forfait_applique ) {
            $montant_nuit = $min_personnes * $prix_ref;
            $libelle      = sprintf( 'Forfait hébergement – %d personnes · %d nuits', $min_personnes, $nb_nuits );
            $quantite     = (float) $nb_nuits;
            $prix_unit    = (float) $montant_nuit;
        } else {
            $montant_nuit = $montant_reel;
            $nuitees      = $total_reel * $nb_nuits;
            $libelle      = sprintf( 'Hébergement – %d nuitées', $nuitees );
            $quantite     = (float) $nb_nuits;
            $prix_unit    = (float) $montant_reel;
        }

        return [
            'libelle'          => $libelle,
            'quantite'         => $quantite,
            'prix_unitaire'    => $prix_unit,
            'prix_total'       => round( $quantite * $prix_unit, 2 ),
            'forfait_applique' => $forfait_applique,
        ];
    }

    /**
     * Calcule la ligne énergie selon §4.2.
     * min(nb_nuits, energie_nb_nuits) × energie_prix_nuit
     */
    public function calculer_energie( int $nb_nuits, int $energie_nb_nuits, float $energie_prix_nuit ): array {
        $nuits_fact = min( $nb_nuits, $energie_nb_nuits );
        $total      = round( $nuits_fact * $energie_prix_nuit, 2 );
        return [
            'libelle'       => sprintf( 'Énergie – %d nuit(s) × %.2f €', $nuits_fact, $energie_prix_nuit ),
            'quantite'      => (float) $nuits_fact,
            'prix_unitaire' => $energie_prix_nuit,
            'prix_total'    => $total,
        ];
    }

    /**
     * Calcule la ligne taxe de séjour selon §4.3.
     * nb_adultes × nb_nuits × taxe_adulte_nuit
     */
    public function calculer_taxe( int $nb_adultes, int $nb_nuits, float $taxe_adulte_nuit ): array {
        $total = round( $nb_adultes * $nb_nuits * $taxe_adulte_nuit, 2 );
        return [
            'libelle'       => sprintf( 'Taxe de séjour – %d adulte(s) × %d nuit(s) × %.2f €', $nb_adultes, $nb_nuits, $taxe_adulte_nuit ),
            'quantite'      => (float) ( $nb_adultes * $nb_nuits ),
            'prix_unitaire' => $taxe_adulte_nuit,
            'prix_total'    => $total,
        ];
    }
}
