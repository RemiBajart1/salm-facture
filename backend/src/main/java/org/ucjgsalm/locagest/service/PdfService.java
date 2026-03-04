package org.ucjgsalm.locagest.service;

import jakarta.inject.Singleton;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;

/**
 * Génère le PDF de facture avec Apache PDFBox.
 * Mise en page : A4, marges 2cm, logo UCJG, tableau des lignes, total en vert forêt.
 */
@Singleton
public class PdfService {

    private static final DateTimeFormatter FMT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final float MARGIN     = 56f;   // 2 cm
    private static final float PAGE_W     = PDRectangle.A4.getWidth();
    private static final float PAGE_H     = PDRectangle.A4.getHeight();
    private static final float CONTENT_W  = PAGE_W - 2 * MARGIN;

    // Charte UCJG Salm
    private static final float[] COLOR_FOREST = {0.165f, 0.361f, 0.247f};  // #2a5c3f
    private static final float[] COLOR_CREAM  = {0.961f, 0.941f, 0.902f};  // #f5f0e6
    private static final float[] COLOR_TEXT   = {0.102f, 0.184f, 0.122f};  // #1a2f1f
    private static final float[] COLOR_MUTED  = {0.478f, 0.580f, 0.506f};  // #7a9481
    private static final float[] COLOR_WARM   = {0.784f, 0.475f, 0.227f};  // #c8793a

    public byte[] generer(Facture facture, Sejour sejour,
                          List<LigneSejour> lignes,
                          Map<String, String> configSite) throws Exception {

        try (var doc = new PDDocument()) {
            var page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            try (var cs = new PDPageContentStream(doc, page)) {
                var fontBold    = PDType1Font.HELVETICA_BOLD;
                var fontRegular = PDType1Font.HELVETICA;
                var fontMono    = PDType1Font.COURIER;

                float y = PAGE_H - MARGIN;

                // ── En-tête : logo triangle UCJG ──────────────────────────
                y = drawHeader(cs, fontBold, fontRegular, y);

                // ── Numéro & dates ────────────────────────────────────────
                y = drawFactureInfo(cs, fontBold, fontRegular, facture, sejour, y);

                // ── Bloc locataire (adresse) ──────────────────────────────
                // (simplification : en prod, passer le Locataire en paramètre)

                // ── Tableau des lignes ────────────────────────────────────
                y = drawLignes(cs, fontBold, fontRegular, fontMono, lignes, y);

                // ── Total ─────────────────────────────────────────────────
                y = drawTotal(cs, fontBold, facture, y);

                // ── Mode de paiement & IBAN ───────────────────────────────
                drawPaiementInfo(cs, fontBold, fontRegular, facture, sejour, configSite, y - 20);

                // ── Pied de page ──────────────────────────────────────────
                drawFooter(cs, fontRegular);
            }

            var out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    // ── Sections ─────────────────────────────────────────────────────────

    private float drawHeader(PDPageContentStream cs,
                             PDType1Font bold, PDType1Font regular, float y) throws Exception {
        // Bande verte en haut
        setFill(cs, COLOR_FOREST);
        cs.addRect(0, PAGE_H - 70, PAGE_W, 70);
        cs.fill();

        // Nom association
        cs.beginText();
        cs.setFont(bold, 16);
        setFillColor(cs, 1f, 1f, 1f);
        cs.newLineAtOffset(MARGIN, PAGE_H - 42);
        cs.showText("UCJG Salm — Maison de vacances YMCA");
        cs.endText();

        cs.beginText();
        cs.setFont(regular, 10);
        setFillColor(cs, 0.9f, 0.9f, 0.9f);
        cs.newLineAtOffset(MARGIN, PAGE_H - 58);
        cs.showText("53 rue du Haut-Fourneau · location@ucjgsalm.org · 06.12.63.81.09");
        cs.endText();

        return PAGE_H - 90;
    }

    private float drawFactureInfo(PDPageContentStream cs,
                                  PDType1Font bold, PDType1Font regular,
                                  Facture facture, Sejour sejour, float y) throws Exception {
        // Titre FACTURE
        cs.beginText();
        cs.setFont(bold, 20);
        setFillColor(cs, COLOR_FOREST);
        cs.newLineAtOffset(MARGIN, y);
        cs.showText("FACTURE");
        cs.endText();

        cs.beginText();
        cs.setFont(regular, 10);
        setFillColor(cs, COLOR_MUTED);
        cs.newLineAtOffset(MARGIN, y - 18);
        cs.showText("N° " + facture.numero());
        cs.endText();

        // Dates séjour (droite)
        cs.beginText();
        cs.setFont(regular, 10);
        setFillColor(cs, COLOR_TEXT);
        cs.newLineAtOffset(PAGE_W - MARGIN - 160, y);
        cs.showText("Séjour : " + sejour.dateArrivee().format(FMT_DATE)
            + " – " + sejour.dateDepart().format(FMT_DATE));
        cs.endText();
        cs.beginText();
        cs.setFont(regular, 10);
        cs.newLineAtOffset(PAGE_W - MARGIN - 160, y - 15);
        cs.showText(sejour.nbNuits() + " nuit" + (sejour.nbNuits() > 1 ? "s" : ""));
        cs.endText();

        // Ligne séparatrice
        setStroke(cs, COLOR_FOREST);
        cs.setLineWidth(1.5f);
        cs.moveTo(MARGIN, y - 32);
        cs.lineTo(PAGE_W - MARGIN, y - 32);
        cs.stroke();

        return y - 48;
    }

    private float drawLignes(PDPageContentStream cs,
                              PDType1Font bold, PDType1Font regular, PDType1Font mono,
                              List<LigneSejour> lignes, float y) throws Exception {

        // En-têtes colonnes
        float[] colX   = {MARGIN, MARGIN + 280, MARGIN + 360, MARGIN + 430, PAGE_W - MARGIN};
        String[] hdrs  = {"Désignation", "Qté", "Prix unit.", "Montant"};

        // Fond en-tête
        setFill(cs, COLOR_CREAM);
        cs.addRect(MARGIN, y - 4, CONTENT_W, 18);
        cs.fill();

        cs.beginText();
        cs.setFont(bold, 9);
        setFillColor(cs, COLOR_FOREST);
        for (int i = 0; i < hdrs.length; i++) {
            cs.newLineAtOffset(i == 0 ? colX[i] : colX[i] - (i == 0 ? 0 : cs.getGraphicsState() != null ? 0 : 0), 0);
        }
        cs.endText();

        // En-têtes individuels
        for (int i = 0; i < hdrs.length; i++) {
            writeText(cs, bold, 9, colX[i], y + 2, hdrs[i], COLOR_FOREST);
        }
        y -= 22;

        // Lignes de facturation (ordonnées par type)
        var sorted = lignes.stream()
            .sorted(Comparator.comparing(LigneSejour::typeLigne))
            .toList();

        boolean alternateRow = false;
        for (var ligne : sorted) {
            if (y < MARGIN + 80) break; // protection débordement (TODO : pages multiples)

            if (alternateRow) {
                setFill(cs, new float[]{0.97f, 0.97f, 0.97f});
                cs.addRect(MARGIN, y - 4, CONTENT_W, 16);
                cs.fill();
            }

            String montantStr = "  " + formatEuro(ligne.montant());

            writeText(cs, regular, 9, colX[0], y, ligne.designation(), COLOR_TEXT);
            writeText(cs, mono, 9, colX[1], y,
                ligne.quantite().stripTrailingZeros().toPlainString(), COLOR_TEXT);
            writeText(cs, mono, 9, colX[2], y,
                ligne.typeLigne() == TypeLigne.HEBERGEMENT ? "—" : formatEuro(ligne.prixUnitaire()),
                COLOR_MUTED);
            writeText(cs, bold, 9, colX[3], y, montantStr, COLOR_TEXT);

            // Badge LIBRE
            if (ligne.statut() == StatutLigne.LIBRE) {
                writeText(cs, regular, 7, colX[0] + 180, y, "⚠ saisie gardien", COLOR_WARM);
            }

            y -= 17;
            alternateRow = !alternateRow;
        }

        // Ligne séparatrice
        setStroke(cs, COLOR_FOREST);
        cs.setLineWidth(0.5f);
        cs.moveTo(MARGIN, y);
        cs.lineTo(PAGE_W - MARGIN, y);
        cs.stroke();

        return y - 8;
    }

    private float drawTotal(PDPageContentStream cs, PDType1Font bold,
                            Facture facture, float y) throws Exception {
        // Bloc total (fond vert)
        float totalH = 28;
        setFill(cs, COLOR_FOREST);
        cs.addRect(MARGIN, y - totalH + 4, CONTENT_W, totalH);
        cs.fill();

        writeText(cs, bold, 13, MARGIN + 10, y - 8, "TOTAL À PAYER", new float[]{1f,1f,1f});
        writeText(cs, bold, 15, PAGE_W - MARGIN - 90, y - 8,
            formatEuro(facture.montantTotal()), new float[]{1f,1f,1f});

        return y - totalH - 16;
    }

    private void drawPaiementInfo(PDPageContentStream cs,
                                  PDType1Font bold, PDType1Font regular,
                                  Facture facture, Sejour sejour,
                                  Map<String, String> config, float y) throws Exception {
        writeText(cs, bold, 10, MARGIN, y, "Modalités de paiement :", COLOR_FOREST);
        y -= 15;

        if (sejour.modePaiement() == ModePaiement.VIREMENT) {
            String iban = config.getOrDefault("iban", "—");
            String dateLimite = sejour.dateLimitePaiement() != null
                ? sejour.dateLimitePaiement().format(FMT_DATE) : "—";
            writeText(cs, regular, 9, MARGIN, y, "Virement bancaire · IBAN : " + iban, COLOR_TEXT);
            writeText(cs, regular, 9, MARGIN, y - 14,
                "Règlement attendu avant le " + dateLimite, COLOR_WARM);
        } else {
            writeText(cs, regular, 9, MARGIN, y, "Chèque à l'ordre de : UCJG Salm", COLOR_TEXT);
        }
    }

    private void drawFooter(PDPageContentStream cs, PDType1Font regular) throws Exception {
        setStroke(cs, COLOR_MUTED);
        cs.setLineWidth(0.5f);
        cs.moveTo(MARGIN, 36);
        cs.lineTo(PAGE_W - MARGIN, 36);
        cs.stroke();

        writeText(cs, regular, 7, MARGIN, 22,
            "Association UCJG Salm · Loi 1901 · Siret : XXX XXX XXX XXXXX · Exonération TVA (art. 261-7 CGI)",
            COLOR_MUTED);
    }

    // ── Helpers PDFBox ────────────────────────────────────────────────────

    private void writeText(PDPageContentStream cs, PDType1Font font, float size,
                           float x, float y, String text, float[] color) throws Exception {
        cs.beginText();
        cs.setFont(font, size);
        setFillColor(cs, color);
        cs.newLineAtOffset(x, y);
        // Encodage sécurisé : supprime les caractères non-latin1
        String safe = text.chars()
            .filter(c -> c < 256)
            .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
            .toString();
        cs.showText(safe);
        cs.endText();
    }

    private void setFill(PDPageContentStream cs, float[] rgb) throws Exception {
        cs.setNonStrokingColor(rgb[0], rgb[1], rgb[2]);
    }

    private void setFillColor(PDPageContentStream cs, float... rgb) throws Exception {
        cs.setNonStrokingColor(rgb[0], rgb[1], rgb[2]);
    }

    private void setStroke(PDPageContentStream cs, float[] rgb) throws Exception {
        cs.setStrokingColor(rgb[0], rgb[1], rgb[2]);
    }

    private String formatEuro(BigDecimal val) {
        if (val == null) return "0,00 €";
        return String.format("%,.2f €", val).replace(',', ' ').replace('.', ',');
    }
}
