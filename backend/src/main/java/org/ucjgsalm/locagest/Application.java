package org.ucjgsalm.locagest;

import io.micronaut.runtime.Micronaut;

/**
 * Point d'entrée pour le développement local (Netty HTTP, port 8080).
 * En production, c'est {@code MicronautLambdaRuntime} qui est utilisé comme mainClass.
 * <p>
 * Lancer avec : {@code ./gradlew runLocal}
 */
public class Application {
    public static void main(String[] args) {
        Micronaut.run(Application.class, args);
    }
}
