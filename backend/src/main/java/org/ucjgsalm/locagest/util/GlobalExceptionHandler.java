package org.ucjgsalm.locagest.util;

import io.micronaut.http.*;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;
import java.util.NoSuchElementException;
import lombok.extern.slf4j.Slf4j;
import static org.ucjgsalm.locagest.dto.Dtos.ErrorResponse;

/**
 * Transforme les exceptions métier en réponses JSON propres.
 * Évite de laisser des stack traces remonter au client.
 */
@Slf4j
@Singleton
@Produces(MediaType.APPLICATION_JSON)
public class GlobalExceptionHandler
    implements ExceptionHandler<Exception, HttpResponse<ErrorResponse>> {

    @Override
    public HttpResponse<ErrorResponse> handle(HttpRequest req, Exception ex) {
        return switch (ex) {
            case NoSuchElementException e -> {
                log.warn("Resource not found: {}", e.getMessage());
                yield HttpResponse.notFound(new ErrorResponse("NOT_FOUND", e.getMessage()));
            }
            case IllegalArgumentException e -> {
                log.warn("Bad request: {}", e.getMessage());
                yield HttpResponse.badRequest(new ErrorResponse("BAD_REQUEST", e.getMessage()));
            }
            case IllegalStateException e -> {
                log.warn("Business rule violation: {}", e.getMessage());
                yield HttpResponse.<ErrorResponse>status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse("CONFLICT", e.getMessage()));
            }
            default -> {
                log.error("Unexpected error processing {}", req.getPath(), ex);
                yield HttpResponse.<ErrorResponse>serverError()
                    .body(new ErrorResponse("INTERNAL_ERROR",
                        "Une erreur interne est survenue. Référence : " + req.getPath()));
            }
        };
    }
}
