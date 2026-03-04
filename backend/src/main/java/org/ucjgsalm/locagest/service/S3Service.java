package org.ucjgsalm.locagest.service;

import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;

/**
 * Gestion des fichiers S3 : upload PDF factures, upload photos chèques, URLs présignées.
 */
@Slf4j
@Singleton
public class S3Service {

    private final S3Client    s3;
    private final S3Presigner presigner;
    private final String      bucket;

    public S3Service(S3Client s3, S3Presigner presigner,
                     @Value("${aws.s3.bucket}") String bucket) {
        this.s3        = s3;
        this.presigner = presigner;
        this.bucket    = bucket;
    }

    /**
     * Upload un PDF de facture dans S3.
     * Chemin : {@code factures/{annee}/{numero}.pdf}
     *
     * @param pdfBytes contenu du PDF
     * @param numero   numéro de facture (ex: FAC-2025-042)
     * @param annee    année du séjour
     * @return clé S3 du fichier uploadé
     */
    public String uploadPdf(byte[] pdfBytes, String numero, int annee) {
        String key = String.format("factures/%d/%s.pdf", annee, numero);
        s3.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType("application/pdf")
                .serverSideEncryption(ServerSideEncryption.AES256)
                .build(),
            RequestBody.fromBytes(pdfBytes)
        );
        log.info("PDF facture uploadé : s3://{}/{}", bucket, key);
        return key;
    }

    /**
     * Upload une photo de chèque dans S3.
     * Chemin : {@code cheques/{sejourId}/{paiementId}.jpg}
     *
     * @return clé S3 du fichier uploadé
     */
    public String uploadCheque(byte[] imageBytes, String sejourId, String paiementId,
                               String contentType) {
        String key = String.format("cheques/%s/%s.jpg", sejourId, paiementId);
        s3.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType != null ? contentType : "image/jpeg")
                .serverSideEncryption(ServerSideEncryption.AES256)
                .build(),
            RequestBody.fromBytes(imageBytes)
        );
        log.info("Photo chèque uploadée : s3://{}/{}", bucket, key);
        return key;
    }

    /**
     * Génère une URL présignée valable 15 minutes.
     * Permet d'afficher les photos/PDFs dans l'interface sans exposer le bucket publiquement.
     *
     * @param s3Key clé S3 du fichier
     * @return URL présignée
     */
    public String presignedUrl(String s3Key) {
        var request = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(15))
            .getObjectRequest(r -> r.bucket(bucket).key(s3Key))
            .build();
        return presigner.presignGetObject(request).url().toString();
    }

    /**
     * Vérifie l'existence d'un fichier dans S3.
     *
     * @param s3Key clé S3 du fichier
     * @return {@code true} si le fichier existe
     */
    public boolean exists(String s3Key) {
        try {
            s3.headObject(HeadObjectRequest.builder().bucket(bucket).key(s3Key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }
}
