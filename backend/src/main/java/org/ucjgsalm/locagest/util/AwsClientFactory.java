package org.ucjgsalm.locagest.util;

import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;

/**
 * Factory des clients AWS SDK v2.
 * Les credentials sont résolus automatiquement par la chaîne par défaut :
 *   1. Variables d'environnement AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
 *   2. Rôle IAM de la Lambda (recommandé en production)
 */
@Factory
public class AwsClientFactory {

    @Singleton
    public S3Client s3Client(@Value("${aws.region}") String region) {
        return S3Client.builder()
            .region(Region.of(region))
            .httpClient(UrlConnectionHttpClient.builder().build())  // léger pour Lambda
            .build();
    }

    @Singleton
    public S3Presigner s3Presigner(@Value("${aws.region}") String region) {
        return S3Presigner.builder()
            .region(Region.of(region))
            .build();
    }

    @Singleton
    public SesClient sesClient(@Value("${aws.region}") String region) {
        return SesClient.builder()
            .region(Region.of(region))
            .httpClient(UrlConnectionHttpClient.builder().build())
            .build();
    }
}
