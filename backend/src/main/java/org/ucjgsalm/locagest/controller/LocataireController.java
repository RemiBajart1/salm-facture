package org.ucjgsalm.locagest.controller;

import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import static org.ucjgsalm.locagest.dto.Dtos.*;
import org.ucjgsalm.locagest.domain.Locataire;
import org.ucjgsalm.locagest.repository.LocataireRepository;

/**
 * Recherche de locataires — /api/v1/locataires
 *
 * <pre>
 * GET /api/v1/locataires?q=dupont   recherche par nom ou email (max 20 résultats)
 * </pre>
 */
@Slf4j
@RequiredArgsConstructor
@Controller("/api/v1/locataires")
@Secured("isAuthenticated()")
public class LocataireController {

    private final LocataireRepository locataireRepo;

    /**
     * Recherche un locataire par nom ou email (ILIKE, max 20 résultats).
     *
     * @param q terme de recherche (ex: "dupont" ou "jean@")
     */
    @Get
    @Secured({"resp_location", "tresorier"})
    public List<LocataireResponse> search(@QueryValue String q) throws Exception {
        log.debug("Recherche locataire q={}", q);
        if (q == null || q.isBlank()) return List.of();
        return locataireRepo.search(q).stream().map(this::toResponse).toList();
    }

    private LocataireResponse toResponse(Locataire l) {
        return new LocataireResponse(l.id(), l.nom(), l.email(),
            l.telephone(), l.adresse(), l.createdAt());
    }
}
