package org.ucjgsalm.locagest.service;

import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

import jakarta.mail.Session;
import jakarta.mail.internet.*;
import jakarta.activation.*;
import jakarta.mail.util.ByteArrayDataSource;
import java.io.ByteArrayOutputStream;
import java.util.Properties;
import org.ucjgsalm.locagest.domain.*;

/**
 * Envoi de la facture par email via AWS SES.
 *
 * <p>Destinataires : locataire + copie au responsable location (second envoi).
 * Pièce jointe : PDF de la facture.
 */
@Slf4j
@Singleton
public class EmailService {

    private final SesClient sesClient;
    private final String    fromAddress;

    public EmailService(SesClient sesClient,
                        @Value("${aws.ses.from-address}") String fromAddress) {
        this.sesClient   = sesClient;
        this.fromAddress = fromAddress;
    }

    /**
     * Envoie la facture par email avec le PDF en pièce jointe.
     * Envoie également une copie au responsable location si configuré.
     *
     * @param facture           facture générée
     * @param sejour            séjour associé
     * @param emailLocataire    email du locataire destinataire principal
     * @param pdfBytes          contenu du PDF
     * @param emailRespLocation email du responsable location pour copie (peut être vide)
     */
    public void envoyerFacture(Facture facture, Sejour sejour,
                               String emailLocataire,
                               byte[] pdfBytes,
                               String emailRespLocation) throws Exception {
        log.info("Envoi email facture {} → {} (resp={})", facture.numero(), emailLocataire, emailRespLocation);

        String subject = String.format("Votre facture UCJG Salm – %s", facture.numero());
        String body    = buildEmailBody(facture, sejour);

        var props   = new Properties();
        var session = Session.getInstance(props);
        var message = new MimeMessage(session);

        message.setFrom(new InternetAddress(fromAddress, "UCJG Salm – Location"));
        message.setRecipients(jakarta.mail.Message.RecipientType.TO,
            InternetAddress.parse(emailLocataire));
        message.setSubject(subject, "UTF-8");

        var multipart = new MimeMultipart();

        var bodyPart = new MimeBodyPart();
        bodyPart.setText(body, "UTF-8", "plain");
        multipart.addBodyPart(bodyPart);

        var pdfPart = new MimeBodyPart();
        pdfPart.setDataHandler(new DataHandler(
            new ByteArrayDataSource(pdfBytes, "application/pdf")));
        pdfPart.setFileName(facture.numero() + ".pdf");
        multipart.addBodyPart(pdfPart);

        message.setContent(multipart);

        var rawOut = new ByteArrayOutputStream();
        message.writeTo(rawOut);

        sesClient.sendRawEmail(SendRawEmailRequest.builder()
            .rawMessage(RawMessage.builder()
                .data(SdkBytes.fromByteArray(rawOut.toByteArray()))
                .build())
            .build());
        log.debug("Email principal envoyé pour facture {}", facture.numero());

        if (emailRespLocation != null && !emailRespLocation.isBlank()) {
            message.setRecipients(jakarta.mail.Message.RecipientType.TO,
                InternetAddress.parse(emailRespLocation));
            message.setSubject("[COPIE] " + subject, "UTF-8");
            rawOut.reset();
            message.writeTo(rawOut);
            sesClient.sendRawEmail(SendRawEmailRequest.builder()
                .rawMessage(RawMessage.builder()
                    .data(SdkBytes.fromByteArray(rawOut.toByteArray()))
                    .build())
                .build());
            log.debug("Copie email envoyée au resp. location {}", emailRespLocation);
        }
    }

    private String buildEmailBody(Facture facture, Sejour sejour) {
        return """
            Madame, Monsieur,

            Veuillez trouver en pièce jointe la facture de votre séjour à la maison \
            de vacances UCJG Salm.

            Référence : %s
            Séjour du %s au %s
            Montant total : %s €

            %s

            Cordialement,
            L'équipe UCJG Salm
            location@ucjgsalm.org

            --
            Association UCJG Salm | 53 rue du Haut-Fourneau, 67130 La Broque
            """.formatted(
                facture.numero(),
                sejour.dateArrivee().toString(),
                sejour.dateDepart().toString(),
                facture.montantTotal().toPlainString(),
                buildPaiementSection(sejour, facture)
            );
    }

    private String buildPaiementSection(Sejour sejour, Facture facture) {
        if (sejour.modePaiement() == null) return "";
        return switch (sejour.modePaiement()) {
            case VIREMENT -> """
                Règlement par virement bancaire attendu avant le %s.
                IBAN communiqué sur la facture ci-jointe.
                """.formatted(sejour.dateLimitePaiement() != null
                    ? sejour.dateLimitePaiement().toString() : "—");
            case CHEQUE -> "Règlement par chèque à l'ordre de UCJG Salm.";
        };
    }
}
